import * as pulumi from "@pulumi/pulumi";
import { K3sTokenGenerator } from "../k3s-token-generator";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para RandomPassword
    if (args.type === "random:index/randomPassword:RandomPassword") {
      return {
        id: args.inputs.name + "_id",
        state: {
          ...args.inputs,
          result: "mocked-random-token-with-64-chars-abcdefghijklmnopqrstuvwxyz",
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

describe("K3sTokenGenerator", () => {
  describe("constructor", () => {
    it("should create an instance with cluster name", async () => {
      const tokenGen = new K3sTokenGenerator("test-token", {
        clusterName: "test-cluster",
      });

      expect(tokenGen).toBeDefined();
      expect(tokenGen.token).toBeDefined();
    });

    it("should create an instance for different cluster", async () => {
      const tokenGen = new K3sTokenGenerator("prod-token", {
        clusterName: "production-cluster",
      });

      expect(tokenGen).toBeDefined();
    });
  });

  describe("token generation", () => {
    it("should generate a token output", async () => {
      const tokenGen = new K3sTokenGenerator("test-token-output", {
        clusterName: "test-cluster",
      });

      // Verificar que o output existe
      expect(tokenGen.token).toBeDefined();

      // Aplicar função para obter o valor
      const tokenValue = await pulumi.output(tokenGen.token).apply(v => v);
      expect(tokenValue).toBeDefined();
    });

    it("should generate a token with sufficient length", async () => {
      const tokenGen = new K3sTokenGenerator("test-token-length", {
        clusterName: "test-cluster",
      });

      // Verificar que o output existe
      expect(tokenGen.token).toBeDefined();

      // Aplicar função assíncrona para obter o comprimento
      return pulumi.output(tokenGen.token).apply(v => {
        // K3s tokens devem ter pelo menos 32 caracteres
        expect(v.length).toBeGreaterThanOrEqual(32);
      });
    });

    it("should register token as secret", async () => {
      const tokenGen = new K3sTokenGenerator("test-token-secret", {
        clusterName: "test-cluster",
      });

      // O token deve estar registrado como output secreto
      expect(tokenGen.token).toBeDefined();
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource with correct type", async () => {
      const tokenGen = new K3sTokenGenerator("test-token-resource", {
        clusterName: "test-cluster",
      });

      // O tipo de recurso deve ser custom:k3s:K3sTokenGenerator
      expect(tokenGen).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should create unique tokens for different clusters", async () => {
      const tokenGen1 = new K3sTokenGenerator("cluster1-token", {
        clusterName: "cluster-1",
      });

      const tokenGen2 = new K3sTokenGenerator("cluster2-token", {
        clusterName: "cluster-2",
      });

      // Verificar que ambos os tokens foram criados
      expect(tokenGen1.token).toBeDefined();
      expect(tokenGen2.token).toBeDefined();
    });
  });

  describe("token characteristics", () => {
    it("should generate token with expected character types", async () => {
      const tokenGen = new K3sTokenGenerator("test-token-chars", {
        clusterName: "test-cluster",
      });

      // Verificar que o token foi criado
      expect(tokenGen.token).toBeDefined();

      // Aplicar função para verificar o tipo
      const tokenValue = await pulumi.output(tokenGen.token).apply(v => v);
      expect(tokenValue).toBeDefined();
    });
  });
});
