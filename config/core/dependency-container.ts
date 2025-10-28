/**
 * Dependency Injection Container
 * Manages dependencies and their lifecycles
 */

type Factory<T> = () => T;
type SingletonFactory<T> = () => T;

/**
 * Service container for dependency injection
 * Provides centralized management of dependencies
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, Factory<any>> = new Map();
  private singletons: Map<string, any> = new Map();

  private constructor() {}

  /**
   * Get container instance
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service instance
   */
  public register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Register a factory for creating services
   */
  public registerFactory<T>(name: string, factory: Factory<T>): void {
    this.factories.set(name, factory);
  }

  /**
   * Register a singleton factory
   */
  public registerSingleton<T>(name: string, factory: SingletonFactory<T>): void {
    this.factories.set(name, () => {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, factory());
      }
      return this.singletons.get(name);
    });
  }

  /**
   * Resolve a service by name
   */
  public resolve<T>(name: string): T {
    // Check for direct service
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Check for factory
    if (this.factories.has(name)) {
      return this.factories.get(name)!() as T;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if service exists
   */
  public has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Remove a service
   */
  public remove(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
    this.singletons.delete(name);
  }

  /**
   * Clear all services
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return [
      ...Array.from(this.services.keys()),
      ...Array.from(this.factories.keys()),
    ];
  }

  /**
   * Reset container (useful for testing)
   */
  public static reset(): void {
    ServiceContainer.instance = null as any;
  }
}

/**
 * Service names used throughout the application
 */
export const Services = {
  CONFIG_MANAGER: "config:manager",
  EVENT_DISPATCHER: "events:dispatcher",
  YAML_LOADER: "config:yaml-loader",
  NODE_CREATOR: "creators:node",
  COMPONENT_CREATOR: "creators:component",
  VALIDATION_CHAIN: "validation:chain",
} as const;
