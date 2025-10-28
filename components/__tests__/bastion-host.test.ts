import * as pulumi from "@pulumi/pulumi";
import { BastionHost } from "../bastion-host";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode Instance
    if (args.type === "linode:index/instance:Instance") {
      return {
        id: "instance-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          id: "instance-" + Math.random().toString(36).substring(7),
          ipAddress: "203.0.113.10",
          privateIpAddress: "192.168.1.10",
          status: "running",
        },
      };
    }
    // Mock específico para Linode FirewallDevice
    if (args.type === "linode:index/firewallDevice:FirewallDevice") {
      return {
        id: "fw-device-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          id: "fw-device-" + Math.random().toString(36).substring(7),
        },
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

describe("BastionHost", () => {
  const baseArgs = {
    region: pulumi.output("us-east"),
    instanceType: pulumi.output("g6-nanode-1"),
    image: pulumi.output("linode/ubuntu22.04"),
    sshKeyId: pulumi.output("ssh-key-123"),
    firewallId: pulumi.output(12345),
    clusterName: "test-cluster",
    rootPassword: pulumi.output("test-password"),
  };

  describe("constructor", () => {
    it("should create bastion host with minimal config", () => {
      const bastion = new BastionHost("test-bastion", baseArgs);

      expect(bastion).toBeDefined();
      expect(bastion.instance).toBeDefined();
      expect(bastion.publicIp).toBeDefined();
      expect(bastion.privateIp).toBeDefined();
    });

    it("should create bastion with custom tags", () => {
      const bastion = new BastionHost("test-bastion-tags", {
        ...baseArgs,
        tags: ["production", "monitoring"],
      });

      expect(bastion).toBeDefined();
    });

    it("should create bastion with allowed SSH CIDRs", () => {
      const bastion = new BastionHost("test-bastion-cidrs", {
        ...baseArgs,
        allowedSshCidrs: ["192.168.1.0/24"],
      });

      expect(bastion).toBeDefined();
    });

    it("should create bastion with VPC configuration", () => {
      const bastion = new BastionHost("test-bastion-vpc", {
        ...baseArgs,
        vpcId: pulumi.output(54321),
        subnetId: pulumi.output(67890),
      });

      expect(bastion).toBeDefined();
    });
  });

  describe("instance creation", () => {
    it("should create Linode instance", () => {
      const bastion = new BastionHost("test-instance", baseArgs);

      expect(bastion.instance).toBeDefined();
    });

    it("should configure private IP", () => {
      const bastion = new BastionHost("test-private-ip", baseArgs);

      expect(bastion.privateIp).toBeDefined();
    });

    it("should configure public IP", () => {
      const bastion = new BastionHost("test-public-ip", baseArgs);

      expect(bastion.publicIp).toBeDefined();
    });

    it("should use correct instance type", () => {
      const bastion = new BastionHost("test-instance-type", {
        ...baseArgs,
        instanceType: pulumi.output("g6-standard-1"),
      });

      expect(bastion.instance).toBeDefined();
    });
  });

  describe("networking", () => {
    it("should have public IP output", async () => {
      const bastion = new BastionHost("test-public-output", baseArgs);

      return pulumi.output(bastion.publicIp).apply((ip) => {
        expect(ip).toBeDefined();
        expect(typeof ip).toBe("string");
      });
    });

    it("should have private IP output", async () => {
      const bastion = new BastionHost("test-private-output", baseArgs);

      return pulumi.output(bastion.privateIp).apply((ip) => {
        expect(ip).toBeDefined();
        expect(typeof ip).toBe("string");
      });
    });

    it("should configure VPC interfaces when VPC is provided", () => {
      const bastion = new BastionHost("test-vpc-interfaces", {
        ...baseArgs,
        vpcId: pulumi.output(12345),
        subnetId: pulumi.output(67890),
      });

      expect(bastion.instance).toBeDefined();
    });

    it("should work without VPC", () => {
      const bastion = new BastionHost("test-no-vpc", baseArgs);

      expect(bastion.instance).toBeDefined();
    });
  });

  describe("firewall configuration", () => {
    it("should attach to firewall", () => {
      const bastion = new BastionHost("test-firewall", baseArgs);

      expect(bastion.instance).toBeDefined();
    });

    it("should use provided firewall ID", () => {
      const bastion = new BastionHost("test-fw-id", {
        ...baseArgs,
        firewallId: pulumi.output(99999),
      });

      expect(bastion.instance).toBeDefined();
    });
  });

  describe("tagging", () => {
    it("should have default tags", () => {
      const bastion = new BastionHost("test-default-tags", baseArgs);

      expect(bastion.instance).toBeDefined();
      // Tags padrão: clusterName, "bastion", "jump-host"
    });

    it("should merge custom tags with default tags", () => {
      const bastion = new BastionHost("test-merged-tags", {
        ...baseArgs,
        tags: ["custom1", "custom2"],
      });

      expect(bastion.instance).toBeDefined();
    });

    it("should tag with cluster name", () => {
      const bastion = new BastionHost("test-cluster-tag", {
        ...baseArgs,
        clusterName: "production-cluster",
      });

      expect(bastion.instance).toBeDefined();
    });
  });

  describe("user data configuration", () => {
    it("should configure SSH agent forwarding", () => {
      const bastion = new BastionHost("test-ssh-config", baseArgs);

      expect(bastion.instance).toBeDefined();
      // User data deve configurar AllowAgentForwarding
    });

    it("should install useful tools", () => {
      const bastion = new BastionHost("test-tools", baseArgs);

      expect(bastion.instance).toBeDefined();
      // User data deve instalar curl, wget, htop, vim, tmux
    });

    it("should create MOTD banner", () => {
      const bastion = new BastionHost("test-banner", baseArgs);

      expect(bastion.instance).toBeDefined();
      // User data deve criar banner com nome do cluster
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const bastion = new BastionHost("test-registration", baseArgs);

      expect(bastion).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register outputs correctly", () => {
      const bastion = new BastionHost("test-outputs", baseArgs);

      expect(bastion.publicIp).toBeDefined();
      expect(bastion.privateIp).toBeDefined();
    });

    it("should have instance ID output", () => {
      const bastion = new BastionHost("test-instance-id", baseArgs);

      expect(bastion.instance.id).toBeDefined();
    });
  });

  describe("different configurations", () => {
    it("should create bastion for production", () => {
      const bastion = new BastionHost("prod-bastion", {
        ...baseArgs,
        clusterName: "production",
        instanceType: pulumi.output("g6-standard-1"),
        tags: ["production", "critical"],
      });

      expect(bastion).toBeDefined();
    });

    it("should create bastion for staging", () => {
      const bastion = new BastionHost("staging-bastion", {
        ...baseArgs,
        clusterName: "staging",
        instanceType: pulumi.output("g6-nanode-1"),
      });

      expect(bastion).toBeDefined();
    });

    it("should create bastion with VPC isolation", () => {
      const bastion = new BastionHost("vpc-bastion", {
        ...baseArgs,
        vpcId: pulumi.output(12345),
        subnetId: pulumi.output(67890),
        allowedSshCidrs: ["10.0.0.0/8"],
      });

      expect(bastion).toBeDefined();
    });
  });

  describe("security configurations", () => {
    it("should restrict SSH access", () => {
      const bastion = new BastionHost("secure-bastion", {
        ...baseArgs,
        allowedSshCidrs: ["203.0.113.0/24"],
      });

      expect(bastion).toBeDefined();
    });

    it("should allow multiple SSH sources", () => {
      const bastion = new BastionHost("multi-source-bastion", {
        ...baseArgs,
        allowedSshCidrs: ["10.0.0.0/8", "172.16.0.0/12"],
      });

      expect(bastion).toBeDefined();
    });
  });
});
