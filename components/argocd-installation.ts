import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

export interface ArgoCDInstallationArgs {
  clusterName: string;
  controlPlaneHost: pulumi.Input<string>;
  privateKey: pulumi.Input<string>;
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  argocdVersion?: string;
  gitRepo?: string;
  gitPath?: string;
  gitBranch?: string;
  enabled?: boolean;
}

export class ArgoCDInstallation extends pulumi.ComponentResource {
  public readonly installationResult: pulumi.Output<string>;
  public readonly argocdUrl: pulumi.Output<string>;
  public readonly argocdAdminPassword: pulumi.Output<string>;

  constructor(name: string, args: ArgoCDInstallationArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:argocd:ArgoCDInstallation", name, {}, opts);

    const defaultOpts = { parent: this };
    const argocdVersion = args.argocdVersion || "stable";
    const enabled = args.enabled ?? true;

    if (!enabled) {
      // Se ArgoCD não está habilitado, criar outputs vazios
      this.installationResult = pulumi.output("ArgoCD installation skipped");
      this.argocdUrl = pulumi.output("");
      this.argocdAdminPassword = pulumi.output("");

      this.registerOutputs({
        installationResult: this.installationResult,
        argocdUrl: this.argocdUrl,
        argocdAdminPassword: this.argocdAdminPassword,
      });
      return;
    }

    // Configurar conexão (com ou sem bastion)
    const connectionConfig: any = {
      user: "root",
      privateKey: args.privateKey,
    };

    if (args.bastionHost) {
      connectionConfig.host = args.controlPlaneHost;
      connectionConfig.proxy = {
        host: args.bastionHost,
        user: args.bastionUser || "root",
        privateKey: args.privateKey,
      };
    } else {
      connectionConfig.host = args.controlPlaneHost;
    }

    // Script de instalação do ArgoCD
    const installScript = pulumi.interpolate`#!/bin/bash
set -e

echo "=== Installing ArgoCD ==="

# Garantir que git está instalado (necessário para clonar repo)
if ! command -v git &> /dev/null; then
  echo "Installing git..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y git
fi

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verificar se kubectl está instalado e kubeconfig existe
echo "Checking kubectl availability..."
if ! command -v kubectl &>/dev/null; then
  echo "ERROR: kubectl not found in PATH"
  exit 1
fi

if [ ! -f /etc/rancher/k3s/k3s.yaml ]; then
  echo "ERROR: kubeconfig not found at /etc/rancher/k3s/k3s.yaml"
  exit 1
fi

echo "✓ kubectl is available"
echo "✓ kubeconfig found"

# Criar namespace argocd
echo "Creating argocd namespace..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Instalar ArgoCD
echo "Installing ArgoCD ${argocdVersion}..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/${argocdVersion}/manifests/install.yaml

# Aguardar pods do ArgoCD estarem prontos
echo "Waiting for ArgoCD pods to be ready..."
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=600s

# Patch do serviço para NodePort
echo "Exposing ArgoCD via NodePort..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'

# Obter senha inicial do admin
echo "Getting ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

# Obter NodePort
ARGOCD_PORT=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[?(@.name=="https")].nodePort}')

echo ""
echo "=== ArgoCD Installation Complete ==="
echo "ArgoCD URL: https://$(hostname -I | awk '{print $1}'):$ARGOCD_PORT"
echo "Username: admin"
echo "Password: $ARGOCD_PASSWORD"
echo ""

# Se repositório Git foi fornecido, aplicar Applications
${args.gitRepo ? pulumi.interpolate`
echo "Configuring Git repository and deploying Applications..."

# Aguardar ArgoCD estar pronto
sleep 30

# Criar repositório no ArgoCD (usando CLI)
echo "Adding Git repository to ArgoCD..."
kubectl exec -n argocd deployment/argocd-server -- argocd repo add ${args.gitRepo} --insecure-skip-server-verification --upsert || echo "Repository already exists or failed to add"

# Clonar repositório temporariamente para aplicar as Applications
echo "Cloning repository to apply Applications..."
cd /tmp
rm -rf zapper-argocd-temp
git clone --branch ${args.gitBranch || "main"} --depth 1 ${args.gitRepo} zapper-argocd-temp

# Aplicar todos os arquivos YAML do diretório apps/
echo "Applying ArgoCD Applications from ${args.gitPath || "apps"}..."
if [ -d "zapper-argocd-temp/${args.gitPath ? args.gitPath.replace("*.yaml", "").replace("/*", "") : "apps"}" ]; then
  cd zapper-argocd-temp/${args.gitPath ? args.gitPath.replace("*.yaml", "").replace("/*", "") : "apps"}

  # Contar arquivos YAML
  YAML_COUNT=$(ls -1 *.yaml 2>/dev/null | wc -l)
  echo "Found $YAML_COUNT Application files"

  # Aplicar cada arquivo YAML
  for app_file in *.yaml; do
    if [ -f "$app_file" ]; then
      echo "  → Applying $app_file..."
      kubectl apply -f "$app_file" -n argocd
    fi
  done

  cd /tmp
  rm -rf zapper-argocd-temp

  echo "✓ All Applications deployed successfully"
else
  echo "⚠️  Warning: Path '${args.gitPath || "apps"}' not found in repository"
fi

echo "✓ Git repository configured: ${args.gitRepo}"
echo "✓ Branch: ${args.gitBranch || "main"}"
echo "✓ Path: ${args.gitPath || "apps"}/*.yaml"
` : "echo 'No Git repository configured'"}

echo ""
echo "=== Installation Summary ==="
echo "✓ ArgoCD installed"
echo "✓ ArgoCD UI exposed via NodePort"
${args.gitRepo ? "echo \"✓ Git repository configured\"" : ""}
${args.gitRepo ? "echo \"✓ Applications deployed from repository\"" : ""}

# Output final para Pulumi
echo "ARGOCD_PASSWORD=$ARGOCD_PASSWORD"
echo "ARGOCD_PORT=$ARGOCD_PORT"

exit 0
`;

    // Executar instalação
    const installation = new command.remote.Command(
      `${args.clusterName}-argocd-install`,
      {
        connection: connectionConfig,
        create: installScript,
        triggers: [pulumi.output(args.controlPlaneHost)],
      },
      defaultOpts
    );

    this.installationResult = installation.stdout;

    // Extrair senha do admin
    this.argocdAdminPassword = installation.stdout.apply((output) => {
      const match = output.match(/ARGOCD_PASSWORD=(.+)/);
      return match ? match[1].trim() : "";
    });

    // Construir URL do ArgoCD
    this.argocdUrl = pulumi.all([installation.stdout, args.controlPlaneHost]).apply(([output, host]) => {
      const portMatch = output.match(/ARGOCD_PORT=(\d+)/);
      const port = portMatch ? portMatch[1] : "30443";
      return `https://${host}:${port}`;
    });

    this.registerOutputs({
      installationResult: this.installationResult,
      argocdUrl: this.argocdUrl,
      argocdAdminPassword: pulumi.secret(this.argocdAdminPassword),
    });
  }
}
