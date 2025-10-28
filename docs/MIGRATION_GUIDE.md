# Migration Guide: Legacy Config to YAML

This guide helps you migrate from the legacy Pulumi config format to the new structured YAML configuration.

## Overview

The new YAML-based configuration system offers:
- Better organization with separate files per domain
- Improved readability with YAML syntax
- Type-safe configuration with Builder pattern
- Automatic validation with Chain of Responsibility pattern
- Object-oriented design with Factory and Strategy patterns

## Migration Steps

### Step 1: Understand Your Current Configuration

First, review your current `Pulumi.dev.yaml` (or `Pulumi.<stack>.yaml`):

```yaml
config:
  linode-k3s-cluster:cluster.name: "my-k3s-cluster"
  linode-k3s-cluster:cluster.region: "us-mia"
  linode-k3s-cluster:controlPlane.count: "3"
  linode-k3s-cluster:controlPlane.instanceType: "g6-standard-4"
  # ... etc
```

### Step 2: Create YAML Configuration Directory

The YAML files should already exist in `config/yaml/`. If not:

```bash
mkdir -p config/yaml
```

### Step 3: Migrate Each Configuration Domain

#### 3.1 Cluster Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:cluster.name: "my-k3s-cluster"
linode-k3s-cluster:cluster.region: "us-mia"
linode-k3s-cluster:cluster.image: "linode/ubuntu22.04"
linode-k3s-cluster:cluster.tags: "production,k3s,my-project"
```

To `config/yaml/cluster.yaml`:
```yaml
name: "my-k3s-cluster"
region: "us-mia"
image: "linode/ubuntu22.04"

tags:
  - production
  - k3s
  - my-project
```

#### 3.2 Control Plane Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:controlPlane.count: "3"
linode-k3s-cluster:controlPlane.instanceType: "g6-standard-4"
linode-k3s-cluster:controlPlane.labels: "environment=production,role=master"
linode-k3s-cluster:controlPlane.nodes: '[{"name":"master-1","instanceType":"g6-standard-4","labels":{"node-id":"master-1"}}]'
```

To `config/yaml/control-plane.yaml`:
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

#### 3.3 Workers Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:workers.count: "5"
linode-k3s-cluster:workers.instanceType: "g6-standard-2"
linode-k3s-cluster:workers.labels: "environment=production"
linode-k3s-cluster:workers.nodes: '[{"name":"worker-1","instanceType":"g6-standard-4","labels":{"workload":"postgres"}}]'
```

To `config/yaml/workers.yaml`:
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
  # ... more workers
```

#### 3.4 K3s Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:k3s.version: "v1.28.5+k3s1"
linode-k3s-cluster:k3s.channel: "stable"
linode-k3s-cluster:k3s.disableComponents: "traefik"
```

To `config/yaml/k3s.yaml`:
```yaml
version: "v1.28.5+k3s1"
channel: "stable"

disableComponents:
  - traefik
```

#### 3.5 SSH Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:ssh.autoGenerate: "true"
linode-k3s-cluster:ssh.keyType: "ed25519"
linode-k3s-cluster:ssh.keyBits: "4096"
```

To `config/yaml/ssh.yaml`:
```yaml
autoGenerate: true
keyType: "ed25519"
keyBits: 4096
```

#### 3.6 VPC Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:vpc.enabled: "false"
```

To `config/yaml/vpc.yaml`:
```yaml
enabled: false
```

#### 3.7 Network Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:network.allowSshFromAnywhere: "true"
```

To `config/yaml/network.yaml`:
```yaml
allowSshFromAnywhere: true

nodePortRange:
  start: 30000
  end: 32767
```

#### 3.8 Bastion Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:bastion.enabled: "true"
linode-k3s-cluster:bastion.instanceType: "g6-standard-1"
```

To `config/yaml/bastion.yaml`:
```yaml
enabled: true
instanceType: "g6-standard-1"
```

#### 3.9 ArgoCD Configuration

From Pulumi config:
```yaml
linode-k3s-cluster:argocd.enabled: "false"
```

To `config/yaml/argocd.yaml`:
```yaml
enabled: false
```

### Step 4: Keep Secrets in Pulumi Config

**IMPORTANT**: Do NOT move secrets to YAML files!

Keep these in your Pulumi config:
```bash
pulumi config set --secret cluster.rootPassword "YourSecurePassword123!"
pulumi config set --secret linode:token "your-linode-api-token"
```

### Step 5: Test Your Configuration

Run a preview to validate:

```bash
pulumi preview
```

You should see:
```
Loading configuration from YAML files...
```

If you see any errors, check:
1. All required YAML files exist
2. YAML syntax is correct
3. All required fields are present
4. Secrets are set in Pulumi config

### Step 6: Deploy

Once preview looks good:

```bash
pulumi up
```

## Comparison Table

| Aspect | Legacy Config | New YAML Config |
|--------|---------------|-----------------|
| **Format** | Flat key-value in Pulumi config | Structured YAML files |
| **Syntax** | `prefix:section.key: "value"` | `key: value` |
| **Arrays** | JSON strings | Native YAML arrays |
| **Objects** | JSON strings | Native YAML objects |
| **Labels** | `"key1=val1,key2=val2"` | `key1: val1` / `key2: val2` |
| **Readability** | Poor for complex configs | Excellent |
| **Validation** | Basic type checking | Full validation chain |
| **Reusability** | Difficult | Easy (copy files) |

## Common Issues

### Issue: "Configuration file not found"

**Solution**: Ensure all 9 YAML files exist:
```bash
ls -la config/yaml/
# Should show:
# - cluster.yaml
# - control-plane.yaml
# - workers.yaml
# - k3s.yaml
# - ssh.yaml
# - vpc.yaml
# - network.yaml
# - bastion.yaml
# - argocd.yaml
```

### Issue: "Root password is required"

**Solution**: Set the secret in Pulumi config:
```bash
pulumi config set --secret cluster.rootPassword "YourPassword"
```

### Issue: "Nodes array length does not match count"

**Solution**: In your YAML file, ensure the `nodes` array has exactly `count` items:

```yaml
count: 3
nodes:
  - name: "node-1"
  - name: "node-2"
  - name: "node-3"  # Must have exactly 3 nodes
```

### Issue: YAML Parsing Errors

**Solution**: Validate YAML syntax:
```bash
# Install yamllint
pip install yamllint

# Validate files
yamllint config/yaml/
```

## Rollback Plan

If you need to rollback to legacy config:

1. Rename or delete the YAML directory:
   ```bash
   mv config/yaml config/yaml.backup
   ```

2. The loader will automatically detect the absence of YAML files and use Pulumi config

3. Deploy with legacy config:
   ```bash
   pulumi up
   ```

## Benefits After Migration

✅ **Better Organization**: Configuration split by concern
✅ **Improved Readability**: Native YAML syntax
✅ **Type Safety**: Builder pattern validation
✅ **Better Validation**: Chain of Responsibility
✅ **Easier Testing**: Mock configurations easily
✅ **Version Control**: Track changes per domain
✅ **Reusability**: Copy and modify for new envs

## Next Steps

After migration:

1. Read the [YAML Configuration Guide](./YAML_CONFIGURATION.md)
2. Understand the [Design Patterns](./DESIGN_PATTERNS.md)
3. Review [Examples](./EXAMPLES.md)
4. Set up separate configs for staging/production

## Support

If you encounter issues:

1. Check the error message carefully
2. Review the [Troubleshooting section](./YAML_CONFIGURATION.md#troubleshooting)
3. Validate YAML syntax
4. Ensure all required secrets are set
5. Run `pulumi preview` to see what will change

## Example: Complete Migration

Before (Pulumi.dev.yaml):
```yaml
config:
  linode-k3s-cluster:cluster.name: "production-k3s"
  linode-k3s-cluster:cluster.region: "us-mia"
  linode-k3s-cluster:controlPlane.count: "3"
  linode-k3s-cluster:controlPlane.instanceType: "g6-standard-4"
  linode-k3s-cluster:workers.count: "5"
  linode-k3s-cluster:workers.instanceType: "g6-standard-2"
  linode-k3s-cluster:k3s.version: "v1.28.5+k3s1"
  linode-k3s-cluster:vpc.enabled: "false"
  linode-k3s-cluster:bastion.enabled: "true"
  linode-k3s-cluster:cluster.rootPassword:
    secure: v1:AWPOwUFgP8Z8HtbN:...
```

After (config/yaml/*.yaml + Pulumi.dev.yaml):
```yaml
# config/yaml/cluster.yaml
name: "production-k3s"
region: "us-mia"

# config/yaml/control-plane.yaml
count: 3
instanceType: "g6-standard-4"

# config/yaml/workers.yaml
count: 5
instanceType: "g6-standard-2"

# config/yaml/k3s.yaml
version: "v1.28.5+k3s1"

# ... other YAML files

# Pulumi.dev.yaml (only secrets remain)
config:
  linode-k3s-cluster:cluster.rootPassword:
    secure: v1:AWPOwUFgP8Z8HtbN:...
  linode:token:
    secure: v1:Ub9gp+EnPjMtj5BJ:...
```

Much cleaner and more maintainable!
