import * as pulumi from "@pulumi/pulumi";
import { VpcComponent } from "../../components/vpc";
import { NetworkComponent } from "../../components/network";
import { SshKeyComponent } from "../../components/ssh-key";
import { SshKeyGenerator } from "../../components/ssh-key-generator";
import { K3sTokenGenerator } from "../../components/k3s-token-generator";
import { BastionHost } from "../../components/bastion-host";
import { K3sValidation } from "../../components/k3s-validation";
import { ArgoCDInstallation } from "../../components/argocd-installation";

/**
 * Factory for creating infrastructure components
 */
export class ComponentFactory {
  /**
   * Create VPC component
   */
  static createVpc(
    name: string,
    region: string,
    clusterName: string,
    vpcLabel?: string,
    vpcDescription?: string,
    subnetLabel?: string,
    subnetIpv4?: string,
    opts?: pulumi.ComponentResourceOptions
  ): VpcComponent {
    return new VpcComponent(
      name,
      {
        region,
        clusterName,
        vpcLabel,
        vpcDescription,
        subnetLabel,
        subnetIpv4,
      },
      opts
    );
  }

  /**
   * Create Network component (firewalls)
   */
  static createNetwork(
    name: string,
    region: string,
    clusterName: string,
    allowedSshCidrs?: string[],
    vpcId?: pulumi.Output<number>,
    opts?: pulumi.ComponentResourceOptions
  ): NetworkComponent {
    return new NetworkComponent(
      name,
      {
        region,
        clusterName,
        allowedSshCidrs,
        vpcId,
      },
      opts
    );
  }

  /**
   * Create SSH Key Generator
   */
  static createSshKeyGenerator(
    name: string,
    keyName: string,
    keyType?: "rsa" | "ed25519",
    keyBits?: number,
    opts?: pulumi.ComponentResourceOptions
  ): SshKeyGenerator {
    return new SshKeyGenerator(
      name,
      {
        keyName,
        keyType,
        keyBits,
      },
      opts
    );
  }

  /**
   * Create SSH Key component
   */
  static createSshKey(
    name: string,
    publicKey: pulumi.Input<string>,
    keyLabel: string,
    opts?: pulumi.ComponentResourceOptions
  ): SshKeyComponent {
    return new SshKeyComponent(
      name,
      {
        publicKey,
        keyLabel,
      },
      opts
    );
  }

  /**
   * Create K3s Token Generator
   */
  static createK3sTokenGenerator(
    name: string,
    clusterName: string,
    opts?: pulumi.ComponentResourceOptions
  ): K3sTokenGenerator {
    return new K3sTokenGenerator(
      name,
      {
        clusterName,
      },
      opts
    );
  }

  /**
   * Create Bastion Host
   */
  static createBastionHost(
    name: string,
    region: string,
    instanceType: string,
    image: string,
    sshKeyId: pulumi.Input<string>,
    firewallId: pulumi.Output<number>,
    clusterName: string,
    rootPassword: pulumi.Input<string>,
    tags?: string[],
    allowedSshCidrs?: string[],
    vpcId?: pulumi.Output<number>,
    subnetId?: pulumi.Output<number>,
    opts?: pulumi.ComponentResourceOptions
  ): BastionHost {
    return new BastionHost(
      name,
      {
        region,
        instanceType,
        image,
        sshKeyId,
        firewallId,
        clusterName,
        rootPassword,
        tags,
        allowedSshCidrs,
        vpcId,
        subnetId,
      },
      opts
    );
  }

  /**
   * Create K3s Validation component
   */
  static createK3sValidation(
    name: string,
    clusterName: string,
    controlPlaneHost: pulumi.Output<string>,
    privateKey: pulumi.Input<string>,
    expectedNodeCount: number,
    bastionHost?: pulumi.Output<string>,
    bastionUser?: string,
    opts?: pulumi.ComponentResourceOptions
  ): K3sValidation {
    return new K3sValidation(
      name,
      {
        clusterName,
        controlPlaneHost,
        privateKey,
        bastionHost,
        bastionUser,
        expectedNodeCount,
      },
      opts
    );
  }

  /**
   * Create ArgoCD Installation component
   */
  static createArgoCDInstallation(
    name: string,
    clusterName: string,
    controlPlaneHost: pulumi.Output<string>,
    privateKey: pulumi.Input<string>,
    enabled: boolean,
    argocdVersion?: string,
    gitRepo?: string,
    gitPath?: string,
    gitBranch?: string,
    bastionHost?: pulumi.Output<string>,
    bastionUser?: string,
    opts?: pulumi.ComponentResourceOptions
  ): ArgoCDInstallation {
    return new ArgoCDInstallation(
      name,
      {
        clusterName,
        controlPlaneHost,
        privateKey,
        bastionHost,
        bastionUser,
        argocdVersion,
        gitRepo,
        gitPath,
        gitBranch,
        enabled,
      },
      opts
    );
  }
}
