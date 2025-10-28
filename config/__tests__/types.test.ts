import { ClusterConfig } from "../types";
import { ValidationChainBuilder } from "../validation/config-checker";

describe("ClusterConfig Validation", () => {
  let validConfig: ClusterConfig;

  beforeEach(() => {
    validConfig = {
      name: "test-cluster",
      region: "us-east",
      image: "linode/ubuntu22.04",
      rootPassword: "SecurePassword123!",
      controlPlane: {
        count: 3,
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
        keyBits: 4096,
      },
    };
  });

  describe("Basic Info Validation", () => {
    test("should validate correct configuration", () => {
      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    test("should fail with empty cluster name", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.name = "";
      expect(() => validator.validate(validConfig)).toThrow("Cluster name is required");
    });

    test("should fail with invalid cluster name (uppercase)", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.name = "Test-Cluster";
      expect(() => validator.validate(validConfig)).toThrow("DNS-compatible");
    });

    test("should fail with cluster name > 63 characters", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.name = "a".repeat(64);
      expect(() => validator.validate(validConfig)).toThrow("63 characters or less");
    });

    test("should fail with invalid region", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.region = "invalid-region";
      expect(() => validator.validate(validConfig)).toThrow("Invalid region");
    });

    test("should accept valid regions", () => {
      const validator = ValidationChainBuilder.build();
      const validRegions = ["us-east", "us-mia", "eu-west", "ap-south"];
      validRegions.forEach(region => {
        validConfig.region = region;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });

    test("should fail with invalid image format", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.image = "ubuntu22.04";
      expect(() => validator.validate(validConfig)).toThrow("Invalid image format");
    });

    test("should accept valid image formats", () => {
      const validator = ValidationChainBuilder.build();
      const validImages = ["linode/ubuntu22.04", "linode/debian11", "linode/centos9"];
      validImages.forEach(image => {
        validConfig.image = image;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });

    test("should fail with too many tags", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.tags = Array(51).fill("tag");
      expect(() => validator.validate(validConfig)).toThrow("Maximum 50 tags");
    });
  });

  describe("Control Plane Validation", () => {
    test("should fail with control plane count < 1", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.count = 0;
      expect(() => validator.validate(validConfig)).toThrow(
        "Control plane count must be at least 1"
      );
    });

    test("should fail with control plane count = 2", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.count = 2;
      expect(() => validator.validate(validConfig)).toThrow(
        "Control plane count of 2 is not recommended"
      );
    });

    test("should fail with invalid instance type", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.instanceType = "invalid-type";
      expect(() => validator.validate(validConfig)).toThrow(
        "Invalid control plane instance type"
      );
    });

    test("should fail when control plane nodes array length doesn't match count", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.count = 3;
      validConfig.controlPlane.nodes = [
        { name: "master-1", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow(
        "Control plane nodes array length"
      );
    });

    test("should fail with duplicate control plane node names", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.count = 3;
      validConfig.controlPlane.nodes = [
        { name: "master-1", instanceType: "g6-standard-2" },
        { name: "master-1", instanceType: "g6-standard-2" },
        { name: "master-3", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Duplicate control plane node name");
    });

    test("should fail with invalid label key", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.count = 1;
      validConfig.controlPlane.nodes = [
        { name: "master-1", instanceType: "g6-standard-2", labels: { "invalid key": "value" } },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Invalid label key");
    });

    test("should validate config with individual node configurations", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.controlPlane.nodes = [
        { name: "master-1", instanceType: "g6-standard-4", labels: { zone: "a" } },
        { name: "master-2", instanceType: "g6-standard-4", labels: { zone: "b" } },
        { name: "master-3", instanceType: "g6-standard-4", labels: { zone: "c" } },
      ];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("Worker Validation", () => {
    test("should fail with negative worker count", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.workers.count = -1;
      expect(() => validator.validate(validConfig)).toThrow(
        "Worker count cannot be negative"
      );
    });

    test("should fail with invalid worker instance type", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.workers.instanceType = "invalid-type";
      expect(() => validator.validate(validConfig)).toThrow(
        "Invalid worker instance type"
      );
    });

    test("should fail when worker nodes array length doesn't match count", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.workers.count = 2;
      validConfig.workers.nodes = [
        { name: "worker-1", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow(
        "Worker nodes array length"
      );
    });

    test("should fail with duplicate worker node names", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.workers.count = 2;
      validConfig.workers.nodes = [
        { name: "worker-1", instanceType: "g6-standard-2" },
        { name: "worker-1", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Duplicate worker node name");
    });
  });

  describe("K3s Validation", () => {
    test("should fail with invalid K3s version format", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.k3s.version = "1.28.5";
      expect(() => validator.validate(validConfig)).toThrow("Invalid K3s version format");
    });

    test("should accept valid K3s version formats", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.k3s.version = "v1.28.5+k3s1";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    test("should fail with invalid K3s channel", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.k3s.channel = "invalid" as any;
      expect(() => validator.validate(validConfig)).toThrow("Invalid K3s channel");
    });

    test("should accept valid K3s channels", () => {
      const validator = ValidationChainBuilder.build();
      const validChannels: Array<"stable" | "latest" | "testing"> = ["stable", "latest", "testing"];
      validChannels.forEach(channel => {
        validConfig.k3s.channel = channel;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });
  });

  describe("SSH Validation", () => {
    test("should fail with invalid SSH key type", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.ssh.keyType = "dsa" as any;
      expect(() => validator.validate(validConfig)).toThrow("Invalid SSH key type");
    });

    test("should fail with RSA key bits < 2048", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.ssh.keyType = "rsa";
      validConfig.ssh.keyBits = 1024;
      expect(() => validator.validate(validConfig)).toThrow("RSA key bits must be at least 2048");
    });

    test("should fail when autoGenerate is false but keys are missing", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.ssh.autoGenerate = false;
      expect(() => validator.validate(validConfig)).toThrow("SSH public key");
    });
  });

  describe("Network Validation", () => {
    test("should fail when allowSshFromAnywhere is false but no CIDRs specified", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: [],
      };
      expect(() => validator.validate(validConfig)).toThrow("allowedSshCidrs must be specified");
    });

    test("should fail with invalid CIDR format", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["192.168.1"],
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid CIDR format");
    });

    test("should accept valid CIDR ranges", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["192.168.1.0/24", "10.0.0.0/8"],
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    test("should fail with invalid NodePort range", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.network = {
        nodePortRange: { start: 32000, end: 31000 },
      };
      expect(() => validator.validate(validConfig)).toThrow("NodePort range start must be less than end");
    });
  });

  describe("VPC Validation", () => {
    test("should fail with invalid VPC subnet CIDR", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.vpc = {
        enabled: true,
        subnetIpv4: "invalid-cidr",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid CIDR format");
    });

    test("should fail with VPC subnet mask too small", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.vpc = {
        enabled: true,
        subnetIpv4: "10.0.0.0/29",
      };
      expect(() => validator.validate(validConfig)).toThrow("too small");
    });

    test("should accept valid VPC configuration", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.vpc = {
        enabled: true,
        label: "my-vpc",
        subnetIpv4: "10.0.0.0/24",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("Bastion Validation", () => {
    test("should fail with invalid bastion instance type", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.bastion = {
        enabled: true,
        instanceType: "g6-dedicated-64",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid bastion instance type");
    });

    test("should accept valid bastion configuration", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.bastion = {
        enabled: true,
        instanceType: "g6-nanode-1",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("ArgoCD Validation", () => {
    test("should fail when ArgoCD enabled but gitRepo missing", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.argocd = {
        enabled: true,
      };
      expect(() => validator.validate(validConfig)).toThrow("ArgoCD gitRepo is required");
    });

    test("should fail with invalid gitRepo URL", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "invalid-url",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid ArgoCD gitRepo URL");
    });

    test("should accept valid GitHub URL", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/chalkan3/zapper-argocd",
        version: "stable",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    test("should fail with invalid ArgoCD version", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/chalkan3/zapper-argocd",
        version: "invalid-version",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid ArgoCD version");
    });

    test("should fail with empty gitBranch", () => {
      const validator = ValidationChainBuilder.build();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/chalkan3/zapper-argocd",
        gitBranch: "",
      };
      expect(() => validator.validate(validConfig)).toThrow("ArgoCD gitBranch cannot be empty");
    });
  });
});
