import * as pulumi from "@pulumi/pulumi";
import { K3sCluster } from "./components/k3s-cluster";
import { loadClusterConfig } from "./config/loader";

// Carregar configuração estruturada do cluster
const clusterConfig = loadClusterConfig();

// Criar o cluster K3s completo com todas as dependências
const cluster = new K3sCluster("k3s", {
  config: clusterConfig,
});

// Exportar outputs importantes
export const clusterName = clusterConfig.name;
export const vpcId = cluster.vpc?.vpcId;
export const vpcSubnetId = cluster.vpc?.subnetId;
export const bastionPublicIp = cluster.bastion?.publicIp;
export const bastionPrivateIp = cluster.bastion?.privateIp;
export const controlPlanePublicIps = cluster.controlPlanes.map((cp) => cp.publicIp);
export const controlPlanePrivateIps = cluster.controlPlanes.map((cp) => cp.privateIp);
export const workerPublicIps = cluster.workers.map((w) => w.publicIp);
export const workerPrivateIps = cluster.workers.map((w) => w.privateIp);
export const kubeconfig = cluster.kubeconfig;
export const bastionFirewallId = cluster.network.bastionFirewall.id;
export const clusterFirewallId = cluster.network.clusterFirewall.id;

// Exportar secrets gerados
export const k3sToken = pulumi.secret(cluster.tokenGenerator.token);
export const sshPrivateKey = cluster.generatedPrivateKey
  ? pulumi.secret(cluster.generatedPrivateKey)
  : undefined;
export const sshPublicKey = cluster.generatedPublicKey
  ? cluster.generatedPublicKey
  : undefined;
export const sshFingerprint = cluster.sshKeyGenerator
  ? cluster.sshKeyGenerator.fingerprint
  : undefined;

// Exportar validação e ArgoCD
export const k3sValidationResult = cluster.validation.validationResult;
export const k3sAllNodesReady = cluster.validation.allNodesReady;
export const argocdUrl = cluster.argocd?.argocdUrl;
export const argocdAdminPassword = cluster.argocd?.argocdAdminPassword;

// Informações do cluster
export const clusterInfo = pulumi.interpolate`
==========================================
K3s Cluster Deployment Complete!
==========================================

Cluster Name: ${clusterConfig.name}
Region: ${clusterConfig.region}
K3s Version: ${clusterConfig.k3s.version}

${cluster.bastion ? pulumi.interpolate`Bastion Host: ${cluster.bastion.publicIp}` : "Bastion: Disabled"}

Control Plane Nodes (${clusterConfig.controlPlane.count}):
${pulumi.output(cluster.controlPlanes.map((cp) => cp.publicIp)).apply((ips) =>
  ips.map((ip, i) => `  - cp-${i}: ${ip}`).join("\n")
)}

Worker Nodes (${clusterConfig.workers.count}):
${pulumi.output(cluster.workers.map((w) => w.publicIp)).apply((ips) =>
  ips.map((ip, i) => `  - worker-${i}: ${ip}`).join("\n")
)}

To use your cluster:

1. Save the kubeconfig:
   pulumi stack output kubeconfig > kubeconfig.yaml

2. Use kubectl with the cluster:
   export KUBECONFIG=$(pwd)/kubeconfig.yaml
   kubectl get nodes

3. Verify nodes and labels:
   kubectl get nodes --show-labels

4. Save SSH private key (if generated):
   pulumi stack output sshPrivateKey --show-secrets > ssh_key
   chmod 600 ssh_key

5. SSH to bastion host:
   ssh -i ssh_key root@$(pulumi stack output bastionPublicIp)

6. SSH to cluster nodes (via bastion):
   # From bastion, you can access cluster nodes via private IP
   ssh root@$(pulumi stack output controlPlanePrivateIps | jq -r '.[0]')

7. Check cluster status:
   kubectl get pods -A

${cluster.argocd ? pulumi.interpolate`
8. Access ArgoCD:
   URL: ${cluster.argocd.argocdUrl}
   Username: admin
   Password: $(pulumi stack output argocdAdminPassword --show-secrets)
` : ""}
==========================================
`;

// Export node details with labels
export const nodeDetails = {
  controlPlanes: cluster.controlPlanes.map((cp, i) => ({
    name: `${clusterConfig.name}-cp-${i}`,
    publicIp: cp.publicIp,
    privateIp: cp.privateIp,
    instanceType: clusterConfig.controlPlane.nodes?.[i]?.instanceType || clusterConfig.controlPlane.instanceType,
    labels: {
      ...clusterConfig.controlPlane.labels,
      ...clusterConfig.controlPlane.nodes?.[i]?.labels,
    },
  })),
  workers: cluster.workers.map((w, i) => ({
    name: `${clusterConfig.name}-worker-${i}`,
    publicIp: w.publicIp,
    privateIp: w.privateIp,
    instanceType: clusterConfig.workers.nodes?.[i]?.instanceType || clusterConfig.workers.instanceType,
    labels: {
      ...clusterConfig.workers.labels,
      ...clusterConfig.workers.nodes?.[i]?.labels,
    },
  })),
};
