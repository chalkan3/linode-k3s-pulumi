import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";
import * as command from "@pulumi/command";
import { NodeLabels, NodeTaint } from "../config/types";

export interface WorkerNodeArgs {
  region: pulumi.Input<string>;
  instanceType: pulumi.Input<string>;
  image: pulumi.Input<string>;
  sshKeyId: pulumi.Input<string>;
  firewallId: pulumi.Input<number>;
  clusterName: string;
  rootPassword: pulumi.Input<string>;
  k3sVersion?: string;
  privateKey: pulumi.Input<string>;
  controlPlaneUrl: pulumi.Input<string>;
  k3sToken: pulumi.Input<string>;
  nodeIndex: number;
  nodeName?: string;
  labels?: NodeLabels;
  taints?: NodeTaint[];
  k3sAgentArgs?: string[];
  tags?: string[];
  // Bastion configuration
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  // VPC configuration
  vpcId?: pulumi.Input<number>;
  subnetId?: pulumi.Input<number>;
}

export class WorkerNode extends pulumi.ComponentResource {
  public readonly instance: linode.Instance;
  public readonly k3sInstallation: command.remote.Command;
  public readonly publicIp: pulumi.Output<string>;
  public readonly privateIp: pulumi.Output<string>;

  constructor(name: string, args: WorkerNodeArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k3s:WorkerNode", name, {}, opts);

    const defaultOpts = { parent: this };
    const k3sVersion = args.k3sVersion || "v1.28.5+k3s1";
    const nodeName = args.nodeName || `${args.clusterName}-worker-${args.nodeIndex}`;

    // Construir labels como string para node-label
    const labelArgs: string[] = [];
    if (args.labels) {
      Object.entries(args.labels).forEach(([key, value]) => {
        labelArgs.push(`--node-label=${key}=${value}`);
      });
    }
    // Adicionar labels padrão (removido node-role.kubernetes.io/worker que é uma label reservada)
    // K3s automaticamente adiciona as labels de role do Kubernetes
    labelArgs.push(`--node-label=node.kubernetes.io/instance-type=${args.instanceType}`);

    // Construir taints como string
    const taintArgs: string[] = [];
    if (args.taints) {
      args.taints.forEach((taint) => {
        taintArgs.push(`--node-taint=${taint.key}=${taint.value}:${taint.effect}`);
      });
    }

    // Tags para a instância Linode
    const instanceTags = [
      args.clusterName,
      "worker",
      "k3s",
      `worker-${args.nodeIndex}`,
      ...(args.tags || []),
    ];

    // Construir argumentos extras do agent
    const extraAgentArgs = args.k3sAgentArgs || [];

    // User data para instalar K3s agent via cloud-init
    const userData = pulumi.all([args.k3sToken, args.controlPlaneUrl, args.instanceType]).apply(([token, cpUrl, instanceType]) => `#!/bin/bash
set -e

# Configurar hostname único
echo "Setting hostname to ${nodeName}..."
hostnamectl set-hostname ${nodeName}
echo "127.0.0.1 ${nodeName}" >> /etc/hosts

# Atualizar sistema e instalar dependências
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl wget

# Aguardar rede estar pronta
sleep 10

# Verificar se control plane está disponível (o Pulumi já garantiu que está pronto)
echo "Checking control plane at ${cpUrl}:6443..."
max_attempts=30
attempt=0
until timeout 2 bash -c "cat < /dev/null > /dev/tcp/${cpUrl}/6443" 2>/dev/null || [ $attempt -eq $max_attempts ]; do
  echo "Attempt $((attempt+1))/$max_attempts: Waiting for control plane..."
  sleep 5
  ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
  echo "ERROR: Control plane not reachable"
  exit 1
fi

echo "Control plane is ready!"

# Instalar K3s como agent
echo "Starting K3s agent installation via cloud-init..."
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3sVersion}" \\
K3S_URL="https://${cpUrl}:6443" \\
K3S_TOKEN="${token}" \\
sh -s - agent \\
  --node-name=${nodeName} \\
  --node-external-ip=$(hostname -I | awk '{print $1}') \\
  ${labelArgs.join(" ")} \\
  ${taintArgs.join(" ")} \\
  ${extraAgentArgs.join(" ")}

# Aguardar K3s agent iniciar
echo "Waiting for K3s agent to start..."
sleep 20

echo "K3s agent installation completed on ${nodeName}"
`);

    // Configurar interfaces de rede
    const interfaces: any[] = [];

    if (args.vpcId && args.subnetId) {
      // Adicionar interface VPC
      interfaces.push({
        purpose: "vpc",
        subnetId: args.subnetId,
        primary: false,
      });
      // Interface pública
      interfaces.push({
        purpose: "public",
        primary: true,
      });
    }

    // Criar instância Linode para Worker
    this.instance = new linode.Instance(
      nodeName,
      {
        label: nodeName,
        region: args.region,
        type: args.instanceType,
        image: args.image,
        rootPass: args.rootPassword,
        authorizedKeys: [args.sshKeyId],
        privateIp: true,
        tags: instanceTags,
        interfaces: interfaces.length > 0 ? interfaces : undefined,
        metadatas: [{
          userData: userData.apply(script => Buffer.from(script).toString('base64')),
        }],
      },
      defaultOpts
    );

    // Adicionar instância ao firewall
    const firewallDevice = new linode.FirewallDevice(
      `${nodeName}-fw-device`,
      {
        firewallId: args.firewallId,
        entityId: this.instance.id.apply(id => parseInt(id, 10)),
      },
      { ...defaultOpts, dependsOn: [this.instance] }
    );

    this.publicIp = this.instance.ipAddress;
    this.privateIp = this.instance.privateIpAddress;

    // Aguardar cloud-init E verificar que o K3s está realmente pronto
    const validationScript = `#!/bin/bash
# Initial delay to ensure SSH is fully ready
echo "Waiting for system to be fully ready..."
sleep 15

echo "Waiting for cloud-init to complete K3s installation..."
cloud-init status --wait || true
echo "Cloud-init completed"

# Aguardar K3s agent service estar ativo
echo "Waiting for K3s agent service..."
max_attempts=60
attempt=0
until systemctl is-active --quiet k3s-agent || [ $attempt -eq $max_attempts ]; do
  echo "  Attempt $((attempt+1))/$max_attempts: Waiting for K3s agent service..."
  sleep 5
  ((attempt++))
done

if ! systemctl is-active --quiet k3s-agent; then
  echo "ERROR: K3s agent service not active after $max_attempts attempts"
  systemctl status k3s-agent --no-pager
  journalctl -u k3s-agent -n 50 --no-pager
  exit 1
fi

echo "✓ K3s agent service is active"
echo "Worker node installation completed"
`;

    const connectionConfig: any = {
      user: "root",
      privateKey: args.privateKey,
    };

    if (args.bastionHost) {
      connectionConfig.host = this.instance.privateIpAddress;
      connectionConfig.proxy = {
        host: args.bastionHost,
        user: args.bastionUser || "root",
        privateKey: args.privateKey,
      };
    } else {
      connectionConfig.host = this.instance.ipAddress;
    }

    this.k3sInstallation = new command.remote.Command(
      `${nodeName}-k3s-wait`,
      {
        connection: connectionConfig,
        create: validationScript,
        triggers: [this.instance.id],
      },
      { ...defaultOpts, dependsOn: [this.instance, firewallDevice] }
    );

    this.registerOutputs({
      instanceId: this.instance.id,
      publicIp: this.publicIp,
      privateIp: this.privateIp,
    });
  }
}
