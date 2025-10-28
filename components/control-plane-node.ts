import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";
import * as command from "@pulumi/command";
import { NodeLabels, NodeTaint } from "../config/types";

export interface ControlPlaneNodeArgs {
  region: pulumi.Input<string>;
  instanceType: pulumi.Input<string>;
  image: pulumi.Input<string>;
  sshKeyId: pulumi.Input<string>;
  firewallId: pulumi.Input<number>;
  clusterName: string;
  rootPassword: pulumi.Input<string>;
  k3sVersion?: string;
  privateKey: pulumi.Input<string>;
  nodeIndex: number;
  nodeName?: string;
  labels?: NodeLabels;
  taints?: NodeTaint[];
  k3sServerArgs?: string[];
  disableComponents?: string[];
  tags?: string[];
  k3sToken?: pulumi.Input<string>; // Token compartilhado do cluster
  firstMasterUrl?: pulumi.Input<string>; // URL do primeiro master para HA (se não fornecido, será o primeiro master)
  // Bastion configuration
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  // VPC configuration
  vpcId?: pulumi.Input<number>;
  subnetId?: pulumi.Input<number>;
}

export class ControlPlaneNode extends pulumi.ComponentResource {
  public readonly instance: linode.Instance;
  public readonly k3sToken: pulumi.Output<string>;
  public readonly k3sInstallation: command.remote.Command;
  public readonly publicIp: pulumi.Output<string>;
  public readonly privateIp: pulumi.Output<string>;

  constructor(name: string, args: ControlPlaneNodeArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k3s:ControlPlaneNode", name, {}, opts);

    const defaultOpts = { parent: this };
    const k3sVersion = args.k3sVersion || "v1.28.5+k3s1";
    const nodeName = args.nodeName || `${args.clusterName}-cp-${args.nodeIndex}`;
    const disableComponents = args.disableComponents || ["traefik"];

    // Usar token fornecido ou gerar novo (primeiro nó)
    this.k3sToken = args.k3sToken
      ? pulumi.output(args.k3sToken)
      : pulumi.output(`k3s-${args.clusterName}-${Date.now()}-${Math.random().toString(36).substring(7)}`);

    // Construir labels como string para node-label
    const labelArgs: string[] = [];
    if (args.labels) {
      Object.entries(args.labels).forEach(([key, value]) => {
        labelArgs.push(`--node-label=${key}=${value}`);
      });
    }
    // Adicionar labels padrão (removido node-role.kubernetes.io/control-plane que é uma label reservada)
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
      "control-plane",
      "k3s",
      `cp-${args.nodeIndex}`,
      ...(args.tags || []),
    ];

    // Construir argumentos extras do servidor
    const extraServerArgs = args.k3sServerArgs || [];
    const disableArgs = disableComponents.map((comp) => `--disable=${comp}`).join(" ");

    // User data para instalar K3s via cloud-init
    const userData = pulumi.all([this.k3sToken, args.instanceType, args.firstMasterUrl || pulumi.output("")]).apply(([token, instanceType, firstMasterUrl]) => {
      // Se firstMasterUrl foi fornecido, este é um master adicional (usa --server)
      // Senão, é o primeiro master (usa --cluster-init)
      const isFirstMaster = !firstMasterUrl || firstMasterUrl === "";

      let clusterJoinArgs = "";
      if (isFirstMaster) {
        clusterJoinArgs = "--cluster-init";
      } else {
        clusterJoinArgs = `--server https://${firstMasterUrl}:6443`;
      }

      return `#!/bin/bash
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

${!isFirstMaster ? `# Aguardar primeiro master estar disponível
echo "Waiting for first master at ${firstMasterUrl}:6443..."
max_attempts=60
attempt=0
until timeout 2 bash -c "cat < /dev/null > /dev/tcp/${firstMasterUrl}/6443" 2>/dev/null || [ $attempt -eq $max_attempts ]; do
  echo "Attempt $((attempt+1))/$max_attempts: Waiting for first master..."
  sleep 5
  ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
  echo "ERROR: First master not reachable"
  exit 1
fi

echo "First master is ready!"
` : ""}
# Instalar K3s como server
echo "Starting K3s server installation via cloud-init..."
echo "Mode: ${isFirstMaster ? 'FIRST MASTER (--cluster-init)' : 'ADDITIONAL MASTER (--server)'}"
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3sVersion}" sh -s - server \\
  --token="${token}" \\
  ${clusterJoinArgs} \\
  ${disableArgs} \\
  ${labelArgs.join(" ")} \\
  ${taintArgs.join(" ")} \\
  ${extraServerArgs.join(" ")} \\
  --write-kubeconfig-mode=644 \\
  --node-name=${nodeName} \\
  --node-external-ip=$(hostname -I | awk '{print $1}') \\
  --tls-san=$(hostname -I | awk '{print $1}')

# Aguardar K3s iniciar
echo "Waiting for K3s to start..."
sleep 30

# Verificar se node está pronto
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl wait --for=condition=Ready node/${nodeName} --timeout=300s || true

echo "K3s control plane installation completed on ${nodeName}"
`;
    });

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

    // Criar instância Linode para Control Plane
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

# Aguardar K3s service estar ativo
echo "Waiting for K3s service..."
max_attempts=60
attempt=0
until systemctl is-active --quiet k3s || [ $attempt -eq $max_attempts ]; do
  echo "  Attempt $((attempt+1))/$max_attempts: Waiting for K3s service..."
  sleep 5
  ((attempt++))
done

if ! systemctl is-active --quiet k3s; then
  echo "ERROR: K3s service not active after $max_attempts attempts"
  systemctl status k3s --no-pager
  exit 1
fi

echo "✓ K3s service is active"

# Aguardar node estar Ready no Kubernetes
echo "Waiting for node ${nodeName} to be Ready..."
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
attempt=0
until kubectl wait --for=condition=Ready node/${nodeName} --timeout=10s 2>/dev/null || [ $attempt -eq $max_attempts ]; do
  echo "  Attempt $((attempt+1))/$max_attempts: Waiting for node to be Ready..."
  sleep 5
  ((attempt++))
done

if ! kubectl get node ${nodeName} &>/dev/null; then
  echo "ERROR: Node ${nodeName} not found in cluster"
  kubectl get nodes
  exit 1
fi

echo "✓ Node ${nodeName} is Ready"
echo "Control plane ready to accept new nodes"
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
      k3sToken: this.k3sToken,
    });
  }
}
