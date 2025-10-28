import * as pulumi from "@pulumi/pulumi";
import { loadClusterConfig } from "../loader";

// Mock do Pulumi Config
class MockConfig {
  private data: { [key: string]: any } = {
    cluster: {
      name: "test-cluster",
      region: "us-east",
      image: "linode/ubuntu22.04",
      tags: ["test", "k3s"],
    },
    controlPlane: {
      count: 1,
      instanceType: "g6-standard-2",
      labels: { env: "test" },
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
    secrets: {
      rootPassword: "test-password",
    },
  };

  requireObject<T>(key: string): T {
    const parts = key.split(".");
    let value: any = this.data;
    for (const part of parts) {
      value = value[part];
    }
    return value as T;
  }

  getObject<T>(key: string): T | undefined {
    try {
      return this.requireObject<T>(key);
    } catch {
      return undefined;
    }
  }

  requireSecret(key: string): pulumi.Output<string> {
    return pulumi.output("test-secret-value");
  }
}

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

// Mock do ValidationChainBuilder
jest.mock("../validation/config-checker", () => ({
  ValidationChainBuilder: {
    build: jest.fn().mockReturnValue({
      validate: jest.fn(),
    }),
  },
}));

describe("loadClusterConfig", () => {
  let originalConfig: any;

  beforeEach(() => {
    // Save original
    originalConfig = pulumi.Config;

    // Mock pulumi.Config
    (pulumi as any).Config = jest.fn(() => new MockConfig());
  });

  afterEach(() => {
    // Restore original
    (pulumi as any).Config = originalConfig;
  });

  it("should load cluster configuration", () => {
    const config = loadClusterConfig();

    expect(config).toBeDefined();
    expect(config.name).toBe("test-cluster");
    expect(config.region).toBe("us-east");
    expect(config.image).toBe("linode/ubuntu22.04");
  });

  it("should load control plane configuration", () => {
    const config = loadClusterConfig();

    expect(config.controlPlane).toBeDefined();
    expect(config.controlPlane.count).toBe(1);
    expect(config.controlPlane.instanceType).toBe("g6-standard-2");
  });

  it("should load workers configuration", () => {
    const config = loadClusterConfig();

    expect(config.workers).toBeDefined();
    expect(config.workers.count).toBe(2);
    expect(config.workers.instanceType).toBe("g6-standard-2");
  });

  it("should load K3s configuration", () => {
    const config = loadClusterConfig();

    expect(config.k3s).toBeDefined();
    expect(config.k3s.version).toBe("v1.28.5+k3s1");
    expect(config.k3s.channel).toBe("stable");
  });

  it("should load SSH configuration", () => {
    const config = loadClusterConfig();

    expect(config.ssh).toBeDefined();
    expect(config.ssh.autoGenerate).toBe(true);
    expect(config.ssh.keyType).toBe("ed25519");
  });

  it("should apply default values", () => {
    const config = loadClusterConfig();

    expect(config.vpc?.enabled).toBe(false);
    expect(config.bastion?.enabled).toBe(true);
    expect(config.argocd?.enabled).toBe(false);
  });

  it("should load root password as secret", () => {
    const config = loadClusterConfig();

    expect(config.rootPassword).toBeDefined();
  });

  it("should validate configuration", () => {
    const { ValidationChainBuilder } = require("../validation/config-checker");

    loadClusterConfig();

    expect(ValidationChainBuilder.build).toHaveBeenCalled();
  });

  it("should handle cluster tags", () => {
    const config = loadClusterConfig();

    expect(config.tags).toEqual(["test", "k3s"]);
  });

  it("should apply K3s defaults", () => {
    const config = loadClusterConfig();

    expect(config.k3s.disableComponents).toEqual(["traefik"]);
  });

  it("should apply network defaults", () => {
    const config = loadClusterConfig();

    expect(config.network?.allowSshFromAnywhere).toBe(true);
    expect(config.network?.allowedSshCidrs).toEqual(["0.0.0.0/0"]);
    expect(config.network?.nodePortRange).toEqual({
      start: 30000,
      end: 32767,
    });
  });

  it("should apply VPC defaults", () => {
    const config = loadClusterConfig();

    expect(config.vpc?.subnetIpv4).toBe("10.0.0.0/24");
  });

  it("should apply ArgoCD defaults", () => {
    const config = loadClusterConfig();

    expect(config.argocd?.version).toBe("stable");
    expect(config.argocd?.gitPath).toBe("apps/*");
    expect(config.argocd?.gitBranch).toBe("main");
  });

  it("should load custom VPC configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      vpc: {
        enabled: true,
        label: "custom-vpc",
        description: "Custom VPC",
        subnetLabel: "custom-subnet",
        subnetIpv4: "10.1.0.0/24",
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.vpc?.enabled).toBe(true);
    expect(config.vpc?.label).toBe("custom-vpc");
    expect(config.vpc?.description).toBe("Custom VPC");
    expect(config.vpc?.subnetLabel).toBe("custom-subnet");
    expect(config.vpc?.subnetIpv4).toBe("10.1.0.0/24");
  });

  it("should load custom network configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      network: {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["192.168.1.0/24"],
        nodePortRange: {
          start: 31000,
          end: 31999,
        },
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.network?.allowSshFromAnywhere).toBe(false);
    expect(config.network?.allowedSshCidrs).toEqual(["192.168.1.0/24"]);
    expect(config.network?.nodePortRange?.start).toBe(31000);
    expect(config.network?.nodePortRange?.end).toBe(31999);
  });

  it("should load custom bastion configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      bastion: {
        enabled: false,
        instanceType: "g6-standard-1",
        labels: { role: "bastion" },
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.bastion?.enabled).toBe(false);
    expect(config.bastion?.instanceType).toBe("g6-standard-1");
    expect(config.bastion?.labels).toEqual({ role: "bastion" });
  });

  it("should load custom ArgoCD configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      argocd: {
        enabled: true,
        version: "v2.8.0",
        gitRepo: "https://github.com/example/repo",
        gitPath: "manifests/*",
        gitBranch: "develop",
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.argocd?.enabled).toBe(true);
    expect(config.argocd?.version).toBe("v2.8.0");
    expect(config.argocd?.gitRepo).toBe("https://github.com/example/repo");
    expect(config.argocd?.gitPath).toBe("manifests/*");
    expect(config.argocd?.gitBranch).toBe("develop");
  });

  it("should load custom K3s configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      k3s: {
        version: "v1.29.0+k3s1",
        channel: "latest",
        serverArgs: ["--disable=traefik"],
        agentArgs: ["--node-label=type=worker"],
        disableComponents: ["local-storage"],
        datastoreEndpoint: "mysql://...",
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.k3s.version).toBe("v1.29.0+k3s1");
    expect(config.k3s.channel).toBe("latest");
    expect(config.k3s.serverArgs).toEqual(["--disable=traefik"]);
    expect(config.k3s.agentArgs).toEqual(["--node-label=type=worker"]);
    expect(config.k3s.disableComponents).toEqual(["local-storage"]);
    expect(config.k3s.datastoreEndpoint).toBe("mysql://...");
  });

  it("should load custom SSH configuration", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      ssh: {
        autoGenerate: false,
        keyType: "rsa",
        keyBits: 2048,
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.ssh.autoGenerate).toBe(false);
    expect(config.ssh.keyType).toBe("rsa");
    expect(config.ssh.keyBits).toBe(2048);
  });

  it("should load optional control plane properties", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      controlPlane: {
        count: 3,
        instanceType: "g6-standard-4",
        labels: { tier: "control" },
        nodes: [
          { name: "cp-0", instanceType: "g6-standard-4" },
          { name: "cp-1", instanceType: "g6-standard-4" },
          { name: "cp-2", instanceType: "g6-standard-4" },
        ],
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.controlPlane.labels).toEqual({ tier: "control" });
    expect(config.controlPlane.nodes).toHaveLength(3);
  });

  it("should load optional worker properties", () => {
    const customMock = new MockConfig();
    customMock["data"] = {
      ...customMock["data"],
      workers: {
        count: 3,
        instanceType: "g6-standard-4",
        labels: { tier: "worker" },
        nodes: [
          { name: "worker-0", instanceType: "g6-standard-4" },
          { name: "worker-1", instanceType: "g6-standard-4" },
          { name: "worker-2", instanceType: "g6-standard-4" },
        ],
      },
    };

    (pulumi as any).Config = jest.fn(() => customMock);

    const config = loadClusterConfig();

    expect(config.workers.labels).toEqual({ tier: "worker" });
    expect(config.workers.nodes).toHaveLength(3);
  });
});
