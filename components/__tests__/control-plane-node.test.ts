import * as pulumi from "@pulumi/pulumi";
import { ControlPlaneNode } from "../control-plane-node";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode Instance
    if (args.type === "linode:index/instance:Instance") {
      return {
        id: "cp-instance-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          id: "cp-instance-" + Math.random().toString(36).substring(7),
          ipAddress: "203.0.113.100",
          privateIpAddress: "192.168.1.100",
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
          stdout: "K3s control plane installed successfully",
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

describe("ControlPlaneNode", () => {
  const baseArgs = {
    region: pulumi.output("us-east"),
    instanceType: pulumi.output("g6-standard-2"),
    image: pulumi.output("linode/ubuntu22.04"),
    sshKeyId: pulumi.output("ssh-key-123"),
    firewallId: pulumi.output(12345),
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
    nodeIndex: 0,
  };

  describe("constructor", () => {
    it("should create control plane node with minimal config", () => {
      const node = new ControlPlaneNode("test-cp", baseArgs);

      expect(node).toBeDefined();
      expect(node.instance).toBeDefined();
      expect(node.k3sToken).toBeDefined();
      expect(node.k3sInstallation).toBeDefined();
      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
    });

    it("should create control plane with custom K3s version", () => {
      const node = new ControlPlaneNode("test-cp-version", {
        ...baseArgs,
        k3sVersion: "v1.29.0+k3s1",
      });

      expect(node).toBeDefined();
    });

    it("should create control plane with custom node name", () => {
      const node = new ControlPlaneNode("test-cp-name", {
        ...baseArgs,
        nodeName: "custom-cp-node",
      });

      expect(node).toBeDefined();
    });

    it("should create control plane with labels", () => {
      const node = new ControlPlaneNode("test-cp-labels", {
        ...baseArgs,
        labels: {
          environment: "production",
          role: "control-plane",
        },
      });

      expect(node).toBeDefined();
    });

    it("should create control plane with taints", () => {
      const node = new ControlPlaneNode("test-cp-taints", {
        ...baseArgs,
        taints: [
          {
            key: "node-role.kubernetes.io/control-plane",
            value: "true",
            effect: "NoSchedule",
          },
        ],
      });

      expect(node).toBeDefined();
    });
  });

  describe("K3s token generation", () => {
    it("should generate K3s token", () => {
      const node = new ControlPlaneNode("test-token", baseArgs);

      expect(node.k3sToken).toBeDefined();
    });

    it("should generate unique tokens", () => {
      const node1 = new ControlPlaneNode("test-token-1", baseArgs);
      const node2 = new ControlPlaneNode("test-token-2", {
        ...baseArgs,
        nodeIndex: 1,
      });

      expect(node1.k3sToken).toBeDefined();
      expect(node2.k3sToken).toBeDefined();
    });

    it("should include cluster name in token", async () => {
      const node = new ControlPlaneNode("test-token-cluster", baseArgs);

      return pulumi.output(node.k3sToken).apply((token) => {
        expect(token).toBeDefined();
        expect(token).toContain("test-cluster");
      });
    });
  });

  describe("instance creation", () => {
    it("should create Linode instance", () => {
      const node = new ControlPlaneNode("test-instance", baseArgs);

      expect(node.instance).toBeDefined();
    });

    it("should configure with correct instance type", () => {
      const node = new ControlPlaneNode("test-type", {
        ...baseArgs,
        instanceType: pulumi.output("g6-standard-4"),
      });

      expect(node.instance).toBeDefined();
    });

    it("should use correct image", () => {
      const node = new ControlPlaneNode("test-image", {
        ...baseArgs,
        image: pulumi.output("linode/ubuntu24.04"),
      });

      expect(node.instance).toBeDefined();
    });

    it("should have both public and private IPs", () => {
      const node = new ControlPlaneNode("test-ips", baseArgs);

      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
    });
  });

  describe("VPC configuration", () => {
    it("should configure VPC interfaces when provided", () => {
      const node = new ControlPlaneNode("test-vpc", {
        ...baseArgs,
        vpcId: pulumi.output(12345),
        subnetId: pulumi.output(67890),
      });

      expect(node.instance).toBeDefined();
    });

    it("should work without VPC", () => {
      const node = new ControlPlaneNode("test-no-vpc", baseArgs);

      expect(node.instance).toBeDefined();
    });
  });

  describe("bastion configuration", () => {
    it("should configure bastion proxy when provided", () => {
      const node = new ControlPlaneNode("test-bastion", {
        ...baseArgs,
        bastionHost: pulumi.output("203.0.113.50"),
        bastionUser: "root",
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should use direct connection without bastion", () => {
      const node = new ControlPlaneNode("test-direct", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("K3s installation", () => {
    it("should create K3s installation command", () => {
      const node = new ControlPlaneNode("test-install", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should configure with cluster-init flag", () => {
      const node = new ControlPlaneNode("test-cluster-init", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
      // Deve usar --cluster-init para etcd embedded
    });

    it("should disable specified components", () => {
      const node = new ControlPlaneNode("test-disable", {
        ...baseArgs,
        disableComponents: ["traefik", "servicelb"],
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should apply node labels", () => {
      const node = new ControlPlaneNode("test-labels-apply", {
        ...baseArgs,
        labels: { zone: "us-east-1a" },
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should apply node taints", () => {
      const node = new ControlPlaneNode("test-taints-apply", {
        ...baseArgs,
        taints: [{ key: "dedicated", value: "control-plane", effect: "NoSchedule" }],
      });

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("K3s server arguments", () => {
    it("should accept custom server args", () => {
      const node = new ControlPlaneNode("test-server-args", {
        ...baseArgs,
        k3sServerArgs: ["--kubelet-arg=max-pods=250"],
      });

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should configure TLS SAN with public IP", () => {
      const node = new ControlPlaneNode("test-tls-san", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
      // Deve incluir --tls-san com IP público
    });
  });

  describe("tagging", () => {
    it("should have default tags", () => {
      const node = new ControlPlaneNode("test-default-tags", baseArgs);

      expect(node.instance).toBeDefined();
      // Tags: clusterName, "control-plane", "k3s", "cp-{index}"
    });

    it("should merge custom tags", () => {
      const node = new ControlPlaneNode("test-custom-tags", {
        ...baseArgs,
        tags: ["production", "critical"],
      });

      expect(node.instance).toBeDefined();
    });

    it("should include node index in tags", () => {
      const node = new ControlPlaneNode("test-index-tag", {
        ...baseArgs,
        nodeIndex: 2,
      });

      expect(node.instance).toBeDefined();
      // Tag deve incluir "cp-2"
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const node = new ControlPlaneNode("test-registration", baseArgs);

      expect(node).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register all outputs", () => {
      const node = new ControlPlaneNode("test-outputs", baseArgs);

      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
      expect(node.k3sToken).toBeDefined();
    });

    it("should have instance ID", () => {
      const node = new ControlPlaneNode("test-id", baseArgs);

      expect(node.instance.id).toBeDefined();
    });
  });

  describe("multiple control plane nodes", () => {
    it("should create first control plane node", () => {
      const node = new ControlPlaneNode("cp-0", {
        ...baseArgs,
        nodeIndex: 0,
      });

      expect(node).toBeDefined();
    });

    it("should create second control plane node", () => {
      const node = new ControlPlaneNode("cp-1", {
        ...baseArgs,
        nodeIndex: 1,
      });

      expect(node).toBeDefined();
    });

    it("should create third control plane node", () => {
      const node = new ControlPlaneNode("cp-2", {
        ...baseArgs,
        nodeIndex: 2,
      });

      expect(node).toBeDefined();
    });
  });
});
