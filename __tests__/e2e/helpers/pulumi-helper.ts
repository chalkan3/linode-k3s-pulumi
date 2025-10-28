import * as pulumi from "@pulumi/pulumi";
import { LocalWorkspace, Stack } from "@pulumi/pulumi/automation";
import * as path from "path";
import { ClusterConfig } from "../../../config/types";

/**
 * Helper para gerenciar stacks Pulumi durante testes E2E
 */
export class PulumiE2EHelper {
  private stack?: Stack;
  private stackName: string;
  private projectName: string;

  constructor(stackName: string, projectName: string = "e2e-linode-k3s") {
    this.stackName = stackName;
    this.projectName = projectName;
  }

  /**
   * Cria uma nova stack Pulumi
   */
  async createStack(config: ClusterConfig): Promise<Stack> {
    const program = async () => {
      const { K3sCluster } = await import("../../../components/k3s-cluster");
      const cluster = new K3sCluster(config.name, { config });

      return {
        clusterName: config.name,
        kubeconfig: cluster.kubeconfig,
        bastionIp: cluster.bastion?.publicIp || "",
        controlPlaneIps: pulumi.output(cluster.controlPlanes).apply((nodes) =>
          nodes.map((n) => n.publicIp)
        ),
        workerIps: pulumi.output(cluster.workers).apply((nodes) =>
          nodes.map((n) => n.publicIp)
        ),
        privateKey: cluster.generatedPrivateKey || "",
        publicKey: cluster.generatedPublicKey || "",
      };
    };

    const stackArgs = {
      stackName: this.stackName,
      projectName: this.projectName,
      program,
    };

    this.stack = await LocalWorkspace.createOrSelectStack(stackArgs);

    // Set config values
    await this.stack.setConfig("linode:token", {
      value: process.env.LINODE_TOKEN!,
      secret: true,
    });

    return this.stack;
  }

  /**
   * Faz deploy da stack
   */
  async deploy(): Promise<pulumi.automation.UpResult> {
    if (!this.stack) {
      throw new Error("Stack not created. Call createStack() first.");
    }

    console.log(`🚀 Deploying stack: ${this.stackName}`);
    const upResult = await this.stack.up({ onOutput: console.log });
    console.log(`✅ Stack deployed: ${this.stackName}`);

    return upResult;
  }

  /**
   * Destrói a stack
   */
  async destroy(): Promise<pulumi.automation.DestroyResult> {
    if (!this.stack) {
      throw new Error("Stack not created. Call createStack() first.");
    }

    console.log(`🗑️  Destroying stack: ${this.stackName}`);
    const destroyResult = await this.stack.destroy({ onOutput: console.log });
    console.log(`✅ Stack destroyed: ${this.stackName}`);

    return destroyResult;
  }

  /**
   * Obtém os outputs da stack
   */
  async getOutputs(): Promise<pulumi.automation.OutputMap> {
    if (!this.stack) {
      throw new Error("Stack not created. Call createStack() first.");
    }

    return await this.stack.outputs();
  }

  /**
   * Obtém um output específico
   */
  async getOutput(key: string): Promise<string> {
    const outputs = await this.getOutputs();
    const output = outputs[key];

    if (!output) {
      throw new Error(`Output '${key}' not found in stack outputs`);
    }

    return output.value;
  }

  /**
   * Verifica se a stack existe
   */
  async stackExists(): Promise<boolean> {
    try {
      const workspace = await LocalWorkspace.create({
        projectSettings: {
          name: this.projectName,
          runtime: "nodejs",
        },
      });

      const stacks = await workspace.listStacks();
      return stacks.some((s) => s.name === this.stackName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove a stack completamente
   */
  async removeStack(): Promise<void> {
    if (!this.stack) {
      return;
    }

    try {
      await this.stack.workspace.removeStack(this.stackName);
      console.log(`🗑️  Stack removed: ${this.stackName}`);
    } catch (error) {
      console.warn(`⚠️  Failed to remove stack: ${error}`);
    }
  }

  /**
   * Salva kubeconfig em arquivo
   */
  async saveKubeconfig(filepath: string): Promise<void> {
    const kubeconfig = await this.getOutput("kubeconfig");
    const fs = await import("fs/promises");
    await fs.writeFile(filepath, kubeconfig);
    console.log(`📝 Kubeconfig saved to: ${filepath}`);
  }
}

/**
 * Cleanup helper - destrói todas as stacks de teste E2E órfãs
 */
export async function cleanupOrphanedE2EStacks(): Promise<void> {
  try {
    const workspace = await LocalWorkspace.create({
      projectSettings: {
        name: "e2e-linode-k3s",
        runtime: "nodejs",
      },
    });

    const stacks = await workspace.listStacks();
    const e2eStacks = stacks.filter((s) => s.name.startsWith("e2e-"));

    console.log(`Found ${e2eStacks.length} E2E stacks`);

    for (const stackInfo of e2eStacks) {
      try {
        console.log(`🗑️  Destroying orphaned stack: ${stackInfo.name}`);
        const stack = await LocalWorkspace.selectStack({
          stackName: stackInfo.name,
          projectName: "e2e-linode-k3s",
        });

        await stack.destroy({ onOutput: console.log });
        await workspace.removeStack(stackInfo.name);
        console.log(`✅ Cleaned up: ${stackInfo.name}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup ${stackInfo.name}: ${error}`);
      }
    }
  } catch (error) {
    console.error("Failed to cleanup orphaned stacks:", error);
  }
}
