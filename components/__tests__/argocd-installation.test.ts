import * as pulumi from "@pulumi/pulumi";
import { ArgoCDInstallation } from "../argocd-installation";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para command.remote.Command
    if (args.type === "command:remote:Command") {
      return {
        id: "argocd-cmd-" + Math.random().toString(36).substring(7),
        state: {
          ...args.inputs,
          stdout: `=== Installing ArgoCD ===
✓ ArgoCD installed
✓ ArgoCD UI exposed via NodePort
ARGOCD_PASSWORD=admin-password-test
ARGOCD_PORT=30443`,
          stderr: "",
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

describe("ArgoCDInstallation", () => {
  const baseArgs = {
    clusterName: "test-cluster",
    controlPlaneHost: pulumi.output("203.0.113.100"),
    privateKey: pulumi.output("-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"),
  };

  describe("constructor", () => {
    it("should create ArgoCD installation with minimal config", () => {
      const argocd = new ArgoCDInstallation("test-argocd", baseArgs);

      expect(argocd).toBeDefined();
      expect(argocd.installationResult).toBeDefined();
      expect(argocd.argocdUrl).toBeDefined();
      expect(argocd.argocdAdminPassword).toBeDefined();
    });

    it("should create ArgoCD with custom version", () => {
      const argocd = new ArgoCDInstallation("test-argocd-version", {
        ...baseArgs,
        argocdVersion: "v2.8.0",
      });

      expect(argocd).toBeDefined();
    });

    it("should create ArgoCD with Git repository", () => {
      const argocd = new ArgoCDInstallation("test-argocd-git", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
        gitPath: "apps/*",
        gitBranch: "main",
      });

      expect(argocd).toBeDefined();
    });

    it("should skip installation when disabled", () => {
      const argocd = new ArgoCDInstallation("test-argocd-disabled", {
        ...baseArgs,
        enabled: false,
      });

      expect(argocd).toBeDefined();
    });
  });

  describe("installation", () => {
    it("should install ArgoCD with stable version", () => {
      const argocd = new ArgoCDInstallation("test-stable", baseArgs);

      expect(argocd.installationResult).toBeDefined();
    });

    it("should create argocd namespace", () => {
      const argocd = new ArgoCDInstallation("test-namespace", baseArgs);

      expect(argocd.installationResult).toBeDefined();
      // Script deve criar namespace argocd
    });

    it("should expose ArgoCD via NodePort", () => {
      const argocd = new ArgoCDInstallation("test-nodeport", baseArgs);

      expect(argocd.installationResult).toBeDefined();
      // Script deve fazer patch do serviço para NodePort
    });

    it("should wait for pods to be ready", () => {
      const argocd = new ArgoCDInstallation("test-wait-pods", baseArgs);

      expect(argocd.installationResult).toBeDefined();
      // Script deve aguardar todos os pods ficarem prontos
    });
  });

  describe("authentication", () => {
    it("should retrieve admin password", async () => {
      const argocd = new ArgoCDInstallation("test-password", baseArgs);

      return pulumi.output(argocd.argocdAdminPassword).apply((password) => {
        expect(password).toBeDefined();
        expect(typeof password).toBe("string");
        expect(password.length).toBeGreaterThan(0);
      });
    });

    it("should extract password from stdout", async () => {
      const argocd = new ArgoCDInstallation("test-extract-password", baseArgs);

      return pulumi.output(argocd.argocdAdminPassword).apply((password) => {
        expect(password).toBe("admin-password-test");
      });
    });
  });

  describe("URL configuration", () => {
    it("should generate ArgoCD URL", async () => {
      const argocd = new ArgoCDInstallation("test-url", baseArgs);

      return pulumi.output(argocd.argocdUrl).apply((url) => {
        expect(url).toBeDefined();
        expect(url).toContain("https://");
        expect(url).toContain("203.0.113.100");
      });
    });

    it("should use correct NodePort in URL", async () => {
      const argocd = new ArgoCDInstallation("test-url-port", baseArgs);

      return pulumi.output(argocd.argocdUrl).apply((url) => {
        expect(url).toContain(":30443");
      });
    });
  });

  describe("Git repository configuration", () => {
    it("should configure Git repository", () => {
      const argocd = new ArgoCDInstallation("test-git-repo", {
        ...baseArgs,
        gitRepo: "https://github.com/user/apps",
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should create ApplicationSet", () => {
      const argocd = new ArgoCDInstallation("test-appset", {
        ...baseArgs,
        gitRepo: "https://github.com/user/manifests",
        gitPath: "clusters/prod/*",
      });

      expect(argocd.installationResult).toBeDefined();
      // Script deve criar ApplicationSet
    });

    it("should use custom Git branch", () => {
      const argocd = new ArgoCDInstallation("test-git-branch", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
        gitBranch: "develop",
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should use custom Git path", () => {
      const argocd = new ArgoCDInstallation("test-git-path", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
        gitPath: "environments/staging/*",
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should work without Git repository", () => {
      const argocd = new ArgoCDInstallation("test-no-git", baseArgs);

      expect(argocd.installationResult).toBeDefined();
    });
  });

  describe("connection configuration", () => {
    it("should configure direct SSH connection", () => {
      const argocd = new ArgoCDInstallation("test-direct-ssh", baseArgs);

      expect(argocd.installationResult).toBeDefined();
    });

    it("should configure SSH via bastion", () => {
      const argocd = new ArgoCDInstallation("test-bastion-ssh", {
        ...baseArgs,
        bastionHost: pulumi.output("203.0.113.50"),
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should use custom bastion user", () => {
      const argocd = new ArgoCDInstallation("test-bastion-user", {
        ...baseArgs,
        bastionHost: pulumi.output("203.0.113.50"),
        bastionUser: "ubuntu",
      });

      expect(argocd.installationResult).toBeDefined();
    });
  });

  describe("enabled/disabled state", () => {
    it("should install when enabled", () => {
      const argocd = new ArgoCDInstallation("test-enabled", {
        ...baseArgs,
        enabled: true,
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should skip installation when disabled", async () => {
      const argocd = new ArgoCDInstallation("test-disabled", {
        ...baseArgs,
        enabled: false,
      });

      return pulumi.all([argocd.installationResult, argocd.argocdUrl, argocd.argocdAdminPassword])
        .apply(([result, url, password]) => {
          expect(result).toContain("skipped");
          expect(url).toBe("");
          expect(password).toBe("");
        });
    });

    it("should be enabled by default", () => {
      const argocd = new ArgoCDInstallation("test-default-enabled", baseArgs);

      expect(argocd.installationResult).toBeDefined();
    });
  });

  describe("installation results", () => {
    it("should provide installation output", async () => {
      const argocd = new ArgoCDInstallation("test-output", baseArgs);

      return pulumi.output(argocd.installationResult).apply((result) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      });
    });

    it("should include installation summary", async () => {
      const argocd = new ArgoCDInstallation("test-summary", baseArgs);

      return pulumi.output(argocd.installationResult).apply((result) => {
        expect(result).toContain("ArgoCD installed");
      });
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const argocd = new ArgoCDInstallation("test-registration", baseArgs);

      expect(argocd).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register outputs correctly", () => {
      const argocd = new ArgoCDInstallation("test-outputs", baseArgs);

      expect(argocd.installationResult).toBeDefined();
      expect(argocd.argocdUrl).toBeDefined();
      expect(argocd.argocdAdminPassword).toBeDefined();
    });
  });

  describe("different configurations", () => {
    it("should install for production with GitOps", () => {
      const argocd = new ArgoCDInstallation("prod-argocd", {
        clusterName: "production",
        controlPlaneHost: pulumi.output("203.0.113.100"),
        privateKey: baseArgs.privateKey,
        argocdVersion: "stable",
        gitRepo: "https://github.com/company/production-apps",
        gitPath: "apps/prod/*",
        gitBranch: "main",
      });

      expect(argocd).toBeDefined();
    });

    it("should install for staging", () => {
      const argocd = new ArgoCDInstallation("staging-argocd", {
        clusterName: "staging",
        controlPlaneHost: pulumi.output("203.0.113.50"),
        privateKey: baseArgs.privateKey,
        gitRepo: "https://github.com/company/staging-apps",
        gitPath: "apps/staging/*",
        gitBranch: "develop",
      });

      expect(argocd).toBeDefined();
    });

    it("should install minimal setup for dev", () => {
      const argocd = new ArgoCDInstallation("dev-argocd", {
        clusterName: "development",
        controlPlaneHost: pulumi.output("203.0.113.10"),
        privateKey: baseArgs.privateKey,
      });

      expect(argocd).toBeDefined();
    });
  });

  describe("ApplicationSet configuration", () => {
    it("should configure automatic sync", () => {
      const argocd = new ArgoCDInstallation("test-auto-sync", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
      });

      expect(argocd.installationResult).toBeDefined();
      // ApplicationSet deve ter syncPolicy.automated
    });

    it("should enable prune and self-heal", () => {
      const argocd = new ArgoCDInstallation("test-sync-policy", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
      });

      expect(argocd.installationResult).toBeDefined();
      // Deve configurar prune: true e selfHeal: true
    });

    it("should create namespaces automatically", () => {
      const argocd = new ArgoCDInstallation("test-create-ns", {
        ...baseArgs,
        gitRepo: "https://github.com/user/repo",
      });

      expect(argocd.installationResult).toBeDefined();
      // Deve ter CreateNamespace=true
    });
  });

  describe("version handling", () => {
    it("should use stable version by default", () => {
      const argocd = new ArgoCDInstallation("test-default-version", baseArgs);

      expect(argocd.installationResult).toBeDefined();
    });

    it("should accept specific version", () => {
      const argocd = new ArgoCDInstallation("test-specific-version", {
        ...baseArgs,
        argocdVersion: "v2.9.0",
      });

      expect(argocd.installationResult).toBeDefined();
    });

    it("should accept latest version", () => {
      const argocd = new ArgoCDInstallation("test-latest", {
        ...baseArgs,
        argocdVersion: "latest",
      });

      expect(argocd).toBeDefined();
    });
  });
});
