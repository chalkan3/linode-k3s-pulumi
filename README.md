# Production-Ready K3s Cluster on Linode with Pulumi

[![Pulumi](https://img.shields.io/badge/Pulumi-Infrastructure%20as%20Code-blueviolet)](https://www.pulumi.com/)
[![K3s](https://img.shields.io/badge/K3s-v1.28.5-blue)](https://k3s.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Linode](https://img.shields.io/badge/Linode-Cloud-green)](https://www.linode.com/)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-GitOps-orange)](https://argoproj.github.io/cd/)

[![CI Tests](https://github.com/chalkan3/linode-k3s-pulumi/workflows/CI%20-%20Tests/badge.svg)](https://github.com/chalkan3/linode-k3s-pulumi/actions/workflows/ci-tests.yml)
[![Code Quality](https://github.com/chalkan3/linode-k3s-pulumi/workflows/Code%20Quality/badge.svg)](https://github.com/chalkan3/linode-k3s-pulumi/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete, production-ready Infrastructure as Code (IaC) solution for deploying **lightweight Kubernetes (K3s)** clusters on **Linode** using **Pulumi** with **TypeScript**.

## ✨ Features

- **🔐 Secure by Default**: Bastion host architecture with private networking
- **🏗️ High Availability**: 3-node control plane with embedded etcd
- **🎯 Specialized Workers**: Database-optimized nodes with custom labels and taints
- **🔄 GitOps Ready**: ArgoCD pre-configured for continuous delivery
- **✅ Validated Deployments**: Comprehensive configuration validation prevents errors
- **🔑 Auto-Generated Credentials**: SSH keys and K3s tokens created automatically
- **📦 Component-Based**: Clean OOP architecture with reusable components
- **🧪 Fully Tested**: 800+ tests ensuring reliability
- **📚 Complete Documentation**: Extensive guides in `/docs`

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Pulumi Commands Reference](#-pulumi-commands-reference)
- [YAML Examples](#-yaml-examples)
- [Usage](#-usage)
- [ArgoCD GitOps](#-argocd-gitops)
- [Security](#-security)
- [Cost Estimation](#-cost-estimation)
- [Documentation](#-documentation)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🏛️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          INTERNET                                │
└──────────────┬────────────────────────────┬─────────────────────┘
               │                            │
               │ SSH (Port 22)              │ K3s API (Port 6443)
               │ Restricted by IP           │ HTTPS Access
               │                            │
        ┌──────▼──────┐              ┌─────▼──────────────────┐
        │   BASTION   │              │   CONTROL PLANE         │
        │   HOST      │◄─────────────┤   (3 Masters - HA)      │
        │  (Public)   │   Private    │   - Embedded etcd       │
        └─────┬───────┘   Network    │   - K3s Server          │
              │                      │   - Labels & Taints     │
              │                      └────────────────────────┬┘
              │                                               │
        ┌─────▼────────────────────────────────────┐        │
        │      PRIVATE NETWORK (VPC Optional)       │        │
        │         192.168.0.0/16 or Custom          │        │
        └─────┬─────────────────────────────────────┘        │
              │                                               │
              │                                               │
        ┌─────▼───────────────────────────────────────────┐  │
        │              WORKER NODES                        │  │
        │  ┌──────────────┐  ┌──────────────┐             │  │
        │  │  PostgreSQL  │  │  ClickHouse  │             │  │
        │  │   Workers    │  │   Worker     │             │  │
        │  │  (2 nodes)   │  │  (1 node)    │             │  │
        │  │ g6-standard-4│  │ g6-standard-4│             │  │
        │  └──────────────┘  └──────────────┘             │  │
        │                                                   │  │
        │  ┌──────────────┐  ┌──────────────┐             │  │
        │  │   PeerDB     │  │   PeerDB     │             │  │
        │  │  Worker 1    │  │  Worker 2    │             │  │
        │  │g6-standard-2 │  │g6-standard-2 │             │  │
        │  └──────────────┘  └──────────────┘             │  │
        │                                                   │  │
        │  All nodes: K3s Agent + Custom Labels            │  │
        └───────────────────────────────────────────────────┘  │
                                                                │
┌───────────────────────────────────────────────────────────────▼┐
│                      ARGOCD (GITOPS)                            │
│  Auto-deploys applications from Git repository                 │
│  - Monitoring Stack    - Databases    - Applications           │
└─────────────────────────────────────────────────────────────────┘
```

### Security Architecture

```
                     ┌──────────────────┐
                     │   YOUR MACHINE   │
                     │   (kubectl/ssh)  │
                     └────────┬─────────┘
                              │
                   ┌──────────▼───────────┐
                   │  FIREWALL LAYER 1    │
                   │  Bastion Firewall    │
                   │  - SSH: Your IP only │
                   │  - K3s API: Allowed  │
                   └──────────┬───────────┘
                              │
                   ┌──────────▼───────────┐
                   │    BASTION HOST      │
                   │  - Public IP         │
                   │  - SSH Jump Server   │
                   │  - Agent Forwarding  │
                   └──────────┬───────────┘
                              │
                   ┌──────────▼───────────┐
                   │  FIREWALL LAYER 2    │
                   │  Cluster Firewall    │
                   │  - SSH: Private only │
                   │  - Internal traffic  │
                   └──────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼────────┐         ┌───────────▼────────┐
    │  CONTROL PLANE   │         │   WORKER NODES     │
    │  - Private IPs   │◄────────┤  - Private IPs     │
    │  - No public SSH │         │  - No public SSH   │
    └──────────────────┘         └────────────────────┘
```

### Component Architecture (OOP)

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.ts (Entry Point)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   ConfigLoader     │
                   │  (YAML Parsing)    │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │ ValidationChain    │
                   │  (9 Validators)    │
                   │  - BasicInfo       │
                   │  - ControlPlane    │
                   │  - Workers         │
                   │  - K3s             │
                   │  - SSH             │
                   │  - VPC             │
                   │  - Network         │
                   │  - Bastion         │
                   │  - ArgoCD          │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │   K3sCluster       │
                   │  (Main Component)  │
                   └─────────┬──────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼────────┐ ┌──────▼───────┐ ┌────────▼────────┐
│ SshKeyGenerator  │ │  Network     │ │  BastionHost    │
│                  │ │  Component   │ │                 │
└─────────┬────────┘ └──────┬───────┘ └────────┬────────┘
          │                  │                  │
┌─────────▼────────┐ ┌──────▼───────┐ ┌────────▼────────┐
│K3sTokenGenerator │ │   Firewall   │ │ControlPlaneNode │
│                  │ │   Rules      │ │   (3 nodes)     │
└──────────────────┘ └──────────────┘ └────────┬────────┘
                                               │
                                      ┌────────▼────────┐
                                      │   WorkerNode    │
                                      │   (5 nodes)     │
                                      └────────┬────────┘
                                               │
                                      ┌────────▼────────┐
                                      │ K3sValidation   │
                                      │ ArgoCD Install  │
                                      └─────────────────┘
```

### Validation Pipeline (Chain of Responsibility)

```
Configuration (Pulumi.dev.yaml)
         │
         ▼
    ┌────────────────┐
    │ BasicInfo      │  → Validates: name, region, image, tags
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ ControlPlane   │  → Validates: count, instanceType, labels
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ Workers        │  → Validates: count, instanceType, labels
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ K3s            │  → Validates: version, channel, components
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ SSH            │  → Validates: keyType, keyBits, paths
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ VPC            │  → Validates: CIDR, private IPs
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ Network        │  → Validates: CIDR ranges, ports
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ Bastion        │  → Validates: instanceType, enabled
    │ Validator      │
    └───────┬────────┘
            ▼
    ┌────────────────┐
    │ ArgoCD         │  → Validates: gitRepo, gitPath, version
    │ Validator      │
    └───────┬────────┘
            ▼
    ✅ Valid Configuration
         │
         ▼
    Cluster Deployment
```

---

## 📚 Prerequisites

### Required Tools

1. **Pulumi CLI** (v3.0+)
   ```bash
   # macOS
   brew install pulumi/tap/pulumi

   # Linux
   curl -fsSL https://get.pulumi.com | sh

   # Windows
   choco install pulumi

   # Verify
   pulumi version
   ```

2. **Node.js** (v18+)
   ```bash
   # macOS
   brew install node

   # Linux (via nvm)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18

   # Verify
   node --version
   npm --version
   ```

3. **kubectl** (for cluster access)
   ```bash
   # macOS
   brew install kubectl

   # Linux
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

   # Verify
   kubectl version --client
   ```

4. **Linode Account & API Token**
   - Sign up: https://www.linode.com/
   - Create API token: https://cloud.linode.com/profile/tokens
   - Permissions needed: Read/Write for Linodes, Firewalls, NodeBalancers

### Optional Tools

- **ArgoCD CLI** - For managing GitOps applications
- **git** - For cloning repositories
- **jq** - For parsing JSON outputs

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/linode-k3s-cluster.git
cd linode-k3s-cluster

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 2. Initialize Pulumi

```bash
# Login to Pulumi (choose backend)
pulumi login  # For Pulumi Cloud (free tier available)
# OR
pulumi login --local  # For local state files

# Create a new stack
pulumi stack init dev

# Verify stack
pulumi stack ls
```

### 3. Configure Linode Token

```bash
# Set Linode API token (as secret)
pulumi config set --secret linode:token YOUR_LINODE_API_TOKEN
```

### 4. Set Root Password

```bash
# Set root password for all nodes (required)
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "YourSecurePassword123!"
```

### 5. Deploy the Cluster

```bash
# Preview changes
pulumi preview

# Deploy (takes 10-15 minutes)
pulumi up

# Select 'yes' when prompted
```

### 6. Access Your Cluster

```bash
# Get kubeconfig
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Verify cluster
kubectl get nodes

# Expected output:
# NAME                STATUS   ROLES                  AGE   VERSION
# master-1            Ready    control-plane,master   10m   v1.28.5+k3s1
# master-2            Ready    control-plane,master   10m   v1.28.5+k3s1
# master-3            Ready    control-plane,master   10m   v1.28.5+k3s1
# worker-postgres-1   Ready    <none>                 8m    v1.28.5+k3s1
# worker-postgres-2   Ready    <none>                 8m    v1.28.5+k3s1
# worker-clickhouse-1 Ready    <none>                 8m    v1.28.5+k3s1
# worker-peerdb-1     Ready    <none>                 8m    v1.28.5+k3s1
# worker-peerdb-2     Ready    <none>                 8m    v1.28.5+k3s1
```

---

## ⚙️ Configuration

### Configuration Structure

The project uses **native Pulumi YAML** configuration in `Pulumi.<stack>.yaml`:

```yaml
config:
  linode-k3s-cluster:cluster:      # Basic cluster info
  linode-k3s-cluster:controlPlane: # Master nodes
  linode-k3s-cluster:workers:      # Worker nodes
  linode-k3s-cluster:k3s:          # K3s settings
  linode-k3s-cluster:ssh:          # SSH keys
  linode-k3s-cluster:vpc:          # VPC/networking
  linode-k3s-cluster:network:      # Firewall rules
  linode-k3s-cluster:bastion:      # Jump server
  linode-k3s-cluster:argocd:       # GitOps
  linode-k3s-cluster:secrets:      # Passwords/tokens
```

### Configuration Sections

| Section | Purpose | Documentation |
|---------|---------|---------------|
| **cluster** | Cluster name, region, image, tags | [Config Guide](./docs/CONFIGURATION.md#1-cluster-configuration) |
| **controlPlane** | Master nodes (HA setup) | [Config Guide](./docs/CONFIGURATION.md#2-control-plane-configuration) |
| **workers** | Worker nodes (specialized) | [Config Guide](./docs/CONFIGURATION.md#3-workers-configuration) |
| **k3s** | K3s version, components | [Config Guide](./docs/CONFIGURATION.md#4-k3s-configuration) |
| **ssh** | SSH key management | [Config Guide](./docs/CONFIGURATION.md#5-ssh-configuration) |
| **vpc** | Virtual Private Cloud | [Config Guide](./docs/CONFIGURATION.md#6-vpc-configuration) |
| **network** | Firewall rules | [Config Guide](./docs/CONFIGURATION.md#7-network-configuration) |
| **bastion** | Jump server settings | [Config Guide](./docs/CONFIGURATION.md#8-bastion-configuration) |
| **argocd** | GitOps configuration | [Config Guide](./docs/CONFIGURATION.md#9-argocd-configuration) |
| **secrets** | Encrypted credentials | [Config Guide](./docs/CONFIGURATION.md#10-secrets-configuration) |

---

## 📝 Pulumi Commands Reference

### Basic Commands

```bash
# Initialize new stack
pulumi stack init <stack-name>

# Select existing stack
pulumi stack select <stack-name>

# List all stacks
pulumi stack ls

# Show current stack
pulumi stack

# Delete stack
pulumi stack rm <stack-name>
```

### Configuration Commands

```bash
# Set string value
pulumi config set <key> <value>

# Set secret value (encrypted)
pulumi config set --secret <key> <value>

# Set object value (JSON)
pulumi config set <key> '{"field": "value"}'

# Get value
pulumi config get <key>

# Get secret value (decrypted)
pulumi config get --show-secrets <key>

# List all config
pulumi config

# Remove config key
pulumi config rm <key>
```

### Deployment Commands

```bash
# Preview changes (dry-run)
pulumi preview

# Deploy infrastructure
pulumi up

# Deploy without confirmation prompt
pulumi up --yes

# Deploy with parallelism control
pulumi up --parallel 10

# Refresh state from cloud
pulumi refresh

# Destroy all resources
pulumi destroy

# Destroy without confirmation
pulumi destroy --yes
```

### Output Commands

```bash
# List all outputs
pulumi stack output

# Get specific output
pulumi stack output <output-name>

# Get secret output (decrypted)
pulumi stack output --show-secrets <output-name>

# Export stack as JSON
pulumi stack export > stack.json

# Import stack from JSON
pulumi stack import < stack.json

# Get output as JSON
pulumi stack output --json | jq
```

### Logging and Debugging

```bash
# View deployment logs
pulumi logs

# Follow logs in real-time
pulumi logs --follow

# Enable verbose logging
pulumi up --logtostderr --logflow -v=9

# Debug Pulumi operations
PULUMI_DEBUG_COMMANDS=1 pulumi up
```

### Stack Management

```bash
# Show stack graph
pulumi stack graph stack.dot

# Export stack to file
pulumi stack export --file backup.json

# Clone stack
pulumi stack init new-stack --copy-config-from old-stack

# Rename stack
pulumi stack rename new-name
```

---

## 📄 YAML Examples

### Example 1: Minimal Development Cluster

**File**: `Pulumi.dev.yaml`

```yaml
config:
  # Basic cluster configuration
  linode-k3s-cluster:cluster:
    name: dev-k3s
    region: us-east
    image: linode/ubuntu22.04
    tags:
      - development
      - k3s

  # Single control plane (not HA)
  linode-k3s-cluster:controlPlane:
    count: 1
    instanceType: g6-standard-2

  # Two workers
  linode-k3s-cluster:workers:
    count: 2
    instanceType: g6-standard-2

  # K3s configuration
  linode-k3s-cluster:k3s:
    version: v1.28.5+k3s1
    channel: stable

  # Auto-generate SSH keys
  linode-k3s-cluster:ssh:
    autoGenerate: true
    keyType: ed25519

  # No VPC for dev
  linode-k3s-cluster:vpc:
    enabled: false

  # Allow SSH from anywhere (dev only!)
  linode-k3s-cluster:network:
    allowSshFromAnywhere: true

  # Enable bastion
  linode-k3s-cluster:bastion:
    enabled: true
    instanceType: g6-nanode-1

  # Disable ArgoCD for dev
  linode-k3s-cluster:argocd:
    enabled: false

  # Root password (set via command)
  linode-k3s-cluster:secrets:
    rootPassword: dummy  # Will be encrypted

  # Encrypted values (auto-generated by Pulumi)
  linode-k3s-cluster:secrets.rootPassword:
    secure: v1:xxx...
  linode:token:
    secure: v1:xxx...
```

**Deploy**:
```bash
pulumi stack init dev
pulumi config set --secret linode:token YOUR_TOKEN
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "Dev123!"
pulumi up
```

---

### Example 2: Production HA Cluster with VPC

**File**: `Pulumi.prod.yaml`

```yaml
config:
  # Production cluster
  linode-k3s-cluster:cluster:
    name: prod-k3s
    region: us-mia
    image: linode/ubuntu22.04
    tags:
      - production
      - k3s
      - critical

  # 3 masters for HA
  linode-k3s-cluster:controlPlane:
    count: 3
    instanceType: g6-standard-4
    labels:
      environment: production
      role: master
      tier: control-plane

  # 6 workers
  linode-k3s-cluster:workers:
    count: 6
    instanceType: g6-standard-4
    labels:
      environment: production
      tier: worker

  # K3s stable version
  linode-k3s-cluster:k3s:
    version: v1.28.5+k3s1
    channel: stable
    disableComponents:
      - traefik  # Using custom ingress

  # Auto-generate ed25519 keys
  linode-k3s-cluster:ssh:
    autoGenerate: true
    keyType: ed25519

  # Enable VPC for isolation
  linode-k3s-cluster:vpc:
    enabled: true
    label: prod-k3s-vpc
    region: us-mia
    subnetIpv4: 10.0.0.0/24
    subnetLabel: prod-k3s-subnet

  # Restrict SSH to office IPs
  linode-k3s-cluster:network:
    allowSshFromAnywhere: false
    allowedSshCidrs:
      - 203.0.113.0/24    # Office network
      - 198.51.100.50/32  # VPN server

  # Production bastion
  linode-k3s-cluster:bastion:
    enabled: true
    instanceType: g6-standard-1

  # Enable ArgoCD with GitOps
  linode-k3s-cluster:argocd:
    enabled: true
    version: stable
    gitRepo: https://github.com/company/k8s-apps
    gitPath: apps
    gitBranch: main

  # Secrets
  linode-k3s-cluster:secrets:
    rootPassword: dummy

  # Encrypted
  linode-k3s-cluster:secrets.rootPassword:
    secure: v1:xxx...
  linode:token:
    secure: v1:xxx...
```

**Deploy**:
```bash
pulumi stack init prod
pulumi config set --secret linode:token YOUR_TOKEN
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "SecureProd456!"
pulumi up
```

---

### Example 3: Specialized Workers (Database Workloads)

**File**: `Pulumi.data.yaml`

```yaml
config:
  linode-k3s-cluster:cluster:
    name: data-k3s
    region: us-mia
    image: linode/ubuntu22.04
    tags:
      - production
      - databases
      - zapper

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
          node-id: master-1
          zone: a
      - name: master-2
        instanceType: g6-standard-4
        labels:
          node-id: master-2
          zone: b
      - name: master-3
        instanceType: g6-standard-4
        labels:
          node-id: master-3
          zone: c

  # Specialized workers for databases
  linode-k3s-cluster:workers:
    count: 5
    instanceType: g6-standard-2  # Default
    labels:
      environment: production
    nodes:
      # PostgreSQL Workers (high memory)
      - name: worker-postgres-1
        instanceType: g6-standard-4
        labels:
          workload: postgres
          database: postgresql
          node-id: postgres-1
          zone: a
      - name: worker-postgres-2
        instanceType: g6-standard-4
        labels:
          workload: postgres
          database: postgresql
          node-id: postgres-2
          zone: b

      # ClickHouse Worker (high memory + CPU)
      - name: worker-clickhouse-1
        instanceType: g6-standard-4
        labels:
          workload: clickhouse
          database: clickhouse
          node-id: clickhouse-1
          zone: a

      # PeerDB Workers (standard)
      - name: worker-peerdb-1
        instanceType: g6-standard-2
        labels:
          workload: peerdb
          app: peerdb
          node-id: peerdb-1
          zone: a
      - name: worker-peerdb-2
        instanceType: g6-standard-2
        labels:
          workload: peerdb
          app: peerdb
          node-id: peerdb-2
          zone: b

  # K3s configuration
  linode-k3s-cluster:k3s:
    version: v1.28.5+k3s1
    channel: stable
    disableComponents:
      - traefik

  # SSH keys
  linode-k3s-cluster:ssh:
    autoGenerate: true
    keyType: ed25519

  # VPC disabled (using Linode private network)
  linode-k3s-cluster:vpc:
    enabled: false

  # Network security
  linode-k3s-cluster:network:
    allowSshFromAnywhere: true

  # Bastion
  linode-k3s-cluster:bastion:
    enabled: true
    instanceType: g6-standard-1

  # ArgoCD with database applications
  linode-k3s-cluster:argocd:
    enabled: true
    version: stable
    gitRepo: https://github.com/chalkan3/zapper-argocd
    gitPath: apps
    gitBranch: main

  # Secrets
  linode-k3s-cluster:secrets:
    rootPassword: dummy

  linode-k3s-cluster:secrets.rootPassword:
    secure: v1:xxx...
  linode:token:
    secure: v1:xxx...
```

**Deploy with Node Affinity**:

After deployment, use these labels for pod scheduling:

```yaml
# PostgreSQL deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload
                operator: In
                values:
                - postgres
      containers:
      - name: postgres
        image: postgres:16
```

---

### Example 4: Using Existing SSH Keys

```yaml
config:
  linode-k3s-cluster:cluster:
    name: my-cluster
    region: us-east
    image: linode/ubuntu22.04

  linode-k3s-cluster:controlPlane:
    count: 1
    instanceType: g6-standard-2

  linode-k3s-cluster:workers:
    count: 2
    instanceType: g6-standard-2

  linode-k3s-cluster:k3s:
    version: v1.28.5+k3s1

  # Use existing SSH keys
  linode-k3s-cluster:ssh:
    autoGenerate: false
    publicKeyPath: ~/.ssh/id_ed25519.pub
    privateKeyPath: ~/.ssh/id_ed25519

  linode-k3s-cluster:vpc:
    enabled: false

  linode-k3s-cluster:network:
    allowSshFromAnywhere: true

  linode-k3s-cluster:bastion:
    enabled: true
    instanceType: g6-nanode-1

  linode-k3s-cluster:argocd:
    enabled: false

  linode-k3s-cluster:secrets:
    rootPassword: dummy

  linode-k3s-cluster:secrets.rootPassword:
    secure: v1:xxx...
  linode:token:
    secure: v1:xxx...
```

---

## 🎯 Usage

### Accessing the Cluster

#### 1. Get Kubeconfig

```bash
# Export kubeconfig
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml

# Set environment variable
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Verify
kubectl cluster-info
kubectl get nodes
```

#### 2. Get SSH Access

```bash
# Get bastion IP
BASTION_IP=$(pulumi stack output bastionPublicIp)

# Get SSH private key (if auto-generated)
pulumi stack output sshPrivateKey --show-secrets > ssh_key
chmod 600 ssh_key

# SSH to bastion
ssh -i ssh_key root@$BASTION_IP
```

#### 3. Access Cluster Nodes via Bastion

```bash
# Method 1: Two-hop
ssh -i ssh_key root@$BASTION_IP
# Then from bastion:
ssh root@<NODE_PRIVATE_IP>

# Method 2: SSH Jump (direct)
ssh -i ssh_key -J root@$BASTION_IP root@<NODE_PRIVATE_IP>

# Method 3: ProxyJump in config
cat >> ~/.ssh/config <<EOF
Host bastion
    HostName $BASTION_IP
    User root
    IdentityFile $(pwd)/ssh_key

Host 192.168.*
    User root
    ProxyJump bastion
    IdentityFile $(pwd)/ssh_key
EOF

# Now direct access:
ssh 192.168.0.1
```

### Cluster Operations

#### View All Outputs

```bash
# List all outputs
pulumi stack output

# Get as JSON
pulumi stack output --json | jq

# Specific outputs
pulumi stack output bastionPublicIp
pulumi stack output controlPlanePrivateIps
pulumi stack output workerPrivateIps
pulumi stack output argocdUrl
```

#### Scale Workers

```bash
# Edit Pulumi.dev.yaml
# Change workers.count from 5 to 7

# Preview changes
pulumi preview

# Apply
pulumi up

# Verify
kubectl get nodes
```

#### Upgrade K3s Version

```bash
# Set new version
pulumi config set linode-k3s-cluster:k3s.version "v1.29.0+k3s1"

# Apply (will update nodes)
pulumi up
```

#### Add Custom Worker

Edit `Pulumi.dev.yaml`:

```yaml
linode-k3s-cluster:workers:
  count: 6  # Increment count
  nodes:
    # ... existing nodes ...
    - name: worker-app-1
      instanceType: g6-standard-2
      labels:
        workload: application
        app: frontend
      taints:
        - key: dedicated
          value: frontend
          effect: NoSchedule
```

Then deploy:

```bash
pulumi up
```

---

## 🔄 ArgoCD GitOps

### Overview

ArgoCD is automatically installed and configured when `argocd.enabled: true`.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GIT REPOSITORY                        │
│   https://github.com/chalkan3/zapper-argocd            │
│                                                          │
│   apps/                                                  │
│   ├── clickhouse.yaml         ← ArgoCD Application     │
│   ├── cloudnative-pg.yaml     ← ArgoCD Application     │
│   ├── peerdb.yaml             ← ArgoCD Application     │
│   ├── monitoring.yaml         ← ArgoCD Application     │
│   └── hpa.yaml                ← ArgoCD Application     │
│                                                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Poll every 3 minutes
                   │ (Auto-sync enabled)
                   │
┌──────────────────▼──────────────────────────────────────┐
│              ARGOCD (in K3s cluster)                     │
│                                                          │
│  1. Clones repository                                   │
│  2. Reads all .yaml files from apps/                    │
│  3. Applies each as an Application                      │
│  4. Monitors and syncs automatically                    │
│                                                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Deploys resources
                   │
┌──────────────────▼──────────────────────────────────────┐
│              KUBERNETES CLUSTER                          │
│                                                          │
│  Namespaces:                                            │
│  ├── clickhouse      (ClickHouse cluster)              │
│  ├── postgres        (CloudNativePG)                   │
│  ├── peerdb          (PeerDB application)              │
│  └── monitoring      (Prometheus, Grafana)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Accessing ArgoCD

```bash
# Get URL
ARGOCD_URL=$(pulumi stack output argocdUrl)
echo "ArgoCD URL: $ARGOCD_URL"

# Get admin password
ARGOCD_PASSWORD=$(pulumi stack output argocdAdminPassword --show-secrets)
echo "Username: admin"
echo "Password: $ARGOCD_PASSWORD"

# Open in browser
open $ARGOCD_URL
```

### ArgoCD CLI

```bash
# Install ArgoCD CLI
brew install argocd

# Login
ARGOCD_SERVER=$(pulumi stack output argocdUrl | sed 's|https://||')
argocd login $ARGOCD_SERVER \
  --username admin \
  --password $(pulumi stack output argocdAdminPassword --show-secrets) \
  --insecure

# List applications
argocd app list

# Sync application manually
argocd app sync clickhouse

# Get application details
argocd app get clickhouse
```

### Git Repository Structure

Your ArgoCD repository should look like this:

```
zapper-argocd/
├── apps/
│   ├── clickhouse.yaml          # ArgoCD Application
│   ├── cloudnative-pg.yaml      # ArgoCD Application
│   ├── peerdb.yaml              # ArgoCD Application
│   └── monitoring.yaml          # ArgoCD Application
├── helm-values/
│   ├── clickhouse-cluster.yaml  # Helm values for ClickHouse
│   └── postgres-cluster.yaml    # Helm values for PostgreSQL
├── manifests/
│   ├── peerdb/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   └── monitoring/
│       ├── prometheus.yaml
│       └── grafana.yaml
└── README.md
```

**Example Application** (`apps/clickhouse.yaml`):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: clickhouse
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default

  source:
    repoURL: https://github.com/chalkan3/zapper-argocd
    targetRevision: main
    path: helm-values
    helm:
      releaseName: clickhouse
      valueFiles:
        - clickhouse-cluster.yaml

  destination:
    server: https://kubernetes.default.svc
    namespace: clickhouse

  syncPolicy:
    automated:
      prune: true       # Delete resources removed from Git
      selfHeal: true    # Auto-fix manual changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

For complete ArgoCD guide, see: [ArgoCD Documentation](./docs/ARGOCD_GUIDE.md)

---

## 🔐 Security

### Multi-Layer Security

1. **Bastion Host Architecture**
   - Only bastion has public SSH access
   - All cluster nodes are private
   - Jump host for secure access

2. **Firewall Rules**
   - **Bastion Firewall**: Restricts SSH to allowed IPs
   - **Cluster Firewall**: Only allows SSH from private network

3. **Auto-Generated Credentials**
   - SSH keys generated with ed25519 (or RSA 4096)
   - K3s token generated with 64 random characters
   - All secrets encrypted by Pulumi

4. **Network Isolation**
   - Optional VPC for complete isolation
   - Private network communication between nodes
   - Public access only for K3s API and exposed services

### Security Best Practices

```bash
# 1. Restrict SSH to your IP only
pulumi config set linode-k3s-cluster:network.allowSshFromAnywhere false
pulumi config set linode-k3s-cluster:network.allowedSshCidrs "YOUR.IP.ADDRESS/32"

# 2. Enable VPC
pulumi config set linode-k3s-cluster:vpc.enabled true

# 3. Use auto-generated keys
pulumi config set linode-k3s-cluster:ssh.autoGenerate true
pulumi config set linode-k3s-cluster:ssh.keyType ed25519

# 4. Use strong root password
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "VerySecureP@ssw0rd123!"

# 5. Rotate credentials regularly
pulumi destroy
pulumi up  # New keys and tokens generated
```

### Access Control

```bash
# View firewall rules
pulumi stack output bastionFirewallId
pulumi stack output clusterFirewallId

# Update allowed SSH IPs
pulumi config set linode-k3s-cluster:network.allowedSshCidrs "1.2.3.4/32,5.6.7.8/32"
pulumi up
```

---

## 💰 Cost Estimation

### Production HA Cluster (Default Configuration)

Based on `Pulumi.dev.yaml`:

| Component | Type | Quantity | Monthly Cost |
|-----------|------|----------|--------------|
| **Control Plane** | g6-standard-4 (4 vCPU, 8GB RAM) | 3 | $360 |
| **PostgreSQL Workers** | g6-standard-4 (4 vCPU, 8GB RAM) | 2 | $240 |
| **ClickHouse Worker** | g6-standard-4 (4 vCPU, 8GB RAM) | 1 | $120 |
| **PeerDB Workers** | g6-standard-2 (2 vCPU, 4GB RAM) | 2 | $120 |
| **Bastion Host** | g6-standard-1 (1 vCPU, 2GB RAM) | 1 | $60 |
| **TOTAL** | | **9 nodes** | **~$900/month** |

### Development Cluster (Minimal)

| Component | Type | Quantity | Monthly Cost |
|-----------|------|----------|--------------|
| **Control Plane** | g6-standard-2 (2 vCPU, 4GB RAM) | 1 | $24 |
| **Workers** | g6-standard-2 (2 vCPU, 4GB RAM) | 2 | $48 |
| **Bastion Host** | g6-nanode-1 (1 vCPU, 1GB RAM) | 1 | $5 |
| **TOTAL** | | **4 nodes** | **~$77/month** |

### Cost Optimization Tips

```bash
# Use smaller bastion
pulumi config set linode-k3s-cluster:bastion.instanceType g6-nanode-1  # $5/month

# Use smaller control plane for dev
pulumi config set linode-k3s-cluster:controlPlane.count 1
pulumi config set linode-k3s-cluster:controlPlane.instanceType g6-standard-2

# Use smaller workers
pulumi config set linode-k3s-cluster:workers.count 2
pulumi config set linode-k3s-cluster:workers.instanceType g6-standard-2
```

**Linode Pricing**: https://www.linode.com/pricing/

---

## 📚 Documentation

Complete documentation is available in the `/docs` directory:

| Document | Description |
|----------|-------------|
| [**INDEX.md**](./docs/INDEX.md) | Documentation hub and navigation |
| [**GETTING_STARTED.md**](./docs/GETTING_STARTED.md) | 5-minute deployment guide |
| [**CONFIGURATION.md**](./docs/CONFIGURATION.md) | Complete configuration reference |
| [**ARGOCD_GUIDE.md**](./docs/ARGOCD_GUIDE.md) | GitOps with ArgoCD |
| [**TROUBLESHOOTING.md**](./docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [**VALIDATIONS.md**](./docs/VALIDATIONS.md) | Configuration validation rules |
| [**DESIGN_PATTERNS.md**](./docs/DESIGN_PATTERNS.md) | Architecture and OOP patterns |
| [**YAML_STRUCTURE.md**](./docs/YAML_STRUCTURE.md) | YAML configuration format |

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Cannot SSH to Bastion

```bash
# Check bastion IP
pulumi stack output bastionPublicIp

# Check firewall rules
pulumi stack output bastionFirewallId

# Verify SSH key
pulumi stack output sshPublicKey

# Test connection
ssh -v -i ssh_key root@$(pulumi stack output bastionPublicIp)
```

**Solution**: Check if your IP is in `allowedSshCidrs` or enable `allowSshFromAnywhere`

#### 2. Nodes Not Joining Cluster

```bash
# SSH to bastion
ssh -i ssh_key root@$(pulumi stack output bastionPublicIp)

# SSH to control plane
ssh root@<CONTROL_PLANE_PRIVATE_IP>

# Check K3s status
systemctl status k3s
journalctl -u k3s -f
```

#### 3. ArgoCD Not Accessible

```bash
# Check ArgoCD pods
kubectl get pods -n argocd

# Check service
kubectl get svc -n argocd

# Port forward as workaround
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at https://localhost:8080
```

#### 4. Validation Errors

```bash
# Run build to see validation errors
npm run build

# Common fixes:
# - Check region is valid (us-east, us-mia, eu-west, etc.)
# - Check instance types (g6-standard-2, g6-standard-4, etc.)
# - Check K3s version format (v1.28.5+k3s1)
# - Check CIDR format (10.0.0.0/24)
```

For complete troubleshooting guide: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Test Structure

- **800+ tests** covering:
  - Configuration validation (305 tests)
  - Component creation
  - Network configuration
  - SSH key generation
  - K3s installation
  - Integration workflows

---

## 📦 Project Structure

```
linode-k3s-cluster/
├── components/                   # Pulumi components
│   ├── argocd-installation.ts   # ArgoCD GitOps setup
│   ├── bastion-host.ts          # Jump server
│   ├── control-plane-node.ts    # Master nodes
│   ├── k3s-cluster.ts           # Main orchestrator
│   ├── k3s-token-generator.ts   # Secure token generation
│   ├── k3s-validation.ts        # Cluster health checks
│   ├── network.ts               # Firewall rules
│   ├── ssh-key.ts               # SSH key resource
│   ├── ssh-key-generator.ts     # Key generation
│   ├── vpc.ts                   # VPC setup
│   └── worker-node.ts           # Worker nodes
│
├── config/                       # Configuration system
│   ├── configuration/           # Config assemblers
│   ├── core/                    # Base classes
│   ├── creators/                # Factory pattern
│   ├── installation/            # Installation methods
│   ├── validation/              # Validators (9 validators)
│   │   └── config-checker.ts   # Validation chain
│   ├── loader.ts                # YAML loader
│   └── types.ts                 # TypeScript types
│
├── __tests__/                   # Test suites
│   ├── integration/             # Integration tests
│   └── e2e/                     # E2E tests (excluded from build)
│
├── docs/                        # Documentation
│   ├── INDEX.md                # Documentation hub
│   ├── GETTING_STARTED.md      # Quick start guide
│   ├── CONFIGURATION.md        # Config reference
│   ├── ARGOCD_GUIDE.md         # GitOps guide
│   ├── TROUBLESHOOTING.md      # Common issues
│   ├── VALIDATIONS.md          # Validation rules
│   ├── DESIGN_PATTERNS.md      # Architecture
│   └── YAML_STRUCTURE.md       # YAML format
│
├── index.ts                     # Entry point
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── jest.config.js              # Jest config
├── Pulumi.yaml                 # Pulumi project file
├── Pulumi.dev.yaml             # Development stack config
└── README.md                   # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/linode-k3s-cluster.git
cd linode-k3s-cluster

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit: `git commit -m "Add my feature"`
7. Push: `git push origin feature/my-feature`
8. Create a Pull Request

### Code Style

- Follow existing TypeScript patterns
- Use OOP principles (Chain of Responsibility, Factory, etc.)
- Add comprehensive tests
- Document all new features
- Follow validation patterns

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Pulumi** - Infrastructure as Code platform
- **K3s** - Lightweight Kubernetes distribution by Rancher
- **Linode** - Cloud infrastructure provider (Akamai)
- **ArgoCD** - GitOps continuous delivery
- **TypeScript** - Type-safe JavaScript

---

## 📞 Support

### Getting Help

1. **Documentation**: Check the `/docs` directory
2. **GitHub Issues**: [Create an issue](https://github.com/yourusername/linode-k3s-cluster/issues)
3. **Pulumi Community**: https://slack.pulumi.com/
4. **K3s Community**: https://github.com/k3s-io/k3s/discussions

### Useful Commands

```bash
# Get all stack outputs
pulumi stack output

# View logs
pulumi logs

# Export stack state
pulumi stack export > backup.json

# Refresh cloud state
pulumi refresh

# Destroy all resources
pulumi destroy
```

---

## 🚀 What's Next?

After deploying your cluster:

1. ✅ **[Deploy Applications](./docs/ARGOCD_GUIDE.md)** - Use ArgoCD for GitOps
2. ✅ **[Set Up Monitoring](./docs/ARGOCD_GUIDE.md#monitoring)** - Prometheus & Grafana
3. ✅ **[Configure Storage](./docs/CONFIGURATION.md)** - Persistent volumes
4. ✅ **[Enable Backups](./docs/TROUBLESHOOTING.md)** - Protect your data
5. ✅ **[Scale Cluster](./docs/CONFIGURATION.md)** - Add more workers

---

## ⭐ Features Roadmap

- [ ] Multi-region support
- [ ] Automatic backups to S3/Object Storage
- [ ] Integrated monitoring stack (Prometheus/Grafana)
- [ ] Certificate management (cert-manager)
- [ ] External DNS integration
- [ ] Cluster autoscaling
- [ ] Disaster recovery automation
- [ ] Terraform compatibility layer

---

## 📊 Quick Reference

### Essential Commands

```bash
# Deploy
pulumi up

# Scale workers
pulumi config set linode-k3s-cluster:workers.count 7
pulumi up

# Access cluster
export KUBECONFIG=$(pwd)/kubeconfig.yaml
kubectl get nodes

# SSH to bastion
ssh -i ssh_key root@$(pulumi stack output bastionPublicIp)

# ArgoCD URL
pulumi stack output argocdUrl

# Destroy
pulumi destroy
```

### Common Configurations

| Use Case | Control Plane | Workers | Cost/Month |
|----------|---------------|---------|------------|
| **Dev** | 1x g6-standard-2 | 2x g6-standard-2 | ~$77 |
| **Staging** | 3x g6-standard-2 | 3x g6-standard-2 | ~$216 |
| **Production** | 3x g6-standard-4 | 5x g6-standard-4 | ~$900 |
| **Database** | 3x g6-standard-4 | 5x specialized | ~$900 |

---

**Built with ❤️ using Pulumi, K3s, and TypeScript**

**Ready for Production | Tested | Documented | Secure**

---

**⚡ Deploy in 5 minutes | 🔐 Secure by default | 📦 GitOps ready**

[Get Started](./docs/GETTING_STARTED.md) | [Full Docs](./docs/INDEX.md) | [Report Issue](https://github.com/yourusername/linode-k3s-cluster/issues)
