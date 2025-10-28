import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

export interface StorageClassComponentArgs {
  clusterName: string;
  controlPlaneHost: pulumi.Input<string>;
  privateKey: pulumi.Input<string>;
  bastionHost?: pulumi.Input<string>;
  bastionUser?: string;
}

export class StorageClassComponent extends pulumi.ComponentResource {
  public readonly installationResult: pulumi.Output<string>;
  public readonly storageClassName: pulumi.Output<string>;

  constructor(name: string, args: StorageClassComponentArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:storage:StorageClassComponent", name, {}, opts);

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

    // Script para criar StorageClass "standard"
    const createStorageClassScript = `#!/bin/bash
set -e

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "=== Creating StorageClass 'standard' ==="

# Criar StorageClass "standard" como alias para local-path
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF

echo "✓ StorageClass 'standard' created successfully"
echo "STORAGE_CLASS_NAME=standard"

exit 0
`;

    // Executar criação do StorageClass
    const installation = new command.remote.Command(
      `${args.clusterName}-storage-class-install`,
      {
        connection: connectionConfig,
        create: createStorageClassScript,
        triggers: [pulumi.output(args.controlPlaneHost)],
      },
      defaultOpts
    );

    this.installationResult = installation.stdout;

    // Extrair nome do StorageClass
    this.storageClassName = installation.stdout.apply((output) => {
      const match = output.match(/STORAGE_CLASS_NAME=(.+)/);
      return match ? match[1].trim() : "standard";
    });

    this.registerOutputs({
      installationResult: this.installationResult,
      storageClassName: this.storageClassName,
    });
  }
}
