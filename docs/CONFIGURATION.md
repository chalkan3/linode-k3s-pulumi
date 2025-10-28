# Configuration Reference

## 📋 Overview

This document provides a complete reference for all configuration options available in `Pulumi.dev.yaml`. All configurations are validated before deployment to prevent errors.

---

## 🏗️ Configuration Structure

```yaml
config:
  linode-k3s-cluster:cluster:      # Basic cluster settings
  linode-k3s-cluster:controlPlane: # Master nodes configuration
  linode-k3s-cluster:workers:      # Worker nodes configuration
  linode-k3s-cluster:k3s:          # Kubernetes settings
  linode-k3s-cluster:ssh:          # SSH keys configuration
  linode-k3s-cluster:vpc:          # VPC settings (optional)
  linode-k3s-cluster:network:      # Network and firewall
  linode-k3s-cluster:bastion:      # Jump server settings
  linode-k3s-cluster:argocd:       # GitOps configuration
  linode-k3s-cluster:secrets:      # Encrypted secrets
```

---

## 1️⃣ Cluster Configuration

Basic cluster identification and settings.

```yaml
linode-k3s-cluster:cluster:
  name: string             # Cluster name (required)
  region: string           # Linode region (required)
  image: string            # OS image (required)
  tags: array<string>      # Resource tags (optional)
```

### Fields

#### `name` (required)
- **Type:** string
- **Format:** DNS-compatible (lowercase, alphanumeric, hyphens)
- **Max Length:** 63 characters
- **Pattern:** `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- **Example:** `my-k3s-cluster`, `production-cluster`
- **Invalid:** `My-Cluster` (uppercase), `-my-cluster` (starts with hyphen)

#### `region` (required)
- **Type:** string
- **Valid Values:**
  - **Americas:** `us-east`, `us-southeast`, `us-central`, `us-west`, `us-iad`, `us-ord`, `us-mia`, `ca-central`, `br-gru`
  - **Europe:** `eu-west`, `eu-central`, `gb-lon`, `nl-ams`, `se-sto`, `es-mad`, `fr-par`, `it-mil`
  - **Asia Pacific:** `ap-south`, `ap-northeast`, `ap-southeast`, `ap-west`, `jp-osa`, `in-maa`, `id-cgk`

#### `image` (required)
- **Type:** string
- **Format:** `linode/{distribution}{version}`
- **Valid Examples:**
  - `linode/ubuntu22.04`
  - `linode/ubuntu20.04`
  - `linode/debian11`
  - `linode/debian12`
  - `linode/centos9`
  - `linode/rocky9`
  - `linode/almalinux9`

#### `tags` (optional)
- **Type:** array of strings
- **Max Tags:** 50
- **Max Length per Tag:** 255 characters
- **Example:**
  ```yaml
  tags:
    - production
    - k3s
    - team-platform
  ```

### Example

```yaml
linode-k3s-cluster:cluster:
  name: production-k3s
  region: us-mia
  image: linode/ubuntu22.04
  tags:
    - production
    - kubernetes
    - platform
```

---

## 2️⃣ Control Plane Configuration

Master nodes configuration for Kubernetes control plane.

```yaml
linode-k3s-cluster:controlPlane:
  count: integer                 # Number of masters (required)
  instanceType: string           # Default instance type (required)
  labels: object                 # K8s labels for all masters (optional)
  nodes: array<NodeConfig>       # Individual node configs (optional)
```

### Fields

#### `count` (required)
- **Type:** integer
- **Min:** 1
- **Invalid:** 2 (etcd quorum issue)
- **Recommended:**
  - `1` for development/testing
  - `3` for production (HA)
  - `5` for large production clusters

#### `instanceType` (required)
- **Type:** string
- **Valid Types:**
  - **Shared CPU:** `g6-nanode-1`, `g6-standard-1`, `g6-standard-2`, `g6-standard-4`, `g6-standard-6`, `g6-standard-8`, `g6-standard-16`, `g6-standard-20`, `g6-standard-24`, `g6-standard-32`
  - **Dedicated CPU:** `g6-dedicated-2`, `g6-dedicated-4`, `g6-dedicated-8`, `g6-dedicated-16`, `g6-dedicated-32`, `g6-dedicated-48`, `g6-dedicated-50`, `g6-dedicated-56`, `g6-dedicated-64`
  - **High Memory:** `g7-highmem-1`, `g7-highmem-2`, `g7-highmem-4`, `g7-highmem-8`, `g7-highmem-16`
- **Recommended:** `g6-standard-2` or larger

#### `labels` (optional)
- **Type:** object (key-value pairs)
- **Key Format:** `^[a-z0-9A-Z]([-a-z0-9A-Z_.]*[a-z0-9A-Z])?$`
- **Max Length:** 63 characters (key and value)
- **Example:**
  ```yaml
  labels:
    environment: production
    role: master
    team: platform
  ```

#### `nodes` (optional)
- **Type:** array of NodeConfig objects
- **Length:** Must equal `count` if specified
- **Structure:**
  ```yaml
  nodes:
    - name: string              # Unique node name
      instanceType: string      # Override instance type
      labels: object            # Additional labels for this node
  ```

### Examples

**Simple Configuration (3 masters, same type):**
```yaml
linode-k3s-cluster:controlPlane:
  count: 3
  instanceType: g6-standard-4
  labels:
    environment: production
    role: master
```

**Advanced Configuration (individual node settings):**
```yaml
linode-k3s-cluster:controlPlane:
  count: 3
  instanceType: g6-standard-4
  labels:
    environment: production
    role: master
  nodes:
    - name: master-us-east-1a
      instanceType: g6-standard-4
      labels:
        zone: us-east-1a
        priority: high

    - name: master-us-east-1b
      instanceType: g6-standard-4
      labels:
        zone: us-east-1b
        priority: high

    - name: master-us-east-1c
      instanceType: g6-standard-6  # Larger instance
      labels:
        zone: us-east-1c
        priority: critical
```

---

## 3️⃣ Workers Configuration

Worker nodes configuration for application workloads.

```yaml
linode-k3s-cluster:workers:
  count: integer                 # Number of workers (required)
  instanceType: string           # Default instance type (required)
  labels: object                 # K8s labels for all workers (optional)
  nodes: array<NodeConfig>       # Individual node configs (optional)
```

### Fields

#### `count` (required)
- **Type:** integer
- **Min:** 0 (allows control-plane-only clusters)
- **No Maximum:** Scale as needed

#### `instanceType` (required)
- **Type:** string
- **Valid Types:** Same as control plane
- **Recommended:** Based on workload
  - General: `g6-standard-2`
  - Database: `g6-standard-4` or `g6-dedicated-4`
  - Memory-intensive: `g7-highmem-4`

#### `labels` (optional)
Same as control plane labels

#### `nodes` (optional)
Same structure as control plane nodes

### Examples

**Homogeneous Workers:**
```yaml
linode-k3s-cluster:workers:
  count: 5
  instanceType: g6-standard-2
  labels:
    environment: production
    workload: general
```

**Specialized Workers (recommended for production):**
```yaml
linode-k3s-cluster:workers:
  count: 5
  instanceType: g6-standard-2
  labels:
    environment: production
  nodes:
    # PostgreSQL workers
    - name: worker-postgres-1
      instanceType: g6-standard-4
      labels:
        workload: database
        database: postgresql
        zone: a

    - name: worker-postgres-2
      instanceType: g6-standard-4
      labels:
        workload: database
        database: postgresql
        zone: b

    # ClickHouse worker
    - name: worker-clickhouse-1
      instanceType: g6-standard-4
      labels:
        workload: database
        database: clickhouse
        zone: a

    # Application workers
    - name: worker-app-1
      instanceType: g6-standard-2
      labels:
        workload: application
        zone: a

    - name: worker-app-2
      instanceType: g6-standard-2
      labels:
        workload: application
        zone: b
```

---

## 4️⃣ K3s Configuration

Kubernetes (K3s) version and feature configuration.

```yaml
linode-k3s-cluster:k3s:
  version: string              # K3s version (required)
  channel: string              # Release channel (optional)
  disableComponents: array     # Components to disable (optional)
```

### Fields

#### `version` (required)
- **Type:** string
- **Format:** `v{MAJOR}.{MINOR}.{PATCH}+k3s{BUILD}`
- **Pattern:** `^v\d+\.\d+\.\d+\+k3s\d+$`
- **Examples:**
  - `v1.28.5+k3s1`
  - `v1.29.0+k3s2`
  - `v1.27.10+k3s1`
- **Find versions:** https://github.com/k3s-io/k3s/releases

#### `channel` (optional)
- **Type:** string
- **Valid Values:**
  - `stable` - Stable release (recommended for production)
  - `latest` - Latest available release
  - `testing` - Testing/preview releases
- **Default:** `stable`

#### `disableComponents` (optional)
- **Type:** array of strings
- **Valid Components:**
  - `traefik` - Ingress controller (disable if using nginx/others)
  - `servicelb` - Load balancer (disable if using MetalLB/others)
  - `local-storage` - Storage provider (disable if using external)
  - `coredns` - DNS server (⚠️ not recommended)
  - `metrics-server` - Metrics collection
- **Example:**
  ```yaml
  disableComponents:
    - traefik      # Using nginx-ingress instead
    - servicelb    # Using MetalLB
  ```

### Example

```yaml
linode-k3s-cluster:k3s:
  version: v1.28.5+k3s1
  channel: stable
  disableComponents:
    - traefik
```

---

## 5️⃣ SSH Configuration

SSH key management for node access.

```yaml
linode-k3s-cluster:ssh:
  autoGenerate: boolean        # Auto-generate keys (optional)
  keyType: string              # Key type (optional)
  keyBits: integer             # Key bits for RSA (optional)
  publicKey: string            # Public key content (manual mode)
  privateKey: string           # Private key content (manual mode)
  publicKeyPath: string        # Path to public key (manual mode)
  privateKeyPath: string       # Path to private key (manual mode)
```

### Fields

#### `autoGenerate` (optional)
- **Type:** boolean
- **Default:** `true`
- **Description:** Automatically generate SSH key pair

#### `keyType` (optional)
- **Type:** string
- **Valid Values:**
  - `ed25519` - Modern, secure, recommended
  - `rsa` - Traditional, requires `keyBits`
- **Default:** `ed25519`

#### `keyBits` (optional, RSA only)
- **Type:** integer
- **Min:** 2048
- **Max:** 16384
- **Recommended:** 4096
- **Only used when:** `keyType: rsa`

### Examples

**Auto-Generate (recommended):**
```yaml
linode-k3s-cluster:ssh:
  autoGenerate: true
  keyType: ed25519
```

**Manual Keys (existing keys):**
```yaml
linode-k3s-cluster:ssh:
  autoGenerate: false
  publicKeyPath: ~/.ssh/id_ed25519.pub
  privateKeyPath: ~/.ssh/id_ed25519
```

**Manual Keys (inline content):**
```yaml
linode-k3s-cluster:ssh:
  autoGenerate: false
  publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAbcd..."
  privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1..."
```

---

## 6️⃣ VPC Configuration

Virtual Private Cloud for network isolation (optional).

```yaml
linode-k3s-cluster:vpc:
  enabled: boolean             # Enable VPC (optional)
  label: string                # VPC name (optional)
  description: string          # VPC description (optional)
  subnetLabel: string          # Subnet name (optional)
  subnetIpv4: string           # Subnet CIDR (optional)
```

### Fields

#### `enabled` (optional)
- **Type:** boolean
- **Default:** `false`
- **Description:** Enable VPC for private networking

#### `label` (optional)
- **Type:** string
- **Max Length:** 64 characters
- **Pattern:** `^[a-zA-Z0-9-_]+$`

#### `subnetIpv4` (optional)
- **Type:** string (CIDR format)
- **Format:** `IP/MASK`
- **Min Mask:** /28 (16 IPs)
- **Recommended:** /24 (256 IPs)
- **RFC 1918 Ranges:**
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- **Example:** `10.0.0.0/24`

### Example

```yaml
linode-k3s-cluster:vpc:
  enabled: true
  label: k3s-prod-vpc
  description: Production K3s cluster VPC
  subnetLabel: k3s-prod-subnet
  subnetIpv4: 10.0.0.0/24
```

---

## 7️⃣ Network Configuration

Network and firewall settings.

```yaml
linode-k3s-cluster:network:
  allowSshFromAnywhere: boolean    # Allow SSH from any IP (optional)
  allowedSshCidrs: array           # Allowed SSH CIDRs (optional)
  nodePortRange: object            # Custom NodePort range (optional)
```

### Fields

#### `allowSshFromAnywhere` (optional)
- **Type:** boolean
- **Default:** `true`
- **Description:** Allow SSH access from any IP to bastion host
- **Security Note:** Set to `false` for production

#### `allowedSshCidrs` (optional, required if allowSshFromAnywhere is false)
- **Type:** array of strings (CIDR format)
- **Format:** `IP/MASK`
- **Example:**
  ```yaml
  allowedSshCidrs:
    - 203.0.113.0/24    # Office network
    - 198.51.100.0/24   # VPN network
  ```

#### `nodePortRange` (optional)
- **Type:** object
- **Default:** `{ start: 30000, end: 32767 }`
- **Structure:**
  ```yaml
  nodePortRange:
    start: integer  # Must be < end
    end: integer    # Must be > start
  ```
- **K8s Default:** 30000-32767

### Examples

**Open Access (development):**
```yaml
linode-k3s-cluster:network:
  allowSshFromAnywhere: true
```

**Restricted Access (production):**
```yaml
linode-k3s-cluster:network:
  allowSshFromAnywhere: false
  allowedSshCidrs:
    - 203.0.113.0/24    # Office
    - 198.51.100.50/32  # Admin home
  nodePortRange:
    start: 30000
    end: 32767
```

---

## 8️⃣ Bastion Configuration

Jump server for secure cluster access.

```yaml
linode-k3s-cluster:bastion:
  enabled: boolean             # Enable bastion (optional)
  instanceType: string         # Instance type (optional)
  labels: object               # Custom labels (optional)
```

### Fields

#### `enabled` (optional)
- **Type:** boolean
- **Default:** `true`
- **Description:** Deploy bastion host
- **Security Note:** Recommended for production

#### `instanceType` (optional)
- **Type:** string
- **Valid Types:** `g6-nanode-1`, `g6-standard-1`, `g6-standard-2`, `g6-standard-4`
- **Default:** `g6-nanode-1`
- **Recommended:** `g6-nanode-1` (sufficient for SSH proxy)

### Example

```yaml
linode-k3s-cluster:bastion:
  enabled: true
  instanceType: g6-nanode-1
  labels:
    role: bastion
    security: high
```

---

## 9️⃣ ArgoCD Configuration

GitOps continuous delivery configuration.

```yaml
linode-k3s-cluster:argocd:
  enabled: boolean             # Enable ArgoCD (optional)
  version: string              # ArgoCD version (optional)
  gitRepo: string              # Git repository URL (required if enabled)
  gitPath: string              # Path to applications (optional)
  gitBranch: string            # Git branch (optional)
```

### Fields

#### `enabled` (optional)
- **Type:** boolean
- **Default:** `false`
- **Description:** Install and configure ArgoCD

#### `version` (optional)
- **Type:** string
- **Valid Values:**
  - `stable` - Stable release
  - `latest` - Latest release
  - `vX.Y.Z` - Specific version (e.g., `v2.9.0`)
- **Default:** `stable`

#### `gitRepo` (required if enabled)
- **Type:** string (URL)
- **Valid Formats:**
  - `https://github.com/{user}/{repo}`
  - `https://gitlab.com/{user}/{repo}`
  - `https://bitbucket.org/{user}/{repo}`
  - `git@github.com:{user}/{repo}.git`
- **Example:** `https://github.com/chalkan3/zapper-argocd`

#### `gitPath` (optional)
- **Type:** string
- **Default:** `apps`
- **Description:** Directory containing Application YAML files
- **Note:** Do not include wildcards

#### `gitBranch` (optional)
- **Type:** string
- **Default:** `main`
- **Valid:** Any valid Git branch name

### Example

```yaml
linode-k3s-cluster:argocd:
  enabled: true
  version: stable
  gitRepo: https://github.com/chalkan3/zapper-argocd
  gitPath: apps
  gitBranch: main
```

---

## 🔟 Secrets Configuration

Encrypted passwords and tokens.

```yaml
linode-k3s-cluster:secrets:
  rootPassword: string         # Root password for all nodes (required)
```

### Fields

#### `rootPassword` (required)
- **Type:** string (encrypted by Pulumi)
- **Set with:** `pulumi config set --secret`
- **Example:**
  ```bash
  pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "MySecurePassword123!"
  ```

---

## 📝 Complete Example

```yaml
config:
  # Cluster basics
  linode-k3s-cluster:cluster:
    name: production-k3s
    region: us-mia
    image: linode/ubuntu22.04
    tags:
      - production
      - kubernetes
      - platform

  # 3 masters for HA
  linode-k3s-cluster:controlPlane:
    count: 3
    instanceType: g6-standard-4
    labels:
      environment: production
      role: master
    nodes:
      - name: master-1
        instanceType: g6-standard-4
        labels:
          zone: a
      - name: master-2
        instanceType: g6-standard-4
        labels:
          zone: b
      - name: master-3
        instanceType: g6-standard-4
        labels:
          zone: c

  # 5 specialized workers
  linode-k3s-cluster:workers:
    count: 5
    instanceType: g6-standard-2
    labels:
      environment: production
    nodes:
      - name: worker-db-1
        instanceType: g6-standard-4
        labels:
          workload: database
      - name: worker-db-2
        instanceType: g6-standard-4
        labels:
          workload: database
      - name: worker-app-1
        instanceType: g6-standard-2
        labels:
          workload: application
      - name: worker-app-2
        instanceType: g6-standard-2
        labels:
          workload: application
      - name: worker-app-3
        instanceType: g6-standard-2
        labels:
          workload: application

  # K3s configuration
  linode-k3s-cluster:k3s:
    version: v1.28.5+k3s1
    channel: stable
    disableComponents:
      - traefik

  # Auto-generate SSH keys
  linode-k3s-cluster:ssh:
    autoGenerate: true
    keyType: ed25519

  # VPC enabled
  linode-k3s-cluster:vpc:
    enabled: true
    label: prod-k3s-vpc
    subnetIpv4: 10.0.0.0/24

  # Restricted network access
  linode-k3s-cluster:network:
    allowSshFromAnywhere: false
    allowedSshCidrs:
      - 203.0.113.0/24

  # Bastion enabled
  linode-k3s-cluster:bastion:
    enabled: true
    instanceType: g6-nanode-1

  # ArgoCD with GitOps
  linode-k3s-cluster:argocd:
    enabled: true
    version: stable
    gitRepo: https://github.com/chalkan3/zapper-argocd
    gitPath: apps
    gitBranch: main

  # Secrets (set via CLI)
  linode-k3s-cluster:secrets:
    rootPassword:
      secure: v1:encrypted-value-here

  linode:token:
    secure: v1:encrypted-token-here
```

---

← [ArgoCD Guide](./ARGOCD_GUIDE.md) | Next: [Troubleshooting](./TROUBLESHOOTING.md) →
