import * as pulumi from "@pulumi/pulumi";

/**
 * Interface for installation strategies
 * Strategy pattern allows different installation approaches
 */
export interface InstallationStrategy {
  /**
   * Generate installation script
   */
  generateInstallScript(context: InstallationContext): pulumi.Output<string>;

  /**
   * Get connection configuration for SSH
   */
  getConnectionConfig(context: InstallationContext): any;
}

/**
 * Context for installation
 */
export interface InstallationContext {
  nodeName: string;
  nodeIp: pulumi.Output<string>;
  privateNodeIp: pulumi.Output<string>;
  privateKey: pulumi.Input<string>;
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  k3sVersion: string;
  labels?: { [key: string]: string };
  taints?: Array<{ key: string; value: string; effect: string }>;
}

/**
 * Direct connection strategy (no bastion)
 */
export class DirectConnectionStrategy implements InstallationStrategy {
  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    throw new Error("Must be implemented by subclass");
  }

  getConnectionConfig(context: InstallationContext): any {
    return {
      host: context.nodeIp,
      user: "root",
      privateKey: context.privateKey,
    };
  }
}

/**
 * Bastion connection strategy (jump host)
 */
export class BastionConnectionStrategy implements InstallationStrategy {
  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    throw new Error("Must be implemented by subclass");
  }

  getConnectionConfig(context: InstallationContext): any {
    if (!context.bastionHost) {
      throw new Error("Bastion host is required for BastionConnectionStrategy");
    }

    return {
      host: context.privateNodeIp,
      user: "root",
      privateKey: context.privateKey,
      proxy: {
        host: context.bastionHost,
        user: context.bastionUser || "root",
        privateKey: context.privateKey,
      },
    };
  }
}

/**
 * Factory to create appropriate connection strategy
 */
export class ConnectionStrategyFactory {
  static create(useBastionHost: boolean): InstallationStrategy {
    return useBastionHost
      ? new BastionConnectionStrategy()
      : new DirectConnectionStrategy();
  }
}
