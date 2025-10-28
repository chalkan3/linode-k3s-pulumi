import * as pulumi from "@pulumi/pulumi";
import {
  K3sServerInstallStrategy,
  K3sAgentInstallStrategy,
  BastionK3sServerStrategy,
  BastionK3sAgentStrategy,
} from "../k3s-installation-methods";
import { InstallationContext } from "../connection-methods";

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

describe("K3sServerInstallStrategy", () => {
  const mockContext: InstallationContext = {
    k3sVersion: "v1.28.5+k3s1",
    nodeName: "test-cp-0",
    nodeIp: pulumi.output("203.0.113.10"),
    privateNodeIp: pulumi.output("10.0.0.10"),
    privateKey: pulumi.output("test-private-key"),
    labels: { env: "production" },
    taints: [{ key: "dedicated", value: "control-plane", effect: "NoSchedule" }],
  };

  describe("constructor", () => {
    it("should create strategy with token", () => {
      const token = pulumi.output("test-token-123");
      const strategy = new K3sServerInstallStrategy(token);

      expect(strategy).toBeDefined();
    });

    it("should accept disable components", () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token, ["traefik", "servicelb"]);

      expect(strategy).toBeDefined();
    });

    it("should accept server args", () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token, [], ["--kubelet-arg=max-pods=250"]);

      expect(strategy).toBeDefined();
    });
  });

  describe("generateInstallScript", () => {
    it("should generate valid install script", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("#!/bin/bash");
        expect(s).toContain("curl -sfL https://get.k3s.io");
        expect(s).toContain("v1.28.5+k3s1");
        expect(s).toContain("--cluster-init");
        expect(s).toContain("test-token");
        expect(s).toContain("test-cp-0");
        expect(s).toContain("203.0.113.10");
      });
    });

    it("should include disable components in script", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token, ["traefik", "servicelb"]);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--disable=traefik");
        expect(s).toContain("--disable=servicelb");
      });
    });

    it("should include server args in script", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(
        token,
        [],
        ["--kubelet-arg=max-pods=250", "--disable-cloud-controller"]
      );
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--kubelet-arg=max-pods=250");
        expect(s).toContain("--disable-cloud-controller");
      });
    });

    it("should include labels in script", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript({
        ...mockContext,
        labels: { env: "production", tier: "control" },
      });

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--node-label=env=production");
        expect(s).toContain("--node-label=tier=control");
        expect(s).toContain("--node-label=node-role.kubernetes.io/control-plane=true");
      });
    });

    it("should include taints in script", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--node-taint=dedicated=control-plane:NoSchedule");
      });
    });

    it("should handle empty labels", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript({
        ...mockContext,
        labels: undefined,
      });

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--node-label=node-role.kubernetes.io/control-plane=true");
      });
    });

    it("should handle empty taints", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript({
        ...mockContext,
        taints: undefined,
      });

      return pulumi.output(script).apply((s) => {
        expect(s).toBeDefined();
        expect(s).not.toContain("--node-taint=");
      });
    });

    it("should include initialization wait", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("Waiting for system initialization");
        expect(s).toContain("cloud-init status --wait");
      });
    });

    it("should include error handling", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("if [ $? -ne 0 ]");
        expect(s).toContain("ERROR: K3s installation command failed");
        expect(s).toContain("exit 1");
      });
    });

    it("should include service verification", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("systemctl is-active --quiet k3s");
        expect(s).toContain("kubectl wait --for=condition=Ready");
      });
    });

    it("should set kubeconfig mode", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--write-kubeconfig-mode=644");
      });
    });

    it("should configure TLS SANs", async () => {
      const token = pulumi.output("test-token");
      const strategy = new K3sServerInstallStrategy(token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--tls-san=203.0.113.10");
      });
    });
  });
});

describe("K3sAgentInstallStrategy", () => {
  const mockContext: InstallationContext = {
    k3sVersion: "v1.28.5+k3s1",
    nodeName: "test-worker-0",
    nodeIp: pulumi.output("203.0.113.20"),
    privateNodeIp: pulumi.output("10.0.0.20"),
    privateKey: pulumi.output("test-private-key"),
    labels: { workload: "web" },
    taints: undefined,
  };

  describe("constructor", () => {
    it("should create strategy with control plane URL and token", () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);

      expect(strategy).toBeDefined();
    });

    it("should accept agent args", () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token, ["--kubelet-arg=max-pods=200"]);

      expect(strategy).toBeDefined();
    });
  });

  describe("generateInstallScript", () => {
    it("should generate valid install script", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("#!/bin/bash");
        expect(s).toContain("set -e");
        expect(s).toContain("curl -sfL https://get.k3s.io");
        expect(s).toContain("v1.28.5+k3s1");
        expect(s).toContain("agent");
        expect(s).toContain("test-worker-0");
        expect(s).toContain("203.0.113.20");
      });
    });

    it("should wait for control plane", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("Waiting for control plane to be ready");
        expect(s).toContain("curl -k https://192.168.1.10:6443/ping");
        expect(s).toContain("max_attempts=30");
      });
    });

    it("should include agent args in script", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token, [
        "--kubelet-arg=max-pods=200",
        "--kubelet-arg=eviction-hard=memory.available<500Mi",
      ]);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--kubelet-arg=max-pods=200");
        expect(s).toContain("--kubelet-arg=eviction-hard=memory.available<500Mi");
      });
    });

    it("should include labels in script", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript({
        ...mockContext,
        labels: { workload: "database", tier: "data" },
      });

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--node-label=workload=database");
        expect(s).toContain("--node-label=tier=data");
        expect(s).toContain("--node-label=node-role.kubernetes.io/worker=true");
      });
    });

    it("should include taints in script", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript({
        ...mockContext,
        taints: [{ key: "nvidia.com/gpu", value: "true", effect: "NoSchedule" }],
      });

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("--node-taint=nvidia.com/gpu=true:NoSchedule");
      });
    });

    it("should set K3S_URL environment variable", async () => {
      const url = pulumi.output("10.0.0.5");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain('K3S_URL="https://10.0.0.5:6443"');
      });
    });

    it("should set K3S_TOKEN environment variable", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("my-secret-token-456");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain('K3S_TOKEN="my-secret-token-456"');
      });
    });

    it("should verify agent service status", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("systemctl status k3s-agent");
      });
    });

    it("should handle control plane timeout", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("Control plane did not become ready in time");
        expect(s).toContain("exit 1");
      });
    });

    it("should wait for system initialization", async () => {
      const url = pulumi.output("192.168.1.10");
      const token = pulumi.output("test-token");
      const strategy = new K3sAgentInstallStrategy(url, token);
      const script = strategy.generateInstallScript(mockContext);

      return pulumi.output(script).apply((s) => {
        expect(s).toContain("Waiting for system initialization");
        expect(s).toContain("cloud-init status --wait");
      });
    });
  });
});

describe("BastionK3sServerStrategy", () => {
  const mockContext: InstallationContext = {
    k3sVersion: "v1.28.5+k3s1",
    nodeName: "test-cp-0",
    nodeIp: pulumi.output("10.0.0.10"),
    privateNodeIp: pulumi.output("10.0.0.10"),
    privateKey: pulumi.output("test-private-key"),
    labels: { env: "production" },
    taints: undefined,
  };

  it("should wrap K3sServerInstallStrategy", () => {
    const token = pulumi.output("test-token");
    const serverStrategy = new K3sServerInstallStrategy(token);
    const bastionStrategy = new BastionK3sServerStrategy(serverStrategy);

    expect(bastionStrategy).toBeDefined();
  });

  it("should delegate script generation to wrapped strategy", async () => {
    const token = pulumi.output("test-token");
    const serverStrategy = new K3sServerInstallStrategy(token, ["traefik"]);
    const bastionStrategy = new BastionK3sServerStrategy(serverStrategy);
    const script = bastionStrategy.generateInstallScript(mockContext);

    return pulumi.output(script).apply((s) => {
      expect(s).toContain("#!/bin/bash");
      expect(s).toContain("--cluster-init");
      expect(s).toContain("--disable=traefik");
    });
  });
});

describe("BastionK3sAgentStrategy", () => {
  const mockContext: InstallationContext = {
    k3sVersion: "v1.28.5+k3s1",
    nodeName: "test-worker-0",
    nodeIp: pulumi.output("10.0.0.20"),
    privateNodeIp: pulumi.output("10.0.0.20"),
    privateKey: pulumi.output("test-private-key"),
    labels: { workload: "web" },
    taints: undefined,
  };

  it("should wrap K3sAgentInstallStrategy", () => {
    const url = pulumi.output("10.0.0.10");
    const token = pulumi.output("test-token");
    const agentStrategy = new K3sAgentInstallStrategy(url, token);
    const bastionStrategy = new BastionK3sAgentStrategy(agentStrategy);

    expect(bastionStrategy).toBeDefined();
  });

  it("should delegate script generation to wrapped strategy", async () => {
    const url = pulumi.output("10.0.0.10");
    const token = pulumi.output("test-token");
    const agentStrategy = new K3sAgentInstallStrategy(url, token, ["--kubelet-arg=max-pods=150"]);
    const bastionStrategy = new BastionK3sAgentStrategy(agentStrategy);
    const script = bastionStrategy.generateInstallScript(mockContext);

    return pulumi.output(script).apply((s) => {
      expect(s).toContain("#!/bin/bash");
      expect(s).toContain("agent");
      expect(s).toContain("--kubelet-arg=max-pods=150");
    });
  });
});
