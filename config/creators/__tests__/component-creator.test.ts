import * as pulumi from "@pulumi/pulumi";
import { ComponentFactory } from "../component-creator";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    const baseId = Math.random().toString(36).substring(7);

    const mocks: { [key: string]: any } = {
      "linode:index/vpc:Vpc": {
        id: `vpc-${baseId}`,
      },
      "linode:index/vpcSubnet:VpcSubnet": {
        id: `subnet-${baseId}`,
      },
      "linode:index/firewall:Firewall": {
        id: `firewall-${baseId}`,
      },
      "linode:index/sshKey:SshKey": {
        id: `ssh-key-${baseId}`,
      },
      "linode:index/instance:Instance": {
        id: `instance-${baseId}`,
        ipAddress: "203.0.113.100",
        privateIpAddress: "192.168.1.100",
      },
      "command:local:Command": {
        stdout: "ssh-ed25519 AAAA...\n-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----",
      },
      "random:index/randomPassword:RandomPassword": {
        result: "test-token-" + baseId,
      },
      "command:remote:Command": {
        stdout: "success",
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

describe("ComponentFactory", () => {
  describe("createVpc", () => {
    it("should create VPC component", () => {
      const vpc = ComponentFactory.createVpc(
        "test-vpc",
        "us-east",
        "test-cluster"
      );

      expect(vpc).toBeDefined();
      expect(vpc.vpc).toBeDefined();
      expect(vpc.subnet).toBeDefined();
    });

    it("should create VPC with custom labels", () => {
      const vpc = ComponentFactory.createVpc(
        "test-vpc-custom",
        "us-east",
        "test-cluster",
        "my-vpc",
        "Test VPC",
        "my-subnet",
        "10.1.0.0/24"
      );

      expect(vpc).toBeDefined();
    });
  });

  describe("createNetwork", () => {
    it("should create Network component", () => {
      const network = ComponentFactory.createNetwork(
        "test-network",
        "us-east",
        "test-cluster"
      );

      expect(network).toBeDefined();
      expect(network.bastionFirewall).toBeDefined();
      expect(network.clusterFirewall).toBeDefined();
    });

    it("should create Network with custom SSH CIDRs", () => {
      const network = ComponentFactory.createNetwork(
        "test-network-custom",
        "us-east",
        "test-cluster",
        ["1.2.3.4/32", "5.6.7.8/32"]
      );

      expect(network).toBeDefined();
    });

    it("should create Network with VPC", () => {
      const network = ComponentFactory.createNetwork(
        "test-network-vpc",
        "us-east",
        "test-cluster",
        undefined,
        pulumi.output(12345)
      );

      expect(network).toBeDefined();
    });
  });

  describe("createSshKeyGenerator", () => {
    it("should create SSH Key Generator with default type", () => {
      const generator = ComponentFactory.createSshKeyGenerator(
        "test-generator",
        "test-key"
      );

      expect(generator).toBeDefined();
      expect(generator.publicKey).toBeDefined();
      expect(generator.privateKey).toBeDefined();
    });

    it("should create SSH Key Generator with ed25519", () => {
      const generator = ComponentFactory.createSshKeyGenerator(
        "test-generator-ed25519",
        "test-key",
        "ed25519"
      );

      expect(generator).toBeDefined();
    });

    it("should create SSH Key Generator with RSA", () => {
      const generator = ComponentFactory.createSshKeyGenerator(
        "test-generator-rsa",
        "test-key",
        "rsa",
        4096
      );

      expect(generator).toBeDefined();
    });
  });

  describe("createSshKey", () => {
    it("should create SSH Key component", () => {
      const sshKey = ComponentFactory.createSshKey(
        "test-ssh-key",
        "ssh-ed25519 AAAA...",
        "test-key-label"
      );

      expect(sshKey).toBeDefined();
      expect(sshKey.sshKey).toBeDefined();
    });

    it("should create SSH Key with pulumi output", () => {
      const sshKey = ComponentFactory.createSshKey(
        "test-ssh-key-output",
        pulumi.output("ssh-ed25519 AAAA..."),
        "test-key-label"
      );

      expect(sshKey).toBeDefined();
    });
  });

  describe("createK3sTokenGenerator", () => {
    it("should create K3s Token Generator", () => {
      const tokenGen = ComponentFactory.createK3sTokenGenerator(
        "test-token-gen",
        "test-cluster"
      );

      expect(tokenGen).toBeDefined();
      expect(tokenGen.token).toBeDefined();
    });
  });

  describe("createBastionHost", () => {
    it("should create Bastion Host", () => {
      const bastion = ComponentFactory.createBastionHost(
        "test-bastion",
        "us-east",
        "g6-nanode-1",
        "linode/ubuntu22.04",
        "test-key-id",
        pulumi.output(12345),
        "test-cluster",
        pulumi.output("test-password")
      );

      expect(bastion).toBeDefined();
      expect(bastion.instance).toBeDefined();
    });

    it("should create Bastion Host with tags", () => {
      const bastion = ComponentFactory.createBastionHost(
        "test-bastion-tags",
        "us-east",
        "g6-nanode-1",
        "linode/ubuntu22.04",
        "test-key-id",
        pulumi.output(12345),
        "test-cluster",
        pulumi.output("test-password"),
        ["production", "bastion"]
      );

      expect(bastion).toBeDefined();
    });

    it("should create Bastion Host with VPC", () => {
      const bastion = ComponentFactory.createBastionHost(
        "test-bastion-vpc",
        "us-east",
        "g6-nanode-1",
        "linode/ubuntu22.04",
        "test-key-id",
        pulumi.output(12345),
        "test-cluster",
        pulumi.output("test-password"),
        undefined,
        undefined,
        pulumi.output(999),
        pulumi.output(888)
      );

      expect(bastion).toBeDefined();
    });
  });

  describe("createK3sValidation", () => {
    it("should create K3s Validation", () => {
      const validation = ComponentFactory.createK3sValidation(
        "test-validation",
        "test-cluster",
        pulumi.output("203.0.113.10"),
        pulumi.output("private-key"),
        3
      );

      expect(validation).toBeDefined();
      expect(validation.validationResult).toBeDefined();
    });

    it("should create K3s Validation with bastion", () => {
      const validation = ComponentFactory.createK3sValidation(
        "test-validation-bastion",
        "test-cluster",
        pulumi.output("203.0.113.10"),
        pulumi.output("private-key"),
        5,
        pulumi.output("bastion.example.com"),
        "admin"
      );

      expect(validation).toBeDefined();
    });
  });

  describe("createArgoCDInstallation", () => {
    it("should create ArgoCD Installation when enabled", () => {
      const argocd = ComponentFactory.createArgoCDInstallation(
        "test-argocd",
        "test-cluster",
        pulumi.output("203.0.113.10"),
        pulumi.output("private-key"),
        true,
        "stable",
        "https://github.com/user/repo",
        "apps/*",
        "main"
      );

      expect(argocd).toBeDefined();
    });

    it("should create ArgoCD Installation with bastion", () => {
      const argocd = ComponentFactory.createArgoCDInstallation(
        "test-argocd-bastion",
        "test-cluster",
        pulumi.output("203.0.113.10"),
        pulumi.output("private-key"),
        true,
        "stable",
        "https://github.com/user/repo",
        "apps/*",
        "main",
        pulumi.output("bastion.example.com"),
        "admin"
      );

      expect(argocd).toBeDefined();
    });

    it("should create ArgoCD Installation when disabled", () => {
      const argocd = ComponentFactory.createArgoCDInstallation(
        "test-argocd-disabled",
        "test-cluster",
        pulumi.output("203.0.113.10"),
        pulumi.output("private-key"),
        false
      );

      expect(argocd).toBeDefined();
    });
  });
});
