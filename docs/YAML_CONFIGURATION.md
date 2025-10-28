# YAML Configuration Guide

This guide explains the new YAML-based configuration system for the Linode K3s cluster.

## Overview

The configuration is now split into multiple YAML files, each managing a specific domain:

```
config/yaml/
├── cluster.yaml          # Basic cluster information
├── control-plane.yaml    # Control plane node configuration
├── workers.yaml          # Worker nodes configuration
├── k3s.yaml             # K3s installation settings
├── ssh.yaml             # SSH key configuration
├── vpc.yaml             # VPC settings
├── network.yaml         # Network and firewall rules
├── bastion.yaml         # Bastion host configuration
└── argocd.yaml          # ArgoCD installation settings
```

## Benefits

- **Separation of Concerns**: Each file focuses on one aspect of the infrastructure
- **Better Readability**: YAML format is cleaner than Pulumi config format
- **Type Safety**: Configurations are validated using design patterns
- **Reusability**: Easy to copy and modify for different environments

## Design Patterns Applied

### 1. Builder Pattern
The `ClusterConfigBuilder` provides a fluent interface for constructing complex configurations:

```typescript
const builder = new ClusterConfigBuilder()
  .setBasicInfo(name, region, image)
  .setControlPlane(controlPlaneConfig)
  .setWorkers(workerConfig)
  .build();
```

### 2. Factory Pattern
The `NodeFactory` and `ComponentFactory` centralize object creation:

```typescript
const nodes = NodeFactory.createControlPlaneNodes(
  clusterName,
  count,
  defaultArgs,
  globalLabels,
  nodeConfigs
);
```

### 3. Strategy Pattern
Different installation strategies for control plane and workers:

```typescript
const strategy = new K3sServerInstallStrategy(token, disableComponents);
const installScript = strategy.generateInstallScript(context);
```

### 4. Chain of Responsibility Pattern
Validators are chained to validate different aspects:

```typescript
const validator = ValidationChainBuilder.build();
validator.validate(config);
```

## Configuration Files

### cluster.yaml

Basic cluster settings:

```yaml
name: "my-k3s-cluster"
region: "us-mia"
image: "linode/ubuntu22.04"

tags:
  - production
  - k3s
  - my-project
```

### control-plane.yaml

Control plane node configuration:

```yaml
count: 3
instanceType: "g6-standard-4"

labels:
  environment: production
  role: master

nodes:
  - name: "master-1"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-1"

  - name: "master-2"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-2"

  - name: "master-3"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-3"
```

### workers.yaml

Worker nodes configuration with specialized workloads:

```yaml
count: 5
instanceType: "g6-standard-2"

labels:
  environment: production

nodes:
  - name: "worker-postgres-1"
    instanceType: "g6-standard-4"
    labels:
      workload: postgres
      database: postgresql
      node-id: "postgres-1"

  - name: "worker-postgres-2"
    instanceType: "g6-standard-4"
    labels:
      workload: postgres
      database: postgresql
      node-id: "postgres-2"

  - name: "worker-clickhouse-1"
    instanceType: "g6-standard-4"
    labels:
      workload: clickhouse
      database: clickhouse
      node-id: "clickhouse-1"

  - name: "worker-peerdb-1"
    instanceType: "g6-standard-2"
    labels:
      workload: peerdb
      app: peerdb
      node-id: "peerdb-1"

  - name: "worker-peerdb-2"
    instanceType: "g6-standard-2"
    labels:
      workload: peerdb
      app: peerdb
      node-id: "peerdb-2"
```

### k3s.yaml

K3s installation settings:

```yaml
version: "v1.28.5+k3s1"
channel: "stable"

disableComponents:
  - traefik

# Optional server arguments
# serverArgs:
#   - "--disable-cloud-controller"
#   - "--cluster-cidr=10.42.0.0/16"

# Optional agent arguments
# agentArgs:
#   - "--node-ip=0.0.0.0"
```

### ssh.yaml

SSH key configuration:

```yaml
autoGenerate: true
keyType: "ed25519"
keyBits: 4096

# To use existing keys:
# autoGenerate: false
# publicKeyPath: "/path/to/id_rsa.pub"
# privateKeyPath: "/path/to/id_rsa"
```

### vpc.yaml

VPC configuration:

```yaml
enabled: false

# If enabled:
# label: "my-k3s-vpc"
# description: "VPC for K3s cluster"
# subnetLabel: "my-k3s-subnet"
# subnetIpv4: "10.0.0.0/24"
```

### network.yaml

Network and firewall settings:

```yaml
allowSshFromAnywhere: true

# If not allowing from anywhere:
# allowedSshCidrs:
#   - "192.168.1.0/24"
#   - "10.0.0.0/8"

nodePortRange:
  start: 30000
  end: 32767
```

### bastion.yaml

Bastion host configuration:

```yaml
enabled: true
instanceType: "g6-standard-1"

# Optional labels:
# labels:
#   role: bastion
#   security: high
```

### argocd.yaml

ArgoCD installation:

```yaml
enabled: false

# If enabled:
# version: "stable"
# gitRepo: "https://github.com/your-user/your-repo.git"
# gitPath: "apps/*"
# gitBranch: "main"
```

## Secrets Management

Sensitive data like passwords and tokens are still managed through Pulumi config:

```bash
# Set root password (required)
pulumi config set --secret cluster.rootPassword "YourSecurePassword123!"

# Set Linode token (required)
pulumi config set --secret linode:token "your-linode-api-token"
```

## Migration from Legacy Config

The system automatically detects if YAML files exist and uses them. If not, it falls back to the legacy Pulumi config format.

To migrate:

1. Copy your existing configuration values from `Pulumi.<stack>.yaml` to the appropriate YAML files in `config/yaml/`
2. Ensure all required fields are set
3. The system will automatically use the new YAML configuration

## Architecture Classes

### Builders
- `ClusterConfigBuilder`: Main configuration builder
- `ControlPlaneBuilder`: Control plane configuration builder
- `WorkerBuilder`: Worker configuration builder

### Factories
- `NodeFactory`: Creates control plane and worker nodes
- `ComponentFactory`: Creates infrastructure components (VPC, Network, SSH, Bastion, etc.)

### Strategies
- `InstallationStrategy`: Base strategy interface
- `DirectConnectionStrategy`: Direct SSH connection
- `BastionConnectionStrategy`: SSH through bastion host
- `K3sServerInstallStrategy`: K3s server installation
- `K3sAgentInstallStrategy`: K3s agent installation

### Validators
- `BaseValidator`: Chain of responsibility base
- `BasicInfoValidator`: Validates basic cluster info
- `ControlPlaneValidator`: Validates control plane config
- `WorkerValidator`: Validates worker config
- `SshValidator`: Validates SSH config
- `NetworkValidator`: Validates network config
- `VpcValidator`: Validates VPC config
- `ArgoCDValidator`: Validates ArgoCD config

## Example: Creating a Custom Environment

1. Copy the `config/yaml` directory:
   ```bash
   cp -r config/yaml config/yaml-staging
   ```

2. Modify the files for your staging environment

3. Update the loader to use your custom config:
   ```typescript
   const loader = new YamlConfigLoader("config/yaml-staging");
   const config = loader.loadClusterConfig();
   ```

## Best Practices

1. **Keep secrets in Pulumi config**: Never put passwords or tokens in YAML files
2. **Use meaningful labels**: Labels help with node selection and monitoring
3. **Validate before deploying**: The validation chain will catch configuration errors
4. **Version control your YAML files**: Track changes to your infrastructure configuration
5. **Use separate configs per environment**: dev, staging, production

## Troubleshooting

### "Configuration file not found" error
- Ensure all required YAML files exist in `config/yaml/`
- Check file permissions

### Validation errors
- Read the error message carefully
- Check that node counts match between `count` and `nodes` array length
- Ensure all required fields are present

### SSH key errors
- If `autoGenerate: false`, ensure keys exist at the specified paths
- Check file permissions on SSH keys (should be 600 for private key)

## Next Steps

- Review the [Design Patterns Documentation](./DESIGN_PATTERNS.md)
- See [Examples](./EXAMPLES.md) for common configurations
- Check [API Reference](./API_REFERENCE.md) for detailed type information
