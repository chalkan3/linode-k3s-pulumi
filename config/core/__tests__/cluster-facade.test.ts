import { ClusterFacade } from "../cluster-facade";
import { ConfigurationManager } from "../config-manager";
import { EventDispatcher, ClusterEventType } from "../event-dispatcher";
import { ServiceContainer } from "../dependency-container";
import { ClusterConfig } from "../../types";

// Mock do loader
jest.mock("../../loader", () => ({
  loadClusterConfig: jest.fn(() => ({
    name: "test-cluster",
    region: "us-east",
    image: "linode/ubuntu22.04",
    rootPassword: "test-password",
    controlPlane: {
      count: 3,
      instanceType: "g6-standard-4",
    },
    workers: {
      count: 5,
      instanceType: "g6-standard-2",
    },
    k3s: {
      version: "v1.28.5+k3s1",
    },
    ssh: {
      autoGenerate: true,
      keyType: "ed25519",
    },
    vpc: {
      enabled: true,
    },
    bastion: {
      enabled: true,
      instanceType: "g6-nanode-1",
    },
    argocd: {
      enabled: true,
      version: "stable",
    },
  })),
}));

describe("ClusterFacade", () => {
  let facade: ClusterFacade;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    ConfigurationManager.reset();
    EventDispatcher.reset();
    ServiceContainer.reset();
    facade = new ClusterFacade();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create facade with manager instances", () => {
      expect(facade).toBeDefined();
    });

    it("should initialize with null config", () => {
      expect(() => facade.getConfiguration()).toThrow(
        "Cluster not initialized. Call initialize() first."
      );
    });
  });

  describe("initialize", () => {
    it("should load configuration", () => {
      facade.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Initializing K3s Cluster Deployment")
      );
    });

    it("should emit configuration loaded event", () => {
      const emitSpy = jest.spyOn(EventDispatcher.getInstance(), "emit");

      facade.initialize();

      expect(emitSpy).toHaveBeenCalledWith(
        ClusterEventType.CONFIGURATION_LOADED,
        expect.stringContaining("Configuration loaded for cluster"),
        expect.objectContaining({ clusterName: "test-cluster", region: "us-east" })
      );
    });

    it("should allow getting configuration after initialization", () => {
      facade.initialize();

      const config = facade.getConfiguration();

      expect(config.name).toBe("test-cluster");
      expect(config.region).toBe("us-east");
    });
  });

  describe("getConfiguration", () => {
    it("should throw error if not initialized", () => {
      expect(() => facade.getConfiguration()).toThrow(
        "Cluster not initialized. Call initialize() first."
      );
    });

    it("should return configuration after initialization", () => {
      facade.initialize();

      const config = facade.getConfiguration();

      expect(config).toBeDefined();
      expect(config.name).toBe("test-cluster");
    });

    it("should return same configuration on multiple calls", () => {
      facade.initialize();

      const config1 = facade.getConfiguration();
      const config2 = facade.getConfiguration();

      expect(config1).toBe(config2);
    });
  });

  describe("getSummary", () => {
    it("should throw error if not initialized", () => {
      expect(() => facade.getSummary()).toThrow("Cluster not initialized");
    });

    it("should return cluster summary", () => {
      facade.initialize();

      const summary = facade.getSummary();

      expect(summary.name).toBe("test-cluster");
      expect(summary.region).toBe("us-east");
      expect(summary.controlPlaneCount).toBe(3);
      expect(summary.workerCount).toBe(5);
      expect(summary.k3sVersion).toBe("v1.28.5+k3s1");
      expect(summary.vpcEnabled).toBe(true);
      expect(summary.bastionEnabled).toBe(true);
      expect(summary.argocdEnabled).toBe(true);
    });

    it("should handle missing optional configurations", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "minimal-cluster",
        region: "us-west",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 2, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const summary = facade.getSummary();

      expect(summary.vpcEnabled).toBe(false);
      expect(summary.bastionEnabled).toBe(false);
      expect(summary.argocdEnabled).toBe(false);
    });
  });

  describe("validate", () => {
    it("should emit validation started event", () => {
      facade.initialize();
      const emitSpy = jest.spyOn(EventDispatcher.getInstance(), "emit");

      facade.validate();

      expect(emitSpy).toHaveBeenCalledWith(
        ClusterEventType.VALIDATION_STARTED,
        "Validating cluster configuration..."
      );
    });

    it("should emit validation completed event", () => {
      facade.initialize();
      const emitSpy = jest.spyOn(EventDispatcher.getInstance(), "emit");

      facade.validate();

      expect(emitSpy).toHaveBeenCalledWith(
        ClusterEventType.VALIDATION_COMPLETED,
        "Configuration validation completed successfully"
      );
    });

    it("should return true on successful validation", () => {
      facade.initialize();

      const result = facade.validate();

      expect(result).toBe(true);
    });

    it("should handle validation errors", () => {
      facade.initialize();
      const dispatcher = EventDispatcher.getInstance();

      // Mock emit to throw error on VALIDATION_STARTED
      const originalEmit = dispatcher.emit.bind(dispatcher);
      jest.spyOn(dispatcher, "emit").mockImplementation((eventType, ...args) => {
        if (eventType === ClusterEventType.VALIDATION_STARTED) {
          throw new Error("Validation error");
        }
        return originalEmit(eventType, ...args);
      });

      const result = facade.validate();

      expect(result).toBe(false);
    });
  });

  describe("getRecommendedInstanceTypes", () => {
    it("should return development recommendations for small clusters", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "dev-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 1, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const recommendations = facade.getRecommendedInstanceTypes();

      expect(recommendations.controlPlane).toBe("g6-standard-2");
      expect(recommendations.worker).toBe("g6-standard-1");
      expect(recommendations.bastion).toBe("g6-nanode-1");
    });

    it("should return production recommendations for medium clusters", () => {
      facade.initialize();
      const recommendations = facade.getRecommendedInstanceTypes();

      expect(recommendations.controlPlane).toBe("g6-standard-4");
      expect(recommendations.worker).toBe("g6-standard-2");
      expect(recommendations.bastion).toBe("g6-standard-1");
    });

    it("should return high-performance recommendations for large clusters", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "large-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 3, instanceType: "g6-standard-8" },
        workers: { count: 10, instanceType: "g6-standard-4" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const recommendations = facade.getRecommendedInstanceTypes();

      expect(recommendations.controlPlane).toBe("g6-standard-8");
      expect(recommendations.worker).toBe("g6-standard-4");
      expect(recommendations.bastion).toBe("g6-standard-2");
    });

    it("should return production recommendations by default", () => {
      const recommendations = new ClusterFacade().getRecommendedInstanceTypes();

      expect(recommendations.controlPlane).toBe("g6-standard-4");
    });
  });

  describe("getEstimatedMonthlyCost", () => {
    it("should throw error if not initialized", () => {
      expect(() => facade.getEstimatedMonthlyCost()).toThrow("Cluster not initialized");
    });

    it("should calculate cost with all components", () => {
      facade.initialize();

      const cost = facade.getEstimatedMonthlyCost();

      expect(cost.controlPlane).toBe(120); // 3 * 40
      expect(cost.workers).toBe(100); // 5 * 20
      expect(cost.bastion).toBe(5); // 1 * 5
      expect(cost.vpc).toBe(0);
      expect(cost.total).toBe(225);
      expect(cost.currency).toBe("USD");
      expect(cost.period).toBe("monthly");
    });

    it("should calculate cost without bastion", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "no-bastion-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 2, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
        bastion: { enabled: false },
      });

      facade.initialize();
      const cost = facade.getEstimatedMonthlyCost();

      expect(cost.bastion).toBe(0);
      expect(cost.total).toBe(60); // 20 + 40
    });

    it("should use default prices for unknown instance types", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "custom-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "unknown-type" },
        workers: { count: 1, instanceType: "unknown-type" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const cost = facade.getEstimatedMonthlyCost();

      expect(cost.controlPlane).toBe(20);
      expect(cost.workers).toBe(20);
    });

    it("should calculate cost for various instance types", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "mixed-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-1" },
        workers: { count: 1, instanceType: "g6-standard-8" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
        bastion: { enabled: true, instanceType: "g6-standard-1" },
      });

      facade.initialize();
      const cost = facade.getEstimatedMonthlyCost();

      expect(cost.controlPlane).toBe(10);
      expect(cost.workers).toBe(80);
      expect(cost.bastion).toBe(10);
      expect(cost.total).toBe(100);
    });
  });

  describe("getEstimatedDeploymentTime", () => {
    it("should throw error if not initialized", () => {
      expect(() => facade.getEstimatedDeploymentTime()).toThrow("Cluster not initialized");
    });

    it("should calculate deployment time with all components", () => {
      facade.initialize();

      const timeline = facade.getEstimatedDeploymentTime();

      expect(timeline.provisioning).toBe("8 min"); // 8 nodes * 1
      expect(timeline.installation).toBe("16 min"); // 8 nodes * 2
      expect(timeline.validation).toBe("2 min");
      expect(timeline.argocd).toBe("3 min");
      expect(timeline.total).toBe("34 min"); // 5 + 8 + 16 + 2 + 3
    });

    it("should calculate deployment time without ArgoCD", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "no-argocd-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 2, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
        argocd: { enabled: false },
      });

      facade.initialize();
      const timeline = facade.getEstimatedDeploymentTime();

      expect(timeline.argocd).toBe("N/A");
      expect(timeline.total).toBe("16 min"); // 5 + 3 + 6 + 2 + 0
    });

    it("should calculate time for large cluster", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "large-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 5, instanceType: "g6-standard-4" },
        workers: { count: 15, instanceType: "g6-standard-4" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const timeline = facade.getEstimatedDeploymentTime();

      expect(timeline.provisioning).toBe("20 min"); // 20 nodes * 1
      expect(timeline.installation).toBe("40 min"); // 20 nodes * 2
      expect(timeline.total).toBe("67 min"); // 5 + 20 + 40 + 2
    });

    it("should calculate time for minimal cluster", () => {
      const { loadClusterConfig } = require("../../loader");
      loadClusterConfig.mockReturnValueOnce({
        name: "minimal-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 0, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const timeline = facade.getEstimatedDeploymentTime();

      expect(timeline.provisioning).toBe("1 min");
      expect(timeline.installation).toBe("2 min");
      expect(timeline.total).toBe("10 min"); // 5 + 1 + 2 + 2
    });
  });

  describe("integration scenarios", () => {
    it("should support full workflow", () => {
      facade.initialize();

      const config = facade.getConfiguration();
      const summary = facade.getSummary();
      const valid = facade.validate();
      const recommendations = facade.getRecommendedInstanceTypes();
      const cost = facade.getEstimatedMonthlyCost();
      const timeline = facade.getEstimatedDeploymentTime();

      expect(config).toBeDefined();
      expect(summary).toBeDefined();
      expect(valid).toBe(true);
      expect(recommendations).toBeDefined();
      expect(cost).toBeDefined();
      expect(timeline).toBeDefined();
    });

    it("should handle different cluster sizes", () => {
      const { loadClusterConfig } = require("../../loader");

      // Small cluster
      loadClusterConfig.mockReturnValueOnce({
        name: "small",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 1, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const smallSummary = facade.getSummary();
      expect(smallSummary.controlPlaneCount + smallSummary.workerCount).toBe(2);
    });

    it("should handle edge case cluster sizes for recommendations", () => {
      const { loadClusterConfig } = require("../../loader");

      // Exactly 4 nodes (boundary between development and production)
      loadClusterConfig.mockReturnValueOnce({
        name: "boundary-cluster",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 3, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
      });

      facade.initialize();
      const recommendations = facade.getRecommendedInstanceTypes();

      expect(recommendations).toBeDefined();
      expect(recommendations.controlPlane).toBe("g6-standard-4");
    });

    it("should calculate cost with unknown bastion instance type", () => {
      const { loadClusterConfig } = require("../../loader");

      loadClusterConfig.mockReturnValueOnce({
        name: "unknown-bastion",
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: "password",
        controlPlane: { count: 1, instanceType: "g6-standard-2" },
        workers: { count: 1, instanceType: "g6-standard-2" },
        k3s: { version: "v1.28.5+k3s1" },
        ssh: { autoGenerate: true },
        bastion: { enabled: true, instanceType: "g6-unknown-type" },
      });

      facade.initialize();
      const cost = facade.getEstimatedMonthlyCost();

      expect(cost.bastion).toBe(5); // Default price
      expect(cost.total).toBeGreaterThan(0);
    });
  });
});
