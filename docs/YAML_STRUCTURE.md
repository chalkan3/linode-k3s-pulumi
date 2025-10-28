# Estrutura YAML do Pulumi.dev.yaml

## 📋 Visão Geral

Este documento descreve a estrutura YAML limpa e organizada do arquivo `Pulumi.dev.yaml`, que é a **única fonte de configuração** do cluster K3s.

## ✅ Características da Nova Estrutura

- **100% YAML nativo**: Nenhum JSON string, apenas estrutura YAML pura
- **Pulumi nativo**: Usa `config.requireObject()` e `config.getObject()`
- **Hierárquica e legível**: Estrutura aninhada com indentação clara
- **Type-safe**: Validada por TypeScript através do `loader.ts`
- **Single source of truth**: Toda configuração em um único arquivo

## 🏗️ Estrutura de Configuração

### 1. **Cluster - Configuração Básica**

```yaml
linode-k3s-cluster:cluster:
  name: my-k3s-cluster
  region: us-mia
  image: linode/ubuntu22.04
  tags:
    - production
    - k3s
    - zapper
```

**Campos:**
- `name`: Nome identificador do cluster
- `region`: Região do datacenter Linode
- `image`: Imagem do sistema operacional
- `tags`: Lista de tags para organização

---

### 2. **Control Plane - Masters HA**

```yaml
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
```

**Estrutura:**
- `count`: Número de nós control plane (recomendado: 1 ou 3)
- `instanceType`: Tipo de instância padrão
- `labels`: Labels aplicados a todos os masters
- `nodes`: Array de configurações individuais
  - `name`: Nome único do nó
  - `instanceType`: Tipo de instância específico
  - `labels`: Labels customizados do nó

**Validação:**
- Mínimo 1 control plane
- Count de 2 não é recomendado (sem quorum)
- Se `nodes` especificado, `nodes.length` deve ser igual a `count`

---

### 3. **Workers - Nós Especializados**

```yaml
linode-k3s-cluster:workers:
  count: 5
  instanceType: g6-standard-2
  labels:
    environment: production
  nodes:
    # PostgreSQL Workers
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

    # ClickHouse Worker
    - name: worker-clickhouse-1
      instanceType: g6-standard-4
      labels:
        workload: clickhouse
        database: clickhouse
        node-id: clickhouse-1
        zone: a

    # PeerDB Workers
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
```

**Padrão de Labels:**
- `workload`: Tipo de carga (postgres, clickhouse, peerdb)
- `database` ou `app`: Serviço específico
- `node-id`: Identificador único
- `zone`: Zona de disponibilidade (a, b, c)

**Uso:**
Permite node affinity/anti-affinity no Kubernetes:
```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: workload
          operator: In
          values:
          - postgres
```

---

### 4. **K3s - Kubernetes Configuration**

```yaml
linode-k3s-cluster:k3s:
  version: v1.28.5+k3s1
  channel: stable
  disableComponents:
    - traefik
```

**Campos:**
- `version`: Versão específica do K3s
- `channel`: Canal de release (stable, latest, testing)
- `disableComponents`: Lista de componentes para desabilitar

**Componentes Desabilitáveis:**
- `traefik` - Ingress controller padrão
- `servicelb` - Load balancer padrão
- `local-storage` - Provedor de armazenamento local

---

### 5. **SSH - Configuração de Chaves**

```yaml
linode-k3s-cluster:ssh:
  autoGenerate: true
  keyType: ed25519
  keyBits: 4096
```

**Opções:**
- `autoGenerate: true`: Gera par de chaves automaticamente
- `keyType`: ed25519 (recomendado) ou rsa
- `keyBits`: 4096 (para RSA)

**Modo Manual:**
```yaml
ssh:
  autoGenerate: false
  publicKeyPath: /path/to/id_ed25519.pub
  privateKeyPath: /path/to/id_ed25519
```

---

### 6. **VPC - Virtual Private Cloud**

```yaml
linode-k3s-cluster:vpc:
  enabled: false
```

**Opções quando habilitado:**
```yaml
vpc:
  enabled: true
  label: my-vpc
  description: K3s cluster VPC
  subnetLabel: k3s-subnet
  subnetIpv4: 10.0.0.0/24
```

---

### 7. **Network - Rede e Firewall**

```yaml
linode-k3s-cluster:network:
  allowSshFromAnywhere: true
```

**Configuração Restrita:**
```yaml
network:
  allowSshFromAnywhere: false
  allowedSshCidrs:
    - 192.168.1.0/24
    - 10.0.0.0/8
  nodePortRange:
    start: 30000
    end: 32767
```

---

### 8. **Bastion - Jump Server**

```yaml
linode-k3s-cluster:bastion:
  enabled: true
  instanceType: g6-standard-1
```

**Função:**
- Servidor intermediário para acesso SSH aos nós do cluster
- Aumenta segurança isolando masters/workers da internet pública

**Opções:**
```yaml
bastion:
  enabled: true
  instanceType: g6-nanode-1  # Instância pequena suficiente
  labels:
    role: bastion
    security: high
```

---

### 9. **ArgoCD - GitOps Continuous Delivery**

```yaml
linode-k3s-cluster:argocd:
  enabled: true
  version: stable
  gitRepo: https://github.com/chalkan3/zapper-argocd
  gitPath: apps/*
  gitBranch: main
```

**Campos:**
- `enabled`: Instalar ArgoCD no cluster
- `version`: Versão do ArgoCD (stable, v2.9.0, etc)
- `gitRepo`: Repositório Git com manifestos
- `gitPath`: Path dos ApplicationSets (suporta glob)
- `gitBranch`: Branch a monitorar

**Estrutura do Repositório:**
```
zapper-argocd/
├── apps/
│   ├── postgres/
│   │   └── application.yaml
│   ├── clickhouse/
│   │   └── application.yaml
│   └── peerdb/
│       └── application.yaml
└── README.md
```

---

### 10. **Secrets - Senhas Criptografadas**

```yaml
linode-k3s-cluster:secrets:
  rootPassword:
    secure: v1:AWPOwUFgP8Z8HtbN:KTiGs/RAmmeuCCCXXgIgv778ALP09M2lVU0TLzNS6IEXyg==

linode:token:
  secure: v1:Ub9gp+EnPjMtj5BJ:HFk16DmAow26SLhiCc5cZZkcDUZ0XP3w7OQdRH2jcjvWy6MYryjatw2/ZNcr6sCDhj2li9yzF9RstYOl+F8BRlN8yMFF4B2D+ttagueCPdo=
```

**Comandos:**
```bash
# Criar novo secret
pulumi config set --secret linode-k3s-cluster:secrets.rootPassword "MySecurePassword123!"

# Ver secrets (mascarados)
pulumi config

# Ver secret específico (desmascarado)
pulumi config get linode-k3s-cluster:secrets.rootPassword --show-secrets
```

---

## 🔄 Fluxo de Leitura

### 1. **Pulumi.dev.yaml**
```yaml
linode-k3s-cluster:controlPlane:
  count: 3
  instanceType: g6-standard-4
  nodes:
    - name: master-1
      instanceType: g6-standard-4
```

### 2. **loader.ts**
```typescript
const controlPlaneObj = config.requireObject<any>("controlPlane");

const clusterConfig: ClusterConfig = {
  controlPlane: {
    count: controlPlaneObj.count,          // 3
    instanceType: controlPlaneObj.instanceType,  // "g6-standard-4"
    nodes: controlPlaneObj.nodes,          // Array de NodeConfig
  },
  // ...
};
```

### 3. **Validação**
```typescript
const validator = ValidationChainBuilder.build();
validator.validate(clusterConfig);
```

### 4. **Uso**
```typescript
import { loadClusterConfig } from "./config/loader";

const config = loadClusterConfig();
console.log(config.controlPlane.count);  // 3
console.log(config.controlPlane.nodes[0].name);  // "master-1"
```

---

## 📊 Comparação: Antes vs Depois

### ❌ ANTES (JSON strings)
```yaml
linode-k3s-cluster:controlPlane.nodes: '[{"name":"master-1","instanceType":"g6-standard-4"}]'
```

**Problemas:**
- Difícil de ler e editar
- Sem syntax highlighting
- Propenso a erros de escape
- Não aproveita recursos YAML

### ✅ DEPOIS (YAML puro)
```yaml
linode-k3s-cluster:controlPlane:
  nodes:
    - name: master-1
      instanceType: g6-standard-4
      labels:
        zone: a
```

**Benefícios:**
- Legível e intuitivo
- Syntax highlighting completo
- Fácil de editar
- Estrutura hierárquica clara
- Suporta comentários YAML

---

## 🎯 Boas Práticas

### 1. **Organização por Seções**
Use comentários para separar seções:
```yaml
# ============================================
# CONTROL PLANE - 3 Masters para HA
# ============================================
linode-k3s-cluster:controlPlane:
  count: 3
```

### 2. **Labels Consistentes**
Mantenha padrão de nomenclatura:
```yaml
labels:
  environment: production  # Sempre presente
  workload: postgres       # Tipo de carga
  zone: a                  # Zona de disponibilidade
  node-id: postgres-1      # ID único
```

### 3. **Documentação Inline**
```yaml
controlPlane:
  count: 3  # Usar 1 (dev) ou 3 (prod) para quorum
```

### 4. **Versionamento**
Sempre especifique versões:
```yaml
k3s:
  version: v1.28.5+k3s1  # Não usar "latest"
argocd:
  version: stable        # Ou versão específica: v2.9.0
```

---

## 🔍 Validação

A validação é feita automaticamente pelo **Chain of Responsibility**:

```typescript
ValidationChainBuilder.build()
  ├── BasicInfoValidator        // Nome, região, imagem
  ├── ControlPlaneValidator     // Count, nodes array
  ├── WorkerValidator           // Count, nodes array
  ├── SshValidator              // Chaves SSH
  ├── NetworkValidator          // CIDRs, portas
  ├── VpcValidator              // Subnet, CIDR
  └── ArgoCDValidator           // GitRepo quando enabled
```

**Erros Capturados:**
- Control plane count < 1
- Control plane count == 2 (sem quorum)
- Worker count negativo
- Nodes array length ≠ count
- SSH keys ausentes quando autoGenerate=false
- ArgoCD gitRepo vazio quando enabled=true

---

## 🚀 Comandos Úteis

### Ver configuração atual
```bash
pulumi config
```

### Editar configuração
```bash
# Editar arquivo diretamente
vim Pulumi.dev.yaml

# Ou usar CLI
pulumi config set linode-k3s-cluster:cluster.region us-west
```

### Validar configuração
```bash
npm run build
pulumi preview
```

### Deploy
```bash
pulumi up
```

---

## 📖 Referências

- **Pulumi Config**: https://www.pulumi.com/docs/concepts/config/
- **K3s Documentation**: https://docs.k3s.io/
- **ArgoCD**: https://argo-cd.readthedocs.io/
- **Linode Instance Types**: https://www.linode.com/pricing/

---

## ✅ Checklist de Configuração

- [ ] Configurar região (`cluster.region`)
- [ ] Definir tags (`cluster.tags`)
- [ ] Configurar control plane count (1 ou 3)
- [ ] Configurar worker count
- [ ] Especificar versão K3s
- [ ] Configurar SSH (auto ou manual)
- [ ] Decidir VPC (enabled true/false)
- [ ] Configurar bastion (enabled true/false)
- [ ] Configurar ArgoCD se necessário
- [ ] Adicionar secret rootPassword
- [ ] Adicionar secret linode:token
- [ ] Labels customizados nos nós
- [ ] Validar com `npm run build`
- [ ] Preview com `pulumi preview`

---

**100% YAML nativo, 100% Type-safe, 100% Pulumi!** 🎉
