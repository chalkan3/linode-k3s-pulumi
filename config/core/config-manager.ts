import { ClusterConfig } from "../types";
import { loadClusterConfig as loadConfig } from "../loader";

/**
 * Singleton Pattern: Configuration Manager
 * Ensures only one instance of configuration exists throughout the application
 * Provides global access point to the configuration
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ClusterConfig | null = null;

  /**
   * Private constructor prevents direct instantiation
   */
  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load and cache configuration
   */
  public loadConfiguration(): ClusterConfig {
    if (!this.config) {
      console.log("🔧 Loading configuration for the first time...");
      this.config = loadConfig();
      console.log(`✅ Configuration loaded: ${this.config!.name}`);
    }
    return this.config!;
  }

  /**
   * Get cached configuration
   */
  public getConfiguration(): ClusterConfig {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call loadConfiguration() first.");
    }
    return this.config;
  }

  /**
   * Reload configuration (useful for testing)
   */
  public reloadConfiguration(): ClusterConfig {
    console.log("🔄 Reloading configuration...");
    this.config = null;
    return this.loadConfiguration();
  }

  /**
   * Check if configuration is loaded
   */
  public isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Reset singleton (useful for testing)
   */
  public static reset(): void {
    ConfigurationManager.instance = null as any;
  }
}
