# Documentation Index

Welcome to the comprehensive documentation for **Linode K3s Cluster** - a production-ready Kubernetes (K3s) cluster deployed on Linode using Pulumi Infrastructure as Code with GitOps capabilities.

---

## 🚀 Quick Start Paths

### New to This Project?
1. **[Getting Started Guide](./GETTING_STARTED.md)** - Complete setup in 5 minutes
2. **[Configuration Reference](./CONFIGURATION.md)** - Understand all options
3. **[ArgoCD Guide](./ARGOCD_GUIDE.md)** - Deploy applications with GitOps

### Experiencing Issues?
1. **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common problems and solutions
2. **[Validations Reference](./VALIDATIONS.md)** - Understanding validation errors

### Want to Understand the Architecture?
1. **[Design Patterns](./DESIGN_PATTERNS.md)** - OOP patterns explained
2. **[YAML Structure](./YAML_STRUCTURE.md)** - Configuration format details

---

## 📚 Complete Documentation

### Core Guides

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[Getting Started](./GETTING_STARTED.md)** | Complete deployment guide from zero to production | First time deploying |
| **[Configuration Reference](./CONFIGURATION.md)** | Detailed reference for all configuration options | When customizing cluster |
| **[ArgoCD Guide](./ARGOCD_GUIDE.md)** | GitOps and continuous delivery setup | When deploying applications |
| **[Troubleshooting](./TROUBLESHOOTING.md)** | Common issues and solutions | When facing problems |
| **[Validations](./VALIDATIONS.md)** | Understanding configuration validations | When getting validation errors |

### Architecture & Design

| Document | Description | When to Use |
|----------|-------------|-------------|
| **[Design Patterns](./DESIGN_PATTERNS.md)** | OOP patterns and architecture | Understanding codebase structure |
| **[YAML Structure](./YAML_STRUCTURE.md)** | Configuration file format explained | Understanding Pulumi.dev.yaml |
| **[Migration Guide](./MIGRATION_GUIDE.md)** | Migrating from old configurations | Upgrading existing setup |

---

## 🎯 Documentation by Role

### For DevOps Engineers

**Getting Started:**
1. [Getting Started Guide](./GETTING_STARTED.md) - Deploy your first cluster
2. [Configuration Reference](./CONFIGURATION.md) - Customize for your needs
3. [Troubleshooting](./TROUBLESHOOTING.md) - Resolve issues quickly

**Day-to-Day Operations:**
- [ArgoCD Guide](./ARGOCD_GUIDE.md) - Manage applications
- [Configuration Reference](./CONFIGURATION.md#scaling) - Scale cluster
- [Troubleshooting](./TROUBLESHOOTING.md) - Debug problems

### For Developers

**Deploying Applications:**
1. [ArgoCD Guide](./ARGOCD_GUIDE.md) - GitOps workflow
2. [Getting Started](./GETTING_STARTED.md#access-your-cluster) - Access cluster
3. [Troubleshooting](./TROUBLESHOOTING.md) - Application issues

**Understanding Infrastructure:**
- [YAML Structure](./YAML_STRUCTURE.md) - Configuration format
- [Validations](./VALIDATIONS.md) - Allowed values and rules

### For Architects

**Architecture Understanding:**
1. [Design Patterns](./DESIGN_PATTERNS.md) - OOP architecture
2. [YAML Structure](./YAML_STRUCTURE.md) - Data model
3. [Configuration Reference](./CONFIGURATION.md) - Available options

**Design Decisions:**
- [Design Patterns](./DESIGN_PATTERNS.md) - Why patterns were chosen
- [Migration Guide](./MIGRATION_GUIDE.md) - Evolution of architecture

---

## 📖 Quick Reference

### Configuration Sections

| Section | Purpose | Documentation |
|---------|---------|---------------|
| **cluster** | Basic cluster settings | [Config Ref](./CONFIGURATION.md#1-cluster-configuration) |
| **controlPlane** | Master nodes (HA) | [Config Ref](./CONFIGURATION.md#2-control-plane-configuration) |
| **workers** | Worker nodes | [Config Ref](./CONFIGURATION.md#3-workers-configuration) |
| **k3s** | Kubernetes settings | [Config Ref](./CONFIGURATION.md#4-k3s-configuration) |
| **ssh** | SSH key management | [Config Ref](./CONFIGURATION.md#5-ssh-configuration) |
| **vpc** | Network isolation | [Config Ref](./CONFIGURATION.md#6-vpc-configuration) |
| **network** | Firewall rules | [Config Ref](./CONFIGURATION.md#7-network-configuration) |
| **bastion** | Jump server | [Config Ref](./CONFIGURATION.md#8-bastion-configuration) |
| **argocd** | GitOps setup | [Config Ref](./CONFIGURATION.md#9-argocd-configuration) |
| **secrets** | Encrypted passwords | [Config Ref](./CONFIGURATION.md#10-secrets-configuration) |

### Common Tasks

| Task | Documentation |
|------|---------------|
| Deploy new cluster | [Getting Started](./GETTING_STARTED.md#quick-start-5-minutes) |
| Add worker nodes | [Configuration - Workers](./CONFIGURATION.md#3-workers-configuration) |
| Deploy application | [ArgoCD - Deploy](./ARGOCD_GUIDE.md#deploy-new-application) |
| Scale cluster | [Configuration Reference](./CONFIGURATION.md) |
| Enable VPC | [Configuration - VPC](./CONFIGURATION.md#6-vpc-configuration) |
| Restrict SSH access | [Configuration - Network](./CONFIGURATION.md#7-network-configuration) |
| Troubleshoot nodes | [Troubleshooting](./TROUBLESHOOTING.md#3-k3s-installation-fails) |
| Fix ArgoCD sync | [Troubleshooting](./TROUBLESHOOTING.md#6-applications-not-syncing-in-argocd) |

### Validation Reference

| Validation Type | Documentation |
|-----------------|---------------|
| Cluster name rules | [Validations - BasicInfo](./VALIDATIONS.md#1-basicinfovalidator) |
| Valid regions | [Validations - BasicInfo](./VALIDATIONS.md#região-linode) |
| Instance types | [Validations - ControlPlane](./VALIDATIONS.md#2-controlplanevalidator) |
| K3s versions | [Validations - K3s](./VALIDATIONS.md#4-k3svalidator) |
| CIDR formats | [Validations - Network](./VALIDATIONS.md#6-networkvalidator) |
| ArgoCD git URLs | [Validations - ArgoCD](./VALIDATIONS.md#9-argoCDvalidator) |

---

## 🎓 Common Scenarios

### Scenario 1: Production Cluster with HA

**Goal:** Deploy production-ready cluster with high availability

**Documents:**
1. [Getting Started](./GETTING_STARTED.md)
2. [Configuration - Control Plane (HA)](./CONFIGURATION.md#count-required)
3. [Configuration - VPC](./CONFIGURATION.md#6-vpc-configuration)
4. [Configuration - Network Security](./CONFIGURATION.md#restricted-access-production)

**Example Configuration:**
- 3 master nodes (HA)
- 5+ worker nodes
- VPC enabled
- Restricted SSH access
- ArgoCD for GitOps

### Scenario 2: Development Environment

**Goal:** Quick, cost-effective development cluster

**Documents:**
1. [Getting Started - Quick Start](./GETTING_STARTED.md#quick-start-5-minutes)
2. [Configuration - Dev Setup](./CONFIGURATION.md#devtest-environment)

**Example Configuration:**
- 1 master node
- 2 worker nodes
- No VPC
- Open SSH access
- Optional ArgoCD

### Scenario 3: Database Workloads

**Goal:** Cluster optimized for databases (PostgreSQL, ClickHouse)

**Documents:**
1. [Configuration - Specialized Workers](./CONFIGURATION.md#specialized-workers-recommended-for-production)
2. [ArgoCD - Database Applications](./ARGOCD_GUIDE.md#2-postgresql-application-cloudnativepg)

**Example Configuration:**
- 3 masters
- Workers with labels for database affinity
- Larger instances for database workers (g6-standard-4+)
- VPC for isolation

### Scenario 4: GitOps Pipeline

**Goal:** Full GitOps workflow with ArgoCD

**Documents:**
1. [ArgoCD Guide](./ARGOCD_GUIDE.md)
2. [ArgoCD - Application Structure](./ARGOCD_GUIDE.md#application-structure)
3. [ArgoCD - Best Practices](./ARGOCD_GUIDE.md#best-practices)

**Steps:**
1. Enable ArgoCD in configuration
2. Create Git repository with Applications
3. Configure auto-sync
4. Deploy applications

---

## 🔍 Finding Information

### "How do I...?"

| Question | Answer |
|----------|--------|
| Deploy a cluster? | [Getting Started](./GETTING_STARTED.md#quick-start-5-minutes) |
| Change cluster size? | [Configuration - Workers](./CONFIGURATION.md#count-required-1) |
| Add custom labels? | [Configuration - Labels](./CONFIGURATION.md#labels-optional) |
| Enable high availability? | [Configuration - Control Plane](./CONFIGURATION.md#count-required) |
| Deploy applications? | [ArgoCD Guide](./ARGOCD_GUIDE.md#deploy-new-application) |
| Restrict network access? | [Configuration - Network](./CONFIGURATION.md#restricted-access-production) |
| Fix deployment errors? | [Troubleshooting](./TROUBLESHOOTING.md) |
| Understand validation errors? | [Validations](./VALIDATIONS.md) |

### "What is...?"

| Question | Answer |
|----------|--------|
| The architecture? | [Design Patterns](./DESIGN_PATTERNS.md) |
| A validation error? | [Validations](./VALIDATIONS.md) |
| ArgoCD? | [ArgoCD Guide](./ARGOCD_GUIDE.md#overview) |
| The bastion host? | [Configuration - Bastion](./CONFIGURATION.md#8-bastion-configuration) |
| VPC? | [Configuration - VPC](./CONFIGURATION.md#6-vpc-configuration) |
| Chain of Responsibility? | [Design Patterns - CoR](./DESIGN_PATTERNS.md#chain-of-responsibility) |

### "Why is...?"

| Question | Answer |
|----------|--------|
| My deployment failing? | [Troubleshooting](./TROUBLESHOOTING.md) |
| Validation rejecting my config? | [Validations Reference](./VALIDATIONS.md) |
| ArgoCD not syncing? | [Troubleshooting - ArgoCD](./TROUBLESHOOTING.md#6-applications-not-syncing-in-argocd) |
| Control plane count of 2 invalid? | [Validations - Control Plane](./VALIDATIONS.md#count-quantidade) |

---

## 📊 Visual Guides

### Configuration Flow

```
Pulumi.dev.yaml
      ↓
  Loader.ts (reads YAML)
      ↓
  ValidationChainBuilder (validates)
      ↓
  K3sCluster Component (deploys)
      ↓
  Running Cluster
```

See: [Design Patterns](./DESIGN_PATTERNS.md) for detailed diagrams

### Deployment Process

```
1. npm install
2. pulumi config set (secrets)
3. pulumi up (deploy)
   ├── Create infrastructure
   ├── Install K3s
   ├── Join nodes
   ├── Validate cluster
   └── Install ArgoCD (optional)
4. Access cluster
```

See: [Getting Started](./GETTING_STARTED.md#understanding-the-deployment-process)

---

## 🔗 External Resources

- **Pulumi:** https://www.pulumi.com/docs/
- **K3s:** https://docs.k3s.io/
- **ArgoCD:** https://argo-cd.readthedocs.io/
- **Linode:** https://www.linode.com/docs/
- **Kubernetes:** https://kubernetes.io/docs/

---

## 💬 Getting Help

### Documentation Not Clear?
- Check [Troubleshooting](./TROUBLESHOOTING.md)
- Review specific guide for your task
- Search this index for keywords

### Found a Bug?
- Check existing issues
- Review [Troubleshooting](./TROUBLESHOOTING.md)
- Create detailed bug report

### Have a Question?
- Search this documentation index
- Check relevant guide
- Ask in community discussions

---

## ✅ Documentation Checklist

Before deploying to production:

- [ ] Read [Getting Started](./GETTING_STARTED.md)
- [ ] Review [Configuration Reference](./CONFIGURATION.md)
- [ ] Understand [Validations](./VALIDATIONS.md)
- [ ] Know how to [Troubleshoot](./TROUBLESHOOTING.md)
- [ ] Set up [ArgoCD](./ARGOCD_GUIDE.md) if needed
- [ ] Bookmarked this index for reference

---

## 📅 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| INDEX.md | ✅ Current | 2025-10-27 |
| GETTING_STARTED.md | ✅ Current | 2025-10-27 |
| CONFIGURATION.md | ✅ Current | 2025-10-27 |
| ARGOCD_GUIDE.md | ✅ Current | 2025-10-27 |
| TROUBLESHOOTING.md | ✅ Current | 2025-10-27 |
| VALIDATIONS.md | ✅ Current | 2025-10-27 |
| DESIGN_PATTERNS.md | ✅ Current | 2025-10-27 |
| YAML_STRUCTURE.md | ✅ Current | 2025-10-27 |
| MIGRATION_GUIDE.md | ✅ Current | 2025-10-27 |

---

**Version:** 3.0.0
**Last Updated:** October 27, 2025
**Maintained by:** Platform Team

---

✨ **Built with Pulumi, K3s, and TypeScript**
🎯 **Ready for Production**
📦 **Complete GitOps Integration**
