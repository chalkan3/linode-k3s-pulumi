# Design Patterns Documentation

This document explains the design patterns applied to the Linode K3s cluster infrastructure code.

## Overview

The codebase now uses several Object-Oriented Design Patterns to improve:
- **Maintainability**: Easier to understand and modify
- **Testability**: Components can be tested independently
- **Extensibility**: New features can be added without breaking existing code
- **Separation of Concerns**: Each class has a single responsibility

## Patterns Implemented

### 1. Builder Pattern

**Purpose**: Construct complex objects step by step with a fluent interface.

**Location**: `config/builders/`

#### ClusterConfigBuilder

Builds the complete cluster configuration:

```typescript
const config = new ClusterConfigBuilder()
  .setBasicInfo("my-cluster", "us-mia", "linode/ubuntu22.04")
  .setRootPassword(rootPassword)
  .setControlPlane(controlPlaneConfig)
  .setWorkers(workerConfig)
  .setK3s(k3sConfig)
  .setSsh(sshConfig)
  .setVpc(vpcConfig)
  .setNetwork(networkConfig)
  .setBastion(bastionConfig)
  .setArgoCD(argocdConfig)
  .setTags(["production", "k3s"])
  .build();
```

**Benefits**:
- Validates all required fields before building
- Provides clear, readable construction syntax
- Allows method chaining for convenience

#### ControlPlaneBuilder

Builds control plane configuration:

```typescript
const controlPlane = new ControlPlaneBuilder()
  .setCount(3)
  .setInstanceType("g6-standard-4")
  .setLabels({ environment: "production" })
  .addNode({
    name: "master-1",
    instanceType: "g6-standard-4",
    labels: { "node-id": "master-1" }
  })
  .build();
```

**Features**:
- Validates count vs nodes array length
- Prevents invalid configurations (e.g., count of 2)
- Supports both global and per-node configuration

#### WorkerBuilder

Similar to ControlPlaneBuilder but for worker nodes:

```typescript
const workers = new WorkerBuilder()
  .setCount(5)
  .setInstanceType("g6-standard-2")
  .setLabels({ environment: "production" })
  .addNode({
    name: "worker-postgres-1",
    instanceType: "g6-standard-4",
    labels: { workload: "postgres" }
  })
  .build();
```

### 2. Factory Pattern

**Purpose**: Centralize object creation and hide construction complexity.

**Location**: `config/factories/`

#### NodeFactory

Creates node instances:

```typescript
// Single control plane node
const cpNode = NodeFactory.createControlPlaneNode(
  "my-cluster-cp-0",
  args,
  opts
);

// Multiple control plane nodes
const cpNodes = NodeFactory.createControlPlaneNodes(
  "my-cluster",
  3,
  defaultArgs,
  globalLabels,
  nodeConfigs,
  opts
);

// Single worker node
const worker = NodeFactory.createWorkerNode(
  "my-cluster-worker-0",
  args,
  opts
);

// Multiple worker nodes
const workers = NodeFactory.createWorkerNodes(
  "my-cluster",
  5,
  defaultArgs,
  globalLabels,
  nodeConfigs,
  opts
);
```

**Benefits**:
- Single point of node creation
- Handles label merging (global + node-specific)
- Manages node naming conventions
- Simplifies bulk node creation

#### ComponentFactory

Creates infrastructure components:

```typescript
// Create VPC
const vpc = ComponentFactory.createVpc(
  name,
  region,
  clusterName,
  vpcLabel,
  vpcDescription,
  subnetLabel,
  subnetIpv4,
  opts
);

// Create Network (firewalls)
const network = ComponentFactory.createNetwork(
  name,
  region,
  clusterName,
  allowedSshCidrs,
  vpcId,
  opts
);

// Create SSH Key Generator
const sshKeyGen = ComponentFactory.createSshKeyGenerator(
  name,
  keyName,
  keyType,
  keyBits,
  opts
);

// Create Bastion Host
const bastion = ComponentFactory.createBastionHost(
  name,
  region,
  instanceType,
  image,
  sshKeyId,
  firewallId,
  clusterName,
  rootPassword,
  tags,
  allowedSshCidrs,
  vpcId,
  subnetId,
  opts
);
```

**Benefits**:
- Consistent component creation
- Encapsulates component dependencies
- Easy to mock for testing

### 3. Strategy Pattern

**Purpose**: Define a family of algorithms and make them interchangeable.

**Location**: `config/strategies/`

#### InstallationStrategy

Base interface for installation strategies:

```typescript
interface InstallationStrategy {
  generateInstallScript(context: InstallationContext): pulumi.Output<string>;
  getConnectionConfig(context: InstallationContext): any;
}
```

#### DirectConnectionStrategy

SSH directly to nodes:

```typescript
const strategy = new DirectConnectionStrategy();
const connection = strategy.getConnectionConfig(context);
// { host: nodeIp, user: "root", privateKey: key }
```

#### BastionConnectionStrategy

SSH through bastion host:

```typescript
const strategy = new BastionConnectionStrategy();
const connection = strategy.getConnectionConfig(context);
// {
//   host: privateIp,
//   user: "root",
//   privateKey: key,
//   proxy: { host: bastionIp, user: "root", privateKey: key }
// }
```

#### K3sServerInstallStrategy

K3s server installation script generation:

```typescript
const strategy = new K3sServerInstallStrategy(
  token,
  ["traefik"],
  ["--disable-cloud-controller"]
);

const installScript = strategy.generateInstallScript({
  nodeName: "master-1",
  nodeIp: publicIp,
  privateNodeIp: privateIp,
  privateKey: sshKey,
  k3sVersion: "v1.28.5+k3s1",
  labels: { environment: "production" },
  taints: [{ key: "node-role", value: "master", effect: "NoSchedule" }]
});
```

#### K3sAgentInstallStrategy

K3s agent installation script generation:

```typescript
const strategy = new K3sAgentInstallStrategy(
  controlPlaneUrl,
  k3sToken,
  ["--node-ip=0.0.0.0"]
);

const installScript = strategy.generateInstallScript(context);
```

**Benefits**:
- Easy to add new installation methods
- Separation between connection logic and installation logic
- Testable independently

### 4. Chain of Responsibility Pattern

**Purpose**: Pass requests along a chain of handlers.

**Location**: `config/validators/`

#### Validator Chain

Each validator checks one aspect and passes to the next:

```typescript
const validator = ValidationChainBuilder.build();
validator.validate(config);
```

The chain is built automatically:

```
BasicInfoValidator
  → ControlPlaneValidator
    → WorkerValidator
      → SshValidator
        → NetworkValidator
          → VpcValidator
            → ArgoCDValidator
```

#### Individual Validators

**BasicInfoValidator**:
```typescript
class BasicInfoValidator extends BaseValidator {
  protected doValidate(config: ClusterConfig): void {
    if (!config.name) throw new Error("Cluster name is required");
    if (!config.region) throw new Error("Region is required");
    if (!config.image) throw new Error("Image is required");
    if (!config.rootPassword) throw new Error("Root password is required");
  }
}
```

**ControlPlaneValidator**:
```typescript
class ControlPlaneValidator extends BaseValidator {
  protected doValidate(config: ClusterConfig): void {
    if (config.controlPlane.count < 1) {
      throw new Error("Control plane count must be at least 1");
    }
    if (config.controlPlane.count === 2) {
      throw new Error("Count of 2 is not recommended. Use 1 or 3+");
    }
    // Check nodes array length matches count
  }
}
```

**NetworkValidator**:
```typescript
class NetworkValidator extends BaseValidator {
  protected doValidate(config: ClusterConfig): void {
    // Validate SSH access rules
    // Validate NodePort range
  }
}
```

**Benefits**:
- Single Responsibility: Each validator checks one thing
- Easy to add new validators
- Easy to reorder validation steps
- Clear error messages

## Class Diagram

```
┌─────────────────────────────┐
│   ClusterConfigBuilder      │
│ ─────────────────────────── │
│ + setBasicInfo()           │
│ + setControlPlane()        │
│ + setWorkers()             │
│ + build(): ClusterConfig   │
└─────────────────────────────┘
              │
              │ uses
              ▼
┌─────────────────────────────┐
│   ControlPlaneBuilder       │
│   WorkerBuilder             │
└─────────────────────────────┘
              │
              │ creates
              ▼
┌─────────────────────────────┐
│      NodeFactory            │
│ ─────────────────────────── │
│ + createControlPlaneNode()  │
│ + createWorkerNode()        │
│ + createControlPlaneNodes() │
│ + createWorkerNodes()       │
└─────────────────────────────┘
              │
              │ creates
              ▼
┌─────────────────────────────┐
│   ControlPlaneNode          │
│   WorkerNode                │
└─────────────────────────────┘


┌─────────────────────────────┐
│  InstallationStrategy       │
│  (interface)                │
│ ─────────────────────────── │
│ + generateInstallScript()   │
│ + getConnectionConfig()     │
└─────────────────────────────┘
              △
              │ implements
    ┌─────────┴─────────┐
    │                   │
┌───┴────────────┐  ┌───┴──────────────┐
│  DirectConn    │  │  BastionConn     │
│  Strategy      │  │  Strategy        │
└────────────────┘  └──────────────────┘
    △                   △
    │                   │
┌───┴─────────┐    ┌───┴──────────┐
│ K3sServer   │    │ K3sAgent     │
│ Strategy    │    │ Strategy     │
└─────────────┘    └──────────────┘


┌─────────────────────────────┐
│    ConfigValidator          │
│    (interface)              │
│ ─────────────────────────── │
│ + setNext()                 │
│ + validate()                │
└─────────────────────────────┘
              △
              │ implements
┌─────────────┴─────────────┐
│     BaseValidator         │
│ ───────────────────────── │
│ # doValidate()            │
│ - nextValidator           │
└───────────────────────────┘
              △
              │ extends
    ┌─────────┴──────────┐
    │                    │
┌───┴──────────┐  ┌──────┴─────────┐
│ BasicInfo    │  │ ControlPlane   │
│ Validator    │  │ Validator      │
└──────────────┘  └────────────────┘
```

## Benefits Summary

| Pattern | Benefit | Example Use Case |
|---------|---------|-----------------|
| **Builder** | Complex object construction | Building ClusterConfig with validation |
| **Factory** | Centralized creation | Creating multiple nodes with shared config |
| **Strategy** | Interchangeable algorithms | Different K3s installation methods |
| **Chain of Responsibility** | Sequential processing | Multi-stage configuration validation |

## Testing

Each pattern makes the code more testable:

### Testing Builders
```typescript
test("ClusterConfigBuilder validates required fields", () => {
  const builder = new ClusterConfigBuilder();
  expect(() => builder.build()).toThrow("Cluster name is required");
});
```

### Testing Factories
```typescript
test("NodeFactory creates correct number of nodes", () => {
  const nodes = NodeFactory.createControlPlaneNodes("test", 3, args);
  expect(nodes.length).toBe(3);
});
```

### Testing Strategies
```typescript
test("DirectConnectionStrategy returns correct config", () => {
  const strategy = new DirectConnectionStrategy();
  const config = strategy.getConnectionConfig(context);
  expect(config.host).toBe(context.nodeIp);
});
```

### Testing Validators
```typescript
test("ControlPlaneValidator rejects count of 2", () => {
  const validator = new ControlPlaneValidator();
  const config = { controlPlane: { count: 2 } };
  expect(() => validator.validate(config)).toThrow("not recommended");
});
```

## Future Enhancements

Potential patterns to add:

1. **Observer Pattern**: Notify components when cluster state changes
2. **Singleton Pattern**: Shared configuration manager
3. **Decorator Pattern**: Add features to nodes dynamically
4. **Template Method Pattern**: Define skeleton of node setup algorithm
5. **Command Pattern**: Encapsulate cluster operations

## References

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns)
- [Builder Pattern](https://refactoring.guru/design-patterns/builder)
- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility)
