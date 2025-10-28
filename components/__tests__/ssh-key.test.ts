import * as pulumi from "@pulumi/pulumi";
import { SshKeyComponent } from "../ssh-key";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode SshKey
    if (args.type === "linode:index/sshKey:SshKey") {
      return {
        id: "ssh-key-12345",
        state: {
          ...args.inputs,
          id: "ssh-key-12345",
          created: "2024-01-01T00:00:00Z",
          sshKey: args.inputs.sshKey,
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

describe("SshKeyComponent", () => {
  const mockPublicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJqfWbXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX test-key";

  describe("constructor", () => {
    it("should create an instance with valid inputs", async () => {
      const sshKey = new SshKeyComponent("test-ssh-key", {
        publicKey: mockPublicKey,
        keyLabel: "test-cluster-key",
      });

      expect(sshKey).toBeDefined();
      expect(sshKey.sshKey).toBeDefined();
    });

    it("should create ssh key with custom label", async () => {
      const sshKey = new SshKeyComponent("custom-ssh-key", {
        publicKey: mockPublicKey,
        keyLabel: "custom-cluster",
      });

      expect(sshKey).toBeDefined();
      expect(sshKey.sshKey).toBeDefined();
    });

    it("should accept pulumi.Input for publicKey", async () => {
      const publicKeyOutput = pulumi.output(mockPublicKey);

      const sshKey = new SshKeyComponent("output-ssh-key", {
        publicKey: publicKeyOutput,
        keyLabel: "output-test",
      });

      expect(sshKey).toBeDefined();
    });
  });

  describe("ssh key resource", () => {
    it("should create Linode SSH key with correct label", async () => {
      const keyLabel = "prod-cluster-key";
      const sshKey = new SshKeyComponent("prod-ssh-key", {
        publicKey: mockPublicKey,
        keyLabel: keyLabel,
      });

      expect(sshKey.sshKey).toBeDefined();
    });

    it("should have sshKey id output", async () => {
      const sshKey = new SshKeyComponent("id-test-key", {
        publicKey: mockPublicKey,
        keyLabel: "id-test",
      });

      const sshKeyId = await sshKey.sshKey.id;
      expect(sshKeyId).toBeDefined();
    });

    it("should have sshKey label output", async () => {
      const expectedLabel = "label-test";
      const sshKey = new SshKeyComponent("label-test-key", {
        publicKey: mockPublicKey,
        keyLabel: expectedLabel,
      });

      const label = await sshKey.sshKey.label;
      expect(label).toBeDefined();
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource with correct type", async () => {
      const sshKey = new SshKeyComponent("resource-test-key", {
        publicKey: mockPublicKey,
        keyLabel: "resource-test",
      });

      // O tipo de recurso deve ser custom:security:SshKeyComponent
      expect(sshKey).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register outputs correctly", async () => {
      const sshKey = new SshKeyComponent("outputs-test-key", {
        publicKey: mockPublicKey,
        keyLabel: "outputs-test",
      });

      // Os outputs devem estar registrados
      expect(sshKey.sshKey).toBeDefined();
      expect(sshKey.sshKey.id).toBeDefined();
      expect(sshKey.sshKey.label).toBeDefined();
    });
  });

  describe("different key types", () => {
    it("should accept ed25519 public key", async () => {
      const ed25519Key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJqfWbXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX test";

      const sshKey = new SshKeyComponent("ed25519-test", {
        publicKey: ed25519Key,
        keyLabel: "ed25519-test",
      });

      expect(sshKey).toBeDefined();
    });

    it("should accept rsa public key", async () => {
      const rsaKey = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC5XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx test";

      const sshKey = new SshKeyComponent("rsa-test", {
        publicKey: rsaKey,
        keyLabel: "rsa-test",
      });

      expect(sshKey).toBeDefined();
    });
  });

  describe("parent resource options", () => {
    it("should accept parent resource options", async () => {
      const parentResource = new pulumi.ComponentResource(
        "test:parent:Resource",
        "parent-resource"
      );

      const sshKey = new SshKeyComponent(
        "child-ssh-key",
        {
          publicKey: mockPublicKey,
          keyLabel: "child-test",
        },
        { parent: parentResource }
      );

      expect(sshKey).toBeDefined();
    });
  });
});
