import { ServiceContainer, Services } from "../dependency-container";

describe("ServiceContainer", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
  });

  afterEach(() => {
    container.clear();
  });

  describe("singleton pattern", () => {
    it("should return same instance", () => {
      const instance1 = ServiceContainer.getInstance();
      const instance2 = ServiceContainer.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = ServiceContainer.getInstance();
      ServiceContainer.reset();
      const instance2 = ServiceContainer.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("register", () => {
    it("should register a service instance", () => {
      const service = { name: "test-service" };

      container.register("myService", service);

      expect(container.has("myService")).toBe(true);
    });

    it("should register multiple services", () => {
      const service1 = { id: 1 };
      const service2 = { id: 2 };

      container.register("service1", service1);
      container.register("service2", service2);

      expect(container.has("service1")).toBe(true);
      expect(container.has("service2")).toBe(true);
    });

    it("should overwrite existing service", () => {
      container.register("service", { value: "old" });
      container.register("service", { value: "new" });

      const result = container.resolve<{ value: string }>("service");

      expect(result.value).toBe("new");
    });
  });

  describe("registerFactory", () => {
    it("should register a factory", () => {
      const factory = () => ({ created: Date.now() });

      container.registerFactory("myFactory", factory);

      expect(container.has("myFactory")).toBe(true);
    });

    it("should create new instance each time", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });

      container.registerFactory("counter", factory);

      const instance1 = container.resolve<{ id: number }>("counter");
      const instance2 = container.resolve<{ id: number }>("counter");

      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("registerSingleton", () => {
    it("should register a singleton factory", () => {
      const factory = () => ({ value: "singleton" });

      container.registerSingleton("mySingleton", factory);

      expect(container.has("mySingleton")).toBe(true);
    });

    it("should return same instance each time", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });

      container.registerSingleton("singleton", factory);

      const instance1 = container.resolve<{ id: number }>("singleton");
      const instance2 = container.resolve<{ id: number }>("singleton");

      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(1);
      expect(instance1).toBe(instance2);
    });

    it("should create instance lazily", () => {
      let created = false;
      const factory = () => {
        created = true;
        return { value: "lazy" };
      };

      container.registerSingleton("lazy", factory);

      expect(created).toBe(false);

      container.resolve("lazy");

      expect(created).toBe(true);
    });
  });

  describe("resolve", () => {
    it("should resolve registered service", () => {
      const service = { name: "test" };
      container.register("test", service);

      const result = container.resolve("test");

      expect(result).toBe(service);
    });

    it("should resolve from factory", () => {
      const factory = () => ({ type: "factory-created" });
      container.registerFactory("factoryService", factory);

      const result = container.resolve<{ type: string }>("factoryService");

      expect(result.type).toBe("factory-created");
    });

    it("should throw error for non-existent service", () => {
      expect(() => container.resolve("nonExistent")).toThrow(
        "Service 'nonExistent' not found in container"
      );
    });

    it("should prioritize direct service over factory", () => {
      container.register("service", { source: "direct" });
      container.registerFactory("service", () => ({ source: "factory" }));

      const result = container.resolve<{ source: string }>("service");

      expect(result.source).toBe("direct");
    });

    it("should resolve with correct type", () => {
      interface TestService {
        getValue(): string;
      }

      const service: TestService = {
        getValue: () => "test-value",
      };

      container.register<TestService>("typedService", service);

      const result = container.resolve<TestService>("typedService");

      expect(result.getValue()).toBe("test-value");
    });
  });

  describe("has", () => {
    it("should return true for registered service", () => {
      container.register("exists", {});

      expect(container.has("exists")).toBe(true);
    });

    it("should return true for registered factory", () => {
      container.registerFactory("factoryExists", () => ({}));

      expect(container.has("factoryExists")).toBe(true);
    });

    it("should return false for non-existent service", () => {
      expect(container.has("doesNotExist")).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove a service", () => {
      container.register("toRemove", {});

      expect(container.has("toRemove")).toBe(true);

      container.remove("toRemove");

      expect(container.has("toRemove")).toBe(false);
    });

    it("should remove a factory", () => {
      container.registerFactory("factoryToRemove", () => ({}));

      container.remove("factoryToRemove");

      expect(container.has("factoryToRemove")).toBe(false);
    });

    it("should remove singleton cache", () => {
      let counter = 0;
      container.registerSingleton("singletonToRemove", () => ({ id: ++counter }));

      const first = container.resolve<{ id: number }>("singletonToRemove");
      expect(first.id).toBe(1);

      container.remove("singletonToRemove");
      container.registerSingleton("singletonToRemove", () => ({ id: ++counter }));

      const second = container.resolve<{ id: number }>("singletonToRemove");
      expect(second.id).toBe(2);
    });

    it("should not throw when removing non-existent service", () => {
      expect(() => container.remove("doesNotExist")).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should clear all services", () => {
      container.register("service1", {});
      container.register("service2", {});
      container.registerFactory("factory1", () => ({}));

      container.clear();

      expect(container.has("service1")).toBe(false);
      expect(container.has("service2")).toBe(false);
      expect(container.has("factory1")).toBe(false);
    });

    it("should clear singleton cache", () => {
      let counter = 0;
      container.registerSingleton("singleton", () => ({ id: ++counter }));

      container.resolve("singleton");
      container.clear();
      container.registerSingleton("singleton", () => ({ id: ++counter }));

      const result = container.resolve<{ id: number }>("singleton");

      expect(result.id).toBe(2);
    });
  });

  describe("getServiceNames", () => {
    it("should return all service names", () => {
      container.register("service1", {});
      container.register("service2", {});
      container.registerFactory("factory1", () => ({}));

      const names = container.getServiceNames();

      expect(names).toContain("service1");
      expect(names).toContain("service2");
      expect(names).toContain("factory1");
      expect(names).toHaveLength(3);
    });

    it("should return empty array when no services", () => {
      const names = container.getServiceNames();

      expect(names).toHaveLength(0);
    });

    it("should not include duplicates", () => {
      container.register("duplicate", {});

      const names = container.getServiceNames();

      expect(names.filter((n) => n === "duplicate")).toHaveLength(1);
    });
  });

  describe("complex scenarios", () => {
    it("should handle nested dependencies", () => {
      interface Logger {
        log(msg: string): void;
      }

      interface Database {
        logger: Logger;
      }

      const logger: Logger = {
        log: jest.fn(),
      };

      const database: Database = {
        logger,
      };

      container.register("logger", logger);
      container.register("database", database);

      const db = container.resolve<Database>("database");
      const log = container.resolve<Logger>("logger");

      expect(db.logger).toBe(log);
    });

    it("should support factory with dependencies", () => {
      container.register("config", { apiUrl: "https://api.example.com" });

      container.registerFactory("apiClient", () => {
        const config = container.resolve<{ apiUrl: string }>("config");
        return { url: config.apiUrl };
      });

      const client = container.resolve<{ url: string }>("apiClient");

      expect(client.url).toBe("https://api.example.com");
    });
  });
});

describe("Services constants", () => {
  it("should define all service names", () => {
    expect(Services.CONFIG_MANAGER).toBe("config:manager");
    expect(Services.EVENT_DISPATCHER).toBe("events:dispatcher");
    expect(Services.YAML_LOADER).toBe("config:yaml-loader");
    expect(Services.NODE_CREATOR).toBe("creators:node");
    expect(Services.COMPONENT_CREATOR).toBe("creators:component");
    expect(Services.VALIDATION_CHAIN).toBe("validation:chain");
  });

  it("should have consistent values", () => {
    const keys = Object.keys(Services);
    expect(keys.length).toBeGreaterThan(0);
  });
});
