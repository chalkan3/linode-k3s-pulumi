import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";
import * as command from "@pulumi/command";
import { NodeLabels, NodeTaint } from "../types";

/**
 * Abstract base class for all node types
 * Provides common functionality and enforces structure
 */
export abstract class BaseNode extends pulumi.ComponentResource {
  public readonly instance: linode.Instance;
  public readonly publicIp: pulumi.Output<string>;
  public readonly privateIp: pulumi.Output<string>;
  public readonly k3sInstallation: command.remote.Command;

  protected constructor(
    type: string,
    name: string,
    args: BaseNodeArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(type, name, {}, opts);

    // Create instance
    this.instance = this.createInstance(name, args, { parent: this });

    // Setup IPs
    this.publicIp = this.instance.ipAddress;
    this.privateIp = this.instance.privateIpAddress;

    // Attach to firewall
    this.attachToFirewall(name, args.firewallId, { parent: this });

    // Install K3s
    this.k3sInstallation = this.installK3s(name, args, { parent: this });

    // Register outputs
    this.registerOutputs({
      instanceId: this.instance.id,
      publicIp: this.publicIp,
      privateIp: this.privateIp,
    });
  }

  /**
   * Create Linode instance - must be implemented by subclasses
   */
  protected abstract createInstance(
    name: string,
    args: BaseNodeArgs,
    opts: pulumi.ComponentResourceOptions
  ): linode.Instance;

  /**
   * Generate K3s installation script - must be implemented by subclasses
   */
  protected abstract generateInstallScript(args: BaseNodeArgs): pulumi.Output<string>;

  /**
   * Get node role - must be implemented by subclasses
   */
  protected abstract getNodeRole(): string;

  /**
   * Attach instance to firewall
   */
  protected attachToFirewall(
    name: string,
    firewallId: pulumi.Input<number>,
    opts: pulumi.ComponentResourceOptions
  ): linode.FirewallDevice {
    return new linode.FirewallDevice(
      `${name}-fw-device`,
      {
        firewallId: firewallId,
        entityId: this.instance.id.apply((id) => parseInt(id, 10)),
      },
      opts
    );
  }

  /**
   * Install K3s on the node
   */
  protected installK3s(
    name: string,
    args: BaseNodeArgs,
    opts: pulumi.ComponentResourceOptions
  ): command.remote.Command {
    const connectionConfig = this.buildConnectionConfig(args);
    const installScript = this.generateInstallScript(args);

    return new command.remote.Command(
      `${name}-k3s-install`,
      {
        connection: connectionConfig,
        create: installScript,
        triggers: [this.instance.id],
      },
      opts
    );
  }

  /**
   * Build SSH connection configuration
   */
  protected buildConnectionConfig(args: BaseNodeArgs): any {
    const config: any = {
      user: "root",
      privateKey: args.privateKey,
    };

    if (args.bastionHost) {
      // Connection via bastion
      config.host = this.instance.privateIpAddress;
      config.proxy = {
        host: args.bastionHost,
        user: args.bastionUser || "root",
        privateKey: args.privateKey,
      };
    } else {
      // Direct connection
      config.host = this.instance.ipAddress;
    }

    return config;
  }

  /**
   * Build label arguments for K3s
   */
  protected buildLabelArgs(labels?: NodeLabels, additionalLabels?: NodeLabels): string {
    const allLabels = {
      ...labels,
      ...additionalLabels,
      "node.kubernetes.io/role": this.getNodeRole(),
    };

    const args: string[] = [];
    Object.entries(allLabels).forEach(([key, value]) => {
      args.push(`--node-label=${key}=${value}`);
    });

    return args.join(" ");
  }

  /**
   * Build taint arguments for K3s
   */
  protected buildTaintArgs(taints?: NodeTaint[]): string {
    if (!taints || taints.length === 0) return "";

    return taints
      .map((taint) => `--node-taint=${taint.key}=${taint.value}:${taint.effect}`)
      .join(" ");
  }

  /**
   * Generate user data script
   */
  protected generateUserData(): string {
    return `#!/bin/bash
set -e

# Update system and install dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl wget

echo "System ready for K3s installation"
`;
  }

  /**
   * Build instance tags
   */
  protected buildInstanceTags(
    clusterName: string,
    nodeRole: string,
    nodeIndex: number,
    customTags?: string[]
  ): string[] {
    return [
      clusterName,
      nodeRole,
      "k3s",
      `${nodeRole}-${nodeIndex}`,
      ...(customTags || []),
    ];
  }
}

/**
 * Base arguments for all node types
 */
export interface BaseNodeArgs {
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
  tags?: string[];
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  vpcId?: pulumi.Input<number>;
  subnetId?: pulumi.Input<number>;
}
