import * as pulumi from "@pulumi/pulumi";
import {
  ClusterConfig,
  ControlPlaneConfig,
  WorkerConfig,
  K3sConfig,
  SshConfig,
  VpcConfig,
  NetworkConfig,
  BastionConfig,
  ArgoCDConfig,
} from "../types";

/**
 * Builder pattern for constructing ClusterConfig
 * Provides a fluent interface for creating complex configurations
 */
export class ClusterConfigBuilder {
  private config: Partial<ClusterConfig> = {};

  /**
   * Set basic cluster information
   */
  setBasicInfo(name: string, region: string, image: string): this {
    this.config.name = name;
    this.config.region = region;
    this.config.image = image;
    return this;
  }

  /**
   * Set root password
   */
  setRootPassword(password: pulumi.Input<string>): this {
    this.config.rootPassword = password;
    return this;
  }

  /**
   * Set control plane configuration
   */
  setControlPlane(controlPlane: ControlPlaneConfig): this {
    this.config.controlPlane = controlPlane;
    return this;
  }

  /**
   * Set workers configuration
   */
  setWorkers(workers: WorkerConfig): this {
    this.config.workers = workers;
    return this;
  }

  /**
   * Set K3s configuration
   */
  setK3s(k3s: K3sConfig): this {
    this.config.k3s = k3s;
    return this;
  }

  /**
   * Set SSH configuration
   */
  setSsh(ssh: SshConfig): this {
    this.config.ssh = ssh;
    return this;
  }

  /**
   * Set VPC configuration
   */
  setVpc(vpc: VpcConfig): this {
    this.config.vpc = vpc;
    return this;
  }

  /**
   * Set network configuration
   */
  setNetwork(network: NetworkConfig): this {
    this.config.network = network;
    return this;
  }

  /**
   * Set bastion configuration
   */
  setBastion(bastion: BastionConfig): this {
    this.config.bastion = bastion;
    return this;
  }

  /**
   * Set ArgoCD configuration
   */
  setArgoCD(argocd: ArgoCDConfig): this {
    this.config.argocd = argocd;
    return this;
  }

  /**
   * Set tags
   */
  setTags(tags: string[]): this {
    this.config.tags = tags;
    return this;
  }

  /**
   * Build and return the final configuration
   * Validates that all required fields are present
   */
  build(): ClusterConfig {
    if (!this.config.name) {
      throw new Error("Cluster name is required");
    }
    if (!this.config.region) {
      throw new Error("Cluster region is required");
    }
    if (!this.config.image) {
      throw new Error("Cluster image is required");
    }
    if (!this.config.rootPassword) {
      throw new Error("Root password is required");
    }
    if (!this.config.controlPlane) {
      throw new Error("Control plane configuration is required");
    }
    if (!this.config.workers) {
      throw new Error("Workers configuration is required");
    }
    if (!this.config.k3s) {
      throw new Error("K3s configuration is required");
    }
    if (!this.config.ssh) {
      throw new Error("SSH configuration is required");
    }

    return this.config as ClusterConfig;
  }

  /**
   * Reset builder to start fresh
   */
  reset(): this {
    this.config = {};
    return this;
  }
}
