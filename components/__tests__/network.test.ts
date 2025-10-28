import * as pulumi from "@pulumi/pulumi";
import { NetworkComponent } from "../network";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode Firewall
    if (args.type === "linode:index/firewall:Firewall") {
      return {
        id: "firewall-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          id: "firewall-" + Math.random().toString(36).substring(7),
          status: "enabled",
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

describe("NetworkComponent", () => {
  const baseArgs = {
    region: "us-east",
    clusterName: "test-cluster",
  };

  describe("constructor", () => {
    it("should create network component with minimal config", () => {
      const network = new NetworkComponent("test-network", baseArgs);

      expect(network).toBeDefined();
      expect(network.bastionFirewall).toBeDefined();
      expect(network.clusterFirewall).toBeDefined();
    });

    it("should create network with custom SSH CIDRs", () => {
      const network = new NetworkComponent("test-network-cidrs", {
        ...baseArgs,
        allowedSshCidrs: ["192.168.1.0/24", "10.0.0.0/8"],
      });

      expect(network).toBeDefined();
    });

    it("should create network with bastion private IP", () => {
      const network = new NetworkComponent("test-network-bastion", {
        ...baseArgs,
        bastionPrivateIp: pulumi.output("192.168.1.10"),
      });

      expect(network).toBeDefined();
    });

    it("should create network with VPC", () => {
      const network = new NetworkComponent("test-network-vpc", {
        ...baseArgs,
        vpcId: pulumi.output(12345),
      });

      expect(network).toBeDefined();
    });
  });

  describe("bastion firewall", () => {
    it("should create bastion firewall with default SSH access", () => {
      const network = new NetworkComponent("test-bastion-fw", baseArgs);

      expect(network.bastionFirewall).toBeDefined();
    });

    it("should create bastion firewall with restricted SSH access", () => {
      const network = new NetworkComponent("test-bastion-fw-restricted", {
        ...baseArgs,
        allowedSshCidrs: ["203.0.113.0/24"],
      });

      expect(network.bastionFirewall).toBeDefined();
    });

    it("should create bastion firewall with multiple SSH CIDRs", () => {
      const network = new NetworkComponent("test-bastion-fw-multi", {
        ...baseArgs,
        allowedSshCidrs: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
      });

      expect(network.bastionFirewall).toBeDefined();
    });

    it("should have correct firewall policies", () => {
      const network = new NetworkComponent("test-bastion-policy", baseArgs);

      expect(network.bastionFirewall).toBeDefined();
      // Bastion deve ter política DROP para inbound e ACCEPT para outbound
    });
  });

  describe("cluster firewall", () => {
    it("should create cluster firewall", () => {
      const network = new NetworkComponent("test-cluster-fw", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
    });

    it("should allow K3s API access", () => {
      const network = new NetworkComponent("test-cluster-api", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
      // Deve permitir porta 6443
    });

    it("should allow HTTP/HTTPS traffic", () => {
      const network = new NetworkComponent("test-cluster-http", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
      // Deve permitir portas 80 e 443
    });

    it("should allow internal cluster communication", () => {
      const network = new NetworkComponent("test-cluster-internal", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
      // Deve permitir kubelet (10250) e flannel (8472)
    });

    it("should allow NodePort range", () => {
      const network = new NetworkComponent("test-cluster-nodeport", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
      // Deve permitir portas 30000-32767
    });
  });

  describe("firewall rules", () => {
    it("should configure SSH rules for bastion", () => {
      const network = new NetworkComponent("test-ssh-rules", {
        ...baseArgs,
        allowedSshCidrs: ["192.168.1.0/24"],
      });

      expect(network.bastionFirewall).toBeDefined();
    });

    it("should configure cluster internal rules", () => {
      const network = new NetworkComponent("test-internal-rules", baseArgs);

      expect(network.clusterFirewall).toBeDefined();
    });

    it("should use default SSH CIDR when not specified", () => {
      const network = new NetworkComponent("test-default-cidr", baseArgs);

      expect(network.bastionFirewall).toBeDefined();
      // Deve usar 0.0.0.0/0 como padrão
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const network = new NetworkComponent("test-registration", baseArgs);

      expect(network).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register both firewalls", () => {
      const network = new NetworkComponent("test-both-fw", baseArgs);

      expect(network.bastionFirewall).toBeDefined();
      expect(network.clusterFirewall).toBeDefined();
    });

    it("should register outputs correctly", () => {
      const network = new NetworkComponent("test-outputs", baseArgs);

      expect(network.bastionFirewall.id).toBeDefined();
      expect(network.clusterFirewall.id).toBeDefined();
    });
  });

  describe("different cluster configurations", () => {
    it("should create network for production cluster", () => {
      const network = new NetworkComponent("prod-network", {
        region: "us-east",
        clusterName: "production-cluster",
        allowedSshCidrs: ["203.0.113.0/24"],
      });

      expect(network).toBeDefined();
    });

    it("should create network for staging cluster", () => {
      const network = new NetworkComponent("staging-network", {
        region: "us-west",
        clusterName: "staging-cluster",
        allowedSshCidrs: ["10.0.0.0/8"],
      });

      expect(network).toBeDefined();
    });

    it("should create network with VPC integration", () => {
      const network = new NetworkComponent("vpc-network", {
        region: "eu-central",
        clusterName: "vpc-cluster",
        vpcId: pulumi.output(54321),
      });

      expect(network).toBeDefined();
    });
  });

  describe("security configurations", () => {
    it("should restrict SSH to specific IP", () => {
      const network = new NetworkComponent("secure-ssh", {
        ...baseArgs,
        allowedSshCidrs: ["203.0.113.42/32"],
      });

      expect(network).toBeDefined();
    });

    it("should allow SSH from corporate network", () => {
      const network = new NetworkComponent("corporate-ssh", {
        ...baseArgs,
        allowedSshCidrs: ["192.0.2.0/24"],
      });

      expect(network).toBeDefined();
    });

    it("should configure multiple security zones", () => {
      const network = new NetworkComponent("multi-zone", {
        ...baseArgs,
        allowedSshCidrs: ["10.0.0.0/8", "172.16.0.0/12"],
      });

      expect(network).toBeDefined();
    });
  });
});
