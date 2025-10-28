import * as pulumi from "@pulumi/pulumi";
import { ClusterConfigBuilder } from "../cluster-assembler";

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

describe("ClusterConfigBuilder", () => {
  let builder: ClusterConfigBuilder;

  beforeEach(() => {
    builder = new ClusterConfigBuilder();
  });

  describe("setBasicInfo", () => {
    it("should set name, region, and image", () => {
      builder.setBasicInfo("test-cluster", "us-east", "linode/ubuntu22.04");

      const config = builder
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .build();

      expect(config.name).toBe("test-cluster");
      expect(config.region).toBe("us-east");
      expect(config.image).toBe("linode/ubuntu22.04");
    });

    it("should return this for chaining", () => {
      const result = builder.setBasicInfo("test", "us-east", "ubuntu");

      expect(result).toBe(builder);
    });
  });

  describe("setRootPassword", () => {
    it("should set root password", () => {
      const password = pulumi.output("test-password");

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(password)
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true });

      const config = builder.build();

      expect(config.rootPassword).toBe(password);
    });

    it("should return this for chaining", () => {
      const result = builder.setRootPassword(pulumi.output("password"));

      expect(result).toBe(builder);
    });
  });

  describe("setControlPlane", () => {
    it("should set control plane configuration", () => {
      const controlPlane = { count: 3, instanceType: "g6-standard-4" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane(controlPlane)
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true });

      const config = builder.build();

      expect(config.controlPlane).toEqual(controlPlane);
    });

    it("should return this for chaining", () => {
      const result = builder.setControlPlane({ count: 1, instanceType: "g6-standard-2" });

      expect(result).toBe(builder);
    });
  });

  describe("setWorkers", () => {
    it("should set workers configuration", () => {
      const workers = { count: 5, instanceType: "g6-standard-8" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers(workers)
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true });

      const config = builder.build();

      expect(config.workers).toEqual(workers);
    });

    it("should return this for chaining", () => {
      const result = builder.setWorkers({ count: 2, instanceType: "g6-standard-2" });

      expect(result).toBe(builder);
    });
  });

  describe("setK3s", () => {
    it("should set K3s configuration", () => {
      const k3s = { version: "v1.29.0+k3s1" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s(k3s)
        .setSsh({ autoGenerate: true });

      const config = builder.build();

      expect(config.k3s.version).toBe(k3s.version);
    });

    it("should return this for chaining", () => {
      const result = builder.setK3s({ version: "v1.28.5+k3s1" });

      expect(result).toBe(builder);
    });
  });

  describe("setSsh", () => {
    it("should set SSH configuration", () => {
      const ssh = { autoGenerate: false, publicKey: "ssh-ed25519 AAA..." };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh(ssh);

      const config = builder.build();

      expect(config.ssh).toEqual(ssh);
    });

    it("should return this for chaining", () => {
      const result = builder.setSsh({ autoGenerate: true });

      expect(result).toBe(builder);
    });
  });

  describe("setVpc", () => {
    it("should set VPC configuration", () => {
      const vpc = { enabled: true, subnetIpv4: "10.1.0.0/24" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setVpc(vpc);

      const config = builder.build();

      expect(config.vpc).toEqual(vpc);
    });

    it("should return this for chaining", () => {
      const result = builder.setVpc({ enabled: true });

      expect(result).toBe(builder);
    });
  });

  describe("setNetwork", () => {
    it("should set network configuration", () => {
      const network = { allowSshFromAnywhere: false, allowedSshCidrs: ["1.2.3.4/32"] };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setNetwork(network);

      const config = builder.build();

      expect(config.network).toEqual(network);
    });

    it("should return this for chaining", () => {
      const result = builder.setNetwork({ allowSshFromAnywhere: true });

      expect(result).toBe(builder);
    });
  });

  describe("setBastion", () => {
    it("should set bastion configuration", () => {
      const bastion = { enabled: true, instanceType: "g6-nanode-1" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setBastion(bastion);

      const config = builder.build();

      expect(config.bastion).toEqual(bastion);
    });

    it("should return this for chaining", () => {
      const result = builder.setBastion({ enabled: true });

      expect(result).toBe(builder);
    });
  });

  describe("setArgoCD", () => {
    it("should set ArgoCD configuration", () => {
      const argocd = { enabled: true, version: "stable", gitRepo: "https://github.com/user/repo" };

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setArgoCD(argocd);

      const config = builder.build();

      expect(config.argocd).toEqual(argocd);
    });

    it("should return this for chaining", () => {
      const result = builder.setArgoCD({ enabled: false });

      expect(result).toBe(builder);
    });
  });

  describe("setTags", () => {
    it("should set tags", () => {
      const tags = ["production", "k3s", "cluster"];

      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setTags(tags);

      const config = builder.build();

      expect(config.tags).toEqual(tags);
    });

    it("should return this for chaining", () => {
      const result = builder.setTags(["test"]);

      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build valid configuration", () => {
      const config = builder
        .setBasicInfo("production-cluster", "us-west", "linode/ubuntu22.04")
        .setRootPassword(pulumi.output("secure-password"))
        .setControlPlane({ count: 3, instanceType: "g6-standard-4" })
        .setWorkers({ count: 5, instanceType: "g6-standard-4" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true, keyType: "ed25519" })
        .build();

      expect(config).toBeDefined();
      expect(config.name).toBe("production-cluster");
    });

    it("should throw error if name is missing", () => {
      expect(() => {
        builder
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Cluster name is required");
    });

    it("should throw error if region is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "", "ubuntu")
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Cluster region is required");
    });

    it("should throw error if image is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "")
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Cluster image is required");
    });

    it("should throw error if rootPassword is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "ubuntu")
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Root password is required");
    });

    it("should throw error if controlPlane is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "ubuntu")
          .setRootPassword(pulumi.output("password"))
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Control plane configuration is required");
    });

    it("should throw error if workers is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "ubuntu")
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("Workers configuration is required");
    });

    it("should throw error if k3s is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "ubuntu")
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setSsh({ autoGenerate: true })
          .build();
      }).toThrow("K3s configuration is required");
    });

    it("should throw error if ssh is missing", () => {
      expect(() => {
        builder
          .setBasicInfo("test", "us-east", "ubuntu")
          .setRootPassword(pulumi.output("password"))
          .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
          .setWorkers({ count: 2, instanceType: "g6-standard-2" })
          .setK3s({ version: "v1.28.5+k3s1" })
          .build();
      }).toThrow("SSH configuration is required");
    });
  });

  describe("reset", () => {
    it("should clear configuration", () => {
      builder
        .setBasicInfo("test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .reset();

      expect(() => builder.build()).toThrow();
    });

    it("should return this for chaining", () => {
      const result = builder.reset();

      expect(result).toBe(builder);
    });

    it("should allow building new config after reset", () => {
      builder
        .setBasicInfo("old", "us-east", "ubuntu")
        .reset()
        .setBasicInfo("new", "us-west", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true });

      const config = builder.build();

      expect(config.name).toBe("new");
    });
  });

  describe("fluent interface", () => {
    it("should support method chaining", () => {
      const config = builder
        .setBasicInfo("chain-test", "us-east", "ubuntu")
        .setRootPassword(pulumi.output("password"))
        .setControlPlane({ count: 1, instanceType: "g6-standard-2" })
        .setWorkers({ count: 2, instanceType: "g6-standard-2" })
        .setK3s({ version: "v1.28.5+k3s1" })
        .setSsh({ autoGenerate: true })
        .setTags(["test"])
        .build();

      expect(config.name).toBe("chain-test");
      expect(config.tags).toEqual(["test"]);
    });
  });
});
