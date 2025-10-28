# Getting Started with Linode K3s Cluster

## 📋 Overview

This guide will walk you through deploying a production-ready K3s (Lightweight Kubernetes) cluster on Linode using Pulumi Infrastructure as Code.

**What You'll Get:**
- ✅ 3 Master Nodes (High Availability)
- ✅ 5 Worker Nodes (Specialized workloads)
- ✅ K3s v1.28.5 (Kubernetes)
- ✅ Bastion Host (Jump server for secure access)
- ✅ ArgoCD (GitOps continuous delivery)
- ✅ Auto-generated SSH keys
- ✅ Automated configuration validation
- ✅ Complete monitoring and logging

---

## 🔧 Prerequisites

### Required Tools

1. **Node.js** (v16+)
   ```bash
   node --version  # Should be v16 or higher
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **Pulumi CLI**
   ```bash
   # macOS
   brew install pulumi/tap/pulumi

   # Linux
   curl -fsSL https://get.pulumi.com | sh

   # Windows
   choco install pulumi

   # Verify installation
   pulumi version
   ```

4. **Linode Account**
   - Sign up at https://www.linode.com/
   - Get your API token from https://cloud.linode.com/profile/tokens

### Optional Tools

- **kubectl** - For interacting with the cluster
- **git** - For cloning the repository
- **ArgoCD CLI** - For managing ArgoCD applications

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd linode-k3s-cluster
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Pulumi packages
- Linode provider
- Command provider (for remote execution)
- All development dependencies

### Step 3: Configure Linode Token

```bash
# Set your Linode API token as a secret
pulumi config set --secret linode:token YOUR_LINODE_API_TOKEN
```

### Step 4: Set Root Password

```bash
# Set the root password for all nodes (encrypted)
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "YourSecurePassword123!"
```

### Step 5: Review Configuration

Open `Pulumi.dev.yaml` and review the default configuration:

```yaml
linode-k3s-cluster:cluster:
  name: my-k3s-cluster
  region: us-mia
  image: linode/ubuntu22.04
  tags:
    - production
    - k3s
    - zapper

linode-k3s-cluster:controlPlane:
  count: 3
  instanceType: g6-standard-4
  # ... more config

linode-k3s-cluster:workers:
  count: 5
  instanceType: g6-standard-2
  # ... more config
```

### Step 6: Deploy!

```bash
# Preview what will be created
pulumi preview

# Deploy the cluster
pulumi up

# Select 'yes' when prompted
```

**Deployment Time:** 10-15 minutes

---

## 📊 Understanding the Deployment Process

### Phase 1: Infrastructure Provisioning (5 minutes)
1. Creates 3 master nodes
2. Creates 5 worker nodes
3. Creates bastion host
4. Configures networking and firewall

### Phase 2: K3s Installation (3 minutes)
1. Installs K3s on first master
2. Generates K3s token
3. Joins remaining masters
4. Joins worker nodes
5. Configures embedded etcd for HA

### Phase 3: Validation (2 minutes)
1. Validates K3s cluster health
2. Checks node readiness
3. Verifies control plane quorum

### Phase 4: ArgoCD Setup (3 minutes)
1. Installs ArgoCD
2. Registers Git repository
3. Deploys applications from `apps/` directory
4. Configures auto-sync

---

## 🎯 After Deployment

### Access Your Cluster

Pulumi will output important information:

```bash
Outputs:
  bastionPublicIp        : "45.33.XX.XX"
  clusterInfo            : "..."
  controlPlanePrivateIps : ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
  kubeconfig             : [secret]
  argocdUrl             : "https://45.33.XX.XX:30443"
  argocdAdminPassword   : [secret]
```

### 1. Get Kubeconfig

```bash
# Save kubeconfig to file
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml

# Set KUBECONFIG environment variable
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Verify access
kubectl get nodes
```

Expected output:
```
NAME                STATUS   ROLES                  AGE   VERSION
master-1            Ready    control-plane,master   10m   v1.28.5+k3s1
master-2            Ready    control-plane,master   10m   v1.28.5+k3s1
master-3            Ready    control-plane,master   10m   v1.28.5+k3s1
worker-postgres-1   Ready    <none>                 8m    v1.28.5+k3s1
worker-postgres-2   Ready    <none>                 8m    v1.28.5+k3s1
worker-clickhouse-1 Ready    <none>                 8m    v1.28.5+k3s1
worker-peerdb-1     Ready    <none>                 8m    v1.28.5+k3s1
worker-peerdb-2     Ready    <none>                 8m    v1.28.5+k3s1
```

### 2. Access ArgoCD UI

```bash
# Get ArgoCD URL
pulumi stack output argocdUrl

# Get admin password
pulumi stack output argocdAdminPassword --show-secrets

# Open in browser
open $(pulumi stack output argocdUrl)
```

Login with:
- **Username:** `admin`
- **Password:** (from command above)

### 3. Access Nodes via Bastion

```bash
# Get bastion IP
BASTION_IP=$(pulumi stack output bastionPublicIp)

# Get private key
pulumi stack output sshPrivateKey --show-secrets > ssh_key
chmod 600 ssh_key

# SSH to bastion
ssh -i ssh_key root@$BASTION_IP

# From bastion, access any node
ssh root@<node-private-ip>
```

---

## 🔄 Common Tasks

### Update Cluster Configuration

1. Edit `Pulumi.dev.yaml`
2. Run `pulumi up` to apply changes

Example: Add a new worker node:

```yaml
linode-k3s-cluster:workers:
  count: 6  # Changed from 5 to 6
  nodes:
    # ... existing nodes
    - name: worker-app-1
      instanceType: g6-standard-2
      labels:
        workload: application
```

### Scale Workers

```bash
# Edit Pulumi.dev.yaml and change workers.count
pulumi up
```

### Deploy New Applications

1. Add Application YAML to your `zapper-argocd` repository
2. Push to Git
3. ArgoCD auto-syncs within 3 minutes

Or apply manually:
```bash
kubectl apply -f your-app.yaml
```

### View Cluster Resources

```bash
# All nodes
kubectl get nodes -o wide

# All pods across all namespaces
kubectl get pods -A

# Cluster info
kubectl cluster-info

# Events
kubectl get events -A --sort-by='.lastTimestamp'
```

---

## 🛠️ Customization Options

### Change Cluster Name

```yaml
linode-k3s-cluster:cluster:
  name: production-cluster  # Your custom name
```

### Change Region

```yaml
linode-k3s-cluster:cluster:
  region: eu-west  # Different region
```

Available regions: `us-east`, `us-mia`, `eu-west`, `ap-south`, etc.

### Change Instance Types

```yaml
linode-k3s-cluster:controlPlane:
  instanceType: g6-standard-8  # Larger instances

linode-k3s-cluster:workers:
  instanceType: g6-dedicated-4  # Dedicated CPU
```

### Disable ArgoCD

```yaml
linode-k3s-cluster:argocd:
  enabled: false
```

### Disable Bastion

```yaml
linode-k3s-cluster:bastion:
  enabled: false
```

**Note:** Disabling bastion means masters/workers are directly accessible via public IPs (less secure).

### Enable VPC

```yaml
linode-k3s-cluster:vpc:
  enabled: true
  label: my-k3s-vpc
  subnetIpv4: 10.0.0.0/24
```

---

## 💰 Cost Estimation

Based on default configuration (`Pulumi.dev.yaml`):

| Resource | Type | Quantity | Monthly Cost |
|----------|------|----------|--------------|
| Control Plane | g6-standard-4 | 3 | $360 |
| PostgreSQL Workers | g6-standard-4 | 2 | $240 |
| ClickHouse Worker | g6-standard-4 | 1 | $120 |
| PeerDB Workers | g6-standard-2 | 2 | $120 |
| Bastion | g6-standard-1 | 1 | $60 |
| **Total** | | **9 nodes** | **~$900/month** |

**Note:** Prices are approximate. Check [Linode Pricing](https://www.linode.com/pricing/) for exact costs.

### Cost Optimization Tips

1. **Dev/Test Environment:**
   ```yaml
   controlPlane:
     count: 1  # Single master (not HA)
     instanceType: g6-standard-2
   workers:
     count: 2
     instanceType: g6-standard-1
   ```
   **Cost:** ~$120/month

2. **Use Smaller Bastion:**
   ```yaml
   bastion:
     instanceType: g6-nanode-1  # $5/month
   ```

3. **Shared CPU for Workers:**
   ```yaml
   workers:
     instanceType: g6-standard-2  # Instead of dedicated
   ```

---

## 🔐 Security Best Practices

### 1. Rotate SSH Keys Regularly

```bash
# Generate new keys
ssh-keygen -t ed25519 -f new_key

# Update Pulumi config
pulumi config set linode-k3s-cluster:ssh.autoGenerate false
pulumi config set linode-k3s-cluster:ssh.publicKey "$(cat new_key.pub)"
pulumi config set --secret linode-k3s-cluster:ssh.privateKey "$(cat new_key)"

# Apply
pulumi up
```

### 2. Restrict SSH Access

```yaml
linode-k3s-cluster:network:
  allowSshFromAnywhere: false
  allowedSshCidrs:
    - 203.0.113.0/24  # Your office IP range
```

### 3. Enable VPC

```yaml
linode-k3s-cluster:vpc:
  enabled: true
```

This isolates cluster traffic on a private network.

### 4. Use Kubernetes RBAC

```bash
# Create read-only user
kubectl create serviceaccount readonly-user
kubectl create clusterrolebinding readonly-binding \
  --clusterrole=view \
  --serviceaccount=default:readonly-user
```

### 5. Enable Network Policies

Deploy Calico or Cilium for network segmentation.

---

## 📚 Next Steps

Now that your cluster is running:

1. **[Deploy Applications](./ARGOCD_GUIDE.md)** - Use ArgoCD for GitOps
2. **[Monitor Your Cluster](./MONITORING.md)** - Set up monitoring and alerting
3. **[Configure Storage](./STORAGE.md)** - Set up persistent volumes
4. **[Backup & Disaster Recovery](./BACKUP.md)** - Protect your data
5. **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

---

## ❓ FAQ

### Q: How long does deployment take?
**A:** 10-15 minutes for a complete cluster.

### Q: Can I use a different Kubernetes version?
**A:** Yes, change `k3s.version` in `Pulumi.dev.yaml`. Format: `v1.28.5+k3s1`

### Q: Is this production-ready?
**A:** Yes! The default configuration includes:
- 3 master HA setup
- Automated validation
- Secure SSH access via bastion
- GitOps with ArgoCD

### Q: Can I deploy to AWS/GCP/Azure instead?
**A:** This project is Linode-specific, but the architecture can be adapted for other clouds.

### Q: How do I destroy the cluster?
**A:**
```bash
pulumi destroy
```
This removes ALL resources. **Warning: Data will be lost!**

### Q: What if deployment fails?
**A:** See [Troubleshooting Guide](./TROUBLESHOOTING.md) or check:
```bash
pulumi logs
```

### Q: Can I use my existing SSH keys?
**A:** Yes:
```yaml
ssh:
  autoGenerate: false
  publicKeyPath: ~/.ssh/id_ed25519.pub
  privateKeyPath: ~/.ssh/id_ed25519
```

---

## 🆘 Getting Help

- **Documentation:** `/docs` directory
- **Issues:** Check GitHub issues
- **Logs:** `pulumi logs`
- **Pulumi Support:** https://www.pulumi.com/support/

---

## ✅ Checklist

Before considering your deployment complete:

- [ ] Cluster deployed successfully
- [ ] All nodes are `Ready`
- [ ] kubectl access works
- [ ] ArgoCD is accessible
- [ ] Applications are deployed
- [ ] SSH access via bastion works
- [ ] Kubeconfig saved securely
- [ ] Costs reviewed and acceptable
- [ ] Backups configured
- [ ] Monitoring set up

---

**Congratulations! Your K3s cluster is now running!** 🎉

Next: [ArgoCD Guide](./ARGOCD_GUIDE.md) →
