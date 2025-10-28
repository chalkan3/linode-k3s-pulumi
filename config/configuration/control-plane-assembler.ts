import { ControlPlaneConfig, NodeConfig, NodeLabels } from "../types";

/**
 * Builder for Control Plane configuration
 */
export class ControlPlaneBuilder {
  private count: number = 1;
  private instanceType: string = "g6-standard-2";
  private labels?: NodeLabels;
  private nodes?: NodeConfig[];

  /**
   * Set number of control plane nodes
   */
  setCount(count: number): this {
    if (count < 1) {
      throw new Error("Control plane count must be at least 1");
    }
    if (count === 2) {
      throw new Error("Control plane count of 2 is not recommended. Use 1 or 3+ for HA");
    }
    this.count = count;
    return this;
  }

  /**
   * Set default instance type
   */
  setInstanceType(type: string): this {
    this.instanceType = type;
    return this;
  }

  /**
   * Set global labels for all control plane nodes
   */
  setLabels(labels: NodeLabels): this {
    this.labels = labels;
    return this;
  }

  /**
   * Set individual node configurations
   */
  setNodes(nodes: NodeConfig[]): this {
    if (nodes.length !== this.count) {
      throw new Error(
        `Nodes array length (${nodes.length}) must match count (${this.count})`
      );
    }
    this.nodes = nodes;
    return this;
  }

  /**
   * Add a single node configuration
   */
  addNode(node: NodeConfig): this {
    if (!this.nodes) {
      this.nodes = [];
    }
    this.nodes.push(node);
    return this;
  }

  /**
   * Build the configuration
   */
  build(): ControlPlaneConfig {
    if (this.nodes && this.nodes.length !== this.count) {
      throw new Error(
        `Nodes array length (${this.nodes.length}) must match count (${this.count})`
      );
    }

    return {
      count: this.count,
      instanceType: this.instanceType,
      labels: this.labels,
      nodes: this.nodes,
    };
  }
}
