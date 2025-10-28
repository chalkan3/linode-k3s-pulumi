import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";

export interface SshKeyComponentArgs {
  publicKey: pulumi.Input<string>;
  keyLabel: string;
}

export class SshKeyComponent extends pulumi.ComponentResource {
  public readonly sshKey: linode.SshKey;

  constructor(name: string, args: SshKeyComponentArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:security:SshKeyComponent", name, {}, opts);

    const defaultOpts = { parent: this };

    // Criar chave SSH no Linode
    this.sshKey = new linode.SshKey(
      `${args.keyLabel}-ssh-key`,
      {
        label: args.keyLabel,
        sshKey: args.publicKey,
      },
      defaultOpts
    );

    this.registerOutputs({
      sshKeyId: this.sshKey.id,
      sshKeyLabel: this.sshKey.label,
    });
  }
}
