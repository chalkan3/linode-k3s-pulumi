import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";

export interface NetworkComponentArgs {
  region: pulumi.Input<string>;
  clusterName: string;
  allowedSshCidrs?: string[];
  bastionPrivateIp?: pulumi.Input<string>;
  vpcId?: pulumi.Input<number>;
}

export class NetworkComponent extends pulumi.ComponentResource {
  public readonly bastionFirewall: linode.Firewall;
  public readonly clusterFirewall: linode.Firewall;

  constructor(name: string, args: NetworkComponentArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:network:NetworkComponent", name, {}, opts);

    const defaultOpts = { parent: this };
    const allowedSshCidrs = args.allowedSshCidrs || ["0.0.0.0/0"];

    // Firewall para o Bastion - APENAS ele pode receber SSH externo
    this.bastionFirewall = new linode.Firewall(
      `${args.clusterName}-bastion-firewall`,
      {
        label: `${args.clusterName}-bastion-firewall`,
        inboundPolicy: "DROP",
        outboundPolicy: "ACCEPT",
        inbounds: [
          {
            label: "allow-ssh-bastion",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "22",
            ipv4s: allowedSshCidrs,
          },
        ],
        outbounds: [
          {
            label: "allow-all-outbound",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "1-65535",
            ipv4s: ["0.0.0.0/0"],
          },
          {
            label: "allow-all-udp-outbound",
            action: "ACCEPT",
            protocol: "UDP",
            ports: "1-65535",
            ipv4s: ["0.0.0.0/0"],
          },
        ],
      },
      defaultOpts
    );

    // Firewall para nós do cluster - SSH apenas da rede privada (bastion)
    this.clusterFirewall = new linode.Firewall(
      `${args.clusterName}-cluster-firewall`,
      {
        label: `${args.clusterName}-cluster-firewall`,
        inboundPolicy: "DROP",
        outboundPolicy: "ACCEPT",
        inbounds: [
          {
            label: "allow-ssh-from-private-network",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "22",
            ipv4s: ["192.168.0.0/16"], // Rede privada Linode
          },
          {
            label: "allow-k3s-api",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "6443",
            ipv4s: ["0.0.0.0/0"],
          },
          {
            label: "allow-etcd-client",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "2379",
            ipv4s: ["0.0.0.0/0"], // Etcd client port for HA
          },
          {
            label: "allow-etcd-peer",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "2380",
            ipv4s: ["0.0.0.0/0"], // Etcd peer port for HA
          },
          {
            label: "allow-http",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "80",
            ipv4s: ["0.0.0.0/0"],
          },
          {
            label: "allow-https",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "443",
            ipv4s: ["0.0.0.0/0"],
          },
          {
            label: "allow-kubelet",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "10250",
            ipv4s: ["0.0.0.0/0"], // Allow from anywhere when VPC is disabled
          },
          {
            label: "allow-flannel-vxlan",
            action: "ACCEPT",
            protocol: "UDP",
            ports: "8472",
            ipv4s: ["0.0.0.0/0"], // Allow from anywhere when VPC is disabled - critical for pod networking
          },
          {
            label: "allow-node-ports",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "30000-32767",
            ipv4s: ["0.0.0.0/0"],
          },
        ],
        outbounds: [
          {
            label: "allow-all-outbound",
            action: "ACCEPT",
            protocol: "TCP",
            ports: "1-65535",
            ipv4s: ["0.0.0.0/0"],
          },
          {
            label: "allow-all-udp-outbound",
            action: "ACCEPT",
            protocol: "UDP",
            ports: "1-65535",
            ipv4s: ["0.0.0.0/0"],
          },
        ],
      },
      defaultOpts
    );

    this.registerOutputs({
      bastionFirewallId: this.bastionFirewall.id,
      clusterFirewallId: this.clusterFirewall.id,
    });
  }
}
