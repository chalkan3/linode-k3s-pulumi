# K3s Cluster on Linode - Object-Oriented Architecture with Design Patterns

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Pulumi](https://img.shields.io/badge/Pulumi-3.204.0-purple)
![License](https://img.shields.io/badge/license-MIT-green)

Production-ready K3s cluster deployment on Linode using Pulumi with **Object-Oriented Design Patterns**, secure bastion architecture, and structured YAML configuration.

## 🎯 Key Features

### ✨ NEW: Object-Oriented Design
- **Builder Pattern**: Fluent configuration construction
- **Factory Pattern**: Centralized component creation
- **Strategy Pattern**: Flexible installation strategies
- **Chain of Responsibility**: Multi-stage validation

### 🔐 Security First
- Bastion host jump architecture
- Separated firewall rules
- Auto-generated SSH keys and K3s tokens
- Secrets managed via Pulumi

### 📝 YAML Configuration
- Structured configuration files per domain
- Clear, readable YAML syntax
- Type-safe with automatic validation
- Easy environment management

### 🚀 Production Ready
- High Availability (3+ masters)
- Custom node labels and taints
- VPC support
- ArgoCD integration

## 📁 Project Structure

```
.
├── components/              # Pulumi components
│   ├── k3s-cluster.ts      # Main cluster orchestrator
│   ├── control-plane-node.ts
│   ├── worker-node.ts
│   ├── bastion-host.ts
│   ├── network.ts
│   ├── vpc.ts
│   └── ...
│
├── config/                  # Configuration system
│   ├── yaml/               # YAML configuration files
│   │   ├── cluster.yaml
│   │   ├── control-plane.yaml
│   │   ├── workers.yaml
│   │   ├── k3s.yaml
│   │   ├── ssh.yaml
│   │   ├── vpc.yaml
│   │   ├── network.yaml
│   │   ├── bastion.yaml
│   │   └── argocd.yaml
│   │
│   ├── builders/           # Builder pattern implementations
│   │   ├── ClusterConfigBuilder.ts
│   │   ├── ControlPlaneBuilder.ts
│   │   └── WorkerBuilder.ts
│   │
│   ├── factories/          # Factory pattern implementations
│   │   ├── NodeFactory.ts
│   │   └── ComponentFactory.ts
│   │
│   ├── strategies/         # Strategy pattern implementations
│   │   ├── InstallationStrategy.ts
│   │   └── K3sInstallStrategy.ts
│   │
│   ├── validators/         # Chain of Responsibility validators
│   │   └── ConfigValidator.ts
│   │
│   ├── types.ts           # TypeScript interfaces
│   ├── loader.ts          # Configuration loader
│   └── yaml-loader.ts     # YAML configuration loader
│
├── docs/                   # Documentation
│   ├── YAML_CONFIGURATION.md
│   ├── DESIGN_PATTERNS.md
│   ├── MIGRATION_GUIDE.md
│   └── ...
│
└── index.ts               # Main entry point
```

## 🏗️ Architecture

### Security Architecture

```
Internet
    │
    ├─> Bastion Host (public SSH: port 22)
    │      │
    │      └─> Private Network
    │             │
    │             ├─> Control Plane Nodes
    │             │   └── SSH only via bastion
    │             │
    │             └─> Worker Nodes
    │                 └── SSH only via bastion
    │
    └─> K3s API (port 6443) → Control Planes
```

### Design Patterns Architecture

```
YAML Files
    │
    ▼
YamlConfigLoader
    │
    ├─> ClusterConfigBuilder (Builder Pattern)
    │   ├─> ControlPlaneBuilder
    │   └─> WorkerBuilder
    │
    ├─> ValidationChain (Chain of Responsibility)
    │   ├─> BasicInfoValidator
    │   ├─> ControlPlaneValidator
    │   ├─> WorkerValidator
    │   └─> ...
    │
    ▼
ClusterConfig (validated)
    │
    ▼
K3sCluster
    │
    ├─> ComponentFactory (Factory Pattern)
    │   ├─> createVpc()
    │   ├─> createNetwork()
    │   ├─> createBastion()
    │   └─> ...
    │
    └─> NodeFactory (Factory Pattern)
        ├─> createControlPlaneNodes()
        │   └─> InstallationStrategy (Strategy Pattern)
        │       ├─> K3sServerInstallStrategy
        │       └─> BastionConnectionStrategy
        │
        └─> createWorkerNodes()
            └─> InstallationStrategy (Strategy Pattern)
                ├─> K3sAgentInstallStrategy
                └─> DirectConnectionStrategy
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Install Node.js dependencies
npm install

# Configure Linode token
pulumi config set --secret linode:token "your-linode-api-token"

# Set root password
pulumi config set --secret cluster.rootPassword "YourSecurePassword123!"
```

### Configuration

#### Option 1: YAML Configuration (Recommended)

The YAML configuration files are already created in `config/yaml/`. Simply edit them:

**config/yaml/cluster.yaml**:
```yaml
name: "my-k3s-cluster"
region: "us-mia"
image: "linode/ubuntu22.04"

tags:
  - production
  - k3s
```

**config/yaml/control-plane.yaml**:
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
```

**config/yaml/workers.yaml**:
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
```

See [YAML Configuration Guide](./docs/YAML_CONFIGURATION.md) for complete documentation.

#### Option 2: Legacy Pulumi Config

If YAML files don't exist, the system falls back to Pulumi config:

```bash
pulumi config set cluster.name "my-k3s-cluster"
pulumi config set cluster.region "us-mia"
pulumi config set controlPlane.count 3
pulumi config set workers.count 5
```

### Deploy

```bash
# Preview changes
pulumi preview

# Deploy cluster
pulumi up

# Save kubeconfig
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml

# Save SSH key
pulumi stack output sshPrivateKey --show-secrets > ssh_key
chmod 600 ssh_key
```

### Access Cluster

```bash
# Set kubeconfig
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Check nodes
kubectl get nodes --show-labels

# SSH to bastion
ssh -i ssh_key root@$(pulumi stack output bastionPublicIp)

# SSH to control plane via bastion
ssh -i ssh_key -J root@$(pulumi stack output bastionPublicIp) \
  root@$(pulumi stack output controlPlanePrivateIps | jq -r '.[0]')
```

## 📚 Documentation

- **[YAML Configuration Guide](./docs/YAML_CONFIGURATION.md)**: Complete YAML configuration reference
- **[Design Patterns](./docs/DESIGN_PATTERNS.md)**: Detailed explanation of patterns used
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)**: Migrate from legacy config to YAML
- **[Original README](./README.md)**: Original documentation

## 🎨 Design Patterns

### Builder Pattern

Construct complex configurations with validation:

```typescript
const config = new ClusterConfigBuilder()
  .setBasicInfo("my-cluster", "us-mia", "linode/ubuntu22.04")
  .setControlPlane(controlPlaneConfig)
  .setWorkers(workerConfig)
  .build(); // Validates all required fields
```

### Factory Pattern

Centralized component creation:

```typescript
// Create multiple nodes with shared configuration
const cpNodes = NodeFactory.createControlPlaneNodes(
  clusterName,
  3,
  defaultArgs,
  globalLabels,
  nodeConfigs
);

// Create infrastructure components
const bastion = ComponentFactory.createBastionHost(
  name,
  region,
  instanceType,
  image,
  sshKeyId,
  firewallId,
  clusterName,
  rootPassword
);
```

### Strategy Pattern

Flexible installation approaches:

```typescript
// Different strategies for different scenarios
const directStrategy = new DirectConnectionStrategy();
const bastionStrategy = new BastionConnectionStrategy();

// Different K3s installation strategies
const serverStrategy = new K3sServerInstallStrategy(token, disableComponents);
const agentStrategy = new K3sAgentInstallStrategy(controlPlaneUrl, token);
```

### Chain of Responsibility

Multi-stage validation:

```typescript
// Build validation chain
const validator = ValidationChainBuilder.build();

// Validates: BasicInfo → ControlPlane → Worker → SSH → Network → VPC → ArgoCD
validator.validate(config);
```

## 🔧 Configuration Examples

### Specialized Worker Nodes

```yaml
# config/yaml/workers.yaml
count: 5
instanceType: "g6-standard-2"

nodes:
  # Database workers
  - name: "worker-postgres-1"
    instanceType: "g6-standard-4"
    labels:
      workload: postgres
      database: postgresql

  # Analytics workers
  - name: "worker-clickhouse-1"
    instanceType: "g6-standard-8"
    labels:
      workload: clickhouse
      database: clickhouse

  # Application workers
  - name: "worker-app-1"
    instanceType: "g6-standard-2"
    labels:
      workload: application
      app: peerdb
```

### High Availability Control Plane

```yaml
# config/yaml/control-plane.yaml
count: 3
instanceType: "g6-standard-4"

labels:
  environment: production
  role: master
  ha: "true"

nodes:
  - name: "master-1"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-1"
      az: "zone-a"

  - name: "master-2"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-2"
      az: "zone-b"

  - name: "master-3"
    instanceType: "g6-standard-4"
    labels:
      node-id: "master-3"
      az: "zone-c"
```

### VPC Configuration

```yaml
# config/yaml/vpc.yaml
enabled: true
label: "production-k3s-vpc"
description: "VPC for production K3s cluster"
subnetLabel: "k3s-subnet"
subnetIpv4: "10.0.0.0/24"
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Configuration** | Flat Pulumi config | Structured YAML files |
| **Readability** | Complex JSON strings | Clean YAML syntax |
| **Validation** | Basic type checking | Multi-stage validation |
| **Patterns** | Procedural code | Object-oriented design |
| **Testability** | Difficult to test | Easy to mock and test |
| **Maintainability** | Hard to extend | Easy to add features |
| **Documentation** | Minimal | Comprehensive |

## 🔐 Security Best Practices

1. **Never commit secrets**: Use Pulumi secrets or environment variables
2. **Use bastion host**: Enable bastion for production environments
3. **Restrict SSH access**: Configure `allowedSshCidrs` in network.yaml
4. **Use VPC**: Enable VPC for network isolation
5. **Auto-generate keys**: Let Pulumi generate SSH keys automatically
6. **Rotate credentials**: Regularly rotate root passwords and SSH keys

## 🚨 Troubleshooting

### Configuration not loading from YAML

Check if YAML files exist:
```bash
ls -la config/yaml/
```

### Validation errors

Run preview to see detailed errors:
```bash
pulumi preview
```

### SSH connection issues

Test bastion connection:
```bash
ssh -i ssh_key root@$(pulumi stack output bastionPublicIp)
```

See [Troubleshooting Guide](./docs/YAML_CONFIGURATION.md#troubleshooting) for more help.

## 🗺️ Roadmap

- [ ] Helm chart deployment support
- [ ] Monitoring with Prometheus/Grafana
- [ ] Log aggregation with Loki
- [ ] Automated backups
- [ ] Multi-region support
- [ ] Terraform compatibility layer

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Pulumi team for the amazing IaC framework
- K3s project for lightweight Kubernetes
- Linode for reliable cloud infrastructure
- Design Patterns community for best practices

## 📧 Support

- Documentation: [docs/](./docs/)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Made with ❤️ using Object-Oriented Design Patterns and TypeScript**
