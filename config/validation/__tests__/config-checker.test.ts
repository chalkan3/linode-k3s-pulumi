import { ClusterConfig } from "../../types";
import {
  ValidationChainBuilder,
  BasicInfoValidator,
  ControlPlaneValidator,
  WorkerValidator,
  K3sValidator,
  SshValidator,
  NetworkValidator,
  VpcValidator,
  BastionValidator,
  ArgoCDValidator,
} from "../config-checker";

describe("Validation Chain", () => {
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

  describe("ValidationChainBuilder", () => {
    it("should build complete validation chain", () => {
      const validator = ValidationChainBuilder.build();
      expect(validator).toBeDefined();
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should validate valid configuration", () => {
      const validator = ValidationChainBuilder.build();
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("BasicInfoValidator", () => {
    it("should accept valid cluster name", () => {
      const validator = new BasicInfoValidator();
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject empty cluster name", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "";
      expect(() => validator.validate(validConfig)).toThrow("Cluster name is required");
    });

    it("should reject cluster name longer than 63 characters", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "a".repeat(64);
      expect(() => validator.validate(validConfig)).toThrow("Cluster name must be 63 characters or less");
    });

    it("should reject cluster name with uppercase", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "TestCluster";
      expect(() => validator.validate(validConfig)).toThrow("DNS-compatible");
    });

    it("should reject cluster name starting with hyphen", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "-test";
      expect(() => validator.validate(validConfig)).toThrow("DNS-compatible");
    });

    it("should reject cluster name ending with hyphen", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "test-";
      expect(() => validator.validate(validConfig)).toThrow("DNS-compatible");
    });

    it("should accept valid regions", () => {
      const validator = new BasicInfoValidator();
      const validRegions = ["us-east", "eu-west", "ap-south", "ca-central"];

      validRegions.forEach(region => {
        validConfig.region = region;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });

    it("should reject invalid region", () => {
      const validator = new BasicInfoValidator();
      validConfig.region = "invalid-region";
      expect(() => validator.validate(validConfig)).toThrow("Invalid region");
    });

    it("should accept valid Ubuntu image", () => {
      const validator = new BasicInfoValidator();
      validConfig.image = "linode/ubuntu22.04";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should accept valid Debian image", () => {
      const validator = new BasicInfoValidator();
      validConfig.image = "linode/debian11";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid image format", () => {
      const validator = new BasicInfoValidator();
      validConfig.image = "invalid-image";
      expect(() => validator.validate(validConfig)).toThrow("Invalid image format");
    });

    it("should validate tags array", () => {
      const validator = new BasicInfoValidator();
      validConfig.tags = ["production", "k3s", "cluster"];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject non-array tags", () => {
      const validator = new BasicInfoValidator();
      validConfig.tags = "not-an-array" as any;
      expect(() => validator.validate(validConfig)).toThrow("Tags must be an array");
    });

    it("should reject more than 50 tags", () => {
      const validator = new BasicInfoValidator();
      validConfig.tags = Array(51).fill("tag");
      expect(() => validator.validate(validConfig)).toThrow("Maximum 50 tags allowed");
    });

    it("should reject tag longer than 255 characters", () => {
      const validator = new BasicInfoValidator();
      validConfig.tags = ["a".repeat(256)];
      expect(() => validator.validate(validConfig)).toThrow("exceeds 255 characters");
    });
  });

  describe("ControlPlaneValidator", () => {
    it("should accept count of 1", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 1;
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should accept count of 3", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 3;
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject count less than 1", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 0;
      expect(() => validator.validate(validConfig)).toThrow("Control plane count must be at least 1");
    });

    it("should reject count of 2", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 2;
      expect(() => validator.validate(validConfig)).toThrow("Control plane count of 2 is not recommended");
    });

    it("should accept valid instance types", () => {
      const validator = new ControlPlaneValidator();
      const validTypes = ["g6-standard-2", "g6-standard-4", "g6-dedicated-4"];

      validTypes.forEach(type => {
        validConfig.controlPlane.instanceType = type;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });

    it("should reject invalid instance type", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.instanceType = "invalid-type";
      expect(() => validator.validate(validConfig)).toThrow("Invalid control plane instance type");
    });

    it("should validate nodes array length", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 3;
      validConfig.controlPlane.nodes = [
        { name: "cp-0", instanceType: "g6-standard-2" },
        { name: "cp-1", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("nodes array length");
    });

    it("should validate node names", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 1;
      validConfig.controlPlane.nodes = [
        { name: "", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("must have a name");
    });

    it("should detect duplicate node names", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 3;
      validConfig.controlPlane.nodes = [
        { name: "cp-0", instanceType: "g6-standard-2" },
        { name: "cp-0", instanceType: "g6-standard-2" },
        { name: "cp-2", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Duplicate control plane node name");
    });

    it("should validate node labels", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 1;
      validConfig.controlPlane.nodes = [
        {
          name: "cp-0",
          instanceType: "g6-standard-2",
          labels: { "valid-label": "value" },
        },
      ];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid label keys", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 1;
      validConfig.controlPlane.nodes = [
        {
          name: "cp-0",
          instanceType: "g6-standard-2",
          labels: { "invalid@label": "value" },
        },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Invalid label key");
    });

    it("should reject label key longer than 63 characters", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.count = 1;
      validConfig.controlPlane.nodes = [
        {
          name: "cp-0",
          instanceType: "g6-standard-2",
          labels: { ["a".repeat(64)]: "value" },
        },
      ];
      expect(() => validator.validate(validConfig)).toThrow("exceeds 63 characters");
    });
  });

  describe("WorkerValidator", () => {
    it("should accept zero workers", () => {
      const validator = new WorkerValidator();
      validConfig.workers.count = 0;
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject negative worker count", () => {
      const validator = new WorkerValidator();
      validConfig.workers.count = -1;
      expect(() => validator.validate(validConfig)).toThrow("Worker count cannot be negative");
    });

    it("should validate worker instance types", () => {
      const validator = new WorkerValidator();
      validConfig.workers.instanceType = "g6-standard-4";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid worker instance type", () => {
      const validator = new WorkerValidator();
      validConfig.workers.instanceType = "invalid-type";
      expect(() => validator.validate(validConfig)).toThrow("Invalid worker instance type");
    });

    it("should validate worker nodes array", () => {
      const validator = new WorkerValidator();
      validConfig.workers.count = 2;
      validConfig.workers.nodes = [
        { name: "worker-0", instanceType: "g6-standard-2" },
        { name: "worker-1", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should detect duplicate worker node names", () => {
      const validator = new WorkerValidator();
      validConfig.workers.count = 2;
      validConfig.workers.nodes = [
        { name: "worker-0", instanceType: "g6-standard-2" },
        { name: "worker-0", instanceType: "g6-standard-2" },
      ];
      expect(() => validator.validate(validConfig)).toThrow("Duplicate worker node name");
    });
  });

  describe("K3sValidator", () => {
    it("should accept valid K3s version", () => {
      const validator = new K3sValidator();
      validConfig.k3s.version = "v1.28.5+k3s1";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid K3s version format", () => {
      const validator = new K3sValidator();
      validConfig.k3s.version = "1.28.5";
      expect(() => validator.validate(validConfig)).toThrow("Invalid K3s version format");
    });

    it("should accept valid channels", () => {
      const validator = new K3sValidator();
      const validChannels = ["stable", "latest", "testing"];

      validChannels.forEach(channel => {
        validConfig.k3s.channel = channel as any;
        expect(() => validator.validate(validConfig)).not.toThrow();
      });
    });

    it("should reject invalid channel", () => {
      const validator = new K3sValidator();
      validConfig.k3s.channel = "invalid" as any;
      expect(() => validator.validate(validConfig)).toThrow("Invalid K3s channel");
    });

    it("should validate disable components", () => {
      const validator = new K3sValidator();
      validConfig.k3s.disableComponents = ["traefik", "servicelb"];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject non-array disable components", () => {
      const validator = new K3sValidator();
      validConfig.k3s.disableComponents = "traefik" as any;
      expect(() => validator.validate(validConfig)).toThrow("disableComponents must be an array");
    });

    it("should validate server args", () => {
      const validator = new K3sValidator();
      validConfig.k3s.serverArgs = ["--kubelet-arg=max-pods=250"];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject non-array server args", () => {
      const validator = new K3sValidator();
      validConfig.k3s.serverArgs = "--kubelet-arg" as any;
      expect(() => validator.validate(validConfig)).toThrow("serverArgs must be an array");
    });

    it("should validate agent args", () => {
      const validator = new K3sValidator();
      validConfig.k3s.agentArgs = ["--kubelet-arg=max-pods=250"];
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("SshValidator", () => {
    it("should accept ed25519 key type", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "ed25519";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should accept rsa key type", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "rsa";
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid key type", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "invalid" as any;
      expect(() => validator.validate(validConfig)).toThrow("Invalid SSH key type");
    });

    it("should validate RSA key bits minimum", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "rsa";
      validConfig.ssh.keyBits = 2048;
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject RSA key bits below 2048", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "rsa";
      validConfig.ssh.keyBits = 1024;
      expect(() => validator.validate(validConfig)).toThrow("RSA key bits must be at least 2048");
    });

    it("should reject RSA key bits above 16384", () => {
      const validator = new SshValidator();
      validConfig.ssh.keyType = "rsa";
      validConfig.ssh.keyBits = 20000;
      expect(() => validator.validate(validConfig)).toThrow("RSA key bits cannot exceed 16384");
    });

    it("should require public key when not auto-generating", () => {
      const validator = new SshValidator();
      validConfig.ssh.autoGenerate = false;
      expect(() => validator.validate(validConfig)).toThrow("SSH public key or publicKeyPath is required");
    });

    it("should require private key when not auto-generating", () => {
      const validator = new SshValidator();
      validConfig.ssh.autoGenerate = false;
      validConfig.ssh.publicKey = "ssh-ed25519 AAAA...";
      expect(() => validator.validate(validConfig)).toThrow("SSH private key or privateKeyPath is required");
    });
  });

  describe("NetworkValidator", () => {
    it("should validate CIDR format", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["192.168.1.0/24"],
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid CIDR format", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["invalid-cidr"],
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid CIDR format");
    });

    it("should reject invalid IP in CIDR", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["256.1.1.1/24"],
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid IP address");
    });

    it("should require CIDRs when not allowing from anywhere", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: [],
      };
      expect(() => validator.validate(validConfig)).toThrow("allowedSshCidrs must be specified");
    });

    it("should validate node port range", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        nodePortRange: { start: 30000, end: 32767 },
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid node port range", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        nodePortRange: { start: 32767, end: 30000 },
      };
      expect(() => validator.validate(validConfig)).toThrow("NodePort range start must be less than end");
    });

    it("should reject ports out of range", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        nodePortRange: { start: 0, end: 70000 },
      };
      expect(() => validator.validate(validConfig)).toThrow("NodePort range must be between 1 and 65535");
    });
  });

  describe("VpcValidator", () => {
    it("should validate VPC label", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        label: "test-vpc",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject VPC label longer than 64 characters", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        label: "a".repeat(65),
      };
      expect(() => validator.validate(validConfig)).toThrow("VPC label must be 64 characters or less");
    });

    it("should reject invalid VPC label characters", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        label: "invalid@label",
      };
      expect(() => validator.validate(validConfig)).toThrow("VPC label must contain only");
    });

    it("should validate VPC subnet CIDR", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        subnetIpv4: "10.0.0.0/24",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid VPC subnet CIDR", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        subnetIpv4: "invalid",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid CIDR format");
    });

    it("should reject VPC subnet too small", () => {
      const validator = new VpcValidator();
      validConfig.vpc = {
        enabled: true,
        subnetIpv4: "10.0.0.0/29",
      };
      expect(() => validator.validate(validConfig)).toThrow(/VPC subnet .* is too small/);
    });
  });

  describe("BastionValidator", () => {
    it("should validate bastion instance type", () => {
      const validator = new BastionValidator();
      validConfig.bastion = {
        enabled: true,
        instanceType: "g6-nanode-1",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid bastion instance type", () => {
      const validator = new BastionValidator();
      validConfig.bastion = {
        enabled: true,
        instanceType: "invalid-type",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid bastion instance type");
    });

    it("should validate bastion labels", () => {
      const validator = new BastionValidator();
      validConfig.bastion = {
        enabled: true,
        labels: { role: "bastion" },
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid bastion label keys", () => {
      const validator = new BastionValidator();
      validConfig.bastion = {
        enabled: true,
        labels: { "invalid@key": "value" },
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid label key");
    });
  });

  describe("ArgoCDValidator", () => {
    it("should require gitRepo when enabled", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
      };
      expect(() => validator.validate(validConfig)).toThrow("ArgoCD gitRepo is required");
    });

    it("should validate GitHub URL", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should validate GitLab URL", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://gitlab.com/user/repo",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid git URL", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "invalid-url",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid ArgoCD gitRepo URL");
    });

    it("should validate ArgoCD version", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
        version: "v2.9.0",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should accept stable version", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
        version: "stable",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });

    it("should reject invalid ArgoCD version", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
        version: "invalid",
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid ArgoCD version");
    });

    it("should reject empty gitBranch", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
        gitBranch: "",
      };
      expect(() => validator.validate(validConfig)).toThrow("ArgoCD gitBranch cannot be empty");
    });

    it("should validate gitBranch format", () => {
      const validator = new ArgoCDValidator();
      validConfig.argocd = {
        enabled: true,
        gitRepo: "https://github.com/user/repo",
        gitBranch: "feature/test-branch",
      };
      expect(() => validator.validate(validConfig)).not.toThrow();
    });
  });

  describe("Additional edge cases", () => {
    it("should reject empty control plane instance type", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.instanceType = "" as any;
      expect(() => validator.validate(validConfig)).toThrow("Control plane instance type is required");
    });

    it("should warn for small control plane instance types", () => {
      const validator = new ControlPlaneValidator();
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      validConfig.controlPlane.instanceType = "g6-nanode-1";
      validator.validate(validConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("may be too small for control plane")
      );

      consoleSpy.mockRestore();
    });

    it("should reject empty worker instance type", () => {
      const validator = new WorkerValidator();
      validConfig.workers.instanceType = "" as any;
      expect(() => validator.validate(validConfig)).toThrow("Worker instance type is required");
    });

    it("should validate K3s version format more strictly", () => {
      const validator = new K3sValidator();
      validConfig.k3s.version = "invalid-version";
      expect(() => validator.validate(validConfig)).toThrow("Invalid K3s version format");
    });


    it("should handle SSH key with invalid keyBits for RSA", () => {
      const validator = new SshValidator();
      validConfig.ssh = {
        autoGenerate: true,
        keyType: "rsa",
        keyBits: 1024,
      };
      expect(() => validator.validate(validConfig)).toThrow("RSA key bits must be at least 2048");
    });

    it("should handle cluster with invalid name pattern", () => {
      const validator = new BasicInfoValidator();
      validConfig.name = "Test_Cluster";
      expect(() => validator.validate(validConfig)).toThrow();
    });

    it("should validate worker node without name", () => {
      const validator = new WorkerValidator();
      validConfig.workers.nodes = [
        { name: "", instanceType: "g6-standard-2" },
      ];
      validConfig.workers.count = 1;
      expect(() => validator.validate(validConfig)).toThrow("Worker node at index 0 must have a name");
    });

    it("should validate worker node labels with invalid keys", () => {
      const validator = new WorkerValidator();
      validConfig.workers.nodes = [
        {
          name: "worker-0",
          instanceType: "g6-standard-2",
          labels: { "invalid@key": "value" }
        },
      ];
      validConfig.workers.count = 1;
      expect(() => validator.validate(validConfig)).toThrow("Invalid label key");
    });

    it("should validate control plane node without name", () => {
      const validator = new ControlPlaneValidator();
      validConfig.controlPlane.nodes = [
        { name: "", instanceType: "g6-standard-2" },
      ];
      validConfig.controlPlane.count = 1;
      expect(() => validator.validate(validConfig)).toThrow("Control plane node at index 0 must have a name");
    });

    it("should validate network with invalid CIDR in array", () => {
      const validator = new NetworkValidator();
      validConfig.network = {
        allowSshFromAnywhere: false,
        allowedSshCidrs: ["192.168.1.0/24", "invalid-cidr"],
      };
      expect(() => validator.validate(validConfig)).toThrow("Invalid CIDR format");
    });

    it("should validate K3s with invalid disable components", () => {
      const validator = new K3sValidator();
      validConfig.k3s.disableComponents = "traefik" as any;
      expect(() => validator.validate(validConfig)).toThrow("disableComponents must be an array");
    });

    it("should validate K3s with invalid server args", () => {
      const validator = new K3sValidator();
      validConfig.k3s.serverArgs = "invalid" as any;
      expect(() => validator.validate(validConfig)).toThrow("serverArgs must be an array");
    });
  });
});
