import * as pulumi from "@pulumi/pulumi";
import { ClusterConfigBuilder } from "../../config/configuration/cluster-assembler";
import { ValidationChainBuilder } from "../../config/validation/config-checker";
import { K3sCluster } from "../../components/k3s-cluster";

/**
 * Testes de Integração - Fluxo Completo de Configuração
 *
 * Estes testes validam o fluxo end-to-end desde a construção da configuração
 * até a criação do cluster, passando por todas as etapas de validação.
 */

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    const resourceType = args.type;

    switch (resourceType) {
      case "linode:index/instance:Instance":
        return {
          id: `instance-${args.name}-${Date.now()}`,
          state: {
            ...args.inputs,
            ipAddress: `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
            privateIpAddress: `10.0.0.${Math.floor(Math.random() * 200) + 1}`,
          },
        };

      case "linode:index/vpc:Vpc":
        return {
          id: `vpc-${args.name}`,
          state: args.inputs,
        };

      case "linode:index/vpcSubnet:VpcSubnet":
        return {
          id: `subnet-${args.name}`,
          state: args.inputs,
        };

      case "linode:index/firewall:Firewall":
        return {
          id: `firewall-${args.name}`,
          state: args.inputs,
        };

      case "tls:index/privateKey:PrivateKey":
        return {
          id: `key-${args.name}`,
          state: {
            ...args.inputs,
            privateKeyPem: "-----BEGIN OPENSSH PRIVATE KEY-----\\ntest\\n-----END OPENSSH PRIVATE KEY-----",
            publicKeyOpenssh: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest",
          },
        };

      case "random:index/randomPassword:RandomPassword":
        return {
          id: `token-${args.name}`,
          state: {
            ...args.inputs,
            result: "K10" + Math.random().toString(36).substring(2, 66),
          },
        };

      case "command:remote:Command":
        return {
          id: `cmd-${args.name}`,
          state: {
            ...args.inputs,
            stdout: "Command executed successfully",
          },
        };

      default:
        return {
          id: `${args.type}-${args.name}`,
          state: args.inputs,
        };
    }
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("Integration Tests - Complete Workflow", () => {
  describe("Development Cluster Workflow", () => {
    it("should build, validate, and create a minimal dev cluster", () => {
      // Step 1: Build configuration
      const config = new ClusterConfigBuilder()
        .setBasicInfo("dev-cluster", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("DevCluster123!"))
        .setTags(["dev", "testing"])
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 1, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      // Step 2: Validate configuration
      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      // Step 3: Create cluster
      const cluster = new K3sCluster("dev-cluster", { config });

      // Step 4: Verify cluster components
      expect(cluster).toBeDefined();
      expect(cluster.controlPlanes).toBeDefined();
      expect(cluster.workers).toBeDefined();
      expect(cluster.kubeconfig).toBeDefined();
    });

    it("should handle dev cluster with custom node labels", () => {
      const config = new ClusterConfigBuilder()
        .setBasicInfo("dev-labeled", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("DevLabeled123!"))
        .setControlPlane({
          count: 1,
          instanceType: "g6-standard-2",
          labels: {
            environment: "development",
            team: "platform",
            "cost-center": "engineering",
          },
        })
        .setWorkers({
          count: 2,
          instanceType: "g6-standard-2",
          labels: {
            environment: "development",
            workload: "mixed",
          },
        })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      const cluster = new K3sCluster("dev-labeled", { config });

      expect(cluster).toBeDefined();
      expect(config.controlPlane.labels?.environment).toBe("development");
      expect(config.workers.labels?.workload).toBe("mixed");
    });
  });

  describe("Staging Cluster Workflow", () => {
    it("should build, validate, and create a staging cluster with VPC", () => {
      const config = new ClusterConfigBuilder()
        .setBasicInfo("staging-cluster", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("StagingCluster123!"))
        .setTags(["staging", "pre-production"])
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 3, instanceType: "g6-standard-4" })
        .setK3s({
          version: "v1.28.5+k3s1",
          channel: "stable",
        })
        .setSsh({ autoGenerate: true, keyType: "ed25519" })
        .setVpc({
          enabled: true,
          label: "staging-vpc",
          subnetIpv4: "10.1.0.0/24",
        })
        .setNetwork({
          allowSshFromAnywhere: false,
          allowedSshCidrs: ["192.168.1.0/24"],
        })
        .setBastion({
          enabled: true,
          instanceType: "g6-nanode-1",
        })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      const cluster = new K3sCluster("staging-cluster", { config });

      expect(cluster).toBeDefined();
      expect(cluster.vpc).toBeDefined();
      expect(cluster.bastion).toBeDefined();
      expect(cluster.network).toBeDefined();
    });

    it("should validate staging cluster with custom K3s args", () => {
      const config = new ClusterConfigBuilder()
        .setBasicInfo("staging-custom-k3s", "eu-central", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("StagingCustom123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({
          version: "v1.28.5+k3s1",
          disableComponents: ["traefik"],
          serverArgs: ["--disable=servicelb", "--kube-apiserver-arg=audit-log-path=/var/log/audit.log"],
          agentArgs: ["--node-label=stage=staging"],
        })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      expect(config.k3s.disableComponents).toContain("traefik");
      expect(config.k3s.serverArgs).toHaveLength(2);
      expect(config.k3s.agentArgs).toHaveLength(1);
    });
  });

  describe("Production Cluster Workflow", () => {
    it("should build, validate, and create a full production cluster", () => {
      const config = new ClusterConfigBuilder()
        .setBasicInfo("production-cluster", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("ProductionCluster123!"))
        .setTags(["production", "critical", "ha"])
        .setControlPlane({
          count: 5,
          instanceType: "g6-standard-8",
          labels: {
            tier: "control",
            environment: "production",
            criticality: "high",
          },
        })
        .setWorkers({
          count: 10,
          instanceType: "g6-standard-8",
          labels: {
            tier: "worker",
            environment: "production",
          },
        })
        .setK3s({
          version: "v1.28.5+k3s1",
          channel: "stable",
          disableComponents: ["traefik", "servicelb"],
        })
        .setSsh({
          autoGenerate: true,
          keyType: "ed25519",
          keyBits: 4096,
        })
        .setVpc({
          enabled: true,
          label: "production-vpc",
          description: "Production VPC for K3s cluster",
          subnetLabel: "production-subnet",
          subnetIpv4: "10.0.0.0/16",
        })
        .setNetwork({
          allowSshFromAnywhere: false,
          allowedSshCidrs: ["192.168.1.0/24", "10.0.0.0/8"],
          nodePortRange: { start: 30000, end: 32767 },
        })
        .setBastion({
          enabled: true,
          instanceType: "g6-standard-1",
          labels: { role: "bastion", environment: "production" },
        })
        .setArgoCD({
          enabled: true,
          version: "stable",
          gitRepo: "https://github.com/company/production-apps",
          gitPath: "clusters/production/*",
          gitBranch: "main",
        })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      const cluster = new K3sCluster("production-cluster", { config });

      expect(cluster).toBeDefined();
      expect(cluster.controlPlanes).toHaveLength(5);
      expect(cluster.workers).toHaveLength(10);
      expect(cluster.vpc).toBeDefined();
      expect(cluster.bastion).toBeDefined();
      expect(cluster.argocd).toBeDefined();
    });

    it("should handle production cluster with heterogeneous workers", () => {
      const config = new ClusterConfigBuilder()
        .setBasicInfo("prod-heterogeneous", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("ProdHetero123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({
          count: 4,
          instanceType: "g6-standard-2",
          nodes: [
            {
              name: "worker-web-0",
              instanceType: "g6-standard-2",
              labels: { workload: "web", tier: "frontend" },
            },
            {
              name: "worker-api-0",
              instanceType: "g6-standard-4",
              labels: { workload: "api", tier: "backend" },
            },
            {
              name: "worker-db-0",
              instanceType: "g6-standard-8",
              labels: { workload: "database", tier: "data" },
            },
            {
              name: "worker-cache-0",
              instanceType: "g6-standard-4",
              labels: { workload: "cache", tier: "data" },
            },
          ],
        })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(config)).not.toThrow();

      const cluster = new K3sCluster("prod-heterogeneous", { config });

      expect(cluster).toBeDefined();
      expect(config.workers.nodes).toHaveLength(4);
      expect(config.workers.nodes![2].labels?.workload).toBe("database");
    });
  });

  describe("Multi-Environment Workflow", () => {
    it("should create clusters for dev, staging, and prod from same builder", () => {
      const builder = new ClusterConfigBuilder();
      const validator = ValidationChainBuilder.build();

      // Dev environment
      const devConfig = builder
        .setBasicInfo("dev", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Dev123!"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 1, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(devConfig)).not.toThrow();

      // Staging environment
      const stagingConfig = builder
        .reset()
        .setBasicInfo("staging", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Staging123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 3, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setVpc({ enabled: true, subnetIpv4: "10.1.0.0/24" })
        .build();

      expect(() => validator.validate(stagingConfig)).not.toThrow();

      // Production environment
      const prodConfig = builder
        .reset()
        .setBasicInfo("production", "eu-central", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Production123!"))
        .setControlPlane({ count: 5, instanceType: "g6-standard-8" })
        .setWorkers({ count: 10, instanceType: "g6-standard-8" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setVpc({ enabled: true, subnetIpv4: "10.2.0.0/16" })
        .setArgoCD({
          enabled: true,
          version: "stable",
          gitRepo: "https://github.com/example/production-configs.git"
        })
        .build();

      expect(() => validator.validate(prodConfig)).not.toThrow();

      expect(devConfig.controlPlane.count).toBe(1);
      expect(stagingConfig.controlPlane.count).toBe(3);
      expect(prodConfig.controlPlane.count).toBe(5);
    });
  });

  describe("Cluster Upgrade Workflow", () => {
    it("should validate configuration for K3s version upgrade", () => {
      // Original cluster
      const originalConfig = new ClusterConfigBuilder()
        .setBasicInfo("upgrade-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Upgrade123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.27.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(originalConfig)).not.toThrow();

      // Upgraded cluster
      const upgradedConfig = new ClusterConfigBuilder()
        .setBasicInfo("upgrade-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Upgrade123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" }) // Upgraded version
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(upgradedConfig)).not.toThrow();
      expect(upgradedConfig.k3s.version).toBe("v1.28.5+k3s1");
    });
  });

  describe("Cluster Scaling Workflow", () => {
    it("should validate horizontal scaling of workers", () => {
      const validator = ValidationChainBuilder.build();

      // Original cluster - 3 workers
      const originalConfig = new ClusterConfigBuilder()
        .setBasicInfo("scale-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Scale123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 3, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(originalConfig)).not.toThrow();

      // Scaled cluster - 10 workers
      const scaledConfig = new ClusterConfigBuilder()
        .setBasicInfo("scale-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Scale123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 10, instanceType: "g6-standard-4" }) // Scaled up
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(scaledConfig)).not.toThrow();
      expect(scaledConfig.workers.count).toBe(10);
    });

    it("should validate vertical scaling of instance types", () => {
      const validator = ValidationChainBuilder.build();

      // Original cluster - standard-2
      const originalConfig = new ClusterConfigBuilder()
        .setBasicInfo("vscale-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("VScale123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-2" })
        .setWorkers({ count: 5, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(originalConfig)).not.toThrow();

      // Vertically scaled cluster - standard-8
      const scaledConfig = new ClusterConfigBuilder()
        .setBasicInfo("vscale-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("VScale123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-8" }) // Upgraded
        .setWorkers({ count: 5, instanceType: "g6-standard-8" }) // Upgraded
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(scaledConfig)).not.toThrow();
      expect(scaledConfig.controlPlane.instanceType).toBe("g6-standard-8");
    });
  });

  describe("Cluster Migration Workflow", () => {
    it("should validate migration from non-VPC to VPC cluster", () => {
      const validator = ValidationChainBuilder.build();

      // Original cluster without VPC
      const noVpcConfig = new ClusterConfigBuilder()
        .setBasicInfo("migration-test", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Migration123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(noVpcConfig)).not.toThrow();

      // Migrated cluster with VPC
      const vpcConfig = new ClusterConfigBuilder()
        .setBasicInfo("migration-test-vpc", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("Migration123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setVpc({
          enabled: true,
          label: "migration-vpc",
          subnetIpv4: "10.0.0.0/24",
        })
        .build();

      expect(() => validator.validate(vpcConfig)).not.toThrow();
      expect(vpcConfig.vpc?.enabled).toBe(true);
    });
  });

  describe("GitOps Adoption Workflow", () => {
    it("should validate adding ArgoCD to existing cluster", () => {
      const validator = ValidationChainBuilder.build();

      // Original cluster without GitOps
      const noGitOpsConfig = new ClusterConfigBuilder()
        .setBasicInfo("gitops-adoption", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("GitOps123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(() => validator.validate(noGitOpsConfig)).not.toThrow();

      // Cluster with ArgoCD enabled
      const gitOpsConfig = new ClusterConfigBuilder()
        .setBasicInfo("gitops-adoption", "us-east", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("GitOps123!"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setArgoCD({
          enabled: true,
          version: "stable",
          gitRepo: "https://github.com/company/apps",
          gitPath: "apps/*",
          gitBranch: "main",
        })
        .build();

      expect(() => validator.validate(gitOpsConfig)).not.toThrow();
      expect(gitOpsConfig.argocd?.enabled).toBe(true);

      const cluster = new K3sCluster("gitops-adoption", { config: gitOpsConfig });
      expect(cluster.argocd).toBeDefined();
    });
  });
});
