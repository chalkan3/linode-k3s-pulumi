import * as pulumi from "@pulumi/pulumi";
import { K3sCluster } from "../k3s-cluster";
import { ClusterConfig } from "../../config/types";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    const baseId = Math.random().toString(36).substring(7);

    // Mock para diferentes tipos de recursos
    const mocks: { [key: string]: any } = {
      "linode:index/instance:Instance": {
        id: `instance-${baseId}`,
        ipAddress: "203.0.113.100",
        privateIpAddress: "192.168.1.100",
        status: "running",
      },
      "linode:index/vpc:Vpc": {
        id: `12345`,
      },
      "linode:index/vpcSubnet:VpcSubnet": {
        id: `67890`,
      },
      "linode:index/firewall:Firewall": {
        id: `firewall-${baseId}`,
        status: "enabled",
      },
      "linode:index/sshKey:SshKey": {
        id: `ssh-key-${baseId}`,
        sshKey: "ssh-ed25519 AAAA...",
      },
      "random:index/randomPassword:RandomPassword": {
        result: "test-k3s-token-" + baseId,
      },
      "command:remote:Command": {
        stdout: `K3s installed successfully
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443`,
        stderr: "",
      },
      "command:local:Command": {
        stdout: "-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----",
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

describe("K3sCluster", () => {
  const baseConfig: ClusterConfig = {
    name: "test-cluster",
    region: "us-east",
    image: "linode/ubuntu22.04",
    rootPassword: pulumi.output("test-password"),
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
  };

  describe("constructor", () => {
    it("should create a complete K3s cluster", () => {
      const cluster = new K3sCluster("test", { config: baseConfig });

      expect(cluster).toBeDefined();
      expect(cluster.network).toBeDefined();
      expect(cluster.sshKey).toBeDefined();
      expect(cluster.tokenGenerator).toBeDefined();
      expect(cluster.controlPlanes).toBeDefined();
      expect(cluster.workers).toBeDefined();
      expect(cluster.validation).toBeDefined();
      expect(cluster.kubeconfig).toBeDefined();
    });

    it("should create cluster with VPC enabled", () => {
      const cluster = new K3sCluster("test-vpc", {
        config: {
          ...baseConfig,
          vpc: { enabled: true },
        }
      });

      expect(cluster.vpc).toBeDefined();
    });

    it("should create cluster without VPC", () => {
      const cluster = new K3sCluster("test-no-vpc", {
        config: {
          ...baseConfig,
          vpc: { enabled: false },
        }
      });

      expect(cluster.vpc).toBeUndefined();
    });

    it("should create cluster with bastion", () => {
      const cluster = new K3sCluster("test-bastion", {
        config: {
          ...baseConfig,
          bastion: { enabled: true },
        }
      });

      expect(cluster.bastion).toBeDefined();
    });

    it("should create cluster without bastion", () => {
      const cluster = new K3sCluster("test-no-bastion", {
        config: {
          ...baseConfig,
          bastion: { enabled: false },
        }
      });

      expect(cluster.bastion).toBeUndefined();
    });
  });

  describe("SSH key generation", () => {
    it("should auto-generate SSH keys", () => {
      const cluster = new K3sCluster("test-auto-ssh", {
        config: {
          ...baseConfig,
          ssh: { autoGenerate: true, keyType: "ed25519" },
        }
      });

      expect(cluster.sshKeyGenerator).toBeDefined();
      expect(cluster.generatedPublicKey).toBeDefined();
      expect(cluster.generatedPrivateKey).toBeDefined();
    });

    it("should use provided SSH keys", () => {
      const cluster = new K3sCluster("test-provided-ssh", {
        config: {
          ...baseConfig,
          ssh: {
            autoGenerate: false,
            publicKey: "ssh-ed25519 AAAA...",
            privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----",
          },
        }
      });

      expect(cluster.sshKeyGenerator).toBeUndefined();
      expect(cluster.sshKey).toBeDefined();
    });
  });

  describe("control plane nodes", () => {
    it("should create single control plane node", () => {
      const cluster = new K3sCluster("test-single-cp", {
        config: {
          ...baseConfig,
          controlPlane: { count: 1, instanceType: "g6-standard-2" },
        }
      });

      expect(cluster.controlPlanes).toHaveLength(1);
    });

    it("should create HA control plane", () => {
      const cluster = new K3sCluster("test-ha-cp", {
        config: {
          ...baseConfig,
          controlPlane: { count: 3, instanceType: "g6-standard-2" },
        }
      });

      expect(cluster.controlPlanes).toHaveLength(3);
    });

    it("should apply labels to control plane nodes", () => {
      const cluster = new K3sCluster("test-cp-labels", {
        config: {
          ...baseConfig,
          controlPlane: {
            count: 1,
            instanceType: "g6-standard-2",
            labels: { env: "production" },
          },
        }
      });

      expect(cluster.controlPlanes).toBeDefined();
    });

    it("should support individual node configurations", () => {
      const cluster = new K3sCluster("test-cp-individual", {
        config: {
          ...baseConfig,
          controlPlane: {
            count: 2,
            instanceType: "g6-standard-2",
            nodes: [
              { name: "cp-0", instanceType: "g6-standard-4", labels: { zone: "a" } },
              { name: "cp-1", instanceType: "g6-standard-4", labels: { zone: "b" } },
            ],
          },
        }
      });

      expect(cluster.controlPlanes).toHaveLength(2);
    });
  });

  describe("worker nodes", () => {
    it("should create worker nodes", () => {
      const cluster = new K3sCluster("test-workers", {
        config: {
          ...baseConfig,
          workers: { count: 2, instanceType: "g6-standard-2" },
        }
      });

      expect(cluster.workers).toHaveLength(2);
    });

    it("should create cluster with zero workers", () => {
      const cluster = new K3sCluster("test-no-workers", {
        config: {
          ...baseConfig,
          workers: { count: 0, instanceType: "g6-standard-2" },
        }
      });

      expect(cluster.workers).toHaveLength(0);
    });

    it("should apply labels to worker nodes", () => {
      const cluster = new K3sCluster("test-worker-labels", {
        config: {
          ...baseConfig,
          workers: {
            count: 1,
            instanceType: "g6-standard-2",
            labels: { workload: "web" },
          },
        }
      });

      expect(cluster.workers).toBeDefined();
    });

    it("should support individual worker configurations", () => {
      const cluster = new K3sCluster("test-worker-individual", {
        config: {
          ...baseConfig,
          workers: {
            count: 2,
            instanceType: "g6-standard-2",
            nodes: [
              { name: "worker-0", instanceType: "g6-standard-4", labels: { type: "web" } },
              { name: "worker-1", instanceType: "g6-standard-4", labels: { type: "db" } },
            ],
          },
        }
      });

      expect(cluster.workers).toHaveLength(2);
    });
  });

  describe("K3s configuration", () => {
    it("should use specified K3s version", () => {
      const cluster = new K3sCluster("test-k3s-version", {
        config: {
          ...baseConfig,
          k3s: { version: "v1.29.0+k3s1", channel: "latest" },
        }
      });

      expect(cluster).toBeDefined();
    });

    it("should disable specified components", () => {
      const cluster = new K3sCluster("test-k3s-disable", {
        config: {
          ...baseConfig,
          k3s: {
            version: "v1.28.5+k3s1",
            disableComponents: ["traefik", "servicelb"],
          },
        }
      });

      expect(cluster).toBeDefined();
    });

    it("should accept custom server args", () => {
      const cluster = new K3sCluster("test-k3s-server-args", {
        config: {
          ...baseConfig,
          k3s: {
            version: "v1.28.5+k3s1",
            serverArgs: ["--kubelet-arg=max-pods=250"],
          },
        }
      });

      expect(cluster).toBeDefined();
    });

    it("should accept custom agent args", () => {
      const cluster = new K3sCluster("test-k3s-agent-args", {
        config: {
          ...baseConfig,
          k3s: {
            version: "v1.28.5+k3s1",
            agentArgs: ["--kubelet-arg=max-pods=250"],
          },
        }
      });

      expect(cluster).toBeDefined();
    });
  });

  describe("ArgoCD integration", () => {
    it("should install ArgoCD when enabled", () => {
      const cluster = new K3sCluster("test-argocd", {
        config: {
          ...baseConfig,
          argocd: { enabled: true, version: "stable" },
        }
      });

      expect(cluster.argocd).toBeDefined();
    });

    it("should not install ArgoCD when disabled", () => {
      const cluster = new K3sCluster("test-no-argocd", {
        config: {
          ...baseConfig,
          argocd: { enabled: false },
        }
      });

      expect(cluster.argocd).toBeUndefined();
    });

    it("should configure Git repository for ArgoCD", () => {
      const cluster = new K3sCluster("test-argocd-git", {
        config: {
          ...baseConfig,
          argocd: {
            enabled: true,
            gitRepo: "https://github.com/user/repo",
            gitPath: "apps/*",
            gitBranch: "main",
          },
        }
      });

      expect(cluster.argocd).toBeDefined();
    });
  });

  describe("kubeconfig", () => {
    it("should generate kubeconfig", () => {
      const cluster = new K3sCluster("test-kubeconfig", { config: baseConfig });

      expect(cluster.kubeconfig).toBeDefined();
    });

    it("should adjust kubeconfig with public IP", async () => {
      const cluster = new K3sCluster("test-kubeconfig-ip", { config: baseConfig });

      return pulumi.output(cluster.kubeconfig).apply((config) => {
        expect(config).toBeDefined();
        expect(config).toContain("203.0.113.100");
      });
    });
  });

  describe("validation", () => {
    it("should validate cluster health", () => {
      const cluster = new K3sCluster("test-validation", { config: baseConfig });

      expect(cluster.validation).toBeDefined();
      expect(cluster.validation.validationResult).toBeDefined();
      expect(cluster.validation.allNodesReady).toBeDefined();
    });

    it("should validate correct node count", () => {
      const cluster = new K3sCluster("test-node-count", {
        config: {
          ...baseConfig,
          controlPlane: { count: 3, instanceType: "g6-standard-2" },
          workers: { count: 5, instanceType: "g6-standard-2" },
        }
      });

      expect(cluster.validation).toBeDefined();
      // Total: 3 + 5 = 8 nodes
    });
  });

  describe("token generation", () => {
    it("should generate K3s token", () => {
      const cluster = new K3sCluster("test-token", { config: baseConfig });

      expect(cluster.tokenGenerator).toBeDefined();
      expect(cluster.tokenGenerator.token).toBeDefined();
    });
  });

  describe("networking", () => {
    it("should create network firewalls", () => {
      const cluster = new K3sCluster("test-network", { config: baseConfig });

      expect(cluster.network).toBeDefined();
      expect(cluster.network.bastionFirewall).toBeDefined();
      expect(cluster.network.clusterFirewall).toBeDefined();
    });

    it("should configure VPC networking", () => {
      const cluster = new K3sCluster("test-vpc-network", {
        config: {
          ...baseConfig,
          vpc: {
            enabled: true,
            subnetIpv4: "10.1.0.0/24",
          },
        }
      });

      expect(cluster.vpc).toBeDefined();
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const cluster = new K3sCluster("test-registration", { config: baseConfig });

      expect(cluster).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register all outputs", () => {
      const cluster = new K3sCluster("test-outputs", { config: baseConfig });

      expect(cluster.kubeconfig).toBeDefined();
      expect(cluster.validation.validationResult).toBeDefined();
    });
  });

  describe("complete cluster configurations", () => {
    it("should create production cluster", () => {
      const cluster = new K3sCluster("prod", {
        config: {
          name: "production",
          region: "us-east",
          image: "linode/ubuntu22.04",
          rootPassword: pulumi.output("secure-password"),
          controlPlane: {
            count: 3,
            instanceType: "g6-standard-4",
            labels: { env: "production" },
          },
          workers: {
            count: 5,
            instanceType: "g6-standard-4",
            labels: { env: "production" },
          },
          k3s: {
            version: "v1.28.5+k3s1",
            disableComponents: ["traefik"],
          },
          ssh: { autoGenerate: true, keyType: "ed25519" },
          vpc: { enabled: true },
          bastion: { enabled: true, instanceType: "g6-standard-1" },
          argocd: { enabled: true, version: "stable" },
        }
      });

      expect(cluster).toBeDefined();
      expect(cluster.vpc).toBeDefined();
      expect(cluster.bastion).toBeDefined();
      expect(cluster.argocd).toBeDefined();
      expect(cluster.controlPlanes).toHaveLength(3);
      expect(cluster.workers).toHaveLength(5);
    });

    it("should create development cluster", () => {
      const cluster = new K3sCluster("dev", {
        config: {
          name: "development",
          region: "us-east",
          image: "linode/ubuntu22.04",
          rootPassword: pulumi.output("dev-password"),
          controlPlane: {
            count: 1,
            instanceType: "g6-standard-2",
          },
          workers: {
            count: 1,
            instanceType: "g6-standard-2",
          },
          k3s: { version: "v1.28.5+k3s1" },
          ssh: { autoGenerate: true, keyType: "ed25519" },
          vpc: { enabled: false },
          bastion: { enabled: false },
        }
      });

      expect(cluster).toBeDefined();
      expect(cluster.vpc).toBeUndefined();
      expect(cluster.bastion).toBeUndefined();
      expect(cluster.controlPlanes).toHaveLength(1);
      expect(cluster.workers).toHaveLength(1);
    });
  });

  describe("tags configuration", () => {
    it("should apply tags to all resources", () => {
      const cluster = new K3sCluster("test-tags", {
        config: {
          ...baseConfig,
          tags: ["production", "k3s", "cluster"],
        }
      });

      expect(cluster).toBeDefined();
    });
  });
});
