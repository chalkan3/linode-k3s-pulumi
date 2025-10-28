import * as pulumi from "@pulumi/pulumi";
import { ControlPlaneNode, ControlPlaneNodeArgs } from "../../components/control-plane-node";
import { WorkerNode, WorkerNodeArgs } from "../../components/worker-node";
import { NodeConfig } from "../types";

/**
 * Factory pattern for creating nodes
 * Centralizes node creation logic
 */
export class NodeFactory {
  /**
   * Create a control plane node
   */
  static createControlPlaneNode(
    name: string,
    args: ControlPlaneNodeArgs,
    opts?: pulumi.ComponentResourceOptions
  ): ControlPlaneNode {
    return new ControlPlaneNode(name, args, opts);
  }

  /**
   * Create a worker node
   */
  static createWorkerNode(
    name: string,
    args: WorkerNodeArgs,
    opts?: pulumi.ComponentResourceOptions
  ): WorkerNode {
    return new WorkerNode(name, args, opts);
  }

  /**
   * Create multiple control plane nodes
   */
  static createControlPlaneNodes(
    clusterName: string,
    count: number,
    defaultArgs: Omit<ControlPlaneNodeArgs, "nodeIndex" | "nodeName" | "labels">,
    globalLabels: { [key: string]: string } = {},
    nodeConfigs?: NodeConfig[],
    opts?: pulumi.ComponentResourceOptions
  ): ControlPlaneNode[] {
    const nodes: ControlPlaneNode[] = [];

    for (let i = 0; i < count; i++) {
      const nodeConfig = nodeConfigs?.[i];
      const nodeName = nodeConfig?.name || `${clusterName}-cp-${i}`;
      const instanceType = nodeConfig?.instanceType || defaultArgs.instanceType;

      // Merge global and node-specific labels
      const labels = {
        ...globalLabels,
        ...nodeConfig?.labels,
      };

      const node = NodeFactory.createControlPlaneNode(
        `${clusterName}-cp-${i}`,
        {
          ...defaultArgs,
          instanceType,
          nodeIndex: i,
          nodeName,
          labels,
          taints: nodeConfig?.taints,
        },
        opts
      );

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * Create multiple worker nodes
   */
  static createWorkerNodes(
    clusterName: string,
    count: number,
    defaultArgs: Omit<WorkerNodeArgs, "nodeIndex" | "nodeName" | "labels">,
    globalLabels: { [key: string]: string } = {},
    nodeConfigs?: NodeConfig[],
    opts?: pulumi.ComponentResourceOptions
  ): WorkerNode[] {
    const nodes: WorkerNode[] = [];

    for (let i = 0; i < count; i++) {
      const nodeConfig = nodeConfigs?.[i];
      const nodeName = nodeConfig?.name || `${clusterName}-worker-${i}`;
      const instanceType = nodeConfig?.instanceType || defaultArgs.instanceType;

      // Merge global and node-specific labels
      const labels = {
        ...globalLabels,
        ...nodeConfig?.labels,
      };

      const node = NodeFactory.createWorkerNode(
        `${clusterName}-worker-${i}`,
        {
          ...defaultArgs,
          instanceType,
          nodeIndex: i,
          nodeName,
          labels,
          taints: nodeConfig?.taints,
        },
        opts
      );

      nodes.push(node);
    }

    return nodes;
  }
}
