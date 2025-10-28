import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";

export interface BastionHostArgs {
  region: pulumi.Input<string>;
  instanceType: pulumi.Input<string>;
  image: pulumi.Input<string>;
  sshKeyId: pulumi.Input<string>;
  firewallId: pulumi.Input<number>;
  clusterName: string;
  rootPassword: pulumi.Input<string>;
  tags?: string[];
  allowedSshCidrs?: string[];
  vpcId?: pulumi.Input<number>;
  subnetId?: pulumi.Input<number>;
}

export class BastionHost extends pulumi.ComponentResource {
  public readonly instance: linode.Instance;
  public readonly publicIp: pulumi.Output<string>;
  public readonly privateIp: pulumi.Output<string>;

  constructor(name: string, args: BastionHostArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:security:BastionHost", name, {}, opts);

    const defaultOpts = { parent: this };

    // Tags para o bastion
    const instanceTags = [
      args.clusterName,
      "bastion",
      "jump-host",
      ...(args.tags || []),
    ];

    // User data para configurar bastion
    const userData = `#!/bin/bash
set -e

# Atualizar sistema
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Instalar ferramentas úteis
apt-get install -y curl wget htop vim tmux

# Configurar SSH para permitir agent forwarding
cat >> /etc/ssh/sshd_config <<EOL

# Bastion configuration
AllowAgentForwarding yes
AllowTcpForwarding yes
GatewayPorts no
X11Forwarding no
PermitTunnel no
EOL

# Restart SSH
systemctl restart sshd

# Banner
cat > /etc/motd <<EOL
===============================================
 Bastion Host - ${args.clusterName}

 This is a jump host for accessing cluster nodes.
 Do not run workloads on this server.
===============================================
EOL

echo "Bastion host configured successfully"
`;

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

    // Criar instância Linode para Bastion
    this.instance = new linode.Instance(
      `${args.clusterName}-bastion`,
      {
        label: `${args.clusterName}-bastion`,
        region: args.region,
        type: args.instanceType,
        image: args.image,
        rootPass: args.rootPassword,
        authorizedKeys: [args.sshKeyId],
        privateIp: true,
        tags: instanceTags,
        interfaces: interfaces.length > 0 ? interfaces : undefined,
        metadatas: [{
          userData: Buffer.from(userData).toString('base64'),
        }],
      },
      defaultOpts
    );

    // Adicionar instância ao firewall
    const firewallDevice = new linode.FirewallDevice(
      `${args.clusterName}-bastion-fw-device`,
      {
        firewallId: args.firewallId,
        entityId: this.instance.id.apply(id => parseInt(id, 10)),
      },
      { ...defaultOpts, dependsOn: [this.instance] }
    );

    this.publicIp = this.instance.ipAddress;
    this.privateIp = this.instance.privateIpAddress;

    this.registerOutputs({
      instanceId: this.instance.id,
      publicIp: this.publicIp,
      privateIp: this.privateIp,
    });
  }
}
