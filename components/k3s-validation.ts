import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

export interface K3sValidationArgs {
  clusterName: string;
  controlPlaneHost: pulumi.Input<string>;
  privateKey: pulumi.Input<string>;
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
  expectedNodeCount: number;
}

export class K3sValidation extends pulumi.ComponentResource {
  public readonly validationResult: pulumi.Output<string>;
  public readonly allNodesReady: pulumi.Output<boolean>;

  constructor(name: string, args: K3sValidationArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k3s:K3sValidation", name, {}, opts);

    const defaultOpts = { parent: this };

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

    // Script de validação
    const validationScript = pulumi.interpolate`#!/bin/bash
set -e

echo "=== K3s Cluster Validation ==="

# Aguardar kubeconfig estar disponível
max_attempts=60
attempt=0
until [ -f /etc/rancher/k3s/k3s.yaml ] || [ $attempt -eq $max_attempts ]; do
  echo "Waiting for kubeconfig... ($((attempt+1))/$max_attempts)"
  sleep 5
  ((attempt++))
done

if [ ! -f /etc/rancher/k3s/k3s.yaml ]; then
  echo "ERROR: kubeconfig not found"
  exit 1
fi

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verificar se o K3s está rodando
echo "Checking K3s service..."
systemctl is-active --quiet k3s || {
  echo "ERROR: K3s service is not running"
  systemctl status k3s --no-pager
  exit 1
}

echo "✓ K3s service is running"

# Aguardar todos os nós estarem registrados
echo "Waiting for all nodes to register..."
attempt=0
max_attempts=60
expected_nodes=${args.expectedNodeCount}

until [ "$(kubectl get nodes --no-headers 2>/dev/null | wc -l)" -eq "$expected_nodes" ] || [ $attempt -eq $max_attempts ]; do
  current_nodes=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
  echo "Current nodes: $current_nodes / Expected: $expected_nodes ($((attempt+1))/$max_attempts)"
  sleep 10
  ((attempt++))
done

current_nodes=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
if [ "$current_nodes" -ne "$expected_nodes" ]; then
  echo "ERROR: Expected $expected_nodes nodes, but found $current_nodes"
  kubectl get nodes
  exit 1
fi

echo "✓ All $expected_nodes nodes registered"

# Aguardar todos os nós estarem Ready
echo "Waiting for all nodes to be Ready..."
attempt=0
max_attempts=120

until [ "$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready ')" -eq "$expected_nodes" ] || [ $attempt -eq $max_attempts ]; do
  ready_nodes=$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready ' || echo "0")
  echo "Ready nodes: $ready_nodes / $expected_nodes ($((attempt+1))/$max_attempts)"
  kubectl get nodes --no-headers || true
  sleep 10
  ((attempt++))
done

ready_nodes=$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready ' || echo "0")
if [ "$ready_nodes" -ne "$expected_nodes" ]; then
  echo "ERROR: Not all nodes are Ready"
  kubectl get nodes
  exit 1
fi

echo "✓ All nodes are Ready"

# Mostrar status dos nós
echo ""
echo "=== Cluster Nodes ==="
kubectl get nodes -o wide

# Verificar pods do sistema
echo ""
echo "=== System Pods ==="
kubectl get pods -n kube-system

# Verificar componentes críticos
echo ""
echo "=== Critical Components ==="
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik 2>/dev/null || echo "Traefik disabled"

echo ""
echo "=== Validation Summary ==="
echo "✓ K3s service: RUNNING"
echo "✓ Nodes registered: $expected_nodes/$expected_nodes"
echo "✓ Nodes ready: $ready_nodes/$expected_nodes"
echo "✓ Cluster is HEALTHY"

exit 0
`;

    // Executar validação
    const validation = new command.remote.Command(
      `${args.clusterName}-k3s-validation`,
      {
        connection: connectionConfig,
        create: validationScript,
        triggers: [pulumi.output(args.controlPlaneHost)],
      },
      defaultOpts
    );

    this.validationResult = validation.stdout;

    // Verificar se todos os nós estão prontos
    this.allNodesReady = validation.stdout.apply((output) => {
      return output.includes("Cluster is HEALTHY");
    });

    this.registerOutputs({
      validationResult: this.validationResult,
      allNodesReady: this.allNodesReady,
    });
  }
}
