# Arquitetura Orientada a Objetos - K3s Cluster Pulumi

## 📋 Visão Geral

Este projeto implementa uma infraestrutura K3s no Linode usando **Pulumi com TypeScript** e **Design Patterns Orientados a Objetos**. A arquitetura foi completamente refatorada para seguir princípios SOLID e padrões de design da indústria.

## 🏗️ Estrutura de Diretórios

```
config/
├── configuration/          # Montadores de Configuração (Builder Pattern)
│   ├── cluster-assembler.ts
│   ├── control-plane-assembler.ts
│   ├── worker-assembler.ts
│   └── index.ts
│
├── creators/               # Criadores de Recursos (Factory Pattern)
│   ├── node-creator.ts
│   ├── component-creator.ts
│   └── index.ts
│
├── installation/           # Métodos de Instalação (Strategy Pattern)
│   ├── connection-methods.ts
│   ├── k3s-installation-methods.ts
│   └── index.ts
│
├── validation/             # Verificadores de Configuração (Chain of Responsibility)
│   ├── config-checker.ts
│   └── index.ts
│
├── core/                   # Sistema Central
│   ├── config-manager.ts        # Singleton para gerenciar configuração
│   ├── event-dispatcher.ts      # Observer para eventos do cluster
│   ├── dependency-container.ts  # Container de injeção de dependências
│   ├── cluster-facade.ts        # Facade para interface simplificada
│   ├── base-node.ts             # Classe base abstrata para nós
│   └── index.ts
│
├── types.ts                # Interfaces e tipos TypeScript
└── loader.ts               # Carregador de configuração do Pulumi
```

## 🎨 Design Patterns Implementados

### 1. **Builder Pattern** (Padrão Construtor)
**Localização**: `config/configuration/`

**Propósito**: Construir objetos de configuração complexos passo a passo com interface fluente.

**Classes**:
- `ClusterConfigBuilder` - Monta configuração completa do cluster
- `ControlPlaneBuilder` - Monta configuração do control plane
- `WorkerBuilder` - Monta configuração dos workers

**Exemplo**:
```typescript
const config = new ClusterConfigBuilder()
  .setBasicInfo("my-cluster", "us-mia", "linode/ubuntu22.04")
  .setControlPlane(controlPlaneConfig)
  .setWorkers(workerConfig)
  .build(); // Valida automaticamente
```

**Benefícios**:
- ✅ Validação integrada
- ✅ Interface fluente e legível
- ✅ Type-safe em tempo de compilação
- ✅ Fácil de testar

---

### 2. **Factory Pattern** (Padrão Fábrica)
**Localização**: `config/creators/`

**Propósito**: Centralizar a criação de objetos e componentes de infraestrutura.

**Classes**:
- `NodeFactory` - Cria nós (control plane e workers)
- `ComponentFactory` - Cria componentes (VPC, Network, Bastion, etc.)

**Exemplo**:
```typescript
// Criar múltiplos nós de uma vez
const controlPlanes = NodeFactory.createControlPlaneNodes(
  clusterName,
  3,
  defaultArgs,
  globalLabels,
  nodeConfigs
);

// Criar bastion host
const bastion = ComponentFactory.createBastionHost(
  name, region, instanceType, image, sshKeyId, firewallId, ...
);
```

**Benefícios**:
- ✅ Criação consistente
- ✅ Reuso de código
- ✅ Fácil de mockar para testes
- ✅ Single point of creation

---

### 3. **Strategy Pattern** (Padrão Estratégia)
**Localização**: `config/installation/`

**Propósito**: Definir diferentes algoritmos de instalação e conexão que são intercambiáveis.

**Classes**:
- `DirectConnectionStrategy` - Conexão SSH direta
- `BastionConnectionStrategy` - Conexão SSH via jump host
- `K3sServerInstallStrategy` - Instalação do K3s server
- `K3sAgentInstallStrategy` - Instalação do K3s agent

**Exemplo**:
```typescript
// Escolher estratégia de conexão dinamicamente
const strategy = useBastionHost
  ? new BastionConnectionStrategy()
  : new DirectConnectionStrategy();

const connectionConfig = strategy.getConnectionConfig(context);
```

**Benefícios**:
- ✅ Algoritmos intercambiáveis
- ✅ Fácil adicionar novas estratégias
- ✅ Testável independentemente
- ✅ Segue Open/Closed Principle

---

### 4. **Chain of Responsibility** (Cadeia de Responsabilidade)
**Localização**: `config/validation/`

**Propósito**: Passar a configuração por uma cadeia de validadores, cada um responsável por um aspecto.

**Classes**:
- `BasicInfoValidator` - Valida informações básicas
- `ControlPlaneValidator` - Valida control plane
- `WorkerValidator` - Valida workers
- `SshValidator` - Valida configuração SSH
- `NetworkValidator` - Valida rede
- `VpcValidator` - Valida VPC
- `ArgoCDValidator` - Valida ArgoCD

**Exemplo**:
```typescript
const validator = ValidationChainBuilder.build();
// BasicInfo → ControlPlane → Worker → SSH → Network → VPC → ArgoCD
validator.validate(config);
```

**Benefícios**:
- ✅ Single Responsibility - cada validador tem um foco
- ✅ Fácil adicionar novos validadores
- ✅ Mensagens de erro claras
- ✅ Ordem de validação configurável

---

### 5. **Singleton Pattern** (Padrão Singleton)
**Localização**: `config/core/config-manager.ts`

**Propósito**: Garantir que existe apenas uma instância do gerenciador de configuração.

**Classe**: `ConfigurationManager`

**Exemplo**:
```typescript
const manager = ConfigurationManager.getInstance();
const config = manager.loadConfiguration(); // Carrega e cacheia
const sameConfig = manager.getConfiguration(); // Retorna do cache
```

**Benefícios**:
- ✅ Única fonte de verdade
- ✅ Cache automático
- ✅ Acesso global controlado
- ✅ Thread-safe (em contexto Node.js)

---

### 6. **Observer Pattern** (Padrão Observador)
**Localização**: `config/core/event-dispatcher.ts`

**Propósito**: Notificar observadores sobre eventos do ciclo de vida do cluster.

**Classes**:
- `EventDispatcher` - Gerencia eventos e observadores
- `ConsoleEventLogger` - Logger padrão para console

**Eventos**:
```typescript
enum ClusterEventType {
  CONFIGURATION_LOADED,
  CLUSTER_CREATING,
  CLUSTER_CREATED,
  NODE_CREATING,
  NODE_CREATED,
  NODE_FAILED,
  VPC_CREATED,
  NETWORK_CREATED,
  BASTION_CREATED,
  K3S_INSTALLING,
  K3S_INSTALLED,
  VALIDATION_STARTED,
  VALIDATION_COMPLETED,
  ARGOCD_INSTALLING,
  ARGOCD_INSTALLED,
  ERROR
}
```

**Exemplo**:
```typescript
const dispatcher = EventDispatcher.getInstance();

// Assinar eventos
dispatcher.on(ClusterEventType.NODE_CREATED, (event) => {
  console.log(`Node criado: ${event.message}`);
});

// Emitir eventos
dispatcher.emit(
  ClusterEventType.NODE_CREATED,
  "Node worker-1 criado com sucesso",
  { nodeId: "worker-1" }
);
```

**Benefícios**:
- ✅ Desacoplamento de componentes
- ✅ Histórico de eventos
- ✅ Múltiplos observadores
- ✅ Fácil adicionar logging/monitoring

---

### 7. **Dependency Injection Container**
**Localização**: `config/core/dependency-container.ts`

**Propósito**: Gerenciar dependências e seus ciclos de vida.

**Classe**: `ServiceContainer`

**Exemplo**:
```typescript
const container = ServiceContainer.getInstance();

// Registrar serviços
container.registerSingleton("config:manager", () =>
  ConfigurationManager.getInstance()
);

// Resolver serviços
const manager = container.resolve<ConfigurationManager>("config:manager");
```

**Benefícios**:
- ✅ Inversão de controle
- ✅ Gerenciamento de ciclo de vida
- ✅ Facilita testes
- ✅ Reduz acoplamento

---

### 8. **Facade Pattern** (Padrão Fachada)
**Localização**: `config/core/cluster-facade.ts`

**Propósito**: Fornecer interface simplificada para operações complexas do cluster.

**Classe**: `ClusterFacade`

**Exemplo**:
```typescript
const facade = new ClusterFacade();

// Interface simplificada
facade.initialize();
const summary = facade.getSummary();
const cost = facade.getEstimatedMonthlyCost();
const timeline = facade.getEstimatedDeploymentTime();
const recommendations = facade.getRecommendedInstanceTypes();
```

**Benefícios**:
- ✅ Interface simples para sistema complexo
- ✅ Esconde complexidade interna
- ✅ Fácil de usar
- ✅ Ponto único de entrada

---

### 9. **Abstract Base Class** (Classe Base Abstrata)
**Localização**: `config/core/base-node.ts`

**Propósito**: Definir estrutura comum para todos os tipos de nós.

**Classe**: `BaseNode`

**Métodos Abstratos**:
```typescript
abstract class BaseNode {
  protected abstract createInstance(...): linode.Instance;
  protected abstract generateInstallScript(...): pulumi.Output<string>;
  protected abstract getNodeRole(): string;
}
```

**Benefícios**:
- ✅ Reuso de código comum
- ✅ Enforce estrutura consistente
- ✅ Polimorfismo
- ✅ Template Method pattern

---

## 📊 Fluxo de Execução

```
1. index.ts inicia execução
   ↓
2. loadClusterConfig() carrega do Pulumi.dev.yaml
   ↓
3. ValidationChainBuilder valida configuração
   ↓
4. K3sCluster é criado (orchestrator principal)
   ↓
5. ComponentFactory cria infraestrutura base
   - VPC (se habilitado)
   - Network (firewalls)
   - SSH Keys
   - Bastion (se habilitado)
   ↓
6. NodeFactory cria nós
   - Control Plane Nodes (usando strategy)
   - Worker Nodes (usando strategy)
   ↓
7. EventDispatcher notifica progresso
   ↓
8. K3sValidation verifica instalação
   ↓
9. ArgoCDInstallation (se habilitado)
   ↓
10. Outputs exportados
```

## 🔧 Configuração

Toda configuração está em **`Pulumi.dev.yaml`** com estrutura organizada:

```yaml
config:
  # CLUSTER BÁSICO
  linode-k3s-cluster:cluster.name: "my-k3s-cluster"
  linode-k3s-cluster:cluster.region: "us-mia"

  # CONTROL PLANE - 3 Masters HA
  linode-k3s-cluster:controlPlane.count: "3"
  linode-k3s-cluster:controlPlane.instanceType: "g6-standard-4"
  linode-k3s-cluster:controlPlane.nodes: '[...]'

  # WORKERS - 5 Workers Especializados
  linode-k3s-cluster:workers.count: "5"
  linode-k3s-cluster:workers.nodes: '[...]'

  # ARGOCD - GitOps
  linode-k3s-cluster:argocd.enabled: "true"
  linode-k3s-cluster:argocd.gitRepo: "https://github.com/chalkan3/zapper-argocd"
  linode-k3s-cluster:argocd.gitPath: "apps/*"

  # SECRETS
  linode-k3s-cluster:cluster.rootPassword:
    secure: v1:...
  linode:token:
    secure: v1:...
```

## 🎯 Princípios SOLID

### **S** - Single Responsibility Principle
- Cada classe tem uma única responsabilidade
- Validadores focam em um aspecto específico
- Factories criam apenas um tipo de recurso

### **O** - Open/Closed Principle
- Aberto para extensão (novos validators, strategies)
- Fechado para modificação (base classes estáveis)

### **L** - Liskov Substitution Principle
- Subclasses podem substituir classes base
- Strategy implementations são intercambiáveis

### **I** - Interface Segregation Principle
- Interfaces pequenas e específicas
- Clients não dependem de métodos não usados

### **D** - Dependency Inversion Principle
- Depende de abstrações, não implementações
- Uso de interfaces e abstract classes
- Dependency Injection Container

## 📈 Benefícios da Arquitetura

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Testabilidade** | Difícil | Fácil com mocks |
| **Manutenibilidade** | Código procedural | Classes com responsabilidades claras |
| **Extensibilidade** | Hard-coded | Design patterns permitem extensão |
| **Legibilidade** | Funções grandes | Classes pequenas e focadas |
| **Reusabilidade** | Baixa | Alta com factories e builders |
| **Type Safety** | Básica | Completa com TypeScript |
| **Validação** | Função única | Chain of Responsibility |
| **Eventos** | Nenhum | Observer pattern |

## 🚀 Como Usar

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Preview mudanças
pulumi preview

# Aplicar infraestrutura
pulumi up
```

### Customização

1. **Adicionar novo validador**:
   - Criar classe em `config/validation/config-checker.ts`
   - Extender `BaseValidator`
   - Adicionar ao `ValidationChainBuilder`

2. **Adicionar nova estratégia de instalação**:
   - Criar classe em `config/installation/`
   - Implementar `InstallationStrategy`
   - Usar via `ConnectionStrategyFactory`

3. **Adicionar novo tipo de componente**:
   - Adicionar método em `ComponentFactory`
   - Seguir padrão existente

## 📚 Documentação Adicional

- `CHANGES.md` - Log detalhado de mudanças
- `README.md` - README original do projeto
- `docs/DESIGN_PATTERNS.md` - Explicação detalhada dos patterns
- `docs/INDEX.md` - Índice navegável da documentação

## ✅ Status do Projeto

- [x] Código legado removido
- [x] Design patterns implementados
- [x] Validação robusta
- [x] Sistema de eventos
- [x] Dependency injection
- [x] Facade simplificada
- [x] Classes base abstratas
- [x] Documentação completa
- [x] Compilação sem erros
- [x] ArgoCD configurado com repositório GitHub

## 🎓 Conclusão

Este projeto demonstra como aplicar **Design Patterns profissionais** em infraestrutura como código. A arquitetura é:

- ✨ **Profissional**: Segue padrões da indústria
- 🔒 **Type-Safe**: TypeScript garante type safety
- 🧪 **Testável**: Componentes isolados e mockáveis
- 📈 **Escalável**: Fácil adicionar novas features
- 📖 **Documentado**: Documentação completa e clara
- 🏗️ **Manutenível**: Código limpo e organizado

**Todo o código é nativo TypeScript/Pulumi, sem dependências externas de YAML!**
