import { ConfigurationManager } from "../config-manager";
import { ClusterConfig } from "../../types";

// Mock do loader
jest.mock("../../loader", () => ({
  loadClusterConfig: jest.fn(() => ({
    name: "test-cluster",
    region: "us-east",
    image: "linode/ubuntu22.04",
    rootPassword: "test-password",
    controlPlane: {
      count: 1,
      instanceType: "g6-standard-2",
    },
    workers: {
      count: 2,
      instanceType: "g6-standard-2",
    },
    k3s: {
      version: "v1.28.5+k3s1",
      channel: "stable",
    },
    ssh: {
      autoGenerate: true,
      keyType: "ed25519",
    },
  })),
}));

describe("ConfigurationManager", () => {
  let manager: ConfigurationManager;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    ConfigurationManager.reset();
    manager = ConfigurationManager.getInstance();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("singleton pattern", () => {
    it("should return same instance", () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = ConfigurationManager.getInstance();
      ConfigurationManager.reset();
      const instance2 = ConfigurationManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("loadConfiguration", () => {
    it("should load configuration on first call", () => {
      const config = manager.loadConfiguration();

      expect(config).toBeDefined();
      expect(config.name).toBe("test-cluster");
    });

    it("should log loading message", () => {
      manager.loadConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Loading configuration")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configuration loaded")
      );
    });

    it("should cache configuration", () => {
      const { loadClusterConfig } = require("../../loader");

      const config1 = manager.loadConfiguration();
      const config2 = manager.loadConfiguration();

      expect(config1).toBe(config2);
      expect(loadClusterConfig).toHaveBeenCalledTimes(1);
    });

    it("should return cluster config", () => {
      const config = manager.loadConfiguration();

      expect(config.name).toBe("test-cluster");
      expect(config.region).toBe("us-east");
      expect(config.image).toBe("linode/ubuntu22.04");
      expect(config.controlPlane.count).toBe(1);
      expect(config.workers.count).toBe(2);
    });
  });

  describe("getConfiguration", () => {
    it("should return loaded configuration", () => {
      manager.loadConfiguration();
      const config = manager.getConfiguration();

      expect(config).toBeDefined();
      expect(config.name).toBe("test-cluster");
    });

    it("should throw error if not loaded", () => {
      expect(() => manager.getConfiguration()).toThrow(
        "Configuration not loaded. Call loadConfiguration() first."
      );
    });

    it("should return same instance as loadConfiguration", () => {
      const loaded = manager.loadConfiguration();
      const retrieved = manager.getConfiguration();

      expect(loaded).toBe(retrieved);
    });
  });

  describe("isLoaded", () => {
    it("should return false initially", () => {
      expect(manager.isLoaded()).toBe(false);
    });

    it("should return true after loading", () => {
      manager.loadConfiguration();

      expect(manager.isLoaded()).toBe(true);
    });

    it("should return false after reset", () => {
      manager.loadConfiguration();
      ConfigurationManager.reset();
      const newManager = ConfigurationManager.getInstance();

      expect(newManager.isLoaded()).toBe(false);
    });
  });

  describe("reloadConfiguration", () => {
    it("should reload configuration", () => {
      const { loadClusterConfig } = require("../../loader");

      manager.loadConfiguration();
      manager.reloadConfiguration();

      expect(loadClusterConfig).toHaveBeenCalledTimes(2);
    });

    it("should log reload message", () => {
      manager.loadConfiguration();
      consoleSpy.mockClear();

      manager.reloadConfiguration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Reloading configuration")
      );
    });

    it("should clear cached config", () => {
      manager.loadConfiguration();

      const config1 = manager.getConfiguration();
      manager.reloadConfiguration();
      const config2 = manager.getConfiguration();

      // Should have loaded config twice
      const { loadClusterConfig } = require("../../loader");
      expect(loadClusterConfig).toHaveBeenCalledTimes(2);
    });

    it("should return new configuration", () => {
      const config = manager.reloadConfiguration();

      expect(config).toBeDefined();
      expect(config.name).toBe("test-cluster");
    });
  });

  describe("workflow scenarios", () => {
    it("should support load -> get workflow", () => {
      manager.loadConfiguration();
      const config = manager.getConfiguration();

      expect(config.name).toBe("test-cluster");
    });

    it("should support load -> reload -> get workflow", () => {
      manager.loadConfiguration();
      manager.reloadConfiguration();
      const config = manager.getConfiguration();

      expect(config.name).toBe("test-cluster");
    });

    it("should prevent multiple loads without reload", () => {
      const { loadClusterConfig } = require("../../loader");

      manager.loadConfiguration();
      manager.loadConfiguration();
      manager.loadConfiguration();

      expect(loadClusterConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("configuration access", () => {
    it("should provide access to all config properties", () => {
      const config = manager.loadConfiguration();

      expect(config.name).toBeDefined();
      expect(config.region).toBeDefined();
      expect(config.image).toBeDefined();
      expect(config.controlPlane).toBeDefined();
      expect(config.workers).toBeDefined();
      expect(config.k3s).toBeDefined();
      expect(config.ssh).toBeDefined();
    });

    it("should maintain config structure", () => {
      const config = manager.loadConfiguration();

      expect(config.controlPlane.count).toBe(1);
      expect(config.controlPlane.instanceType).toBe("g6-standard-2");
      expect(config.workers.count).toBe(2);
      expect(config.workers.instanceType).toBe("g6-standard-2");
    });
  });

  describe("error handling", () => {
    it("should handle load errors gracefully", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockImplementationOnce(() => {
        throw new Error("Load error");
      });

      expect(() => manager.loadConfiguration()).toThrow("Load error");
    });

    it("should still throw on getConfiguration if load failed", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockImplementationOnce(() => {
        throw new Error("Load error");
      });

      try {
        manager.loadConfiguration();
      } catch (e) {
        // Expected
      }

      expect(() => manager.getConfiguration()).toThrow(
        "Configuration not loaded"
      );
    });
  });
});
