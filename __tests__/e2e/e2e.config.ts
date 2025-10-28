/**
 * Configuração para Testes E2E
 *
 * Este arquivo contém todas as configurações necessárias para executar
 * os testes end-to-end que criam infraestrutura real na Linode.
 */

export interface E2EConfig {
  // Linode API token (obrigatório)
  linodeToken: string;

  // Senha root para as instâncias
  rootPassword: string;

  // CIDR permitido para SSH
  allowedSshCidr: string;

  // Repositório Git para testes do ArgoCD
  gitRepo: string;

  // Região padrão para testes
  defaultRegion: string;

  // Timeouts (em milissegundos)
  timeouts: {
    clusterDeploy: number;
    clusterDestroy: number;
    podReady: number;
    nodeReady: number;
  };

  // Configuração de cleanup
  cleanup: {
    // Destruir recursos automaticamente após os testes
    autoDestroy: boolean;
    // Manter recursos em caso de falha (para debug)
    keepOnFailure: boolean;
  };

  // Tags padrão para todos os recursos E2E
  defaultTags: string[];
}

export function loadE2EConfig(): E2EConfig {
  // Valida variáveis de ambiente obrigatórias
  if (!process.env.LINODE_TOKEN) {
    throw new Error(
      "LINODE_TOKEN environment variable is required for E2E tests"
    );
  }

  return {
    linodeToken: process.env.LINODE_TOKEN,
    rootPassword: process.env.E2E_ROOT_PASSWORD || "E2ETestPassword123!@#",
    allowedSshCidr: process.env.E2E_ALLOWED_CIDR || "0.0.0.0/0",
    gitRepo:
      process.env.E2E_GIT_REPO ||
      "https://github.com/argoproj/argocd-example-apps",
    defaultRegion: process.env.E2E_REGION || "us-east",
    timeouts: {
      clusterDeploy: parseInt(process.env.E2E_DEPLOY_TIMEOUT || "900000", 10), // 15 min
      clusterDestroy: parseInt(process.env.E2E_DESTROY_TIMEOUT || "600000", 10), // 10 min
      podReady: parseInt(process.env.E2E_POD_TIMEOUT || "300000", 10), // 5 min
      nodeReady: parseInt(process.env.E2E_NODE_TIMEOUT || "600000", 10), // 10 min
    },
    cleanup: {
      autoDestroy: process.env.E2E_AUTO_DESTROY !== "false",
      keepOnFailure: process.env.E2E_KEEP_ON_FAILURE === "true",
    },
    defaultTags: [
      "e2e-test",
      "automated",
      `created-at-${new Date().toISOString()}`,
    ],
  };
}

export function isE2EEnabled(): boolean {
  return (
    process.env.RUN_E2E_TESTS === "true" && process.env.LINODE_TOKEN !== undefined
  );
}

export function skipIfE2EDisabled(testName: string): void {
  if (!isE2EEnabled()) {
    console.log(`⏭️  Skipping E2E test: ${testName}`);
    console.log("   Set RUN_E2E_TESTS=true and LINODE_TOKEN to run E2E tests.");
  }
}
