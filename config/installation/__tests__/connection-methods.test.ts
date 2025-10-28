import * as pulumi from "@pulumi/pulumi";
import {
  DirectConnectionStrategy,
  BastionConnectionStrategy,
  ConnectionStrategyFactory,
  InstallationContext,
} from "../connection-methods";

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

describe("DirectConnectionStrategy", () => {
  const mockContext: InstallationContext = {
    nodeName: "test-node",
    nodeIp: pulumi.output("203.0.113.10"),
    privateNodeIp: pulumi.output("10.0.0.10"),
    privateKey: pulumi.output("test-private-key"),
    k3sVersion: "v1.28.5+k3s1",
  };

  describe("getConnectionConfig", () => {
    it("should return direct connection config", () => {
      const strategy = new DirectConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.host).toBeDefined();
      expect(config.user).toBe("root");
      expect(config.privateKey).toBeDefined();
      expect(config.proxy).toBeUndefined();
    });

    it("should use nodeIp for host", () => {
      const strategy = new DirectConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.host).toBe(mockContext.nodeIp);
    });

    it("should include private key", () => {
      const strategy = new DirectConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.privateKey).toBe(mockContext.privateKey);
    });
  });

  describe("generateInstallScript", () => {
    it("should throw error when not implemented", () => {
      const strategy = new DirectConnectionStrategy();

      expect(() => strategy.generateInstallScript(mockContext)).toThrow(
        "Must be implemented by subclass"
      );
    });
  });
});

describe("BastionConnectionStrategy", () => {
  const mockContext: InstallationContext = {
    nodeName: "test-node",
    nodeIp: pulumi.output("203.0.113.10"),
    privateNodeIp: pulumi.output("10.0.0.10"),
    privateKey: pulumi.output("test-private-key"),
    bastionHost: pulumi.output("bastion.example.com"),
    bastionUser: "admin",
    k3sVersion: "v1.28.5+k3s1",
  };

  describe("getConnectionConfig", () => {
    it("should return bastion connection config", () => {
      const strategy = new BastionConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.host).toBeDefined();
      expect(config.user).toBe("root");
      expect(config.privateKey).toBeDefined();
      expect(config.proxy).toBeDefined();
    });

    it("should use privateNodeIp for host", () => {
      const strategy = new BastionConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.host).toBe(mockContext.privateNodeIp);
    });

    it("should configure proxy with bastion host", () => {
      const strategy = new BastionConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.proxy.host).toBe(mockContext.bastionHost);
      expect(config.proxy.user).toBe("admin");
      expect(config.proxy.privateKey).toBe(mockContext.privateKey);
    });

    it("should use default bastion user when not specified", () => {
      const strategy = new BastionConnectionStrategy();
      const contextWithoutUser = {
        ...mockContext,
        bastionUser: undefined,
      };
      const config = strategy.getConnectionConfig(contextWithoutUser);

      expect(config.proxy.user).toBe("root");
    });

    it("should throw error when bastion host not provided", () => {
      const strategy = new BastionConnectionStrategy();
      const contextWithoutBastion = {
        ...mockContext,
        bastionHost: undefined,
      };

      expect(() => strategy.getConnectionConfig(contextWithoutBastion)).toThrow(
        "Bastion host is required for BastionConnectionStrategy"
      );
    });

    it("should include private key in both host and proxy", () => {
      const strategy = new BastionConnectionStrategy();
      const config = strategy.getConnectionConfig(mockContext);

      expect(config.privateKey).toBe(mockContext.privateKey);
      expect(config.proxy.privateKey).toBe(mockContext.privateKey);
    });
  });

  describe("generateInstallScript", () => {
    it("should throw error when not implemented", () => {
      const strategy = new BastionConnectionStrategy();

      expect(() => strategy.generateInstallScript(mockContext)).toThrow(
        "Must be implemented by subclass"
      );
    });
  });
});

describe("ConnectionStrategyFactory", () => {
  describe("create", () => {
    it("should create DirectConnectionStrategy when useBastionHost is false", () => {
      const strategy = ConnectionStrategyFactory.create(false);

      expect(strategy).toBeInstanceOf(DirectConnectionStrategy);
    });

    it("should create BastionConnectionStrategy when useBastionHost is true", () => {
      const strategy = ConnectionStrategyFactory.create(true);

      expect(strategy).toBeInstanceOf(BastionConnectionStrategy);
    });
  });
});

describe("InstallationContext", () => {
  it("should support all required fields", () => {
    const context: InstallationContext = {
      nodeName: "test",
      nodeIp: pulumi.output("1.2.3.4"),
      privateNodeIp: pulumi.output("10.0.0.1"),
      privateKey: pulumi.output("key"),
      k3sVersion: "v1.28.5+k3s1",
    };

    expect(context.nodeName).toBe("test");
  });

  it("should support optional fields", () => {
    const context: InstallationContext = {
      nodeName: "test",
      nodeIp: pulumi.output("1.2.3.4"),
      privateNodeIp: pulumi.output("10.0.0.1"),
      privateKey: pulumi.output("key"),
      k3sVersion: "v1.28.5+k3s1",
      bastionHost: pulumi.output("bastion"),
      bastionUser: "admin",
      labels: { env: "prod" },
      taints: [{ key: "dedicated", value: "gpu", effect: "NoSchedule" }],
    };

    expect(context.bastionUser).toBe("admin");
    expect(context.labels).toEqual({ env: "prod" });
  });
});
