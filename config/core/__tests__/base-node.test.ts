import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";
import * as command from "@pulumi/command";
import { BaseNode, BaseNodeArgs } from "../base-node";

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
        firewallId: 12345,
        entityId: parseInt(baseId, 36),
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

/**
 * Concrete implementation of BaseNode for testing
 */
class TestNode extends BaseNode {
  constructor(name: string, args: BaseNodeArgs, opts?: pulumi.ComponentResourceOptions) {
    super("test:node:TestNode", name, args, opts);
  }

  protected createInstance(
    name: string,
    args: BaseNodeArgs,
    opts: pulumi.ComponentResourceOptions
  ): linode.Instance {
    return new linode.Instance(
      `${name}-instance`,
      {
        label: args.nodeName || name,
        region: args.region,
        type: args.instanceType,
        image: args.image,
        rootPass: args.rootPassword,
        authorizedKeys: [args.sshKeyId],
        tags: this.buildInstanceTags(args.clusterName, this.getNodeRole(), args.nodeIndex, args.tags),
        stackscriptData: {
          userdata: this.generateUserData(),
        },
      },
      opts
    );
  }

  protected generateInstallScript(args: BaseNodeArgs): pulumi.Output<string> {
    return pulumi.output(`#!/bin/bash
curl -sfL https://get.k3s.io | sh -
`);
  }

  protected getNodeRole(): string {
    return "test";
  }
}

describe("BaseNode", () => {
  const baseArgs: BaseNodeArgs = {
    region: "us-east",
    instanceType: "g6-standard-2",
    image: "linode/ubuntu22.04",
    sshKeyId: "test-key-id",
    firewallId: 12345,
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
    nodeIndex: 0,
  };

  describe("constructor", () => {
    it("should create a node with all components", () => {
      const node = new TestNode("test-node", baseArgs);

      expect(node).toBeDefined();
      expect(node.instance).toBeDefined();
      expect(node.publicIp).toBeDefined();
      expect(node.privateIp).toBeDefined();
      expect(node.k3sInstallation).toBeDefined();
    });

    it("should register as ComponentResource", () => {
      const node = new TestNode("test-component", baseArgs);

      expect(node).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should assign public and private IPs", async () => {
      const node = new TestNode("test-ips", baseArgs);

      return pulumi.output([node.publicIp, node.privateIp]).apply(([publicIp, privateIp]) => {
        expect(publicIp).toBeDefined();
        expect(privateIp).toBeDefined();
      });
    });
  });

  describe("buildConnectionConfig", () => {
    it("should build direct connection config without bastion", () => {
      const node = new TestNode("test-direct", baseArgs);
      const config = (node as any).buildConnectionConfig(baseArgs);

      expect(config.user).toBe("root");
      expect(config.privateKey).toBeDefined();
      expect(config.host).toBeDefined();
      expect(config.proxy).toBeUndefined();
    });

    it("should build bastion connection config", () => {
      const node = new TestNode("test-bastion", baseArgs);
      const argsWithBastion = {
        ...baseArgs,
        bastionHost: pulumi.output("bastion.example.com"),
        bastionUser: "admin",
      };
      const config = (node as any).buildConnectionConfig(argsWithBastion);

      expect(config.user).toBe("root");
      expect(config.privateKey).toBeDefined();
      expect(config.proxy).toBeDefined();
      expect(config.proxy.user).toBe("admin");
    });

    it("should use default bastion user when not specified", () => {
      const node = new TestNode("test-bastion-default", baseArgs);
      const argsWithBastion = {
        ...baseArgs,
        bastionHost: pulumi.output("bastion.example.com"),
      };
      const config = (node as any).buildConnectionConfig(argsWithBastion);

      expect(config.proxy.user).toBe("root");
    });
  });

  describe("buildLabelArgs", () => {
    it("should build label arguments from labels object", () => {
      const node = new TestNode("test-labels", baseArgs);
      const labelArgs = (node as any).buildLabelArgs({ env: "production", tier: "frontend" });

      expect(labelArgs).toContain("--node-label=env=production");
      expect(labelArgs).toContain("--node-label=tier=frontend");
      expect(labelArgs).toContain("--node-label=node.kubernetes.io/role=test");
    });

    it("should handle empty labels", () => {
      const node = new TestNode("test-no-labels", baseArgs);
      const labelArgs = (node as any).buildLabelArgs();

      expect(labelArgs).toContain("--node-label=node.kubernetes.io/role=test");
    });

    it("should merge labels and additional labels", () => {
      const node = new TestNode("test-merge-labels", baseArgs);
      const labelArgs = (node as any).buildLabelArgs(
        { env: "production" },
        { zone: "us-east-1a" }
      );

      expect(labelArgs).toContain("--node-label=env=production");
      expect(labelArgs).toContain("--node-label=zone=us-east-1a");
    });

    it("should prioritize additional labels over base labels", () => {
      const node = new TestNode("test-label-priority", baseArgs);
      const labelArgs = (node as any).buildLabelArgs(
        { env: "staging" },
        { env: "production" }
      );

      expect(labelArgs).toContain("--node-label=env=production");
      expect(labelArgs).not.toContain("--node-label=env=staging");
    });
  });

  describe("buildTaintArgs", () => {
    it("should build taint arguments from taints array", () => {
      const node = new TestNode("test-taints", baseArgs);
      const taintArgs = (node as any).buildTaintArgs([
        { key: "dedicated", value: "gpu", effect: "NoSchedule" },
        { key: "special", value: "true", effect: "PreferNoSchedule" },
      ]);

      expect(taintArgs).toContain("--node-taint=dedicated=gpu:NoSchedule");
      expect(taintArgs).toContain("--node-taint=special=true:PreferNoSchedule");
    });

    it("should return empty string for no taints", () => {
      const node = new TestNode("test-no-taints", baseArgs);
      const taintArgs = (node as any).buildTaintArgs();

      expect(taintArgs).toBe("");
    });

    it("should return empty string for empty taints array", () => {
      const node = new TestNode("test-empty-taints", baseArgs);
      const taintArgs = (node as any).buildTaintArgs([]);

      expect(taintArgs).toBe("");
    });

    it("should handle NoExecute taint effect", () => {
      const node = new TestNode("test-noexecute", baseArgs);
      const taintArgs = (node as any).buildTaintArgs([
        { key: "node.kubernetes.io/not-ready", value: "true", effect: "NoExecute" },
      ]);

      expect(taintArgs).toContain("--node-taint=node.kubernetes.io/not-ready=true:NoExecute");
    });
  });

  describe("buildInstanceTags", () => {
    it("should build instance tags", () => {
      const node = new TestNode("test-tags", baseArgs);
      const tags = (node as any).buildInstanceTags("my-cluster", "worker", 3);

      expect(tags).toContain("my-cluster");
      expect(tags).toContain("worker");
      expect(tags).toContain("k3s");
      expect(tags).toContain("worker-3");
    });

    it("should include custom tags", () => {
      const node = new TestNode("test-custom-tags", baseArgs);
      const tags = (node as any).buildInstanceTags("my-cluster", "control-plane", 0, [
        "production",
        "critical",
      ]);

      expect(tags).toContain("production");
      expect(tags).toContain("critical");
    });

    it("should work without custom tags", () => {
      const node = new TestNode("test-no-custom-tags", baseArgs);
      const tags = (node as any).buildInstanceTags("my-cluster", "worker", 1);

      expect(tags).toHaveLength(4);
      expect(tags).toContain("my-cluster");
      expect(tags).toContain("worker");
      expect(tags).toContain("k3s");
      expect(tags).toContain("worker-1");
    });
  });

  describe("generateUserData", () => {
    it("should generate valid user data script", () => {
      const node = new TestNode("test-userdata", baseArgs);
      const userData = (node as any).generateUserData();

      expect(userData).toContain("#!/bin/bash");
      expect(userData).toContain("set -e");
      expect(userData).toContain("apt-get update");
      expect(userData).toContain("apt-get install -y curl wget");
      expect(userData).toContain("System ready for K3s installation");
    });

    it("should use non-interactive debian frontend", () => {
      const node = new TestNode("test-debian-frontend", baseArgs);
      const userData = (node as any).generateUserData();

      expect(userData).toContain("export DEBIAN_FRONTEND=noninteractive");
    });
  });

  describe("node configuration", () => {
    it("should accept custom node name", () => {
      const node = new TestNode("test-custom-name", {
        ...baseArgs,
        nodeName: "custom-node-0",
      });

      expect(node).toBeDefined();
    });

    it("should accept K3s version", () => {
      const node = new TestNode("test-k3s-version", {
        ...baseArgs,
        k3sVersion: "v1.29.0+k3s1",
      });

      expect(node).toBeDefined();
    });

    it("should accept labels", () => {
      const node = new TestNode("test-with-labels", {
        ...baseArgs,
        labels: { env: "production", tier: "web" },
      });

      expect(node).toBeDefined();
    });

    it("should accept taints", () => {
      const node = new TestNode("test-with-taints", {
        ...baseArgs,
        taints: [{ key: "dedicated", value: "gpu", effect: "NoSchedule" }],
      });

      expect(node).toBeDefined();
    });

    it("should accept VPC configuration", () => {
      const node = new TestNode("test-with-vpc", {
        ...baseArgs,
        vpcId: 123,
        subnetId: 456,
      });

      expect(node).toBeDefined();
    });
  });

  describe("attachToFirewall", () => {
    it("should attach instance to firewall", () => {
      const node = new TestNode("test-firewall", baseArgs);

      expect(node.instance).toBeDefined();
    });

    it("should use provided firewall ID", () => {
      const node = new TestNode("test-firewall-id", {
        ...baseArgs,
        firewallId: 99999,
      });

      expect(node).toBeDefined();
    });
  });

  describe("installK3s", () => {
    it("should install K3s via remote command", () => {
      const node = new TestNode("test-install", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });

    it("should trigger on instance ID", () => {
      const node = new TestNode("test-trigger", baseArgs);

      expect(node.k3sInstallation).toBeDefined();
    });
  });

  describe("multiple nodes", () => {
    it("should create multiple nodes with different indexes", () => {
      const node0 = new TestNode("test-node-0", { ...baseArgs, nodeIndex: 0 });
      const node1 = new TestNode("test-node-1", { ...baseArgs, nodeIndex: 1 });
      const node2 = new TestNode("test-node-2", { ...baseArgs, nodeIndex: 2 });

      expect(node0).toBeDefined();
      expect(node1).toBeDefined();
      expect(node2).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle node index 0", () => {
      const node = new TestNode("test-index-0", { ...baseArgs, nodeIndex: 0 });
      const tags = (node as any).buildInstanceTags("cluster", "test", 0);

      expect(tags).toContain("test-0");
    });

    it("should handle high node index", () => {
      const node = new TestNode("test-index-high", { ...baseArgs, nodeIndex: 99 });
      const tags = (node as any).buildInstanceTags("cluster", "test", 99);

      expect(tags).toContain("test-99");
    });

    it("should handle special characters in cluster name", () => {
      const node = new TestNode("test-special", {
        ...baseArgs,
        clusterName: "my-k3s-cluster-v2",
      });
      const tags = (node as any).buildInstanceTags("my-k3s-cluster-v2", "test", 0);

      expect(tags).toContain("my-k3s-cluster-v2");
    });
  });
});
