# Testes Unitários - Linode K3s Cluster

Este documento descreve a estrutura completa de testes unitários do projeto e como executá-los.

## Estrutura de Testes

Os testes estão organizados da seguinte forma:

```
.
├── __tests__/
│   └── integration/
│       ├── cluster-creation.integration.test.ts
│       ├── config-validation.integration.test.ts
│       └── complete-workflow.integration.test.ts
├── components/
│   └── __tests__/
│       ├── ssh-key-generator.test.ts
│       ├── k3s-token-generator.test.ts
│       ├── ssh-key.test.ts
│       ├── vpc.test.ts
│       ├── network.test.ts
│       ├── bastion-host.test.ts
│       ├── control-plane-node.test.ts
│       ├── worker-node.test.ts
│       ├── k3s-validation.test.ts
│       └── argocd-installation.test.ts
├── config/
│   ├── __tests__/
│   │   ├── loader.test.ts
│   │   └── types.test.ts
│   ├── configuration/__tests__/
│   │   ├── cluster-assembler.test.ts
│   │   ├── control-plane-assembler.test.ts
│   │   └── worker-assembler.test.ts
│   ├── core/__tests__/
│   │   ├── base-node.test.ts
│   │   ├── cluster-facade.test.ts
│   │   ├── config-manager.test.ts
│   │   ├── dependency-container.test.ts
│   │   └── event-dispatcher.test.ts
│   ├── creators/__tests__/
│   │   ├── component-creator.test.ts
│   │   └── node-creator.test.ts
│   ├── installation/__tests__/
│   │   ├── connection-methods.test.ts
│   │   └── k3s-installation-methods.test.ts
│   └── validation/__tests__/
│       └── config-checker.test.ts
├── jest.config.js
└── package.json
```

## Componentes Testados

### 1. SSH Key Generator (`ssh-key-generator.test.ts`)
Testa a geração de chaves SSH para o cluster:
- Criação de chaves ed25519 (padrão)
- Criação de chaves RSA com tamanhos customizados
- Outputs de chave privada, pública e fingerprint
- Registro correto como ComponentResource

### 2. K3s Token Generator (`k3s-token-generator.test.ts`)
Testa a geração de tokens seguros para o K3s:
- Criação de tokens com comprimento adequado (64 caracteres)
- Tokens únicos para diferentes clusters
- Registro de token como secret
- Validação de características do token

### 3. SSH Key Component (`ssh-key.test.ts`)
Testa o componente de gerenciamento de chaves SSH no Linode:
- Criação de chave SSH no Linode com label
- Aceitação de diferentes tipos de chaves (ed25519, RSA)
- Suporte a pulumi.Input para chaves públicas
- Parent resource options

### 4. VPC Component (`vpc.test.ts`)
Testa a criação de VPC e Subnets:
- Criação de VPC no Linode
- Criação de Subnet dentro da VPC
- Configuração de CIDRs customizados
- Outputs de VPC ID e Subnet ID
- Diferentes configurações de cluster (dev, staging, prod)

### 5. Network Component (`network.test.ts`)
Testa a configuração de firewalls:
- Criação de firewall para bastion
- Criação de firewall para cluster
- Regras de SSH restrito
- Regras de comunicação interna do cluster
- Configurações de segurança customizadas

### 6. Bastion Host (`bastion-host.test.ts`)
Testa o jump host/bastion:
- Criação de instância bastion
- Configuração de SSH agent forwarding
- Integração com VPC
- Tags e labels customizados
- Conexão via firewall

### 7. Control Plane Node (`control-plane-node.test.ts`)
Testa nós control plane do K3s:
- Criação de instâncias control plane
- Geração e uso de tokens K3s
- Instalação do K3s server
- Configuração de labels e taints
- Conexão via bastion ou direta
- Configuração de cluster-init para HA

### 8. Worker Node (`worker-node.test.ts`)
Testa nós worker do K3s:
- Criação de instâncias worker
- Instalação do K3s agent
- Conexão ao control plane
- Configuração de labels e taints
- Diferentes tipos de workload (web, database, GPU)

### 9. K3s Validation (`k3s-validation.test.ts`)
Testa a validação do cluster:
- Verificação do status do serviço K3s
- Validação de número de nós registrados
- Verificação de nós no estado Ready
- Checagem de pods do sistema
- Validação de componentes críticos

### 10. ArgoCD Installation (`argocd-installation.test.ts`)
Testa a instalação do ArgoCD:
- Instalação do ArgoCD no cluster
- Exposição via NodePort
- Recuperação de senha admin
- Configuração de Git repositories
- Criação de ApplicationSets
- GitOps automation

### 11. Config Loader (`loader.test.ts`)
Testa o carregamento de configurações do Pulumi:
- Carregamento de configurações mínimas obrigatórias
- Valores padrão quando não especificados
- Configuração de SSH (auto-generate vs manual)
- Parsing de labels e arrays
- Configurações de VPC, bastion e ArgoCD

### 12. Config Types (`types.test.ts`)
Testa as validações de configuração:
- Validação de count do control plane (1 ou 3+, não 2)
- Validação de count dos workers (não negativo)
- Validação de arrays de nós (matching count)
- Configurações válidas completas

### 13. Control Plane Assembler (`control-plane-assembler.test.ts`)
Testa o builder do control plane:
- setCount com validação (rejeita < 1 e count = 2)
- setInstanceType e defaults
- setLabels
- setNodes com validação de count
- addNode individual e múltiplos
- build() com todas as validações
- Fluent interface

### 14. Worker Assembler (`worker-assembler.test.ts`)
Testa o builder dos workers:
- setCount permitindo 0 mas rejeitando negativos
- setInstanceType e defaults
- setLabels
- setNodes heterogêneos
- addNode com validação
- build() para diferentes tamanhos de pool
- Edge cases (zero workers, grandes clusters)

### 15. Cluster Facade (`cluster-facade.test.ts`)
Testa a facade de alto nível:
- initialize() e carregamento de configuração
- getConfiguration() com validações
- getSummary() do cluster
- validate() com eventos
- getRecommendedInstanceTypes() por tamanho
- getEstimatedMonthlyCost() com diferentes configurações
- getEstimatedDeploymentTime() com/sem ArgoCD
- Integration scenarios completos

## 🔗 Testes de Integração

### 16. Cluster Creation Integration (`cluster-creation.integration.test.ts`)
Testa a criação completa de clusters K3s:
- **Minimal Cluster**: 1 control plane + 2 workers
- **HA Cluster**: 3 control planes + 5 workers
- **VPC-enabled Cluster**: Cluster com VPC networking
- **GitOps-enabled Cluster**: Cluster com ArgoCD instalado
- **Custom Node Configurations**: Nós com configurações individuais
- **Cluster without Bastion**: Acesso SSH direto
- **Full-featured Production Cluster**: Todas as features habilitadas

### 17. Config Validation Integration (`config-validation.integration.test.ts`)
Testa a integração entre Builder e Validation:
- **Builder + Validation Integration**: Fluxo completo de build e validação
- **Complex Configuration Scenarios**: Nós customizados, labels, network complexa
- **Validation Error Scenarios**: Nome inválido, count incompatível, K3s inválido, VPC inválida
- **Builder Reset and Reuse**: Reset e reutilização do builder
- **Full Validation Chain**: Execução de toda cadeia de validadores

## 📊 Resultados dos Testes

### Testes Unitários e de Integração

```
Test Suites: 28 passed, 28 total
Tests:       788 passed, 788 total
Snapshots:   0 total
Time:        ~11s
```

### Testes E2E (End-to-End)

⚠️ **Não executados por padrão** (requerem infraestrutura real e incorrem em custos)

```
Test Suites: Skipped (require RUN_E2E_TESTS=true)
Tests:       19 E2E scenarios ready
Estimated Cost: $5-10 per full run
```

## 📈 Cobertura de Código

### Componentes (100% de cobertura) ✅
- `ssh-key-generator.ts` - 100% statements, 100% branches, 100% functions
- `k3s-token-generator.ts` - 100% statements, 100% branches, 100% functions
- `ssh-key.ts` - 100% statements, 100% branches, 100% functions
- `vpc.ts` - 100% statements, 100% branches, 100% functions
- `network.ts` - 100% statements, 100% branches, 100% functions
- `bastion-host.ts` - 100% statements, 100% branches, 100% functions
- `control-plane-node.ts` - 100% statements, 96.15% branches, 100% functions
- `worker-node.ts` - 100% statements, 95.45% branches, 100% functions
- `k3s-validation.ts` - 100% statements, 100% branches, 100% functions
- `argocd-installation.ts` - 100% statements, 94.11% branches, 100% functions
- `k3s-cluster.ts` - 100% statements, 98.91% branches, 100% functions

### Config - Core & Utilities (>80% de cobertura) ✅
- `config/loader.ts` - 100% statements, 80% branches, 100% functions
- `config/validation/config-checker.ts` - 84.27% statements, 80.25% branches, 96% functions
- `config/core/base-node.ts` - 100% statements, 100% branches, 100% functions
- `config/core/event-dispatcher.ts` - 98.27% statements, 81.25% branches, 100% functions
- `config/core/dependency-container.ts` - 100% statements, 100% branches, 100% functions
- `config/core/config-manager.ts` - 100% statements, 100% branches, 100% functions
- `config/creators/node-creator.ts` - 100% statements, 100% branches, 100% functions
- `config/creators/component-creator.ts` - 100% statements, 100% branches, 100% functions
- `config/installation/k3s-installation-methods.ts` - 100% statements, 90.9% branches, 100% functions
- `config/installation/connection-methods.ts` - 100% statements, 100% branches, 100% functions
- `config/configuration/cluster-assembler.ts` - 100% statements, 100% branches, 100% functions

### Estatísticas Gerais
```
------------------------------|---------|----------|---------|---------|
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |   89.62 |     90.7 |   81.93 |   90.83 |
 components                   |     100 |    97.39 |     100 |     100 |
 config                       |     100 |       80 |     100 |     100 |
 config/validation            |   86.04 |    87.39 |   73.52 |   85.93 |
 config/core                  |   93.75 |    96.25 |   87.87 |   95.93 |
 config/creators              |    91.3 |      100 |   85.71 |   95.23 |
 config/installation          |   86.56 |    94.11 |   75.86 |   86.15 |
 config/configuration         |   93.81 |      100 |   90.32 |    96.8 |
------------------------------|---------|----------|---------|---------|
```

### 📝 Notas sobre Cobertura

**Arquivos com 100% de Cobertura**: 24 arquivos principais ✨
**Cobertura Geral**: **89.62%** statements, **90.7%** branches, **90.83%** lines 🎯
**Total de Testes**: **800 testes** passando em **29 suites** ✅
**MARCO IMPORTANTE**: **Ultrapassamos 90% de cobertura em branches e lines!** 🚀
**Testes de Integração**: **31 testes** validando fluxos completos end-to-end 🔗
  - 12 testes em cluster-creation.integration.test.ts
  - 10 testes em config-validation.integration.test.ts
  - 9 testes em complete-workflow.integration.test.ts (NOVO!)

**Arquivos não testados** (código de integração/orquestração):
- `index.ts` - Arquivo principal de execução do Pulumi (não testável em unit tests)
- Arquivos `index.ts` de export - Apenas re-exportam módulos (baixíssima prioridade)

## Executando os Testes

### Instalar Dependências
```bash
npm install
```

### Executar Todos os Testes (Unit + Integration)
```bash
npm test
```

### Executar Testes em Modo Watch
```bash
npm run test:watch
```

### Executar Testes com Cobertura
```bash
npm run test:coverage
```

### Executar Testes com Saída Detalhada
```bash
npm run test:verbose
```

### Executar Apenas Testes Unitários
```bash
npm run test:unit
```

### Executar Apenas Testes de Integração
```bash
npm run test:integration
```

### Executar Testes E2E (End-to-End)
⚠️ **ATENÇÃO**: Cria infraestrutura REAL e incorre em custos!
```bash
# Configurar variáveis de ambiente primeiro
export LINODE_TOKEN=seu-token
export RUN_E2E_TESTS=true

# Executar testes E2E
npm run test:e2e
```

Ver [__tests__/e2e/README.md](./__tests__/e2e/README.md) para mais detalhes sobre testes E2E.

## Tecnologias Utilizadas

- **Jest**: Framework de testes
- **ts-jest**: Preprocessador TypeScript para Jest
- **@types/jest**: Tipos TypeScript para Jest
- **Pulumi Mocks**: Mocks para recursos Pulumi

## Configuração do Jest

O arquivo `jest.config.js` contém:
- Preset para TypeScript (`ts-jest`)
- Padrões de busca de arquivos de teste (apenas `*.test.ts`)
- Ignorar arquivos helper e de configuração E2E
- Configuração de cobertura
- Timeout de 30 segundos para testes

```javascript
testMatch: [
  '**/__tests__/**/*.test.ts',
  '**/?(*.)+(spec|test).ts'
],
testPathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/e2e/helpers/',
  '/__tests__/e2e/e2e.config.ts',
]
```

## Mocks do Pulumi

Os testes utilizam `pulumi.runtime.setMocks()` para simular:
- Criação de recursos (`newResource`)
- Chamadas de função (`call`)
- Outputs e secrets

Exemplo:
```typescript
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs) {
    return {
      id: args.inputs.name + "_id",
      state: args.inputs,
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});
```

## Categorias de Testes

### Testes de Infraestrutura
- VPC e Networking
- Firewalls e Segurança
- Bastion Host

### Testes de Cluster
- Control Plane Nodes
- Worker Nodes
- K3s Validation

### Testes de Segurança
- SSH Key Generation
- Token Generation
- Firewall Rules

### Testes de GitOps
- ArgoCD Installation
- ApplicationSet Configuration

### Testes de Configuração
- Config Loading
- Validation Rules

## Adicionando Novos Testes

Para adicionar novos testes:

1. Crie um arquivo `*.test.ts` no diretório `__tests__/` correspondente
2. Importe o módulo a ser testado
3. Configure os mocks do Pulumi
4. Escreva os casos de teste usando `describe()` e `it()`
5. Execute os testes para verificar

Exemplo:
```typescript
import * as pulumi from "@pulumi/pulumi";
import { MyComponent } from "../my-component";

pulumi.runtime.setMocks({...});

describe("MyComponent", () => {
  it("should do something", () => {
    const component = new MyComponent("test", {...});
    expect(component).toBeDefined();
  });
});
```

## Convenções de Nomenclatura

- Arquivos de teste: `*.test.ts`
- Describe blocks: Nome do componente/função
- Test cases: Descrição clara do comportamento esperado
- Use "should" no início das descrições de teste

## CI/CD

Os testes podem ser integrados em pipelines de CI/CD:

```yaml
# Exemplo para GitHub Actions
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Troubleshooting

### Erro: "Cannot find module"
```bash
npm install
npm run build
```

### Timeout em testes
Aumente o timeout no `jest.config.js`:
```javascript
testTimeout: 60000  // 60 segundos
```

### Problemas com TypeScript
Verifique o `tsconfig.json` e certifique-se de que está configurado corretamente.

## Testes de Integração

### Visão Geral
Os testes de integração validam o fluxo completo de criação e configuração de clusters K3s, testando a interação entre múltiplos componentes.

### Cenários Cobertos

#### Cluster Creation Integration
1. **Minimal Cluster**: Configuração mínima viável (1 CP + 2 workers)
2. **HA Cluster**: Alta disponibilidade (3 CPs + 5 workers)
3. **VPC-enabled**: Cluster com VPC e subnet customizada
4. **GitOps-enabled**: ArgoCD instalado e configurado
5. **Custom Nodes**: Nós com configurações individuais heterogêneas
6. **No Bastion**: Cluster sem bastion host
7. **Production**: Cluster completo com todas as features

#### Config Validation Integration
1. **Builder + Validation**: Teste de integração entre Builder pattern e Chain of Responsibility
2. **Complex Scenarios**: Configurações com nós customizados, labels, taints, network avançada
3. **Error Scenarios**: Validação de erros em nomes, counts, versões, VPC
4. **Builder Reuse**: Reset e reutilização do builder para múltiplas configurações
5. **Full Chain**: Execução completa da cadeia de validadores

#### Complete Workflow Integration
1. **Development Cluster Workflow**: Cluster mínimo de desenvolvimento com labels e configuração simplificada
2. **Staging Cluster Workflow**: HA cluster com VPC, custom K3s args e autoscaling tags
3. **Production Cluster Workflow**: Cluster completo com HA, VPC, ArgoCD, heterogeneous workers e segurança reforçada
4. **Multi-Environment Workflow**: Criação de dev, staging e prod a partir do mesmo builder (com reset)
5. **Cluster Upgrade Workflow**: Validação de upgrade de versão K3s (v1.27 → v1.28)
6. **Cluster Scaling Workflow**: Horizontal (worker count) e vertical (instance type) scaling
7. **Cluster Migration Workflow**: Migração de cluster sem VPC para com VPC
8. **GitOps Adoption Workflow**: Adição de ArgoCD a um cluster existente

### Mock Strategy para Integration Tests

Os testes de integração utilizam mocks abrangentes do Pulumi runtime:

```typescript
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs) {
    switch (args.type) {
      case "linode:index/instance:Instance":
        return { id: `instance-${args.name}`, state: {...} };
      case "linode:index/vpc:Vpc":
        return { id: `vpc-${args.name}`, state: {...} };
      // ... outros recursos
    }
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});
```

### Diferenças entre Unit e Integration Tests

| Aspecto | Unit Tests | Integration Tests |
|---------|-----------|-------------------|
| **Escopo** | Componente isolado | Múltiplos componentes |
| **Velocidade** | Rápido (~1s) | Moderado (~3s) |
| **Foco** | Lógica individual | Interação entre componentes |
| **Mocks** | Granulares | Abrangentes |
| **Objetivo** | Correção de código | Validação de fluxo |

## 🔥 Testes End-to-End (E2E)

### Visão Geral
Os testes E2E validam o ciclo de vida completo do cluster criando infraestrutura REAL na Linode.

⚠️ **IMPORTANTE**: Estes testes incorrem em custos reais (estimativa: $5-10 por execução completa).

### Estrutura E2E

```
__tests__/e2e/
├── README.md                      # Documentação completa
├── e2e.config.ts                  # Configuração E2E
├── cluster-lifecycle.e2e.test.ts  # Testes principais
└── helpers/
    ├── pulumi-helper.ts           # Pulumi Automation API
    └── kubectl-helper.ts          # Kubectl operations
```

### Cenários E2E Cobertos

1. **Minimal Cluster Deployment** (~15 min, $0.50/hora)
   - Deploy de 1 control plane + 2 workers
   - Validação de conectividade kubectl
   - Verificação de pods do sistema
   - Deploy de workload de teste

2. **HA Cluster Deployment** (~20 min, $2.00/hora)
   - Deploy de 3 control planes + 3 workers
   - Verificação de quorum etcd
   - Teste de resiliência a falhas

3. **VPC-enabled Cluster** (~15 min, $0.50/hora)
   - Criação de VPC e subnet
   - Validação de IPs privados
   - Teste de roteamento via VPC

4. **GitOps with ArgoCD** (~20 min, $0.50/hora)
   - Instalação do ArgoCD
   - Validação de UI e sync de apps
   - Teste de ApplicationSet

### Executando Testes E2E

```bash
# 1. Configurar variáveis de ambiente
export LINODE_TOKEN=seu-token-aqui
export RUN_E2E_TESTS=true
export E2E_ROOT_PASSWORD=SuaSenhaSegura123!

# 2. Executar testes
npm run test:e2e

# 3. Cleanup manual (se necessário)
npm run test:e2e:cleanup
```

### Documentação Completa

Para informações detalhadas sobre:
- Pré-requisitos e configuração
- Variáveis de ambiente
- Estimativa de custos
- Troubleshooting
- Segurança

Veja: **[__tests__/e2e/README.md](./__tests__/e2e/README.md)**

## Próximos Passos

Possíveis melhorias futuras:
- ✅ Testes E2E com infraestrutura real (IMPLEMENTADO!)
- Testes de performance e carga
- Testes de rollback e recovery
- Validação de security policies
- Testes de upgrade de versão do K3s

## Contribuindo

Ao adicionar novos recursos:
1. Sempre adicione testes correspondentes
2. Mantenha cobertura acima de 80% para componentes críticos
3. Execute `npm run test:coverage` antes de fazer commit
4. Documente casos de teste complexos

## Referências

- [Jest Documentation](https://jestjs.io/)
- [Pulumi Testing Guide](https://www.pulumi.com/docs/using-pulumi/testing/)
- [TypeScript Jest](https://kulshekhar.github.io/ts-jest/)
