import * as pulumi from "@pulumi/pulumi";
import { ClusterConfig } from "../types";
import { ConfigurationManager } from "./config-manager";
import { EventDispatcher, ClusterEventType } from "./event-dispatcher";
import { ServiceContainer, Services } from "./dependency-container";

/**
 * Cluster Facade
 * Provides a simplified, high-level interface for cluster operations
 * Hides the complexity of the underlying subsystems
 */
export class ClusterFacade {
  private configManager: ConfigurationManager;
  private eventDispatcher: EventDispatcher;
  private container: ServiceContainer;
  private config: ClusterConfig | null = null;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.eventDispatcher = EventDispatcher.getInstance();
    this.container = ServiceContainer.getInstance();
  }

  /**
   * Initialize the cluster facade
   */
  public initialize(): void {
    console.log("🚀 Initializing K3s Cluster Deployment...");

    // Load configuration
    this.config = this.configManager.loadConfiguration();
    this.eventDispatcher.emit(
      ClusterEventType.CONFIGURATION_LOADED,
      `Configuration loaded for cluster: ${this.config.name}`,
      { clusterName: this.config.name, region: this.config.region }
    );
  }

  /**
   * Get cluster configuration
   */
  public getConfiguration(): ClusterConfig {
    if (!this.config) {
      throw new Error("Cluster not initialized. Call initialize() first.");
    }
    return this.config;
  }

  /**
   * Get cluster summary
   */
  public getSummary(): ClusterSummary {
    if (!this.config) {
      throw new Error("Cluster not initialized");
    }

    return {
      name: this.config.name,
      region: this.config.region,
      controlPlaneCount: this.config.controlPlane.count,
      workerCount: this.config.workers.count,
      k3sVersion: this.config.k3s.version,
      vpcEnabled: this.config.vpc?.enabled ?? false,
      bastionEnabled: this.config.bastion?.enabled ?? false,
      argocdEnabled: this.config.argocd?.enabled ?? false,
    };
  }

  /**
   * Validate configuration
   */
  public validate(): boolean {
    try {
      this.eventDispatcher.emit(
        ClusterEventType.VALIDATION_STARTED,
        "Validating cluster configuration..."
      );

      // Configuration is already validated by the loader
      // This is for additional runtime validation if needed

      this.eventDispatcher.emit(
        ClusterEventType.VALIDATION_COMPLETED,
        "Configuration validation completed successfully"
      );

      return true;
    } catch (error: any) {
      this.eventDispatcher.emit(
        ClusterEventType.ERROR,
        `Validation failed: ${error.message}`,
        { error: error.message }
      );
      return false;
    }
  }

  /**
   * Get recommended instance types
   */
  public getRecommendedInstanceTypes(): RecommendedInstances {
    const workloadType = this.detectWorkloadType();

    const recommendations: Record<string, RecommendedInstances> = {
      development: {
        controlPlane: "g6-standard-2",
        worker: "g6-standard-1",
        bastion: "g6-nanode-1",
      },
      production: {
        controlPlane: "g6-standard-4",
        worker: "g6-standard-2",
        bastion: "g6-standard-1",
      },
      "high-performance": {
        controlPlane: "g6-standard-8",
        worker: "g6-standard-4",
        bastion: "g6-standard-2",
      },
    };

    return recommendations[workloadType] || recommendations.production;
  }

  /**
   * Detect workload type based on configuration
   */
  private detectWorkloadType(): string {
    if (!this.config) return "production";

    const totalNodes =
      this.config.controlPlane.count + this.config.workers.count;

    if (totalNodes <= 3) return "development";
    if (totalNodes >= 10) return "high-performance";
    return "production";
  }

  /**
   * Get cost estimation (approximate)
   */
  public getEstimatedMonthlyCost(): CostEstimation {
    if (!this.config) {
      throw new Error("Cluster not initialized");
    }

    // Approximate Linode pricing (in USD)
    const prices: Record<string, number> = {
      "g6-nanode-1": 5,
      "g6-standard-1": 10,
      "g6-standard-2": 20,
      "g6-standard-4": 40,
      "g6-standard-8": 80,
    };

    const cpPrice = prices[this.config.controlPlane.instanceType] || 20;
    const workerPrice = prices[this.config.workers.instanceType] || 20;
    const bastionPrice = prices[this.config.bastion?.instanceType || "g6-nanode-1"] || 5;

    const cpCost = cpPrice * this.config.controlPlane.count;
    const workerCost = workerPrice * this.config.workers.count;
    const bastionCost = this.config.bastion?.enabled ? bastionPrice : 0;
    const vpcCost = this.config.vpc?.enabled ? 0 : 0; // VPC is free on Linode

    const total = cpCost + workerCost + bastionCost + vpcCost;

    return {
      controlPlane: cpCost,
      workers: workerCost,
      bastion: bastionCost,
      vpc: vpcCost,
      total,
      currency: "USD",
      period: "monthly",
    };
  }

  /**
   * Get deployment timeline estimate
   */
  public getEstimatedDeploymentTime(): DeploymentTimeline {
    if (!this.config) {
      throw new Error("Cluster not initialized");
    }

    const baseTime = 5; // minutes
    const perNodeTime = 2; // minutes per node
    const totalNodes = this.config.controlPlane.count + this.config.workers.count;

    const provisioning = totalNodes * 1;
    const installation = totalNodes * perNodeTime;
    const validation = 2;
    const argocd = this.config.argocd?.enabled ? 3 : 0;

    const total = baseTime + provisioning + installation + validation + argocd;

    return {
      provisioning: `${provisioning} min`,
      installation: `${installation} min`,
      validation: `${validation} min`,
      argocd: argocd > 0 ? `${argocd} min` : "N/A",
      total: `${total} min`,
    };
  }
}

/**
 * Types for Facade
 */
export interface ClusterSummary {
  name: string;
  region: string;
  controlPlaneCount: number;
  workerCount: number;
  k3sVersion: string;
  vpcEnabled: boolean;
  bastionEnabled: boolean;
  argocdEnabled: boolean;
}

export interface RecommendedInstances {
  controlPlane: string;
  worker: string;
  bastion: string;
}

export interface CostEstimation {
  controlPlane: number;
  workers: number;
  bastion: number;
  vpc: number;
  total: number;
  currency: string;
  period: string;
}

export interface DeploymentTimeline {
  provisioning: string;
  installation: string;
  validation: string;
  argocd: string;
  total: string;
}
