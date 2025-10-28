import * as pulumi from "@pulumi/pulumi";
import { NodeFactory } from "../node-creator";
import { ControlPlaneNodeArgs } from "../../../components/control-plane-node";
import { WorkerNodeArgs } from "../../../components/worker-node";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    const baseId = Math.random().toString(36).substring(7);

    const mocks: { [key: string]: any } = {
      "linode:index/instance:Instance": {
        id: `instance-${baseId}`,
        ipAddress: "203.0.113.100",
        privateIpAddress: "192.168.1.100",
        status: "running",
      },
      "linode:index/firewallDevice:FirewallDevice": {
        id: `fw-device-${baseId}`,
      },
      "random:index/randomPassword:RandomPassword": {
        result: "test-token-" + baseId,
      },
      "command:remote:Command": {
        stdout: "K3s installed successfully",
        stderr: "",
      },
    };

    const mockState = mocks[args.type] || {};

    return {
      id: mockState.id || args.inputs.name + "_id",
      state: {
        ...args.inputs,
        ...mockState,
      },
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("NodeFactory", () => {
  const baseControlPlaneArgs: Omit<ControlPlaneNodeArgs, "nodeIndex" | "nodeName" | "labels"> = {
    region: "us-east",
    instanceType: "g6-standard-2",
    image: "linode/ubuntu22.04",
    sshKeyId: "test-key",
    firewallId: 12345,
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
    k3sToken: pulumi.output("test-token"),
    k3sVersion: "v1.28.5+k3s1",
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
  };

  const baseWorkerArgs: Omit<WorkerNodeArgs, "nodeIndex" | "nodeName" | "labels"> = {
    region: "us-east",
    instanceType: "g6-standard-2",
    image: "linode/ubuntu22.04",
    sshKeyId: "test-key",
    firewallId: 12345,
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
    k3sToken: pulumi.output("test-token"),
    k3sVersion: "v1.28.5+k3s1",
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
    controlPlaneUrl: pulumi.output("https://192.168.1.10:6443"),
  };

  describe("createControlPlaneNode", () => {
    it("should create a single control plane node", () => {
      const node = NodeFactory.createControlPlaneNode(
        "test-cp-0",
        {
          ...baseControlPlaneArgs,
          nodeIndex: 0,
          nodeName: "test-cp-0",
          labels: {},
        }
      );

      expect(node).toBeDefined();
      expect(node.instance).toBeDefined();
    });

    it("should create control plane node with custom labels", () => {
      const node = NodeFactory.createControlPlaneNode(
        "test-cp-labeled",
        {
          ...baseControlPlaneArgs,
          nodeIndex: 0,
          nodeName: "test-cp-labeled",
          labels: { env: "production", tier: "control" },
        }
      );

      expect(node).toBeDefined();
    });

    it("should create control plane node with server args", () => {
      const node = NodeFactory.createControlPlaneNode(
        "test-cp-args",
        {
          ...baseControlPlaneArgs,
          nodeIndex: 0,
          nodeName: "test-cp-args",
          labels: {},
          k3sServerArgs: ["--disable=traefik"],
        }
      );

      expect(node).toBeDefined();
    });
  });

  describe("createWorkerNode", () => {
    it("should create a single worker node", () => {
      const node = NodeFactory.createWorkerNode(
        "test-worker-0",
        {
          ...baseWorkerArgs,
          nodeIndex: 0,
          nodeName: "test-worker-0",
          labels: {},
        }
      );

      expect(node).toBeDefined();
      expect(node.instance).toBeDefined();
    });

    it("should create worker node with custom labels", () => {
      const node = NodeFactory.createWorkerNode(
        "test-worker-labeled",
        {
          ...baseWorkerArgs,
          nodeIndex: 0,
          nodeName: "test-worker-labeled",
          labels: { workload: "web", env: "staging" },
        }
      );

      expect(node).toBeDefined();
    });

    it("should create worker node with taints", () => {
      const node = NodeFactory.createWorkerNode(
        "test-worker-tainted",
        {
          ...baseWorkerArgs,
          nodeIndex: 0,
          nodeName: "test-worker-tainted",
          labels: {},
          taints: [{ key: "dedicated", value: "gpu", effect: "NoSchedule" }],
        }
      );

      expect(node).toBeDefined();
    });
  });

  describe("createControlPlaneNodes", () => {
    it("should create single control plane node", () => {
      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        1,
        baseControlPlaneArgs
      );

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toBeDefined();
    });

    it("should create multiple control plane nodes", () => {
      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        3,
        baseControlPlaneArgs
      );

      expect(nodes).toHaveLength(3);
      nodes.forEach((node, index) => {
        expect(node).toBeDefined();
      });
    });

    it("should apply global labels to all nodes", () => {
      const globalLabels = { env: "production", cluster: "main" };
      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        2,
        baseControlPlaneArgs,
        globalLabels
      );

      expect(nodes).toHaveLength(2);
    });

    it("should use default node names when not specified", () => {
      const nodes = NodeFactory.createControlPlaneNodes(
        "my-cluster",
        2,
        baseControlPlaneArgs
      );

      expect(nodes).toHaveLength(2);
    });

    it("should use custom node configurations", () => {
      const nodeConfigs = [
        { name: "cp-0", instanceType: "g6-standard-4", labels: { zone: "a" } },
        { name: "cp-1", instanceType: "g6-standard-4", labels: { zone: "b" } },
      ];

      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        2,
        baseControlPlaneArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(2);
    });

    it("should merge global and node-specific labels", () => {
      const globalLabels = { env: "production" };
      const nodeConfigs = [
        { name: "cp-0", instanceType: "g6-standard-2", labels: { zone: "us-east-1a" } },
      ];

      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        1,
        baseControlPlaneArgs,
        globalLabels,
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should override instance type with node config", () => {
      const nodeConfigs = [
        { name: "cp-0", instanceType: "g6-standard-8" },
      ];

      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        1,
        baseControlPlaneArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should handle taints in node config", () => {
      const nodeConfigs = [
        {
          name: "cp-0",
          instanceType: "g6-standard-2",
          taints: [{ key: "node-role.kubernetes.io/control-plane", value: "true", effect: "NoSchedule" as const }],
        },
      ];

      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        1,
        baseControlPlaneArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should create HA control plane (3 nodes)", () => {
      const nodes = NodeFactory.createControlPlaneNodes(
        "ha-cluster",
        3,
        baseControlPlaneArgs,
        { env: "production" }
      );

      expect(nodes).toHaveLength(3);
    });

    it("should handle zero count", () => {
      const nodes = NodeFactory.createControlPlaneNodes(
        "test-cluster",
        0,
        baseControlPlaneArgs
      );

      expect(nodes).toHaveLength(0);
    });
  });

  describe("createWorkerNodes", () => {
    it("should create single worker node", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        1,
        baseWorkerArgs
      );

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toBeDefined();
    });

    it("should create multiple worker nodes", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        5,
        baseWorkerArgs
      );

      expect(nodes).toHaveLength(5);
      nodes.forEach((node, index) => {
        expect(node).toBeDefined();
      });
    });

    it("should apply global labels to all workers", () => {
      const globalLabels = { workload: "general", tier: "compute" };
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        2,
        baseWorkerArgs,
        globalLabels
      );

      expect(nodes).toHaveLength(2);
    });

    it("should use default node names when not specified", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "my-cluster",
        3,
        baseWorkerArgs
      );

      expect(nodes).toHaveLength(3);
    });

    it("should use custom node configurations", () => {
      const nodeConfigs = [
        { name: "worker-0", instanceType: "g6-standard-4", labels: { type: "web" } },
        { name: "worker-1", instanceType: "g6-standard-8", labels: { type: "database" } },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        2,
        baseWorkerArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(2);
    });

    it("should merge global and node-specific labels", () => {
      const globalLabels = { env: "staging" };
      const nodeConfigs = [
        { name: "worker-0", instanceType: "g6-standard-2", labels: { zone: "us-west-1a" } },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        1,
        baseWorkerArgs,
        globalLabels,
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should override instance type with node config", () => {
      const nodeConfigs = [
        { name: "worker-0", instanceType: "g6-dedicated-16" },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        1,
        baseWorkerArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should handle taints in worker config", () => {
      const nodeConfigs = [
        {
          name: "gpu-worker-0",
          instanceType: "g6-gpu-2",
          taints: [{ key: "nvidia.com/gpu", value: "true", effect: "NoSchedule" as const }],
        },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        1,
        baseWorkerArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });

    it("should handle zero count", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        0,
        baseWorkerArgs
      );

      expect(nodes).toHaveLength(0);
    });

    it("should create large worker pool", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        10,
        baseWorkerArgs
      );

      expect(nodes).toHaveLength(10);
    });
  });

  describe("factory pattern usage", () => {
    it("should create mixed cluster topology", () => {
      const controlPlanes = NodeFactory.createControlPlaneNodes(
        "mixed-cluster",
        3,
        baseControlPlaneArgs
      );

      const workers = NodeFactory.createWorkerNodes(
        "mixed-cluster",
        5,
        baseWorkerArgs
      );

      expect(controlPlanes).toHaveLength(3);
      expect(workers).toHaveLength(5);
    });

    it("should support heterogeneous worker configurations", () => {
      const nodeConfigs = [
        { name: "web-0", instanceType: "g6-standard-2", labels: { workload: "web" } },
        { name: "web-1", instanceType: "g6-standard-2", labels: { workload: "web" } },
        { name: "db-0", instanceType: "g6-standard-8", labels: { workload: "database" } },
        { name: "cache-0", instanceType: "g6-highmem-4", labels: { workload: "cache" } },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "heterogeneous-cluster",
        4,
        baseWorkerArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(4);
    });

    it("should support heterogeneous control plane configurations", () => {
      const nodeConfigs = [
        { name: "cp-us-east-0", instanceType: "g6-standard-4", labels: { zone: "us-east" } },
        { name: "cp-us-west-0", instanceType: "g6-standard-4", labels: { zone: "us-west" } },
        { name: "cp-eu-central-0", instanceType: "g6-standard-4", labels: { zone: "eu-central" } },
      ];

      const nodes = NodeFactory.createControlPlaneNodes(
        "multi-region-cluster",
        3,
        baseControlPlaneArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle partial node configs (less configs than count)", () => {
      const nodeConfigs = [
        { name: "custom-worker-0", instanceType: "g6-standard-4" },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        3,
        baseWorkerArgs,
        {},
        nodeConfigs
      );

      expect(nodes).toHaveLength(3);
    });

    it("should handle empty global labels", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        2,
        baseWorkerArgs,
        {}
      );

      expect(nodes).toHaveLength(2);
    });

    it("should handle undefined node configs", () => {
      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        2,
        baseWorkerArgs,
        {},
        undefined
      );

      expect(nodes).toHaveLength(2);
    });

    it("should prioritize node-specific labels over global labels", () => {
      const globalLabels = { env: "staging" };
      const nodeConfigs = [
        { name: "worker-0", instanceType: "g6-standard-2", labels: { env: "production" } },
      ];

      const nodes = NodeFactory.createWorkerNodes(
        "test-cluster",
        1,
        baseWorkerArgs,
        globalLabels,
        nodeConfigs
      );

      expect(nodes).toHaveLength(1);
    });
  });
});
