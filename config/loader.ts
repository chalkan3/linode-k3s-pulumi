import * as pulumi from "@pulumi/pulumi";
import { ClusterConfig } from "./types";
import { ValidationChainBuilder } from "./validation/config-checker";

/**
 * Load cluster configuration from Pulumi config
 * Uses clean YAML structure with Pulumi's native object support
 */
export function loadClusterConfig(): ClusterConfig {
  const config = new pulumi.Config();

  // Load structured objects directly from YAML
  const clusterObj = config.requireObject<any>("cluster");
  const controlPlaneObj = config.requireObject<any>("controlPlane");
  const workersObj = config.requireObject<any>("workers");
  const k3sObj = config.requireObject<any>("k3s");
  const sshObj = config.requireObject<any>("ssh");
  const vpcObj = config.getObject<any>("vpc") || { enabled: false };
  const networkObj = config.getObject<any>("network") || { allowSshFromAnywhere: true };
  const bastionObj = config.getObject<any>("bastion") || { enabled: true, instanceType: "g6-nanode-1" };
  const argocdObj = config.getObject<any>("argocd") || { enabled: false };
  const secretsObj = config.requireObject<any>("secrets");

  // Build cluster configuration
  const clusterConfig: ClusterConfig = {
    name: clusterObj.name,
    region: clusterObj.region,
    image: clusterObj.image,
    rootPassword: config.requireSecret("secrets.rootPassword"),
    tags: clusterObj.tags,

    controlPlane: {
      count: controlPlaneObj.count,
      instanceType: controlPlaneObj.instanceType,
      labels: controlPlaneObj.labels,
      nodes: controlPlaneObj.nodes,
    },

    workers: {
      count: workersObj.count,
      instanceType: workersObj.instanceType,
      labels: workersObj.labels,
      nodes: workersObj.nodes,
    },

    k3s: {
      version: k3sObj.version,
      channel: k3sObj.channel || "stable",
      serverArgs: k3sObj.serverArgs,
      agentArgs: k3sObj.agentArgs,
      disableComponents: k3sObj.disableComponents || ["traefik"],
      datastoreEndpoint: k3sObj.datastoreEndpoint,
    },

    ssh: {
      autoGenerate: sshObj.autoGenerate ?? true,
      keyType: sshObj.keyType || "ed25519",
      keyBits: sshObj.keyBits || 4096,
    },

    vpc: {
      enabled: vpcObj.enabled ?? false,
      label: vpcObj.label,
      description: vpcObj.description,
      subnetLabel: vpcObj.subnetLabel,
      subnetIpv4: vpcObj.subnetIpv4 || "10.0.0.0/24",
    },

    network: {
      allowSshFromAnywhere: networkObj.allowSshFromAnywhere ?? true,
      allowedSshCidrs: networkObj.allowedSshCidrs || ["0.0.0.0/0"],
      nodePortRange: networkObj.nodePortRange || {
        start: 30000,
        end: 32767,
      },
    },

    bastion: {
      enabled: bastionObj.enabled ?? true,
      instanceType: bastionObj.instanceType || "g6-nanode-1",
      labels: bastionObj.labels,
    },

    argocd: {
      enabled: argocdObj.enabled ?? false,
      version: argocdObj.version || "stable",
      gitRepo: argocdObj.gitRepo,
      gitPath: argocdObj.gitPath || "apps/*",
      gitBranch: argocdObj.gitBranch || "main",
    },
  };

  // Validate configuration using Chain of Responsibility pattern
  const validator = ValidationChainBuilder.build();
  validator.validate(clusterConfig);

  return clusterConfig;
}
