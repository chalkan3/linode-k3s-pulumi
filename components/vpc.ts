import * as pulumi from "@pulumi/pulumi";
import * as linode from "@pulumi/linode";

export interface VpcComponentArgs {
  region: pulumi.Input<string>;
  clusterName: string;
  vpcLabel?: string;
  vpcDescription?: string;
  subnetLabel?: string;
  subnetIpv4?: string;
}

export class VpcComponent extends pulumi.ComponentResource {
  public readonly vpc: linode.Vpc;
  public readonly subnet: linode.VpcSubnet;
  public readonly vpcId: pulumi.Output<number>;
  public readonly subnetId: pulumi.Output<number>;

  constructor(name: string, args: VpcComponentArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:network:VpcComponent", name, {}, opts);

    const defaultOpts = { parent: this };

    // Criar VPC
    this.vpc = new linode.Vpc(
      `${args.clusterName}-vpc`,
      {
        label: args.vpcLabel || `${args.clusterName}-vpc`,
        region: args.region,
        description: args.vpcDescription || `VPC for ${args.clusterName} K3s cluster`,
      },
      defaultOpts
    );

    // Criar Subnet dentro da VPC
    this.subnet = new linode.VpcSubnet(
      `${args.clusterName}-subnet`,
      {
        vpcId: this.vpc.id.apply(id => parseInt(id, 10)),
        label: args.subnetLabel || `${args.clusterName}-subnet`,
        ipv4: args.subnetIpv4 || "10.0.0.0/24",
      },
      { ...defaultOpts, dependsOn: [this.vpc] }
    );

    // Converter IDs para number
    this.vpcId = this.vpc.id.apply(id => parseInt(id, 10));
    this.subnetId = this.subnet.id.apply(id => parseInt(id, 10));

    this.registerOutputs({
      vpcId: this.vpcId,
      subnetId: this.subnetId,
    });
  }
}
