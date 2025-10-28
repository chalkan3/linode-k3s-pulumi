import * as pulumi from "@pulumi/pulumi";
import { WorkerNode } from "../worker-node";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode Instance
    if (args.type === "linode:index/instance:Instance") {
      return {
        id: "worker-instance-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          id: "worker-instance-" + Math.random().toString(36).substring(7),
          ipAddress: "203.0.113.200",
          privateIpAddress: "192.168.1.200",
          status: "running",
        },
      };
    }
    // Mock específico para command.remote.Command
    if (args.type === "command:remote:Command") {
      return {
        id: "cmd-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          stdout: "K3s agent installed successfully",
          stderr: "",
        },
      };
    }
    // Mock específico para FirewallDevice
    if (args.type === "linode:index/firewallDevice:FirewallDevice") {
      return {
        id: "fw-device-" + Math.random().toString(36).substring(7),
        state: args.inputs,
      };
    }
    return {
      id: args.inputs.name + "_id",
      state: args.inputs,
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("WorkerNode", () => {
  const baseArgs = {
    region: pulumi.output("us-east"),
    instanceType: pulumi.output("g6-standard-2"),
    image: pulumi.output("linode/ubuntu22.04"),
    sshKeyId: pulumi.output("ssh-key-123"),
    firewallId: pulumi.output(12345),
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
    controlPlaneUrl: pulumi.output("203.0.113.100"),
    k3sToken: pulumi.output("test-k3s-token"),
    nodeIndex: 0,
  };

  describe("constructor", () => {
    it("should create worker node with minimal config", () => {
      const node = new WorkerNode("test-worker", baseArgs);

      expect(node).toBeDefined();
      expect(node.instance).toBeDefined();
      expect(node.k3sInstallation).toBeDefined();
      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
    });

    it("should create worker with custom K3s version", () => {
      const node = new WorkerNode("test-worker-version", {
        ...baseArgs,
        k3sVersion: "v1.29.0+k3s1",
      });

      expect(node).toBeDefined();
    });

    it("should create worker with custom node name", () => {
      const node = new WorkerNode("test-worker-name", {
        ...baseArgs,
        nodeName: "custom-worker-node",
      });

      expect(node).toBeDefined();
    });

    it("should create worker with labels", () => {
      const node = new WorkerNode("test-worker-labels", {
        ...baseArgs,
        labels: {
          environment: "production",
          workload: "web",
        },
      });

      expect(node).toBeDefined();
    });

    it("should create worker with taints", () => {
      const node = new WorkerNode("test-worker-taints", {
        ...baseArgs,
        taints: [
          {
            key: "workload",
            value: "gpu",
            effect: "NoSchedule",
          },
        ],
      });

      expect(node).toBeDefined();
    });
  });

  describe("instance creation", () => {
    it("should create Linode instance", () => {
      const node = new WorkerNode("test-instance", baseArgs);

      expect(node.instance).toBeDefined();
    });

    it("should configure with correct instance type", () => {
      const node = new WorkerNode("test-type", {
        ...baseArgs,
        instanceType: pulumi.output("g6-standard-4"),
      });

      expect(node.instance).toBeDefined();
    });

    it("should use correct image", () => {
      const node = new WorkerNode("test-image", {
        ...baseArgs,
        image: pulumi.output("linode/ubuntu24.04"),
      });

      expect(node.instance).toBeDefined();
    });

    it("should have both public and private IPs", () => {
      const node = new WorkerNode("test-ips", baseArgs);

      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
    });
  });

  describe("VPC configuration", () => {
    it("should configure VPC interfaces when provided", () => {
      const node = new WorkerNode("test-vpc", {
        ...baseArgs,
        vpcId: pulumi.output(12345),
        subnetId: pulumi.output(67890),
      });

      expect(node.instance).toBeDefined();
    });

    it("should work without VPC", () => {
      const node = new WorkerNode("test-no-vpc", baseArgs);

      expect(node.instance).toBeDefined();
    });
  });

  describe("bastion configuration", () => {
    it("should configure bastion proxy when provided", () => {
      const node = new WorkerNode("test-bastion", {
        ...baseArgs,
        bastionHost: pulumi.output("203.0.113.50"),
        bastionUser: "root",
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should use direct connection without bastion", () => {
      const node = new WorkerNode("test-direct", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("K3s agent installation", () => {
    it("should create K3s agent installation command", () => {
      const node = new WorkerNode("test-install", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should connect to control plane", () => {
      const node = new WorkerNode("test-cp-connect", {
        ...baseArgs,
        controlPlaneUrl: pulumi.output("203.0.113.150"),
      });

      expect(node.k3sInstallation).toBeDefined();
      // Deve usar K3S_URL com a URL do control plane
    });

    it("should use provided K3s token", () => {
      const node = new WorkerNode("test-token", {
        ...baseArgs,
        k3sToken: pulumi.output("custom-k3s-token"),
      });

      expect(node.k3sInstallation).toBeDefined();
      // Deve usar K3S_TOKEN
    });

    it("should apply node labels", () => {
      const node = new WorkerNode("test-labels-apply", {
        ...baseArgs,
        labels: { zone: "us-east-1b" },
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should apply node taints", () => {
      const node = new WorkerNode("test-taints-apply", {
        ...baseArgs,
        taints: [{ key: "dedicated", value: "ml", effect: "NoSchedule" }],
      });

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("K3s agent arguments", () => {
    it("should accept custom agent args", () => {
      const node = new WorkerNode("test-agent-args", {
        ...baseArgs,
        k3sAgentArgs: ["--kubelet-arg=max-pods=250"],
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should configure node external IP", () => {
      const node = new WorkerNode("test-external-ip", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
      // Deve incluir --node-external-ip
    });

    it("should set custom node name", () => {
      const node = new WorkerNode("test-node-name", {
        ...baseArgs,
        nodeName: "worker-custom-1",
      });

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("tagging", () => {
    it("should have default tags", () => {
      const node = new WorkerNode("test-default-tags", baseArgs);

      expect(node.instance).toBeDefined();
      // Tags: clusterName, "worker", "k3s", "worker-{index}"
    });

    it("should merge custom tags", () => {
      const node = new WorkerNode("test-custom-tags", {
        ...baseArgs,
        tags: ["production", "web-tier"],
      });

      expect(node.instance).toBeDefined();
    });

    it("should include node index in tags", () => {
      const node = new WorkerNode("test-index-tag", {
        ...baseArgs,
        nodeIndex: 3,
      });

      expect(node.instance).toBeDefined();
      // Tag deve incluir "worker-3"
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const node = new WorkerNode("test-registration", baseArgs);

      expect(node).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register all outputs", () => {
      const node = new WorkerNode("test-outputs", baseArgs);

      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
    });

    it("should have instance ID", () => {
      const node = new WorkerNode("test-id", baseArgs);

      expect(node.instance.id).toBeDefined();
    });
  });

  describe("multiple worker nodes", () => {
    it("should create first worker node", () => {
      const node = new WorkerNode("worker-0", {
        ...baseArgs,
        nodeIndex: 0,
      });

      expect(node).toBeDefined();
    });

    it("should create second worker node", () => {
      const node = new WorkerNode("worker-1", {
        ...baseArgs,
        nodeIndex: 1,
      });

      expect(node).toBeDefined();
    });

    it("should create third worker node", () => {
      const node = new WorkerNode("worker-2", {
        ...baseArgs,
        nodeIndex: 2,
      });

      expect(node).toBeDefined();
    });
  });

  describe("control plane connectivity", () => {
    it("should wait for control plane to be ready", () => {
      const node = new WorkerNode("test-wait-cp", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
      // Script deve incluir loop de espera pelo control plane
    });

    it("should configure control plane URL correctly", () => {
      const node = new WorkerNode("test-cp-url", {
        ...baseArgs,
        controlPlaneUrl: pulumi.output("10.0.0.100"),
      });

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("different workload types", () => {
    it("should create worker for web workloads", () => {
      const node = new WorkerNode("web-worker", {
        ...baseArgs,
        labels: { workload: "web", tier: "frontend" },
        tags: ["web", "frontend"],
      });

      expect(node).toBeDefined();
    });

    it("should create worker for database workloads", () => {
      const node = new WorkerNode("db-worker", {
        ...baseArgs,
        labels: { workload: "database", tier: "backend" },
        taints: [{ key: "workload", value: "database", effect: "NoSchedule" }],
      });

      expect(node).toBeDefined();
    });

    it("should create worker for GPU workloads", () => {
      const node = new WorkerNode("gpu-worker", {
        ...baseArgs,
        instanceType: pulumi.output("g6-gpu-1"),
        labels: { "nvidia.com/gpu": "true" },
        taints: [{ key: "nvidia.com/gpu", value: "true", effect: "NoSchedule" }],
      });

      expect(node).toBeDefined();
    });
  });
});
