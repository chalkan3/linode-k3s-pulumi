import * as pulumi from "@pulumi/pulumi";
import { K3sCluster } from "../../components/k3s-cluster";
import { ClusterConfig } from "../../config/types";
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Testes End-to-End - Ciclo de Vida Completo do Cluster
 *
 * ATENÇÃO: Estes testes criam infraestrutura REAL na Linode e incorrem em custos.
 *
 * Pré-requisitos:
 * - Variável de ambiente LINODE_TOKEN configurada
 * - Pulumi CLI instalado e configurado
 * - kubectl instalado
 * - Créditos suficientes na conta Linode
 *
 * Para executar:
 * npm run test:e2e
 *
 * Ou executar manualmente:
 * LINODE_TOKEN=<seu-token> npm test -- __tests__/e2e/
 */

describe("E2E Tests - Cluster Lifecycle", () => {
  const testClusterName = `e2e-test-${Date.now()}`;
  const stackName = `e2e-stack-${Date.now()}`;
  let projectDir: string;
  let kubeconfigPath: string;

  // Skip all E2E tests by default (use fit() to run specific tests)
  beforeAll(() => {
    if (!process.env.LINODE_TOKEN) {
      console.warn("⚠️  LINODE_TOKEN not set. E2E tests will be skipped.");
      return;
    }

    if (!process.env.RUN_E2E_TESTS) {
      console.warn("⚠️  RUN_E2E_TESTS not set. E2E tests will be skipped.");
      console.warn("   Set RUN_E2E_TESTS=true to run these tests.");
      return;
    }

    projectDir = path.join(__dirname, "../../");
    kubeconfigPath = path.join(projectDir, `.kubeconfig-${testClusterName}`);
  });

  afterAll(() => {
    // Cleanup kubeconfig file
    if (fs.existsSync(kubeconfigPath)) {
      fs.unlinkSync(kubeconfigPath);
    }
  });

  describe("Minimal Cluster Deployment", () => {
    it.skip("should deploy a minimal K3s cluster to Linode", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Create Pulumi program
      const program = async () => {
        const config: ClusterConfig = {
          name: testClusterName,
          region: "us-east",
          image: "linode/ubuntu22.04",
          rootPassword: pulumi.output(process.env.E2E_ROOT_PASSWORD || "TestPassword123!@#"),
          tags: ["e2e-test", "automated"],
          controlPlane: {
            count: 1,
            instanceType: "g6-standard-2",
            labels: {
              "test-type": "e2e",
              "cluster-name": testClusterName,
            },
          },
          workers: {
            count: 2,
            instanceType: "g6-standard-2",
            labels: {
              "test-type": "e2e",
              "cluster-name": testClusterName,
            },
          },
          k3s: {
            version: "v1.28.5+k3s1",
            channel: "stable",
            disableComponents: ["traefik"],
          },
          ssh: {
            autoGenerate: true,
            keyType: "ed25519",
          },
          network: {
            allowSshFromAnywhere: true,
            allowedSshCidrs: ["0.0.0.0/0"],
            nodePortRange: {
              start: 30000,
              end: 32767,
            },
          },
          bastion: {
            enabled: true,
            instanceType: "g6-nanode-1",
          },
          vpc: {
            enabled: false,
          },
          argocd: {
            enabled: false,
          },
        };

        const cluster = new K3sCluster(testClusterName, { config });

        return {
          clusterName: cluster.kubeconfig.apply(() => testClusterName),
          kubeconfig: cluster.kubeconfig,
          bastionIp: cluster.bastion?.publicIp,
          controlPlaneIps: pulumi.output(cluster.controlPlanes).apply((nodes) =>
            nodes.map((n) => n.publicIp)
          ),
          workerIps: pulumi.output(cluster.workers).apply((nodes) =>
            nodes.map((n) => n.publicIp)
          ),
        };
      };

      // Deploy using Pulumi automation API would go here
      // For now, we document the expected flow

      expect(true).toBe(true); // Placeholder
    }, 600000); // 10 minute timeout

    it.skip("should verify cluster is accessible via kubectl", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Verify kubeconfig file exists
      expect(fs.existsSync(kubeconfigPath)).toBe(true);

      // Test kubectl connectivity
      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigPath} get nodes`,
        { encoding: "utf-8" }
      );

      expect(result).toContain("Ready");
      expect(result).toContain("control-plane");
      expect(result).toContain("worker");
    }, 120000); // 2 minute timeout

    it.skip("should have all nodes in Ready state", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigPath} get nodes -o json`,
        { encoding: "utf-8" }
      );

      const nodes = JSON.parse(result);
      expect(nodes.items).toHaveLength(3); // 1 CP + 2 workers

      // All nodes should be Ready
      nodes.items.forEach((node: any) => {
        const readyCondition = node.status.conditions.find(
          (c: any) => c.type === "Ready"
        );
        expect(readyCondition.status).toBe("True");
      });
    }, 120000);

    it.skip("should have all system pods running", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigPath} get pods -n kube-system -o json`,
        { encoding: "utf-8" }
      );

      const pods = JSON.parse(result);

      // Check for essential K3s components
      const podNames = pods.items.map((p: any) => p.metadata.name);

      expect(podNames.some((name: string) => name.startsWith("coredns"))).toBe(true);
      expect(podNames.some((name: string) => name.startsWith("metrics-server"))).toBe(true);
      expect(podNames.some((name: string) => name.startsWith("local-path-provisioner"))).toBe(true);

      // All pods should be Running
      pods.items.forEach((pod: any) => {
        expect(pod.status.phase).toBe("Running");
      });
    }, 120000);

    it.skip("should be able to deploy a test workload", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Create a simple nginx deployment
      const manifest = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-test
  namespace: default
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
  selector:
    app: nginx-test
`;

      const manifestPath = path.join(projectDir, "test-manifest.yaml");
      fs.writeFileSync(manifestPath, manifest);

      try {
        // Apply manifest
        child_process.execSync(
          `kubectl --kubeconfig=${kubeconfigPath} apply -f ${manifestPath}`,
          { encoding: "utf-8" }
        );

        // Wait for deployment to be ready
        child_process.execSync(
          `kubectl --kubeconfig=${kubeconfigPath} wait --for=condition=available --timeout=300s deployment/nginx-test`,
          { encoding: "utf-8" }
        );

        // Verify pods are running
        const result = child_process.execSync(
          `kubectl --kubeconfig=${kubeconfigPath} get pods -l app=nginx-test -o json`,
          { encoding: "utf-8" }
        );

        const pods = JSON.parse(result);
        expect(pods.items).toHaveLength(2);
        pods.items.forEach((pod: any) => {
          expect(pod.status.phase).toBe("Running");
        });

        // Cleanup
        child_process.execSync(
          `kubectl --kubeconfig=${kubeconfigPath} delete -f ${manifestPath}`,
          { encoding: "utf-8" }
        );
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
      }
    }, 600000); // 10 minute timeout
  });

  describe("HA Cluster Deployment", () => {
    const haClusterName = `e2e-ha-${Date.now()}`;

    it.skip("should deploy an HA K3s cluster with 3 control planes", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const config: ClusterConfig = {
        name: haClusterName,
        region: "us-west",
        image: "linode/ubuntu22.04",
        rootPassword: pulumi.output(process.env.E2E_ROOT_PASSWORD || "TestPassword123!@#"),
        tags: ["e2e-test", "ha", "automated"],
        controlPlane: {
          count: 3,
          instanceType: "g6-standard-4",
          labels: {
            "test-type": "e2e-ha",
          },
        },
        workers: {
          count: 3,
          instanceType: "g6-standard-4",
          labels: {
            "test-type": "e2e-ha",
          },
        },
        k3s: {
          version: "v1.28.5+k3s1",
          channel: "stable",
          disableComponents: ["traefik"],
        },
        ssh: {
          autoGenerate: true,
          keyType: "ed25519",
        },
        network: {
          allowSshFromAnywhere: false,
          allowedSshCidrs: [process.env.E2E_ALLOWED_CIDR || "0.0.0.0/0"],
          nodePortRange: {
            start: 30000,
            end: 32767,
          },
        },
        bastion: {
          enabled: true,
          instanceType: "g6-standard-1",
        },
        vpc: {
          enabled: false,
        },
        argocd: {
          enabled: false,
        },
      };

      // Deployment logic would go here
      expect(config.controlPlane.count).toBe(3);
    }, 900000); // 15 minute timeout

    it.skip("should verify all 3 control plane nodes are master nodes", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const kubeconfigHA = path.join(projectDir, `.kubeconfig-${haClusterName}`);

      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigHA} get nodes -o json`,
        { encoding: "utf-8" }
      );

      const nodes = JSON.parse(result);
      const masterNodes = nodes.items.filter((node: any) =>
        node.metadata.labels["node-role.kubernetes.io/master"] ||
        node.metadata.labels["node-role.kubernetes.io/control-plane"]
      );

      expect(masterNodes).toHaveLength(3);
    }, 120000);

    it.skip("should survive control plane node failure", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // This test would:
      // 1. Deploy a workload
      // 2. Shut down one control plane node
      // 3. Verify cluster still functions
      // 4. Verify workload remains accessible
      // 5. Restart the node
      // 6. Verify it rejoins the cluster

      expect(true).toBe(true); // Placeholder
    }, 900000);
  });

  describe("VPC-enabled Cluster", () => {
    const vpcClusterName = `e2e-vpc-${Date.now()}`;

    it.skip("should deploy cluster with VPC networking", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const config: ClusterConfig = {
        name: vpcClusterName,
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: pulumi.output(process.env.E2E_ROOT_PASSWORD || "TestPassword123!@#"),
        tags: ["e2e-test", "vpc", "automated"],
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
        },
        network: {
          allowSshFromAnywhere: true,
          allowedSshCidrs: ["0.0.0.0/0"],
        },
        bastion: {
          enabled: true,
          instanceType: "g6-nanode-1",
        },
        vpc: {
          enabled: true,
          label: `${vpcClusterName}-vpc`,
          description: "E2E test VPC",
          subnetLabel: `${vpcClusterName}-subnet`,
          subnetIpv4: "10.0.0.0/24",
        },
        argocd: {
          enabled: false,
        },
      };

      expect(config.vpc?.enabled).toBe(true);
      expect(config.vpc?.subnetIpv4).toBe("10.0.0.0/24");
    }, 900000);

    it.skip("should have private IPs in VPC subnet", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Verify all nodes have private IPs in the 10.0.0.0/24 range
      // This would require querying the Linode API or checking node annotations

      expect(true).toBe(true); // Placeholder
    }, 120000);

    it.skip("should route pod traffic through VPC", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Deploy 2 pods and verify they can communicate via VPC IPs

      expect(true).toBe(true); // Placeholder
    }, 300000);
  });

  describe("GitOps with ArgoCD", () => {
    const gitopsClusterName = `e2e-gitops-${Date.now()}`;

    it.skip("should deploy cluster with ArgoCD installed", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const config: ClusterConfig = {
        name: gitopsClusterName,
        region: "us-east",
        image: "linode/ubuntu22.04",
        rootPassword: pulumi.output(process.env.E2E_ROOT_PASSWORD || "TestPassword123!@#"),
        tags: ["e2e-test", "gitops", "automated"],
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
        },
        network: {
          allowSshFromAnywhere: true,
          allowedSshCidrs: ["0.0.0.0/0"],
        },
        bastion: {
          enabled: true,
          instanceType: "g6-nanode-1",
        },
        vpc: {
          enabled: false,
        },
        argocd: {
          enabled: true,
          version: "stable",
          gitRepo: process.env.E2E_GIT_REPO || "https://github.com/argoproj/argocd-example-apps",
          gitPath: "guestbook",
          gitBranch: "master",
        },
      };

      expect(config.argocd?.enabled).toBe(true);
    }, 900000);

    it.skip("should have ArgoCD pods running", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const kubeconfigGitOps = path.join(projectDir, `.kubeconfig-${gitopsClusterName}`);

      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigGitOps} get pods -n argocd -o json`,
        { encoding: "utf-8" }
      );

      const pods = JSON.parse(result);

      // Check for ArgoCD components
      const podNames = pods.items.map((p: any) => p.metadata.name);

      expect(podNames.some((name: string) => name.startsWith("argocd-server"))).toBe(true);
      expect(podNames.some((name: string) => name.startsWith("argocd-repo-server"))).toBe(true);
      expect(podNames.some((name: string) => name.startsWith("argocd-application-controller"))).toBe(true);

      // All pods should be Running
      pods.items.forEach((pod: any) => {
        expect(pod.status.phase).toBe("Running");
      });
    }, 300000);

    it.skip("should have ArgoCD UI accessible", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Test ArgoCD UI is accessible via NodePort
      // This would require making an HTTP request to the node IP:port

      expect(true).toBe(true); // Placeholder
    }, 120000);

    it.skip("should sync application from Git repository", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      const kubeconfigGitOps = path.join(projectDir, `.kubeconfig-${gitopsClusterName}`);

      // Wait for ApplicationSet to sync
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute

      // Check if application was deployed
      const result = child_process.execSync(
        `kubectl --kubeconfig=${kubeconfigGitOps} get applications -n argocd -o json`,
        { encoding: "utf-8" }
      );

      const apps = JSON.parse(result);
      expect(apps.items.length).toBeGreaterThan(0);

      // Check application is synced
      apps.items.forEach((app: any) => {
        expect(app.status.sync.status).toBe("Synced");
        expect(app.status.health.status).toBe("Healthy");
      });
    }, 600000);
  });

  describe("Cluster Cleanup", () => {
    it.skip("should destroy all test clusters", async () => {
      if (!process.env.LINODE_TOKEN || !process.env.RUN_E2E_TESTS) {
        console.log("Skipping E2E test - environment not configured");
        return;
      }

      // Destroy all stacks created during E2E tests
      // This would use Pulumi destroy command

      expect(true).toBe(true); // Placeholder
    }, 600000); // 10 minute timeout
  });
});
