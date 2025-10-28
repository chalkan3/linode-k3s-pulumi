import * as pulumi from "@pulumi/pulumi";
import {
  InstallationStrategy,
  InstallationContext,
  DirectConnectionStrategy,
  BastionConnectionStrategy,
} from "./connection-methods";

/**
 * K3s Server installation strategy
 */
export class K3sServerInstallStrategy extends DirectConnectionStrategy {
  constructor(
    private token: pulumi.Output<string>,
    private disableComponents: string[] = [],
    private serverArgs: string[] = []
  ) {
    super();
  }

  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    const labelArgs = this.buildLabelArgs(context.labels);
    const taintArgs = this.buildTaintArgs(context.taints);
    const disableArgs = this.disableComponents
      .map((comp) => `--disable=${comp}`)
      .join(" ");

    return pulumi.interpolate`#!/bin/bash

# Wait for system initialization
echo "Waiting for system initialization..."
sleep 45

# Wait for cloud-init to complete
cloud-init status --wait || true

# Install K3s as server
echo "Starting K3s server installation..."
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${context.k3sVersion}" sh -s - server \
  --token="${this.token}" \
  --cluster-init \
  ${disableArgs} \
  ${labelArgs} \
  ${taintArgs} \
  ${this.serverArgs.join(" ")} \
  --write-kubeconfig-mode=644 \
  --node-name=${context.nodeName} \
  --node-external-ip=${context.nodeIp} \
  --tls-san=${context.nodeIp}

if [ $? -ne 0 ]; then
  echo "ERROR: K3s installation command failed"
  journalctl -xeu k3s.service --no-pager || true
  exit 1
fi

# Wait for K3s to start
echo "Waiting for K3s to start..."
sleep 30

# Verify K3s is running
if ! systemctl is-active --quiet k3s; then
  echo "ERROR: K3s service is not running"
  systemctl status k3s --no-pager || true
  journalctl -xeu k3s.service --no-pager -n 100 || true
  exit 1
fi

# Wait for node to be ready
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
if ! kubectl wait --for=condition=Ready node/${context.nodeName} --timeout=300s; then
  echo "ERROR: Node did not become ready in time"
  kubectl get nodes || true
  kubectl describe node/${context.nodeName} || true
  exit 1
fi

echo "K3s control plane installed successfully on ${context.nodeName}"
`;
  }

  private buildLabelArgs(labels?: { [key: string]: string }): string {
    const args: string[] = [];

    if (labels) {
      Object.entries(labels).forEach(([key, value]) => {
        args.push(`--node-label=${key}=${value}`);
      });
    }

    // Add default labels
    args.push("--node-label=node-role.kubernetes.io/control-plane=true");

    return args.join(" ");
  }

  private buildTaintArgs(taints?: Array<{ key: string; value: string; effect: string }>): string {
    if (!taints) return "";

    return taints
      .map((taint) => `--node-taint=${taint.key}=${taint.value}:${taint.effect}`)
      .join(" ");
  }
}

/**
 * K3s Agent installation strategy
 */
export class K3sAgentInstallStrategy extends DirectConnectionStrategy {
  constructor(
    private controlPlaneUrl: pulumi.Input<string>,
    private token: pulumi.Input<string>,
    private agentArgs: string[] = []
  ) {
    super();
  }

  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    const labelArgs = this.buildLabelArgs(context.labels);
    const taintArgs = this.buildTaintArgs(context.taints);

    return pulumi.interpolate`#!/bin/bash
set -e

# Wait for system initialization
echo "Waiting for system initialization..."
sleep 45

# Wait for cloud-init to complete
cloud-init status --wait || true

# Wait for control plane to be ready
echo "Waiting for control plane to be ready..."
max_attempts=30
attempt=0
until curl -k https://${this.controlPlaneUrl}:6443/ping 2>/dev/null || [ $attempt -eq $max_attempts ]; do
  echo "Attempt $((attempt+1))/$max_attempts: Control plane not ready yet..."
  sleep 10
  ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
  echo "Control plane did not become ready in time"
  exit 1
fi

echo "Control plane is ready, installing K3s agent..."

# Install K3s as agent
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${context.k3sVersion}" \
K3S_URL="https://${this.controlPlaneUrl}:6443" \
K3S_TOKEN="${this.token}" \
sh -s - agent \
  --node-name=${context.nodeName} \
  --node-external-ip=${context.nodeIp} \
  ${labelArgs} \
  ${taintArgs} \
  ${this.agentArgs.join(" ")}

# Wait for K3s agent to start
echo "Waiting for K3s agent to start..."
sleep 20

# Verify status
systemctl status k3s-agent --no-pager || true

echo "K3s agent installed successfully on ${context.nodeName}"
`;
  }

  private buildLabelArgs(labels?: { [key: string]: string }): string {
    const args: string[] = [];

    if (labels) {
      Object.entries(labels).forEach(([key, value]) => {
        args.push(`--node-label=${key}=${value}`);
      });
    }

    // Add default labels
    args.push("--node-label=node-role.kubernetes.io/worker=true");

    return args.join(" ");
  }

  private buildTaintArgs(taints?: Array<{ key: string; value: string; effect: string }>): string {
    if (!taints) return "";

    return taints
      .map((taint) => `--node-taint=${taint.key}=${taint.value}:${taint.effect}`)
      .join(" ");
  }
}

/**
 * Bastion-aware K3s Server strategy
 */
export class BastionK3sServerStrategy extends BastionConnectionStrategy {
  constructor(private serverStrategy: K3sServerInstallStrategy) {
    super();
  }

  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    return this.serverStrategy.generateInstallScript(context);
  }
}

/**
 * Bastion-aware K3s Agent strategy
 */
export class BastionK3sAgentStrategy extends BastionConnectionStrategy {
  constructor(private agentStrategy: K3sAgentInstallStrategy) {
    super();
  }

  generateInstallScript(context: InstallationContext): pulumi.Output<string> {
    return this.agentStrategy.generateInstallScript(context);
  }
}
