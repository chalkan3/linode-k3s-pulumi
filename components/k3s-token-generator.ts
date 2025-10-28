import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

export interface K3sTokenGeneratorArgs {
  clusterName: string;
}

export class K3sTokenGenerator extends pulumi.ComponentResource {
  public readonly token: pulumi.Output<string>;

  constructor(name: string, args: K3sTokenGeneratorArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k3s:K3sTokenGenerator", name, {}, opts);

    const defaultOpts = { parent: this };

    // Gerar token aleatório seguro para K3s
    // K3s aceita tokens com 32+ caracteres
    const randomPassword = new random.RandomPassword(
      `${args.clusterName}-k3s-token`,
      {
        length: 64,
        special: true,
        overrideSpecial: "-_",
        lower: true,
        upper: true,
        numeric: true,
      },
      defaultOpts
    );

    this.token = randomPassword.result;

    this.registerOutputs({
      token: pulumi.secret(this.token),
    });
  }
}
