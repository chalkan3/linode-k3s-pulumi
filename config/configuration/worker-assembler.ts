import { WorkerConfig, NodeConfig, NodeLabels } from "../types";

/**
 * Builder for Worker configuration
 */
export class WorkerBuilder {
  private count: number = 2;
  private instanceType: string = "g6-standard-2";
  private labels?: NodeLabels;
  private nodes?: NodeConfig[];

  /**
   * Set number of worker nodes
   */
  setCount(count: number): this {
    if (count < 0) {
      throw new Error("Worker count cannot be negative");
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
   * Set global labels for all worker nodes
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
  build(): WorkerConfig {
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
