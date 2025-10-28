import * as pulumi from "@pulumi/pulumi";

/**
 * Labels para aplicar em nós Kubernetes
 */
export interface NodeLabels {
  [key: string]: string;
}

/**
 * Taints para aplicar em nós Kubernetes
 */
export interface NodeTaint {
  key: string;
  value: string;
  effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute";
}

/**
 * Configuração de um nó individual
 */
export interface NodeConfig {
  /** Nome identificador do nó */
  name: string;
  /** Tipo de instância Linode */
  instanceType: string;
  /** Labels customizados para o nó */
  labels?: NodeLabels;
  /** Taints para o nó */
  taints?: NodeTaint[];
}

/**
 * Configuração do control plane
 */
export interface ControlPlaneConfig {
  /** Número de nós control plane (1 ou 3 recomendado) */
  count: number;
  /** Tipo de instância padrão */
  instanceType: string;
  /** Configurações individuais dos nós (opcional) */
  nodes?: NodeConfig[];
  /** Labels aplicados a todos os nós control plane */
  labels?: NodeLabels;
}

/**
 * Configuração dos workers
 */
export interface WorkerConfig {
  /** Número de nós workers */
  count: number;
  /** Tipo de instância padrão */
  instanceType: string;
  /** Configurações individuais dos nós (opcional) */
  nodes?: NodeConfig[];
  /** Labels aplicados a todos os workers */
  labels?: NodeLabels;
}

/**
 * Configuração de VPC
 */
export interface VpcConfig {
  /** Habilitar VPC (padrão: true) */
  enabled?: boolean;
  /** Label da VPC */
  label?: string;
  /** Descrição da VPC */
  description?: string;
  /** Label da subnet */
  subnetLabel?: string;
  /** CIDR da subnet IPv4 (padrão: 10.0.0.0/24) */
  subnetIpv4?: string;
}

/**
 * Configuração de rede
 */
export interface NetworkConfig {
  /** Permitir SSH de qualquer IP no bastion */
  allowSshFromAnywhere?: boolean;
  /** IPs permitidos para SSH no bastion (CIDR) */
  allowedSshCidrs?: string[];
  /** Portas NodePort customizadas */
  nodePortRange?: {
    start: number;
    end: number;
  };
}

/**
 * Configuração do Bastion Host
 */
export interface BastionConfig {
  /** Habilitar bastion host (padrão: true) */
  enabled?: boolean;
  /** Tipo de instância para o bastion */
  instanceType?: string;
  /** Labels customizados para o bastion */
  labels?: NodeLabels;
}

/**
 * Configuração do ArgoCD
 */
export interface ArgoCDConfig {
  /** Habilitar instalação do ArgoCD (padrão: false) */
  enabled?: boolean;
  /** Versão do ArgoCD (padrão: stable) */
  version?: string;
  /** Repositório Git para ApplicationSets */
  gitRepo?: string;
  /** Path no repositório para os manifestos (padrão: apps/*) */
  gitPath?: string;
  /** Branch do repositório (padrão: main) */
  gitBranch?: string;
}

/**
 * Configuração do K3s
 */
export interface K3sConfig {
  /** Versão do K3s */
  version: string;
  /** Canal de release (stable, latest, testing) */
  channel?: "stable" | "latest" | "testing";
  /** Argumentos extras para o K3s server */
  serverArgs?: string[];
  /** Argumentos extras para o K3s agent */
  agentArgs?: string[];
  /** Componentes para desabilitar */
  disableComponents?: string[];
  /** Modo de instalação de datastore (default: embedded etcd) */
  datastoreEndpoint?: string;
}

/**
 * Configuração de SSH
 */
export interface SshConfig {
  /** Gerar chaves SSH automaticamente (padrão: true) */
  autoGenerate?: boolean;
  /** Tipo de chave SSH (padrão: ed25519) */
  keyType?: "rsa" | "ed25519";
  /** Número de bits para chave RSA (padrão: 4096) */
  keyBits?: number;
  /** Caminho para chave pública (se não gerar automaticamente) */
  publicKeyPath?: string;
  /** Caminho para chave privada (se não gerar automaticamente) */
  privateKeyPath?: string;
  /** Conteúdo da chave pública (se não gerar automaticamente) */
  publicKey?: string;
  /** Conteúdo da chave privada (se não gerar automaticamente) */
  privateKey?: string;
}

/**
 * Configuração completa do cluster
 */
export interface ClusterConfig {
  /** Nome do cluster */
  name: string;
  /** Região Linode */
  region: string;
  /** Imagem do sistema operacional */
  image: string;
  /** Senha root (deve ser secreto) */
  rootPassword: pulumi.Input<string>;

  /** Configuração do control plane */
  controlPlane: ControlPlaneConfig;

  /** Configuração dos workers */
  workers: WorkerConfig;

  /** Configuração do K3s */
  k3s: K3sConfig;

  /** Configuração SSH */
  ssh: SshConfig;

  /** Configuração de VPC */
  vpc?: VpcConfig;

  /** Configuração de rede */
  network?: NetworkConfig;

  /** Configuração do bastion host */
  bastion?: BastionConfig;

  /** Configuração do ArgoCD */
  argocd?: ArgoCDConfig;

  /** Tags aplicadas a todos os recursos Linode */
  tags?: string[];
}
