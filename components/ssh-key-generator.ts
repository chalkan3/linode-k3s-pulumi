import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

export interface SshKeyGeneratorArgs {
  keyName: string;
  keyType?: "rsa" | "ed25519";
  keyBits?: number;
}

export class SshKeyGenerator extends pulumi.ComponentResource {
  public readonly privateKey: pulumi.Output<string>;
  public readonly publicKey: pulumi.Output<string>;
  public readonly fingerprint: pulumi.Output<string>;

  constructor(name: string, args: SshKeyGeneratorArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:security:SshKeyGenerator", name, {}, opts);

    const defaultOpts = { parent: this };
    const keyType = args.keyType || "ed25519";
    const keyBits = args.keyBits || (keyType === "rsa" ? 4096 : undefined);

    // Comando para gerar chave SSH
    let generateCommand: string;
    if (keyType === "ed25519") {
      generateCommand = `ssh-keygen -t ed25519 -f /tmp/${args.keyName} -N "" -C "${args.keyName}" >/dev/null 2>&1`;
    } else {
      generateCommand = `ssh-keygen -t rsa -b ${keyBits} -f /tmp/${args.keyName} -N "" -C "${args.keyName}" >/dev/null 2>&1`;
    }

    // Gerar chave SSH usando comando local
    const keyGeneration = new command.local.Command(
      `${args.keyName}-keygen`,
      {
        create: pulumi.interpolate`
${generateCommand}
cat /tmp/${args.keyName}
`,
        delete: `rm -f /tmp/${args.keyName} /tmp/${args.keyName}.pub`,
      },
      defaultOpts
    );

    // Obter chave pública
    const publicKeyCommand = new command.local.Command(
      `${args.keyName}-pubkey`,
      {
        create: `cat /tmp/${args.keyName}.pub`,
        triggers: [keyGeneration.stdout],
      },
      { ...defaultOpts, dependsOn: [keyGeneration] }
    );

    // Obter fingerprint
    const fingerprintCommand = new command.local.Command(
      `${args.keyName}-fingerprint`,
      {
        create: `ssh-keygen -lf /tmp/${args.keyName}.pub | awk '{print $2}'`,
        triggers: [keyGeneration.stdout],
      },
      { ...defaultOpts, dependsOn: [keyGeneration] }
    );

    this.privateKey = keyGeneration.stdout;
    this.publicKey = publicKeyCommand.stdout;
    this.fingerprint = fingerprintCommand.stdout;

    this.registerOutputs({
      privateKey: pulumi.secret(this.privateKey),
      publicKey: this.publicKey,
      fingerprint: this.fingerprint,
    });
  }
}
