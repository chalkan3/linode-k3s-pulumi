import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import { VpcComponent } from "./vpc";
import { NetworkComponent } from "./network";
import { SshKeyComponent } from "./ssh-key";
import { SshKeyGenerator } from "./ssh-key-generator";
import { K3sTokenGenerator } from "./k3s-token-generator";
import { BastionHost } from "./bastion-host";
import { ControlPlaneNode } from "./control-plane-node";
import { WorkerNode } from "./worker-node";
import { K3sValidation } from "./k3s-validation";
import { StorageClassComponent } from "./storage-class";
import { ArgoCDInstallation } from "./argocd-installation";
import { ClusterConfig } from "../config/types";

export interface K3sClusterArgs {
  config: ClusterConfig;
}

export class K3sCluster extends pulumi.ComponentResource {
  public readonly vpc?: VpcComponent;
  public readonly network: NetworkComponent;
  public readonly sshKey: SshKeyComponent;
  public readonly sshKeyGenerator?: SshKeyGenerator;
  public readonly tokenGenerator: K3sTokenGenerator;
  public readonly bastion?: BastionHost;
  public readonly controlPlanes: ControlPlaneNode[];
  public readonly workers: WorkerNode[];
  public readonly validation: K3sValidation;
  public readonly storageClass: StorageClassComponent;
  public readonly argocd?: ArgoCDInstallation;
  public readonly kubeconfig: pulumi.Output<string>;
  public readonly generatedPrivateKey?: pulumi.Output<string>;
  public readonly generatedPublicKey?: pulumi.Output<string>;

  constructor(name: string, args: K3sClusterArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k3s:K3sCluster", name, {}, opts);

    const defaultOpts = { parent: this };
    const config = args.config;

    let publicKey: pulumi.Input<string>;
    let privateKey: pulumi.Input<string>;

    // 0. Gerar ou usar chaves SSH existentes
    if (config.ssh.autoGenerate) {
      this.sshKeyGenerator = new SshKeyGenerator(
        `${config.name}-ssh-gen`,
        {
          keyName: `${config.name}-key`,
          keyType: config.ssh.keyType,
          keyBits: config.ssh.keyBits,
        },
        defaultOpts
      );
      publicKey = this.sshKeyGenerator.publicKey;
      privateKey = this.sshKeyGenerator.privateKey;
      this.generatedPublicKey = this.sshKeyGenerator.publicKey;
      this.generatedPrivateKey = this.sshKeyGenerator.privateKey;
    } else {
      publicKey = config.ssh.publicKey!;
      privateKey = config.ssh.privateKey!;
    }

    // 1. Criar VPC (se habilitado)
    const vpcEnabled = config.vpc?.enabled ?? true;
    if (vpcEnabled) {
      this.vpc = new VpcComponent(
        `${config.name}-vpc`,
        {
          region: config.region,
          clusterName: config.name,
          vpcLabel: config.vpc?.label,
          vpcDescription: config.vpc?.description,
          subnetLabel: config.vpc?.subnetLabel,
          subnetIpv4: config.vpc?.subnetIpv4,
        },
        defaultOpts
      );
    }

    // 2. Gerar token K3s
    this.tokenGenerator = new K3sTokenGenerator(
      `${config.name}-token-gen`,
      {
        clusterName: config.name,
      },
      defaultOpts
    );

    // 3. Criar componente de rede (firewalls)
    const networkDeps = vpcEnabled && this.vpc ? [this.vpc] : [];
    this.network = new NetworkComponent(
      `${config.name}-network`,
      {
        region: config.region,
        clusterName: config.name,
        allowedSshCidrs: config.network?.allowedSshCidrs,
        vpcId: vpcEnabled && this.vpc ? this.vpc.vpcId : undefined,
      },
      { ...defaultOpts, dependsOn: networkDeps }
    );

    // 4. Criar chave SSH no Linode
    this.sshKey = new SshKeyComponent(
      `${config.name}-ssh`,
      {
        publicKey: publicKey,
        keyLabel: `${config.name}-key`,
      },
      {
        ...defaultOpts,
        dependsOn: config.ssh.autoGenerate ? [this.network, this.sshKeyGenerator!] : [this.network]
      }
    );

    // 5. Criar Bastion Host (se habilitado)
    const bastionEnabled = config.bastion?.enabled ?? true;
    if (bastionEnabled) {
      const bastionDeps: any[] = [this.sshKey, this.network];
      if (vpcEnabled && this.vpc) bastionDeps.push(this.vpc);

      this.bastion = new BastionHost(
        `${config.name}-bastion`,
        {
          region: config.region,
          instanceType: config.bastion?.instanceType || "g6-nanode-1",
          image: config.image,
          sshKeyId: this.sshKey.sshKey.sshKey,
          firewallId: this.network.bastionFirewall.id.apply(id => parseInt(id, 10)),
          clusterName: config.name,
          rootPassword: config.rootPassword,
          tags: config.tags,
          allowedSshCidrs: config.network?.allowedSshCidrs,
          vpcId: vpcEnabled && this.vpc ? this.vpc.vpcId : undefined,
          subnetId: vpcEnabled && this.vpc ? this.vpc.subnetId : undefined,
        },
        { ...defaultOpts, dependsOn: bastionDeps }
      );
    }

    // 6. Criar Control Plane Nodes
    this.controlPlanes = [];
    const sharedK3sToken = this.tokenGenerator.token;

    // Primeiro master sobe em paralelo com bastion (só depende de SSH key e network)
    const firstMasterDependencies: any[] = [this.sshKey, this.network];
    if (vpcEnabled && this.vpc) firstMasterDependencies.push(this.vpc);

    // Masters adicionais precisam aguardar bastion (se habilitado)
    const additionalMastersDependencies: any[] = [this.sshKey, this.network];
    if (bastionEnabled && this.bastion) additionalMastersDependencies.push(this.bastion);
    if (vpcEnabled && this.vpc) additionalMastersDependencies.push(this.vpc);

    // ESTRATÉGIA: Criar primeiro master, aguardar ele ficar pronto, depois criar o resto em paralelo
    let firstMaster: ControlPlaneNode;

    // Criar APENAS o primeiro master
    const firstNodeConfig = config.controlPlane.nodes?.[0];
    const firstInstanceType = firstNodeConfig?.instanceType || config.controlPlane.instanceType;
    const firstNodeName = firstNodeConfig?.name;

    const firstLabels = {
      ...config.controlPlane.labels,
      ...firstNodeConfig?.labels,
    };

    firstMaster = new ControlPlaneNode(
      `${config.name}-cp-0`,
      {
        region: config.region,
        instanceType: firstInstanceType,
        image: config.image,
        sshKeyId: this.sshKey.sshKey.sshKey,
        firewallId: this.network.clusterFirewall.id.apply(id => parseInt(id, 10)),
        clusterName: config.name,
        rootPassword: config.rootPassword,
        k3sVersion: config.k3s.version,
        k3sToken: sharedK3sToken,
        privateKey: privateKey,
        nodeIndex: 0,
        nodeName: firstNodeName,
        labels: firstLabels,
        taints: firstNodeConfig?.taints,
        k3sServerArgs: config.k3s.serverArgs,
        disableComponents: config.k3s.disableComponents,
        tags: config.tags,
        bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
        bastionUser: "root",
        vpcId: vpcEnabled && this.vpc ? this.vpc.vpcId : undefined,
        subnetId: vpcEnabled && this.vpc ? this.vpc.subnetId : undefined,
      },
      { ...defaultOpts, dependsOn: firstMasterDependencies } // Primeiro master não depende de bastion!
    );

    this.controlPlanes.push(firstMaster);

    // Criar demais masters em paralelo, dependendo do primeiro estar pronto
    for (let i = 1; i < config.controlPlane.count; i++) {
      const nodeConfig = config.controlPlane.nodes?.[i];
      const instanceType = nodeConfig?.instanceType || config.controlPlane.instanceType;
      const nodeName = nodeConfig?.name;

      const labels = {
        ...config.controlPlane.labels,
        ...nodeConfig?.labels,
      };

      const cpNode = new ControlPlaneNode(
        `${config.name}-cp-${i}`,
        {
          region: config.region,
          instanceType: instanceType,
          image: config.image,
          sshKeyId: this.sshKey.sshKey.sshKey,
          firewallId: this.network.clusterFirewall.id.apply(id => parseInt(id, 10)),
          clusterName: config.name,
          rootPassword: config.rootPassword,
          k3sVersion: config.k3s.version,
          k3sToken: sharedK3sToken,
          firstMasterUrl: firstMaster.publicIp, // Passar IP do primeiro master para join
          privateKey: privateKey,
          nodeIndex: i,
          nodeName: nodeName,
          labels: labels,
          taints: nodeConfig?.taints,
          k3sServerArgs: config.k3s.serverArgs,
          disableComponents: config.k3s.disableComponents,
          tags: config.tags,
          bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
          bastionUser: "root",
          vpcId: vpcEnabled && this.vpc ? this.vpc.vpcId : undefined,
          subnetId: vpcEnabled && this.vpc ? this.vpc.subnetId : undefined,
        },
        { ...defaultOpts, dependsOn: [firstMaster.k3sInstallation] } // Depende do primeiro master estar pronto!
      );

      this.controlPlanes.push(cpNode);
    }

    // 7. Criar Worker Nodes
    this.workers = [];
    for (let i = 0; i < config.workers.count; i++) {
      const nodeConfig = config.workers.nodes?.[i];
      const instanceType = nodeConfig?.instanceType || config.workers.instanceType;
      const nodeName = nodeConfig?.name;

      // Combinar labels globais com labels do nó
      const labels = {
        ...config.workers.labels,
        ...nodeConfig?.labels,
      };

      const worker = new WorkerNode(
        `${config.name}-worker-${i}`,
        {
          region: config.region,
          instanceType: instanceType,
          image: config.image,
          sshKeyId: this.sshKey.sshKey.sshKey,
          firewallId: this.network.clusterFirewall.id.apply(id => parseInt(id, 10)),
          clusterName: config.name,
          rootPassword: config.rootPassword,
          k3sVersion: config.k3s.version,
          privateKey: privateKey,
          controlPlaneUrl: this.controlPlanes[0].publicIp,
          k3sToken: sharedK3sToken,
          nodeIndex: i,
          nodeName: nodeName,
          labels: labels,
          taints: nodeConfig?.taints,
          k3sAgentArgs: config.k3s.agentArgs,
          tags: config.tags,
          bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
          bastionUser: "root",
          vpcId: vpcEnabled && this.vpc ? this.vpc.vpcId : undefined,
          subnetId: vpcEnabled && this.vpc ? this.vpc.subnetId : undefined,
        },
        {
          ...defaultOpts,
          // Workers dependem do primeiro master estar pronto
          dependsOn: [firstMaster.k3sInstallation]
        }
      );
      this.workers.push(worker);
    }

    // 8. Obter kubeconfig após todos os workers estarem prontos
    const kubeconfigConnectionConfig: any = {
      user: "root",
      privateKey: privateKey,
    };

    if (bastionEnabled && this.bastion) {
      // Conexão via bastion
      kubeconfigConnectionConfig.host = this.controlPlanes[0].privateIp;
      kubeconfigConnectionConfig.proxy = {
        host: this.bastion.publicIp,
        user: "root",
        privateKey: privateKey,
      };
    } else {
      // Conexão direta
      kubeconfigConnectionConfig.host = this.controlPlanes[0].publicIp;
    }

    const kubeconfigCommand = new command.remote.Command(
      `${config.name}-get-kubeconfig`,
      {
        connection: kubeconfigConnectionConfig,
        create: "cat /etc/rancher/k3s/k3s.yaml",
        triggers: [this.controlPlanes[0].instance.id],
      },
      {
        ...defaultOpts,
        dependsOn: [
          ...this.controlPlanes.map((cp) => cp.k3sInstallation),
          ...this.workers.map((w) => w.k3sInstallation),
        ],
      }
    );

    // Ajustar kubeconfig para usar IP público
    this.kubeconfig = pulumi
      .all([kubeconfigCommand.stdout, this.controlPlanes[0].publicIp])
      .apply(([kubeconfig, publicIp]) => {
        return kubeconfig.replace("127.0.0.1", publicIp);
      });

    // 9. Validar instalação do K3s
    const totalNodes = config.controlPlane.count + config.workers.count;
    const validationHost = bastionEnabled && this.bastion
      ? this.controlPlanes[0].privateIp
      : this.controlPlanes[0].publicIp;

    this.validation = new K3sValidation(
      `${config.name}-validation`,
      {
        clusterName: config.name,
        controlPlaneHost: validationHost,
        privateKey: privateKey,
        bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
        bastionUser: "root",
        expectedNodeCount: totalNodes,
      },
      {
        ...defaultOpts,
        dependsOn: [
          kubeconfigCommand,
          ...this.controlPlanes.map((cp) => cp.k3sInstallation),
          ...this.workers.map((w) => w.k3sInstallation),
        ],
      }
    );

    // 9.5. Criar StorageClass "standard"
    this.storageClass = new StorageClassComponent(
      `${config.name}-storage`,
      {
        clusterName: config.name,
        controlPlaneHost: validationHost,
        privateKey: privateKey,
        bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
        bastionUser: "root",
      },
      {
        ...defaultOpts,
        dependsOn: [this.validation],
      }
    );

    // 9.6. Escalar CoreDNS para 5 réplicas para HA
    const coreDnsConnectionConfig: any = {
      user: "root",
      privateKey: privateKey,
    };

    if (bastionEnabled && this.bastion) {
      coreDnsConnectionConfig.host = this.controlPlanes[0].privateIp;
      coreDnsConnectionConfig.proxy = {
        host: this.bastion.publicIp,
        user: "root",
        privateKey: privateKey,
      };
    } else {
      coreDnsConnectionConfig.host = this.controlPlanes[0].publicIp;
    }

    const scaleCoreDns = new command.remote.Command(
      `${config.name}-scale-coredns`,
      {
        connection: coreDnsConnectionConfig,
        create: `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml && kubectl scale deployment coredns -n kube-system --replicas=5 && echo "CoreDNS scaled to 5 replicas"`,
        triggers: [this.validation.validationResult],
      },
      {
        ...defaultOpts,
        dependsOn: [this.validation],
      }
    );

    // 10. Instalar ArgoCD (se habilitado)
    const argocdEnabled = config.argocd?.enabled ?? false;
    if (argocdEnabled) {
      this.argocd = new ArgoCDInstallation(
        `${config.name}-argocd`,
        {
          clusterName: config.name,
          controlPlaneHost: validationHost,
          privateKey: privateKey,
          bastionHost: bastionEnabled && this.bastion ? this.bastion.publicIp : undefined,
          bastionUser: "root",
          argocdVersion: config.argocd?.version,
          gitRepo: config.argocd?.gitRepo,
          gitPath: config.argocd?.gitPath,
          gitBranch: config.argocd?.gitBranch,
          enabled: argocdEnabled,
        },
        {
          ...defaultOpts,
          dependsOn: [this.validation, scaleCoreDns],
        }
      );
    }

    this.registerOutputs({
      controlPlaneIps: this.controlPlanes.map((cp) => cp.publicIp),
      workerIps: this.workers.map((w) => w.publicIp),
      kubeconfig: this.kubeconfig,
      k3sToken: sharedK3sToken,
      validationResult: this.validation.validationResult,
      storageClassName: this.storageClass.storageClassName,
      argocdUrl: this.argocd?.argocdUrl,
      argocdAdminPassword: this.argocd?.argocdAdminPassword,
    });
  }
}
