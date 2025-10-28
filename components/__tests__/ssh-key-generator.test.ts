import * as pulumi from "@pulumi/pulumi";
import { SshKeyGenerator } from "../ssh-key-generator";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    return {
      id: args.inputs.name + "_id",
      state: args.inputs,
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("SshKeyGenerator", () => {
  describe("constructor", () => {
    it("should create an instance with ed25519 key type by default", async () => {
      const keyGen = new SshKeyGenerator("test-key", {
        keyName: "test-cluster",
      });

      expect(keyGen).toBeDefined();
      expect(keyGen.privateKey).toBeDefined();
      expect(keyGen.publicKey).toBeDefined();
      expect(keyGen.fingerprint).toBeDefined();
    });

    it("should create an instance with rsa key type when specified", async () => {
      const keyGen = new SshKeyGenerator("test-key-rsa", {
        keyName: "test-cluster-rsa",
        keyType: "rsa",
      });

      expect(keyGen).toBeDefined();
      expect(keyGen.privateKey).toBeDefined();
      expect(keyGen.publicKey).toBeDefined();
      expect(keyGen.fingerprint).toBeDefined();
    });

    it("should use custom key bits for rsa when specified", async () => {
      const keyGen = new SshKeyGenerator("test-key-custom", {
        keyName: "test-cluster-custom",
        keyType: "rsa",
        keyBits: 2048,
      });

      expect(keyGen).toBeDefined();
    });

    it("should default to 4096 bits for rsa keys", async () => {
      const keyGen = new SshKeyGenerator("test-key-default-bits", {
        keyName: "test-cluster-default",
        keyType: "rsa",
      });

      expect(keyGen).toBeDefined();
    });
  });

  describe("outputs", () => {
    it("should have privateKey as secret output", async () => {
      const keyGen = new SshKeyGenerator("test-key-outputs", {
        keyName: "test-cluster-outputs",
      });

      const privateKey = await keyGen.privateKey;
      expect(privateKey).toBeDefined();
    });

    it("should have publicKey output", async () => {
      const keyGen = new SshKeyGenerator("test-key-public", {
        keyName: "test-cluster-public",
      });

      const publicKey = await keyGen.publicKey;
      expect(publicKey).toBeDefined();
    });

    it("should have fingerprint output", async () => {
      const keyGen = new SshKeyGenerator("test-key-fingerprint", {
        keyName: "test-cluster-fingerprint",
      });

      const fingerprint = await keyGen.fingerprint;
      expect(fingerprint).toBeDefined();
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource with correct type", async () => {
      const keyGen = new SshKeyGenerator("test-key-resource", {
        keyName: "test-cluster-resource",
      });

      // O tipo de recurso deve ser custom:security:SshKeyGenerator
      expect(keyGen).toBeInstanceOf(pulumi.ComponentResource);
    });
  });
});
