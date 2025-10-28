import { ClusterConfig } from "../types";

/**
 * Chain of Responsibility pattern for validation
 * Each validator handles one aspect of validation
 */
export interface ConfigValidator {
  setNext(validator: ConfigValidator): ConfigValidator;
  validate(config: ClusterConfig): void;
}

/**
 * Base validator with chain of responsibility implementation
 */
export abstract class BaseValidator implements ConfigValidator {
  private nextValidator?: ConfigValidator;

  setNext(validator: ConfigValidator): ConfigValidator {
    this.nextValidator = validator;
    return validator;
  }

  validate(config: ClusterConfig): void {
    this.doValidate(config);

    if (this.nextValidator) {
      this.nextValidator.validate(config);
    }
  }

  protected abstract doValidate(config: ClusterConfig): void;
}

/**
 * Validates control plane configuration
 */
export class ControlPlaneValidator extends BaseValidator {
  // Common Linode instance types
  private static readonly VALID_INSTANCE_TYPES = [
    // Shared CPU
    "g6-nanode-1", "g6-standard-1", "g6-standard-2", "g6-standard-4",
    "g6-standard-6", "g6-standard-8", "g6-standard-16", "g6-standard-20",
    "g6-standard-24", "g6-standard-32",
    // Dedicated CPU
    "g6-dedicated-2", "g6-dedicated-4", "g6-dedicated-8", "g6-dedicated-16",
    "g6-dedicated-32", "g6-dedicated-48", "g6-dedicated-50", "g6-dedicated-56",
    "g6-dedicated-64",
    // High Memory
    "g7-highmem-1", "g7-highmem-2", "g7-highmem-4", "g7-highmem-8",
    "g7-highmem-16",
  ];

  // Minimum recommended instance types for control plane
  private static readonly MIN_CONTROL_PLANE_TYPES = [
    "g6-standard-2", "g6-standard-4", "g6-standard-6", "g6-standard-8",
    "g6-dedicated-2", "g6-dedicated-4", "g6-dedicated-8", "g6-dedicated-16",
    "g7-highmem-2", "g7-highmem-4", "g7-highmem-8",
  ];

  protected doValidate(config: ClusterConfig): void {
    if (config.controlPlane.count < 1) {
      throw new Error("Control plane count must be at least 1");
    }

    if (config.controlPlane.count === 2) {
      throw new Error(
        "Control plane count of 2 is not recommended. Use 1 or 3+ for HA"
      );
    }

    // Validate default instance type
    if (!config.controlPlane.instanceType) {
      throw new Error("Control plane instance type is required");
    }

    if (!ControlPlaneValidator.VALID_INSTANCE_TYPES.includes(config.controlPlane.instanceType)) {
      throw new Error(
        `Invalid control plane instance type: ${config.controlPlane.instanceType}. ` +
        `Valid types: ${ControlPlaneValidator.VALID_INSTANCE_TYPES.join(", ")}`
      );
    }

    // Warn if instance type is too small
    if (!ControlPlaneValidator.MIN_CONTROL_PLANE_TYPES.includes(config.controlPlane.instanceType)) {
      console.warn(
        `⚠️  Warning: ${config.controlPlane.instanceType} may be too small for control plane. ` +
        `Recommended: g6-standard-2 or larger`
      );
    }

    // Validate nodes array
    if (
      config.controlPlane.nodes &&
      config.controlPlane.nodes.length !== config.controlPlane.count
    ) {
      throw new Error(
        `Control plane nodes array length (${config.controlPlane.nodes.length}) ` +
          `does not match count (${config.controlPlane.count})`
      );
    }

    // Validate individual node configurations
    if (config.controlPlane.nodes) {
      const nodeNames = new Set<string>();

      config.controlPlane.nodes.forEach((node, index) => {
        // Validate node name
        if (!node.name || node.name.trim().length === 0) {
          throw new Error(`Control plane node at index ${index} must have a name`);
        }

        // Check for duplicate names
        if (nodeNames.has(node.name)) {
          throw new Error(`Duplicate control plane node name: ${node.name}`);
        }
        nodeNames.add(node.name);

        // Validate instance type
        if (!node.instanceType) {
          throw new Error(`Control plane node ${node.name} must have an instance type`);
        }

        if (!ControlPlaneValidator.VALID_INSTANCE_TYPES.includes(node.instanceType)) {
          throw new Error(
            `Invalid instance type for control plane node ${node.name}: ${node.instanceType}`
          );
        }

        // Validate labels
        if (node.labels) {
          Object.entries(node.labels).forEach(([key, value]) => {
            if (!/^[a-z0-9A-Z]([-a-z0-9A-Z_.]*[a-z0-9A-Z])?$/.test(key)) {
              throw new Error(
                `Invalid label key "${key}" on control plane node ${node.name}. ` +
                `Must be alphanumeric with -, _, or .`
              );
            }
            if (key.length > 63) {
              throw new Error(`Label key "${key}" exceeds 63 characters on node ${node.name}`);
            }
            if (value.length > 63) {
              throw new Error(`Label value "${value}" exceeds 63 characters on node ${node.name}`);
            }
          });
        }
      });
    }
  }
}

/**
 * Validates worker configuration
 */
export class WorkerValidator extends BaseValidator {
  // Same instance types as control plane
  private static readonly VALID_INSTANCE_TYPES = [
    // Shared CPU
    "g6-nanode-1", "g6-standard-1", "g6-standard-2", "g6-standard-4",
    "g6-standard-6", "g6-standard-8", "g6-standard-16", "g6-standard-20",
    "g6-standard-24", "g6-standard-32",
    // Dedicated CPU
    "g6-dedicated-2", "g6-dedicated-4", "g6-dedicated-8", "g6-dedicated-16",
    "g6-dedicated-32", "g6-dedicated-48", "g6-dedicated-50", "g6-dedicated-56",
    "g6-dedicated-64",
    // High Memory
    "g7-highmem-1", "g7-highmem-2", "g7-highmem-4", "g7-highmem-8",
    "g7-highmem-16",
  ];

  protected doValidate(config: ClusterConfig): void {
    if (config.workers.count < 0) {
      throw new Error("Worker count cannot be negative");
    }

    // Validate default instance type
    if (!config.workers.instanceType) {
      throw new Error("Worker instance type is required");
    }

    if (!WorkerValidator.VALID_INSTANCE_TYPES.includes(config.workers.instanceType)) {
      throw new Error(
        `Invalid worker instance type: ${config.workers.instanceType}. ` +
        `Valid types: ${WorkerValidator.VALID_INSTANCE_TYPES.join(", ")}`
      );
    }

    // Validate nodes array length
    if (
      config.workers.nodes &&
      config.workers.nodes.length !== config.workers.count
    ) {
      throw new Error(
        `Worker nodes array length (${config.workers.nodes.length}) ` +
          `does not match count (${config.workers.count})`
      );
    }

    // Validate individual worker nodes
    if (config.workers.nodes) {
      const nodeNames = new Set<string>();

      config.workers.nodes.forEach((node, index) => {
        // Validate node name
        if (!node.name || node.name.trim().length === 0) {
          throw new Error(`Worker node at index ${index} must have a name`);
        }

        // Check for duplicate names
        if (nodeNames.has(node.name)) {
          throw new Error(`Duplicate worker node name: ${node.name}`);
        }
        nodeNames.add(node.name);

        // Validate instance type
        if (!node.instanceType) {
          throw new Error(`Worker node ${node.name} must have an instance type`);
        }

        if (!WorkerValidator.VALID_INSTANCE_TYPES.includes(node.instanceType)) {
          throw new Error(
            `Invalid instance type for worker node ${node.name}: ${node.instanceType}`
          );
        }

        // Validate labels
        if (node.labels) {
          Object.entries(node.labels).forEach(([key, value]) => {
            if (!/^[a-z0-9A-Z]([-a-z0-9A-Z_.]*[a-z0-9A-Z])?$/.test(key)) {
              throw new Error(
                `Invalid label key "${key}" on worker node ${node.name}. ` +
                `Must be alphanumeric with -, _, or .`
              );
            }
            if (key.length > 63) {
              throw new Error(`Label key "${key}" exceeds 63 characters on node ${node.name}`);
            }
            if (value.length > 63) {
              throw new Error(`Label value "${value}" exceeds 63 characters on node ${node.name}`);
            }
          });
        }
      });
    }
  }
}

/**
 * Validates basic cluster information
 */
export class BasicInfoValidator extends BaseValidator {
  // Linode valid regions
  private static readonly VALID_REGIONS = [
    "us-east", "us-southeast", "us-central", "us-west", "us-iad", "us-ord", "us-mia",
    "ca-central", "eu-west", "eu-central", "ap-south", "ap-northeast", "ap-southeast",
    "ap-west", "jp-osa", "in-maa", "br-gru", "nl-ams", "se-sto", "es-mad", "fr-par",
    "it-mil", "id-cgk", "gb-lon"
  ];

  // Common Linode images
  private static readonly VALID_IMAGE_PATTERNS = [
    /^linode\/ubuntu\d+\.\d+$/,
    /^linode\/debian\d+$/,
    /^linode\/centos\d+$/,
    /^linode\/fedora\d+$/,
    /^linode\/rocky\d+$/,
    /^linode\/almalinux\d+$/,
  ];

  // Cluster name pattern (DNS-compatible)
  private static readonly CLUSTER_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

  protected doValidate(config: ClusterConfig): void {
    // Validate cluster name
    if (!config.name || config.name.trim().length === 0) {
      throw new Error("Cluster name is required");
    }

    if (config.name.length > 63) {
      throw new Error("Cluster name must be 63 characters or less");
    }

    if (!BasicInfoValidator.CLUSTER_NAME_PATTERN.test(config.name)) {
      throw new Error(
        "Cluster name must be DNS-compatible: lowercase letters, numbers, and hyphens only. " +
        "Cannot start or end with a hyphen."
      );
    }

    // Validate region
    if (!config.region || config.region.trim().length === 0) {
      throw new Error("Cluster region is required");
    }

    if (!BasicInfoValidator.VALID_REGIONS.includes(config.region)) {
      throw new Error(
        `Invalid region: ${config.region}. Valid regions: ${BasicInfoValidator.VALID_REGIONS.join(", ")}`
      );
    }

    // Validate image
    if (!config.image || config.image.trim().length === 0) {
      throw new Error("Cluster image is required");
    }

    const imageValid = BasicInfoValidator.VALID_IMAGE_PATTERNS.some(pattern =>
      pattern.test(config.image)
    );

    if (!imageValid) {
      throw new Error(
        `Invalid image format: ${config.image}. Expected format like: linode/ubuntu22.04, linode/debian11, etc.`
      );
    }

    // Validate root password
    if (!config.rootPassword) {
      throw new Error("Root password is required");
    }

    // Validate tags if present
    if (config.tags) {
      if (!Array.isArray(config.tags)) {
        throw new Error("Tags must be an array");
      }

      if (config.tags.length > 50) {
        throw new Error("Maximum 50 tags allowed");
      }

      config.tags.forEach((tag, index) => {
        if (typeof tag !== "string") {
          throw new Error(`Tag at index ${index} must be a string`);
        }

        if (tag.length > 255) {
          throw new Error(`Tag "${tag}" exceeds 255 characters`);
        }
      });
    }
  }
}

/**
 * Validates K3s configuration
 */
export class K3sValidator extends BaseValidator {
  // K3s version pattern (e.g., v1.28.5+k3s1)
  private static readonly K3S_VERSION_PATTERN = /^v\d+\.\d+\.\d+\+k3s\d+$/;

  // Valid K3s channels
  private static readonly VALID_CHANNELS = ["stable", "latest", "testing"];

  // Known disableable components
  private static readonly VALID_DISABLE_COMPONENTS = [
    "coredns", "servicelb", "traefik", "local-storage", "metrics-server"
  ];

  protected doValidate(config: ClusterConfig): void {
    // Validate version format
    if (!config.k3s.version) {
      throw new Error("K3s version is required");
    }

    if (!K3sValidator.K3S_VERSION_PATTERN.test(config.k3s.version)) {
      throw new Error(
        `Invalid K3s version format: ${config.k3s.version}. ` +
        `Expected format: v1.28.5+k3s1`
      );
    }

    // Validate channel
    if (config.k3s.channel) {
      if (!K3sValidator.VALID_CHANNELS.includes(config.k3s.channel)) {
        throw new Error(
          `Invalid K3s channel: ${config.k3s.channel}. ` +
          `Valid channels: ${K3sValidator.VALID_CHANNELS.join(", ")}`
        );
      }
    }

    // Validate disable components
    if (config.k3s.disableComponents) {
      if (!Array.isArray(config.k3s.disableComponents)) {
        throw new Error("K3s disableComponents must be an array");
      }

      config.k3s.disableComponents.forEach(component => {
        if (!K3sValidator.VALID_DISABLE_COMPONENTS.includes(component)) {
          console.warn(
            `⚠️  Warning: Disabling unknown K3s component: ${component}. ` +
            `Known components: ${K3sValidator.VALID_DISABLE_COMPONENTS.join(", ")}`
          );
        }
      });
    }

    // Validate server args
    if (config.k3s.serverArgs) {
      if (!Array.isArray(config.k3s.serverArgs)) {
        throw new Error("K3s serverArgs must be an array");
      }
    }

    // Validate agent args
    if (config.k3s.agentArgs) {
      if (!Array.isArray(config.k3s.agentArgs)) {
        throw new Error("K3s agentArgs must be an array");
      }
    }
  }
}

/**
 * Validates SSH configuration
 */
export class SshValidator extends BaseValidator {
  private static readonly VALID_KEY_TYPES = ["rsa", "ed25519"];

  protected doValidate(config: ClusterConfig): void {
    const autoGenerate = config.ssh.autoGenerate ?? true;

    // Validate key type
    if (config.ssh.keyType && !SshValidator.VALID_KEY_TYPES.includes(config.ssh.keyType)) {
      throw new Error(
        `Invalid SSH key type: ${config.ssh.keyType}. Valid types: ${SshValidator.VALID_KEY_TYPES.join(", ")}`
      );
    }

    // Validate key bits for RSA
    if (config.ssh.keyType === "rsa" && config.ssh.keyBits) {
      if (config.ssh.keyBits < 2048) {
        throw new Error("RSA key bits must be at least 2048");
      }
      if (config.ssh.keyBits > 16384) {
        throw new Error("RSA key bits cannot exceed 16384");
      }
    }

    if (!autoGenerate) {
      // If not auto-generating, must have keys
      if (!config.ssh.publicKey && !config.ssh.publicKeyPath) {
        throw new Error(
          "SSH public key or publicKeyPath is required when autoGenerate is false"
        );
      }

      if (!config.ssh.privateKey && !config.ssh.privateKeyPath) {
        throw new Error(
          "SSH private key or privateKeyPath is required when autoGenerate is false"
        );
      }
    }
  }
}

/**
 * Validates network configuration
 */
export class NetworkValidator extends BaseValidator {
  // CIDR validation regex
  private static readonly CIDR_PATTERN = /^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[0-2])$/;

  protected doValidate(config: ClusterConfig): void {
    const allowFromAnywhere = config.network?.allowSshFromAnywhere ?? true;

    if (!allowFromAnywhere) {
      const allowedCidrs = config.network?.allowedSshCidrs || [];
      if (allowedCidrs.length === 0) {
        throw new Error(
          "allowedSshCidrs must be specified when allowSshFromAnywhere is false"
        );
      }

      // Validate each CIDR
      allowedCidrs.forEach((cidr, index) => {
        if (!NetworkValidator.CIDR_PATTERN.test(cidr)) {
          throw new Error(`Invalid CIDR format at index ${index}: ${cidr}`);
        }

        // Validate IP octets
        const [ip, mask] = cidr.split("/");
        const octets = ip.split(".").map(Number);

        if (octets.some(octet => octet < 0 || octet > 255)) {
          throw new Error(`Invalid IP address in CIDR: ${cidr}`);
        }

        // Check for overly permissive CIDRs
        const maskNum = parseInt(mask);
        if (maskNum < 8) {
          console.warn(
            `⚠️  Warning: Very broad CIDR detected: ${cidr}. ` +
            `Consider using more specific IP ranges for better security.`
          );
        }
      });
    }

    // Validate node port range
    if (config.network?.nodePortRange) {
      const { start, end } = config.network.nodePortRange;

      if (start >= end) {
        throw new Error("NodePort range start must be less than end");
      }

      if (start < 1 || end > 65535) {
        throw new Error("NodePort range must be between 1 and 65535");
      }

      // Kubernetes default NodePort range
      if (start < 30000 || end > 32767) {
        console.warn(
          `⚠️  Warning: NodePort range ${start}-${end} is outside Kubernetes default (30000-32767). ` +
          `Make sure K3s is configured to support this range.`
        );
      }
    }
  }
}

/**
 * Validates VPC configuration
 */
export class VpcValidator extends BaseValidator {
  private static readonly CIDR_PATTERN = /^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[0-2])$/;

  // RFC 1918 private IP ranges
  private static readonly PRIVATE_IP_RANGES = [
    { pattern: /^10\./, mask: [8, 24], description: "10.0.0.0/8" },
    { pattern: /^172\.(1[6-9]|2[0-9]|3[0-1])\./, mask: [12, 28], description: "172.16.0.0/12" },
    { pattern: /^192\.168\./, mask: [16, 29], description: "192.168.0.0/16" },
  ];

  protected doValidate(config: ClusterConfig): void {
    if (config.vpc?.enabled) {
      // Validate label if provided
      if (config.vpc.label) {
        if (config.vpc.label.length > 64) {
          throw new Error("VPC label must be 64 characters or less");
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(config.vpc.label)) {
          throw new Error("VPC label must contain only letters, numbers, hyphens, and underscores");
        }
      }

      // Validate subnet CIDR
      if (config.vpc.subnetIpv4) {
        const cidr = config.vpc.subnetIpv4;

        if (!VpcValidator.CIDR_PATTERN.test(cidr)) {
          throw new Error(`Invalid CIDR format: ${cidr}. Expected format: 10.0.0.0/24`);
        }

        // Validate IP octets
        const [ip, mask] = cidr.split("/");
        const octets = ip.split(".").map(Number);

        if (octets.some(octet => octet < 0 || octet > 255)) {
          throw new Error(`Invalid IP address in CIDR: ${cidr}`);
        }

        // Check if it's a private IP range
        const isPrivate = VpcValidator.PRIVATE_IP_RANGES.some(range =>
          range.pattern.test(ip)
        );

        if (!isPrivate) {
          console.warn(
            `⚠️  Warning: VPC subnet ${cidr} is not in RFC 1918 private IP range. ` +
            `Recommended ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16`
          );
        }

        // Validate subnet mask size
        const maskNum = parseInt(mask);
        if (maskNum < 16) {
          console.warn(
            `⚠️  Warning: VPC subnet ${cidr} is very large (/${maskNum}). ` +
            `Consider using /24 or smaller for better IP management.`
          );
        }

        if (maskNum > 28) {
          throw new Error(
            `VPC subnet ${cidr} is too small (/${maskNum}). ` +
            `Must be /28 or larger to accommodate cluster nodes.`
          );
        }
      }

      // Validate subnet label
      if (config.vpc.subnetLabel) {
        if (config.vpc.subnetLabel.length > 64) {
          throw new Error("VPC subnet label must be 64 characters or less");
        }
      }
    }
  }
}

/**
 * Validates Bastion configuration
 */
export class BastionValidator extends BaseValidator {
  private static readonly VALID_INSTANCE_TYPES = [
    "g6-nanode-1", "g6-standard-1", "g6-standard-2", "g6-standard-4",
  ];

  protected doValidate(config: ClusterConfig): void {
    if (config.bastion?.enabled) {
      // Validate instance type if provided
      if (config.bastion.instanceType) {
        if (!BastionValidator.VALID_INSTANCE_TYPES.includes(config.bastion.instanceType)) {
          throw new Error(
            `Invalid bastion instance type: ${config.bastion.instanceType}. ` +
            `Valid types: ${BastionValidator.VALID_INSTANCE_TYPES.join(", ")}`
          );
        }
      }

      // Validate labels
      if (config.bastion.labels) {
        Object.entries(config.bastion.labels).forEach(([key, value]) => {
          if (!/^[a-z0-9A-Z]([-a-z0-9A-Z_.]*[a-z0-9A-Z])?$/.test(key)) {
            throw new Error(
              `Invalid label key "${key}" on bastion. ` +
              `Must be alphanumeric with -, _, or .`
            );
          }
          if (key.length > 63) {
            throw new Error(`Label key "${key}" exceeds 63 characters on bastion`);
          }
          if (value.length > 63) {
            throw new Error(`Label value "${value}" exceeds 63 characters on bastion`);
          }
        });
      }
    }
  }
}

/**
 * Validates ArgoCD configuration
 */
export class ArgoCDValidator extends BaseValidator {
  // Git URL patterns
  private static readonly GIT_URL_PATTERNS = [
    /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^https:\/\/gitlab\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^https:\/\/bitbucket\.org\/[\w-]+\/[\w.-]+(?:\.git)?$/,
    /^git@github\.com:[\w-]+\/[\w.-]+\.git$/,
    /^git@gitlab\.com:[\w-]+\/[\w.-]+\.git$/,
  ];

  // Valid ArgoCD versions
  private static readonly VERSION_PATTERN = /^(stable|latest|v\d+\.\d+\.\d+)$/;

  protected doValidate(config: ClusterConfig): void {
    if (config.argocd?.enabled) {
      // Validate gitRepo is required when enabled
      if (!config.argocd.gitRepo) {
        throw new Error("ArgoCD gitRepo is required when ArgoCD is enabled");
      }

      // Validate git repo URL format
      const isValidGitUrl = ArgoCDValidator.GIT_URL_PATTERNS.some(pattern =>
        pattern.test(config.argocd!.gitRepo!)
      );

      if (!isValidGitUrl) {
        throw new Error(
          `Invalid ArgoCD gitRepo URL: ${config.argocd.gitRepo}. ` +
          `Expected GitHub, GitLab, or Bitbucket URL format.`
        );
      }

      // Validate version format
      if (config.argocd.version) {
        if (!ArgoCDValidator.VERSION_PATTERN.test(config.argocd.version)) {
          throw new Error(
            `Invalid ArgoCD version: ${config.argocd.version}. ` +
            `Expected: stable, latest, or v2.9.0 format`
          );
        }
      }

      // Validate gitPath
      if (config.argocd.gitPath !== undefined) {
        if (config.argocd.gitPath.length === 0) {
          throw new Error("ArgoCD gitPath cannot be empty");
        }

        // Warn about common mistakes
        if (config.argocd.gitPath.startsWith("/")) {
          console.warn(
            `⚠️  Warning: ArgoCD gitPath "${config.argocd.gitPath}" starts with /. ` +
            `Relative paths are usually preferred.`
          );
        }

        // Info about wildcard usage
        if (!config.argocd.gitPath.includes("*") && !config.argocd.gitPath.includes("/")) {
          console.log(
            `ℹ️  ArgoCD gitPath "${config.argocd.gitPath}" will apply all .yaml files from this directory`
          );
        }
      }

      // Validate gitBranch
      if (config.argocd.gitBranch !== undefined) {
        if (config.argocd.gitBranch.length === 0) {
          throw new Error("ArgoCD gitBranch cannot be empty");
        }

        // Basic branch name validation
        if (!/^[a-zA-Z0-9/_.-]+$/.test(config.argocd.gitBranch)) {
          throw new Error(
            `Invalid ArgoCD gitBranch: ${config.argocd.gitBranch}. ` +
            `Branch names can contain letters, numbers, /, _, ., and -`
          );
        }
      }
    }
  }
}

/**
 * Validation chain builder
 */
export class ValidationChainBuilder {
  static build(): ConfigValidator {
    const basicInfoValidator = new BasicInfoValidator();
    const controlPlaneValidator = new ControlPlaneValidator();
    const workerValidator = new WorkerValidator();
    const k3sValidator = new K3sValidator();
    const sshValidator = new SshValidator();
    const networkValidator = new NetworkValidator();
    const vpcValidator = new VpcValidator();
    const bastionValidator = new BastionValidator();
    const argoCDValidator = new ArgoCDValidator();

    // Build the chain
    basicInfoValidator
      .setNext(controlPlaneValidator)
      .setNext(workerValidator)
      .setNext(k3sValidator)
      .setNext(sshValidator)
      .setNext(networkValidator)
      .setNext(vpcValidator)
      .setNext(bastionValidator)
      .setNext(argoCDValidator);

    return basicInfoValidator;
  }
}
