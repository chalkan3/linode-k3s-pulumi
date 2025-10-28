import * as child_process from "child_process";
import { promisify } from "util";

const execAsync = promisify(child_process.exec);

/**
 * Helper para executar comandos kubectl durante testes E2E
 */
export class KubectlHelper {
  private kubeconfigPath: string;

  constructor(kubeconfigPath: string) {
    this.kubeconfigPath = kubeconfigPath;
  }

  /**
   * Executa um comando kubectl
   */
  private async exec(command: string): Promise<string> {
    const fullCommand = `kubectl --kubeconfig=${this.kubeconfigPath} ${command}`;
    try {
      const { stdout } = await execAsync(fullCommand);
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`kubectl command failed: ${error.message}\nCommand: ${fullCommand}`);
    }
  }

  /**
   * Obtém todos os nodes do cluster
   */
  async getNodes(): Promise<any[]> {
    const output = await this.exec("get nodes -o json");
    const result = JSON.parse(output);
    return result.items;
  }

  /**
   * Verifica se todos os nodes estão Ready
   */
  async areAllNodesReady(): Promise<boolean> {
    const nodes = await this.getNodes();

    return nodes.every((node: any) => {
      const readyCondition = node.status.conditions.find(
        (c: any) => c.type === "Ready"
      );
      return readyCondition && readyCondition.status === "True";
    });
  }

  /**
   * Aguarda todos os nodes ficarem Ready
   */
  async waitForNodesReady(timeoutMs: number = 600000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const ready = await this.areAllNodesReady();
        if (ready) {
          console.log("✅ All nodes are Ready");
          return;
        }
      } catch (error) {
        // Cluster may not be accessible yet
      }

      console.log("⏳ Waiting for nodes to be Ready...");
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s
    }

    throw new Error(`Timeout waiting for nodes to be Ready after ${timeoutMs}ms`);
  }

  /**
   * Obtém pods de um namespace
   */
  async getPods(namespace: string = "default"): Promise<any[]> {
    const output = await this.exec(`get pods -n ${namespace} -o json`);
    const result = JSON.parse(output);
    return result.items;
  }

  /**
   * Verifica se todos os pods de um namespace estão Running
   */
  async areAllPodsRunning(namespace: string = "kube-system"): Promise<boolean> {
    const pods = await this.getPods(namespace);

    if (pods.length === 0) {
      return false;
    }

    return pods.every((pod: any) => pod.status.phase === "Running");
  }

  /**
   * Aguarda todos os pods de um namespace ficarem Running
   */
  async waitForPodsRunning(
    namespace: string = "kube-system",
    timeoutMs: number = 300000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const ready = await this.areAllPodsRunning(namespace);
        if (ready) {
          console.log(`✅ All pods in ${namespace} are Running`);
          return;
        }
      } catch (error) {
        // Pods may not be created yet
      }

      console.log(`⏳ Waiting for pods in ${namespace} to be Running...`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s
    }

    throw new Error(
      `Timeout waiting for pods in ${namespace} to be Running after ${timeoutMs}ms`
    );
  }

  /**
   * Aplica um manifest YAML
   */
  async apply(manifestPath: string): Promise<void> {
    await this.exec(`apply -f ${manifestPath}`);
    console.log(`✅ Applied manifest: ${manifestPath}`);
  }

  /**
   * Deleta recursos de um manifest YAML
   */
  async delete(manifestPath: string): Promise<void> {
    await this.exec(`delete -f ${manifestPath}`);
    console.log(`✅ Deleted manifest: ${manifestPath}`);
  }

  /**
   * Aguarda um deployment ficar disponível
   */
  async waitForDeployment(
    name: string,
    namespace: string = "default",
    timeoutMs: number = 300000
  ): Promise<void> {
    const timeoutSeconds = Math.floor(timeoutMs / 1000);
    await this.exec(
      `wait --for=condition=available --timeout=${timeoutSeconds}s deployment/${name} -n ${namespace}`
    );
    console.log(`✅ Deployment ${name} is available`);
  }

  /**
   * Obtém logs de um pod
   */
  async getLogs(
    podName: string,
    namespace: string = "default",
    container?: string
  ): Promise<string> {
    let command = `logs ${podName} -n ${namespace}`;
    if (container) {
      command += ` -c ${container}`;
    }
    return await this.exec(command);
  }

  /**
   * Executa um comando em um pod
   */
  async execInPod(
    podName: string,
    command: string,
    namespace: string = "default"
  ): Promise<string> {
    return await this.exec(`exec ${podName} -n ${namespace} -- ${command}`);
  }

  /**
   * Obtém eventos do cluster
   */
  async getEvents(namespace?: string): Promise<any[]> {
    let command = "get events -o json";
    if (namespace) {
      command += ` -n ${namespace}`;
    }
    const output = await this.exec(command);
    const result = JSON.parse(output);
    return result.items;
  }

  /**
   * Verifica se um componente específico do K3s está rodando
   */
  async isK3sComponentRunning(componentName: string): Promise<boolean> {
    const pods = await this.getPods("kube-system");
    return pods.some(
      (pod: any) =>
        pod.metadata.name.startsWith(componentName) &&
        pod.status.phase === "Running"
    );
  }

  /**
   * Valida componentes essenciais do K3s
   */
  async validateK3sComponents(): Promise<{ component: string; running: boolean }[]> {
    const components = ["coredns", "metrics-server", "local-path-provisioner"];

    const results = await Promise.all(
      components.map(async (component) => ({
        component,
        running: await this.isK3sComponentRunning(component),
      }))
    );

    return results;
  }

  /**
   * Cria um namespace
   */
  async createNamespace(name: string): Promise<void> {
    await this.exec(`create namespace ${name} --dry-run=client -o yaml | kubectl --kubeconfig=${this.kubeconfigPath} apply -f -`);
    console.log(`✅ Created namespace: ${name}`);
  }

  /**
   * Deleta um namespace
   */
  async deleteNamespace(name: string): Promise<void> {
    await this.exec(`delete namespace ${name} --ignore-not-found=true`);
    console.log(`✅ Deleted namespace: ${name}`);
  }

  /**
   * Obtém informações sobre um node específico
   */
  async getNode(nodeName: string): Promise<any> {
    const output = await this.exec(`get node ${nodeName} -o json`);
    return JSON.parse(output);
  }

  /**
   * Lista nodes control plane
   */
  async getControlPlaneNodes(): Promise<any[]> {
    const nodes = await this.getNodes();
    return nodes.filter(
      (node: any) =>
        node.metadata.labels["node-role.kubernetes.io/master"] ||
        node.metadata.labels["node-role.kubernetes.io/control-plane"]
    );
  }

  /**
   * Lista nodes worker
   */
  async getWorkerNodes(): Promise<any[]> {
    const nodes = await this.getNodes();
    return nodes.filter(
      (node: any) =>
        !node.metadata.labels["node-role.kubernetes.io/master"] &&
        !node.metadata.labels["node-role.kubernetes.io/control-plane"]
    );
  }

  /**
   * Obtém versão do Kubernetes
   */
  async getK8sVersion(): Promise<string> {
    const output = await this.exec("version --short");
    const serverVersion = output
      .split("\n")
      .find((line) => line.startsWith("Server Version:"));
    return serverVersion?.split(":")[1].trim() || "unknown";
  }
}
