# Testes End-to-End (E2E)

Este diretório contém testes end-to-end que criam e validam infraestrutura **REAL** na Linode.

⚠️ **ATENÇÃO**: Estes testes **INCORREM EM CUSTOS REAIS** na sua conta Linode!

## 📋 Pré-requisitos

Antes de executar os testes E2E, certifique-se de ter:

1. **Linode API Token**
   - Obtenha em: https://cloud.linode.com/profile/tokens
   - Permissões necessárias: Read/Write para Linodes, VPCs, Firewalls

2. **Ferramentas CLI**
   ```bash
   # Pulumi CLI
   curl -fsSL https://get.pulumi.com | sh

   # kubectl
   # macOS
   brew install kubectl

   # Linux
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   ```

3. **Dependências Node.js**
   ```bash
   npm install
   ```

4. **Créditos Linode**
   - Certifique-se de ter créditos suficientes (estimativa: $50-100 para testes completos)

## 🚀 Executando os Testes

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env.e2e` na raiz do projeto:

```bash
# Obrigatório
LINODE_TOKEN=seu-token-aqui
RUN_E2E_TESTS=true

# Opcional
E2E_ROOT_PASSWORD=SuaSenhaSegura123!@#
E2E_ALLOWED_CIDR=seu.ip.aqui/32
E2E_GIT_REPO=https://github.com/seu-repo/apps
E2E_REGION=us-east

# Timeouts (em milissegundos)
E2E_DEPLOY_TIMEOUT=900000    # 15 minutos
E2E_DESTROY_TIMEOUT=600000   # 10 minutos
E2E_POD_TIMEOUT=300000       # 5 minutos
E2E_NODE_TIMEOUT=600000      # 10 minutos

# Cleanup
E2E_AUTO_DESTROY=true        # Destruir recursos após testes
E2E_KEEP_ON_FAILURE=false    # Manter recursos se houver falha
```

### Executar Todos os Testes E2E

```bash
# Carregar variáveis de ambiente
source .env.e2e

# Executar testes
npm run test:e2e
```

### Executar Testes Específicos

```bash
# Apenas testes de cluster minimal
npm test -- __tests__/e2e/cluster-lifecycle.e2e.test.ts -t "Minimal Cluster"

# Apenas testes de HA
npm test -- __tests__/e2e/cluster-lifecycle.e2e.test.ts -t "HA Cluster"

# Apenas testes de VPC
npm test -- __tests__/e2e/cluster-lifecycle.e2e.test.ts -t "VPC-enabled"

# Apenas testes de GitOps
npm test -- __tests__/e2e/cluster-lifecycle.e2e.test.ts -t "GitOps"
```

## 📁 Estrutura de Arquivos

```
__tests__/e2e/
├── README.md                          # Este arquivo
├── e2e.config.ts                      # Configuração E2E
├── cluster-lifecycle.e2e.test.ts      # Testes principais
└── helpers/
    ├── pulumi-helper.ts               # Helper para Pulumi Automation API
    └── kubectl-helper.ts              # Helper para comandos kubectl
```

## 🧪 Suítes de Teste

### 1. Minimal Cluster Deployment
- **Duração**: ~15 minutos
- **Custo estimado**: ~$0.50/hora
- **O que testa**:
  - Deploy de 1 control plane + 2 workers
  - Conectividade kubectl
  - Nodes em estado Ready
  - Pods do sistema rodando
  - Deploy de workload de teste

### 2. HA Cluster Deployment
- **Duração**: ~20 minutos
- **Custo estimado**: ~$2.00/hora
- **O que testa**:
  - Deploy de 3 control planes + 3 workers
  - Verificação de múltiplos masters
  - Resiliência a falha de control plane
  - Quorum do etcd

### 3. VPC-enabled Cluster
- **Duração**: ~15 minutos
- **Custo estimado**: ~$0.50/hora
- **O que testa**:
  - Criação de VPC e subnet
  - IPs privados na subnet correta
  - Roteamento de tráfego via VPC
  - Isolamento de rede

### 4. GitOps with ArgoCD
- **Duração**: ~20 minutos
- **Custo estimado**: ~$0.50/hora
- **O que testa**:
  - Instalação do ArgoCD
  - Pods do ArgoCD rodando
  - UI do ArgoCD acessível
  - Sync de aplicações do Git
  - ApplicationSet funcionando

### 5. Cluster Cleanup
- **Duração**: ~10 minutos
- **Custo**: Nenhum (remove recursos)
- **O que faz**:
  - Destrói todos os clusters de teste
  - Remove stacks órfãs
  - Limpa recursos residuais

## 💰 Estimativa de Custos

| Recurso | Tipo | Custo/hora | Observações |
|---------|------|------------|-------------|
| Control Plane (g6-standard-2) | 1x | $0.036 | Por node |
| Worker (g6-standard-2) | 2x | $0.072 | Total 2 nodes |
| Bastion (g6-nanode-1) | 1x | $0.0075 | Jump host |
| **Total Minimal** | | **~$0.12/hora** | |
| | | | |
| Control Plane HA (g6-standard-4) | 3x | $0.216 | Por node |
| Worker HA (g6-standard-4) | 3x | $0.216 | Total 3 nodes |
| Bastion (g6-standard-1) | 1x | $0.015 | Jump host |
| **Total HA** | | **~$0.45/hora** | |

**Custo total para executar todos os testes E2E**: ~$5-10 (dependendo do tempo de execução)

## 🔍 Helpers Disponíveis

### PulumiE2EHelper

```typescript
import { PulumiE2EHelper } from './helpers/pulumi-helper';

const helper = new PulumiE2EHelper('my-stack-name');

// Criar e fazer deploy
await helper.createStack(config);
await helper.deploy();

// Obter outputs
const kubeconfig = await helper.getOutput('kubeconfig');

// Destruir
await helper.destroy();
await helper.removeStack();
```

### KubectlHelper

```typescript
import { KubectlHelper } from './helpers/kubectl-helper';

const kubectl = new KubectlHelper('/path/to/kubeconfig');

// Aguardar nodes prontos
await kubectl.waitForNodesReady();

// Aguardar pods prontos
await kubectl.waitForPodsRunning('kube-system');

// Validar componentes K3s
const components = await kubectl.validateK3sComponents();

// Aplicar manifest
await kubectl.apply('./test-manifest.yaml');
```

## 🐛 Debugging

### Ver logs do Pulumi durante deploy

```bash
export PULUMI_DEBUG_COMMANDS=true
npm run test:e2e
```

### Manter recursos após falha

```bash
export E2E_KEEP_ON_FAILURE=true
npm run test:e2e
```

### Listar stacks órfãs

```bash
pulumi stack ls --all
```

### Cleanup manual de recursos

```typescript
import { cleanupOrphanedE2EStacks } from './helpers/pulumi-helper';

// Executar cleanup
await cleanupOrphanedE2EStacks();
```

## ⚠️ Problemas Comuns

### 1. Timeout durante deploy
**Causa**: Instâncias Linode demorando para provisionar
**Solução**: Aumentar `E2E_DEPLOY_TIMEOUT`

### 2. Nodes não ficam Ready
**Causa**: K3s installation falhou
**Solução**: Verificar logs via Linode console, checar network/firewall

### 3. kubectl não consegue conectar
**Causa**: Kubeconfig incorreto ou IP do control plane inacessível
**Solução**: Verificar bastion host, regras de firewall

### 4. Pods do ArgoCD não iniciam
**Causa**: Recursos insuficientes ou imagens não baixaram
**Solução**: Usar instance types maiores, verificar network

### 5. Custo inesperado
**Causa**: Recursos não foram destruídos
**Solução**: Executar cleanup manual via Linode console ou Pulumi

## 🔒 Segurança

### Práticas Recomendadas

1. **Nunca commite tokens**
   ```bash
   # Adicione ao .gitignore
   echo ".env.e2e" >> .gitignore
   ```

2. **Use SSH CIDR restrito**
   ```bash
   E2E_ALLOWED_CIDR=seu.ip.publico/32
   ```

3. **Rotacione tokens regularmente**
   - Tokens de teste devem ter vida curta
   - Revogue após uso

4. **Use senhas fortes**
   ```bash
   E2E_ROOT_PASSWORD=$(openssl rand -base64 32)
   ```

## 📊 Métricas e Monitoramento

Durante a execução dos testes, você pode monitorar:

### Via Linode Console
- Número de instâncias criadas
- Status das instâncias
- Uso de recursos (CPU, RAM, Network)
- Custos acumulados

### Via kubectl
```bash
# Monitorar nodes em tempo real
watch kubectl --kubeconfig=.kubeconfig-e2e-test-* get nodes

# Monitorar pods
watch kubectl --kubeconfig=.kubeconfig-e2e-test-* get pods -A

# Ver eventos
kubectl --kubeconfig=.kubeconfig-e2e-test-* get events --sort-by='.lastTimestamp'
```

## 🚨 Emergência: Parar Tudo

Se algo der errado e você precisar parar tudo imediatamente:

```bash
# 1. Interromper testes
Ctrl+C

# 2. Destruir via Pulumi
cd /Users/chalkan3/.projects/zapper
pulumi stack ls --all | grep e2e | while read stack; do
  pulumi destroy --stack $stack --yes
  pulumi stack rm $stack --yes
done

# 3. Verificar Linode Console
# Vá para https://cloud.linode.com/linodes
# Delete manualmente qualquer instância com tag "e2e-test"
```

## 📝 Contribuindo

Ao adicionar novos testes E2E:

1. Sempre use `.skip` por padrão
2. Documente custos estimados
3. Adicione timeouts apropriados
4. Implemente cleanup adequado
5. Teste localmente antes de commit

## 📚 Referências

- [Linode API Documentation](https://www.linode.com/docs/api/)
- [Pulumi Automation API](https://www.pulumi.com/docs/using-pulumi/automation-api/)
- [K3s Documentation](https://docs.k3s.io/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
