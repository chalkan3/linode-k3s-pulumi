import { ClusterConfigBuilder } from "../../config/configuration/cluster-assembler";
import { ValidationChainBuilder } from "../../config/validation/config-checker";
import * as pulumi from "@pulumi/pulumi";

/**
 * Testes de Integração - Configuração e Validação
 *
 * Estes testes validam o fluxo completo de construção e validação de configurações,
 * integrando o Builder pattern com Chain of Responsibility validation.
 */

describe("Integration Tests - Configuration and Validation", () => {
  describe("Builder + Validation Integration", () => {
    it("should build and validate a complete valid configuration", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("valid-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("SecurePassword123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1", channel: "stable" })
        .setSsh({ autoGenerate: true, keyType: "ed25519" })
        .setVpc({ enabled: true, subnetIpv4: "10.0.0.0/24" })
        .setNetwork({ allowSshFromAnywhere: false, allowedSshCidrs: ["192.168.1.0/24"] })
        .setBastion({ enabled: true, instanceType: "g6-nanode-1" })
        .setArgoCD({ enabled: true, version: "stable", gitRepo: "https://github.com/test/repo" })
        .setTags(["production", "k3s"])
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).not.toThrow();
      expect(config.name).toBe("valid-cluster");
      expect(config.controlPlane.count).toBe(3);
      expect(config.workers.count).toBe(5);
    });

    it("should build minimal configuration and validate successfully", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("minimal-cluster", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("MinimalPassword123!"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 0, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).not.toThrow();
      expect(config.workers.count).toBe(0);
    });

    it("should reject invalid configuration built with builder", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("invalid-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 2, instanceType: "g6-standard-2" }) // Invalid: count of 2
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).toThrow("Control plane count of 2 is not recommended. Use 1 or 3+ for HA");
    });
  });

  describe("Complex Configuration Scenarios", () => {
    it("should handle configuration with custom node arrays", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("custom-nodes", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("CustomPassword123!"))
        .setControlPlane({
          count: 3,
          instanceType: "g6-standard-2",
          nodes: [
            { name: "cp-0", instanceType: "g6-standard-2" },
            { name: "cp-1", instanceType: "g6-standard-4" },
            { name: "cp-2", instanceType: "g6-standard-4" },
          ],
        })
        .setWorkers({
          count: 3,
          instanceType: "g6-standard-2",
          nodes: [
            { name: "worker-0", instanceType: "g6-standard-2" },
            { name: "worker-1", instanceType: "g6-standard-4" },
            { name: "worker-2", instanceType: "g6-standard-8" },
          ],
        })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).not.toThrow();
      expect(config.controlPlane.nodes).toHaveLength(3);
      expect(config.workers.nodes).toHaveLength(3);
    });

    it("should validate configuration with labels and taints", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("labeled-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("LabeledPassword123!"))
        .setControlPlane({
          count: 1,
          instanceType: "g6-standard-2",
          labels: {
            tier: "control",
            environment: "production",
            "app.kubernetes.io/component": "control-plane",
          },
        })
        .setWorkers({
          count: 2,
          instanceType: "g6-standard-2",
          labels: {
            tier: "worker",
            environment: "production",
            "app.kubernetes.io/component": "worker",
          },
        })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).not.toThrow();
    });

    it("should validate complex network configuration", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("network-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("NetworkPassword123!"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setNetwork({
          allowSshFromAnywhere: false,
          allowedSshCidrs: ["192.168.1.0/24", "10.0.0.0/8", "172.16.0.0/12"],
          nodePortRange: {
            start: 31000,
            end: 31999,
          },
        })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).not.toThrow();
      expect(config.network?.allowedSshCidrs).toHaveLength(3);
    });
  });

  describe("Validation Error Scenarios", () => {
    it("should reject configuration with invalid cluster name", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("Invalid_Cluster_Name", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).toThrow();
    });

    it("should reject configuration with mismatched node counts", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("mismatch-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({
          count: 3,
          instanceType: "g6-standard-2",
          nodes: [
            { name: "cp-0", instanceType: "g6-standard-2" },
            { name: "cp-1", instanceType: "g6-standard-2" },
          ], // Only 2 nodes but count is 3
        })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).toThrow("Control plane nodes array length (2) does not match count (3)");
    });

    it("should reject configuration with invalid K3s version", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("invalid-k3s", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "invalid-version" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).toThrow("Invalid K3s version format");
    });

    it("should reject configuration with invalid VPC subnet", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("invalid-vpc", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setVpc({ enabled: true, subnetIpv4: "10.0.0.0/29" }) // Too small
        .build();

      const validator = ValidationChainBuilder.build();

      expect(() => validator.validate(config)).toThrow("VPC subnet 10.0.0.0/29 is too small (/29). Must be /28 or larger to accommodate cluster nodes.");
    });
  });

  describe("Builder Reset and Reuse", () => {
    it("should allow builder reset and reuse", () => {
      const builder = new ClusterConfigBuilder();

      // First configuration
      const config1 = builder
        .setBasicInfo("cluster-1", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password1"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(config1.name).toBe("cluster-1");

      // Reset and build second configuration
      const config2 = builder
        .reset()
        .setBasicInfo("cluster-2", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("password2"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(config2.name).toBe("cluster-2");
      expect(config2.region).toBe("us-west");
      expect(config2.controlPlane.count).toBe(3);
    });
  });

  describe("Full Validation Chain", () => {
    it("should run all validators in chain successfully", () => {
      const builder = new ClusterConfigBuilder();

      const config = builder
        .setBasicInfo("full-validation", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("FullPassword123!"))
        .setTags(["test", "integration"])
        .setControlPlane({
          count: 3,
          instanceType: "g6-standard-4",
          labels: { tier: "control" },
        })
        .setWorkers({
          count: 5,
          instanceType: "g6-standard-4",
          labels: { tier: "worker" },
        })
        .setK3s({
          version: "v1.28.5+k3s1",
          channel: "stable",
          disableComponents: ["traefik", "servicelb"],
          serverArgs: ["--disable=metrics-server"],
          agentArgs: ["--node-label=test=true"],
        })
        .setSsh({
          autoGenerate: true,
          keyType: "rsa",
          keyBits: 4096,
        })
        .setVpc({
          enabled: true,
          label: "test-vpc",
          description: "Test VPC",
          subnetLabel: "test-subnet",
          subnetIpv4: "10.0.0.0/24",
        })
        .setNetwork({
          allowSshFromAnywhere: false,
          allowedSshCidrs: ["192.168.1.0/24"],
          nodePortRange: { start: 30000, end: 32767 },
        })
        .setBastion({
          enabled: true,
          instanceType: "g6-nanode-1",
          labels: { role: "bastion" },
        })
        .setArgoCD({
          enabled: true,
          version: "v2.9.0",
          gitRepo: "https://github.com/test/repo",
          gitPath: "apps/*",
          gitBranch: "main",
        })
        .build();

      const validator = ValidationChainBuilder.build();

      // Should pass all validations
      expect(() => validator.validate(config)).not.toThrow();

      // Verify all configuration sections
      expect(config.name).toBe("full-validation");
      expect(config.tags).toHaveLength(2);
      expect(config.controlPlane.count).toBe(3);
      expect(config.workers.count).toBe(5);
      expect(config.k3s.disableComponents).toHaveLength(2);
      expect(config.vpc?.enabled).toBe(true);
      expect(config.bastion?.enabled).toBe(true);
      expect(config.argocd?.enabled).toBe(true);
    });
  });
});
