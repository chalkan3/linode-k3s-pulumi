# Validações de Configuração

## 📋 Visão Geral

Este documento descreve todas as validações aplicadas à configuração do cluster **antes do deploy**, garantindo que configurações inválidas sejam detectadas cedo e evitando falhas durante o provisionamento.

## 🎯 Objetivo

**Prevenir deploy com configurações erradas** através de validação rigorosa em múltiplas camadas usando o padrão **Chain of Responsibility**.

## 🔗 Chain of Responsibility

As validações são executadas em cadeia, na seguinte ordem:

```
BasicInfoValidator
  ↓
ControlPlaneValidator
  ↓
WorkerValidator
  ↓
K3sValidator
  ↓
SshValidator
  ↓
NetworkValidator
  ↓
VpcValidator
  ↓
BastionValidator
  ↓
ArgoCDValidator
```

**Se qualquer validação falhar**, o processo é interrompido imediatamente com uma mensagem de erro clara.

---

## 1️⃣ BasicInfoValidator

Valida informações básicas do cluster.

### Validações

#### **Nome do Cluster**
```yaml
name: my-k3s-cluster  ✅
name: My-K3s-Cluster  ❌ (uppercase não permitido)
name: -my-cluster     ❌ (não pode começar com -)
name: my-cluster-     ❌ (não pode terminar com -)
```

**Regras:**
- ✅ Obrigatório
- ✅ Máximo 63 caracteres
- ✅ Apenas lowercase, números e hífens
- ✅ Não pode começar ou terminar com hífen
- ✅ DNS-compatible (RFC 1123)

#### **Região Linode**
```yaml
region: us-east      ✅
region: us-mia       ✅
region: invalid-reg  ❌
```

**Regiões Válidas:**
```
us-east, us-southeast, us-central, us-west, us-iad, us-ord, us-mia
ca-central
eu-west, eu-central
ap-south, ap-northeast, ap-southeast, ap-west
jp-osa, in-maa, br-gru
nl-ams, se-sto, es-mad, fr-par, it-mil
id-cgk, gb-lon
```

#### **Imagem do Sistema Operacional**
```yaml
image: linode/ubuntu22.04  ✅
image: linode/debian11     ✅
image: ubuntu22.04         ❌ (falta prefixo linode/)
```

**Formatos Válidos:**
- `linode/ubuntu{version}` (ex: ubuntu22.04)
- `linode/debian{version}` (ex: debian11)
- `linode/centos{version}`
- `linode/fedora{version}`
- `linode/rocky{version}`
- `linode/almalinux{version}`

#### **Tags**
```yaml
tags:
  - production
  - k3s
  - zapper
```

**Regras:**
- ✅ Máximo 50 tags
- ✅ Cada tag máximo 255 caracteres
- ✅ Deve ser array de strings

#### **Root Password**
```yaml
rootPassword: <secret>
```

**Regras:**
- ✅ Obrigatório
- ✅ Deve ser um Pulumi secret

---

## 2️⃣ ControlPlaneValidator

Valida configuração dos nós control plane (masters).

### Validações

#### **Count (Quantidade)**
```yaml
controlPlane:
  count: 1  ✅ (dev/testing)
  count: 2  ❌ (sem quorum etcd)
  count: 3  ✅ (HA recomendado)
  count: 5  ✅ (HA avançado)
```

**Regras:**
- ✅ Mínimo: 1
- ❌ Evitar: 2 (não forma quorum etcd)
- ✅ Recomendado: 1 (dev) ou 3+ (produção)

#### **Instance Type**
```yaml
controlPlane:
  instanceType: g6-standard-2     ✅
  instanceType: g6-standard-4     ✅
  instanceType: g6-nanode-1       ⚠️  (muito pequeno, aviso)
  instanceType: invalid-type      ❌
```

**Tipos Válidos:**
- **Shared CPU:** g6-nanode-1, g6-standard-1/2/4/6/8/16/20/24/32
- **Dedicated CPU:** g6-dedicated-2/4/8/16/32/48/50/56/64
- **High Memory:** g7-highmem-1/2/4/8/16

**Recomendado para Control Plane:**
- g6-standard-2 ou maior
- g6-dedicated-2 ou maior
- g7-highmem-2 ou maior

#### **Nodes Array**
```yaml
controlPlane:
  count: 3
  nodes:
    - name: master-1        ✅
      instanceType: g6-standard-4
    - name: master-2        ✅
      instanceType: g6-standard-4
    - name: master-3        ✅
      instanceType: g6-standard-4
```

**Regras:**
- ✅ Se especificado, `nodes.length` deve ser igual a `count`
- ✅ Cada nó deve ter nome único
- ✅ Sem nomes duplicados
- ✅ Cada nó deve ter `instanceType` válido

#### **Labels**
```yaml
labels:
  environment: production  ✅
  node-id: master-1        ✅
  zone: a                  ✅
  invalid key: value       ❌ (espaço não permitido)
```

**Regras Kubernetes:**
- ✅ Chave: alfanumérico com `-`, `_`, `.`
- ✅ Máximo 63 caracteres (chave e valor)
- ✅ Deve começar e terminar com alfanumérico

---

## 3️⃣ WorkerValidator

Valida configuração dos nós workers.

### Validações

#### **Count (Quantidade)**
```yaml
workers:
  count: 0   ✅ (cluster sem workers)
  count: 5   ✅
  count: -1  ❌ (negativo não permitido)
```

**Regras:**
- ✅ Mínimo: 0 (permite cluster só com masters)
- ✅ Sem máximo definido

#### **Instance Type**
Mesmas regras do ControlPlaneValidator.

#### **Nodes Array**
Mesmas regras do ControlPlaneValidator:
- Array length deve ser igual a count
- Nomes únicos
- Instance types válidos
- Labels válidos

---

## 4️⃣ K3sValidator

Valida configuração do K3s (Kubernetes).

### Validações

#### **Versão**
```yaml
k3s:
  version: v1.28.5+k3s1  ✅
  version: 1.28.5        ❌ (falta prefixo v e sufixo +k3s)
  version: v1.28.5       ❌ (falta sufixo +k3s1)
```

**Formato Obrigatório:**
```
v{MAJOR}.{MINOR}.{PATCH}+k3s{BUILD}
```

**Exemplos:**
- v1.28.5+k3s1 ✅
- v1.29.0+k3s2 ✅
- v1.27.10+k3s1 ✅

#### **Channel**
```yaml
k3s:
  channel: stable   ✅
  channel: latest   ✅
  channel: testing  ✅
  channel: dev      ❌
```

**Canais Válidos:**
- `stable` - Versão estável recomendada
- `latest` - Última versão disponível
- `testing` - Versão em teste

#### **Disable Components**
```yaml
k3s:
  disableComponents:
    - traefik        ✅ (componente conhecido)
    - servicelb      ✅
    - unknown-comp   ⚠️  (aviso, mas não falha)
```

**Componentes Conhecidos:**
- `coredns` - DNS interno
- `servicelb` - Load balancer padrão
- `traefik` - Ingress controller padrão
- `local-storage` - Storage class local
- `metrics-server` - Métricas de cluster

**Nota:** Componentes desconhecidos geram aviso, mas não falham a validação.

#### **Server/Agent Args**
```yaml
k3s:
  serverArgs: ["--tls-san=example.com"]  ✅
  agentArgs: ["--node-label=foo=bar"]    ✅
```

**Regras:**
- ✅ Deve ser array de strings

---

## 5️⃣ SshValidator

Valida configuração de chaves SSH.

### Validações

#### **Key Type**
```yaml
ssh:
  keyType: ed25519  ✅ (recomendado)
  keyType: rsa      ✅
  keyType: dsa      ❌ (não suportado)
```

**Tipos Válidos:**
- `ed25519` - Recomendado (seguro e rápido)
- `rsa` - Suportado (requer keyBits >= 2048)

#### **Key Bits (RSA)**
```yaml
ssh:
  keyType: rsa
  keyBits: 4096   ✅
  keyBits: 2048   ✅ (mínimo)
  keyBits: 1024   ❌ (muito fraco)
```

**Regras RSA:**
- ✅ Mínimo: 2048 bits
- ✅ Máximo: 16384 bits
- ✅ Recomendado: 4096 bits

#### **Auto Generate**
```yaml
# Caso 1: Auto-gerar (padrão)
ssh:
  autoGenerate: true  ✅

# Caso 2: Chaves manuais
ssh:
  autoGenerate: false
  publicKey: "ssh-ed25519 AAAA..."    ✅
  privateKey: "-----BEGIN OPENSSH..." ✅
```

**Regras quando `autoGenerate: false`:**
- ✅ `publicKey` ou `publicKeyPath` obrigatório
- ✅ `privateKey` ou `privateKeyPath` obrigatório

---

## 6️⃣ NetworkValidator

Valida configuração de rede e firewall.

### Validações

#### **SSH CIDRs**
```yaml
# Permitir de qualquer lugar (padrão)
network:
  allowSshFromAnywhere: true  ✅

# Restringir a IPs específicos
network:
  allowSshFromAnywhere: false
  allowedSshCidrs:
    - 192.168.1.0/24    ✅
    - 10.0.0.0/8        ✅
    - 0.0.0.0/0         ⚠️  (muito permissivo, aviso se mask < 8)
    - 192.168.1         ❌ (formato CIDR inválido)
```

**Regras:**
- ✅ Se `allowSshFromAnywhere: false`, `allowedSshCidrs` obrigatório
- ✅ Formato CIDR válido: `IP/MASK`
- ✅ IP octetos entre 0-255
- ✅ Mask entre 0-32
- ⚠️  Aviso se mask < 8 (muito permissivo)

#### **NodePort Range**
```yaml
network:
  nodePortRange:
    start: 30000  ✅ (padrão Kubernetes)
    end: 32767    ✅
```

**Regras:**
- ✅ Start < End
- ✅ Range entre 1-65535
- ⚠️  Aviso se fora de 30000-32767 (padrão K8s)

---

## 7️⃣ VpcValidator

Valida configuração de VPC (Virtual Private Cloud).

### Validações

#### **VPC Enabled**
```yaml
vpc:
  enabled: true   ✅
  enabled: false  ✅ (skip validações)
```

#### **Labels**
```yaml
vpc:
  label: my-vpc           ✅
  label: my_vpc_test      ✅
  label: invalid label    ❌ (espaço não permitido)
  label: "a".repeat(65)   ❌ (> 64 caracteres)
```

**Regras:**
- ✅ Máximo 64 caracteres
- ✅ Apenas letras, números, `-`, `_`

#### **Subnet IPv4 (CIDR)**
```yaml
vpc:
  subnetIpv4: 10.0.0.0/24       ✅ (RFC 1918)
  subnetIpv4: 172.16.0.0/24     ✅ (RFC 1918)
  subnetIpv4: 192.168.0.0/24    ✅ (RFC 1918)
  subnetIpv4: 8.8.8.0/24        ⚠️  (IP público, aviso)
  subnetIpv4: 10.0.0.0/29       ❌ (muito pequeno, < /28)
  subnetIpv4: 10.0.0.0/8        ⚠️  (muito grande, aviso)
```

**Regras:**
- ✅ Formato CIDR válido
- ✅ Mínimo /28 (16 IPs)
- ⚠️  Aviso se < /16 (muito grande)
- ⚠️  Aviso se não for RFC 1918 (privado)

**RFC 1918 Private Ranges:**
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16

---

## 8️⃣ BastionValidator

Valida configuração do Bastion Host (jump server).

### Validações

#### **Bastion Enabled**
```yaml
bastion:
  enabled: true   ✅
  enabled: false  ✅ (skip validações)
```

#### **Instance Type**
```yaml
bastion:
  instanceType: g6-nanode-1    ✅ (pequeno suficiente)
  instanceType: g6-standard-1  ✅
  instanceType: g6-standard-2  ✅
  instanceType: g6-dedicated-8 ❌ (não na lista permitida)
```

**Tipos Válidos para Bastion:**
- g6-nanode-1 (recomendado - mais barato)
- g6-standard-1
- g6-standard-2
- g6-standard-4

**Razão:** Bastion não precisa de muito poder computacional.

#### **Labels**
Mesmas regras de Kubernetes labels (63 caracteres, alfanumérico com `-`, `_`, `.`).

---

## 9️⃣ ArgoCDValidator

Valida configuração do ArgoCD (GitOps).

### Validações

#### **ArgoCD Enabled**
```yaml
argocd:
  enabled: true   ✅ (requer gitRepo)
  enabled: false  ✅ (skip validações)
```

#### **Git Repository URL**
```yaml
argocd:
  gitRepo: https://github.com/user/repo         ✅
  gitRepo: https://github.com/user/repo.git     ✅
  gitRepo: https://gitlab.com/user/repo         ✅
  gitRepo: https://bitbucket.org/user/repo      ✅
  gitRepo: git@github.com:user/repo.git         ✅
  gitRepo: invalid-url                          ❌
```

**Formatos Suportados:**
- GitHub HTTPS: `https://github.com/{user}/{repo}`
- GitLab HTTPS: `https://gitlab.com/{user}/{repo}`
- Bitbucket HTTPS: `https://bitbucket.org/{user}/{repo}`
- GitHub SSH: `git@github.com:{user}/{repo}.git`
- GitLab SSH: `git@gitlab.com:{user}/{repo}.git`

#### **Version**
```yaml
argocd:
  version: stable       ✅
  version: latest       ✅
  version: v2.9.0       ✅
  version: 2.9.0        ❌ (falta prefixo v)
  version: invalid      ❌
```

**Formatos Válidos:**
- `stable` - Versão estável
- `latest` - Última versão
- `v{MAJOR}.{MINOR}.{PATCH}` - Versão específica

#### **Git Path**
```yaml
argocd:
  gitPath: apps/*          ✅
  gitPath: manifests/dev   ✅
  gitPath: /absolute/path  ⚠️  (aviso - preferir relativo)
  gitPath: ""              ❌ (vazio não permitido)
```

**Regras:**
- ✅ Não pode ser vazio se especificado
- ⚠️  Aviso se começar com `/` (paths relativos preferidos)

#### **Git Branch**
```yaml
argocd:
  gitBranch: main          ✅
  gitBranch: develop       ✅
  gitBranch: feature/new   ✅
  gitBranch: ""            ❌ (vazio não permitido)
  gitBranch: invalid branch ❌ (espaço não permitido)
```

**Regras:**
- ✅ Não pode ser vazio se especificado
- ✅ Apenas: letras, números, `/`, `_`, `.`, `-`

---

## 🚨 Tipos de Validação

### ❌ Erros (Falha Imediata)
Interrompem o processo e impedem deploy:
- Campos obrigatórios ausentes
- Formatos inválidos
- Valores fora de limites permitidos
- Configurações conflitantes

### ⚠️ Avisos (Warnings)
Não impedem deploy, mas alertam sobre possíveis problemas:
- Instâncias muito pequenas para control plane
- CIDRs muito permissivos
- Ranges NodePort fora do padrão
- VPC em IP público (não RFC 1918)

---

## 🧪 Como Testar Validações

### Executar Testes
```bash
npm test
```

### Executar Apenas Testes de Validação
```bash
npm test config/__tests__/types.test.ts
```

### Testar Configuração Atual
```bash
# Build compila e valida
npm run build

# Preview valida antes de deploy
pulumi preview
```

---

## 📊 Cobertura de Testes

```
Test Suites: 12 passed
Tests:       305 passed

Validations Coverage:
✅ BasicInfoValidator       - 7 tests
✅ ControlPlaneValidator    - 7 tests
✅ WorkerValidator          - 4 tests
✅ K3sValidator             - 4 tests
✅ SshValidator             - 3 tests
✅ NetworkValidator         - 4 tests
✅ VpcValidator             - 3 tests
✅ BastionValidator         - 2 tests
✅ ArgoCDValidator          - 5 tests
```

---

## 🔧 Adicionando Novas Validações

### 1. Criar Novo Validator
```typescript
export class MyNewValidator extends BaseValidator {
  protected doValidate(config: ClusterConfig): void {
    if (/* condição */) {
      throw new Error("Mensagem de erro clara");
    }

    if (/* condição de aviso */) {
      console.warn("⚠️  Warning: Mensagem de aviso");
    }
  }
}
```

### 2. Adicionar à Chain
```typescript
export class ValidationChainBuilder {
  static build(): ConfigValidator {
    // ... outros validators
    const myNewValidator = new MyNewValidator();

    // Adicionar na posição apropriada da cadeia
    previousValidator
      .setNext(myNewValidator)
      .setNext(nextValidator);
  }
}
```

### 3. Criar Testes
```typescript
describe("MyNew Validation", () => {
  test("should fail with invalid input", () => {
    validConfig.myField = "invalid";
    expect(() => validator.validate(validConfig)).toThrow("error message");
  });
});
```

---

## 🎯 Boas Práticas

### 1. Mensagens de Erro Claras
```typescript
// ❌ Ruim
throw new Error("Invalid value");

// ✅ Bom
throw new Error(
  `Invalid region: ${config.region}. ` +
  `Valid regions: us-east, us-west, eu-central`
);
```

### 2. Validar Cedo
Validações são executadas no `loader.ts` antes de qualquer recurso ser criado.

### 3. Fail Fast
Primeira validação que falha interrompe toda a cadeia.

### 4. Warnings para Sugestões
Use `console.warn()` para avisos que não devem falhar o deploy.

### 5. Testar Todos os Casos
- Caso válido ✅
- Caso inválido ❌
- Casos de borda
- Valores padrão

---

## 📝 Exemplos de Erros

### Exemplo 1: Nome Inválido
```yaml
name: My-Cluster
```
```
❌ Error: Cluster name must be DNS-compatible: lowercase letters,
numbers, and hyphens only. Cannot start or end with a hyphen.
```

### Exemplo 2: Região Inválida
```yaml
region: invalid-region
```
```
❌ Error: Invalid region: invalid-region.
Valid regions: us-east, us-southeast, us-central, ...
```

### Exemplo 3: Control Plane Count = 2
```yaml
controlPlane:
  count: 2
```
```
❌ Error: Control plane count of 2 is not recommended.
Use 1 or 3+ for HA
```

### Exemplo 4: CIDR Inválido
```yaml
network:
  allowSshFromAnywhere: false
  allowedSshCidrs:
    - 192.168.1
```
```
❌ Error: Invalid CIDR format at index 0: 192.168.1
```

### Exemplo 5: ArgoCD sem Repo
```yaml
argocd:
  enabled: true
  # gitRepo ausente
```
```
❌ Error: ArgoCD gitRepo is required when ArgoCD is enabled
```

---

## ✅ Checklist de Validação

Antes de fazer deploy, certifique-se:

- [ ] Cluster name é DNS-compatible
- [ ] Região Linode é válida
- [ ] Imagem tem formato correto
- [ ] Control plane count é 1 ou 3+
- [ ] Instance types são válidos
- [ ] Versão K3s tem formato correto
- [ ] SSH key type é válido
- [ ] CIDRs de rede são válidos
- [ ] VPC subnet está em range privado
- [ ] ArgoCD gitRepo está configurado (se enabled)
- [ ] Todos os testes passam: `npm test`
- [ ] Build compila: `npm run build`

---

**Validações implementadas garantem deploy seguro e confiável!** ✅
