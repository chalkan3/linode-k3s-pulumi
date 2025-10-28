import { WorkerBuilder } from "../worker-assembler";

describe("WorkerBuilder", () => {
  let builder: WorkerBuilder;

  beforeEach(() => {
    builder = new WorkerBuilder();
  });

  describe("setCount", () => {
    it("should set count to 0", () => {
      builder.setCount(0);
      const config = builder.build();

      expect(config.count).toBe(0);
    });

    it("should set count to 2", () => {
      builder.setCount(2);
      const config = builder.build();

      expect(config.count).toBe(2);
    });

    it("should set count to 5", () => {
      builder.setCount(5);
      const config = builder.build();

      expect(config.count).toBe(5);
    });

    it("should set count to 10", () => {
      builder.setCount(10);
      const config = builder.build();

      expect(config.count).toBe(10);
    });

    it("should throw error for negative count", () => {
      expect(() => builder.setCount(-1)).toThrow("Worker count cannot be negative");
    });

    it("should throw error for large negative count", () => {
      expect(() => builder.setCount(-100)).toThrow("Worker count cannot be negative");
    });

    it("should return this for chaining", () => {
      const result = builder.setCount(3);

      expect(result).toBe(builder);
    });
  });

  describe("setInstanceType", () => {
    it("should set instance type", () => {
      builder.setInstanceType("g6-standard-4");
      const config = builder.build();

      expect(config.instanceType).toBe("g6-standard-4");
    });

    it("should use default instance type if not set", () => {
      const config = builder.build();

      expect(config.instanceType).toBe("g6-standard-2");
    });

    it("should set small instance type", () => {
      builder.setInstanceType("g6-nanode-1");
      const config = builder.build();

      expect(config.instanceType).toBe("g6-nanode-1");
    });

    it("should set large instance type", () => {
      builder.setInstanceType("g6-standard-8");
      const config = builder.build();

      expect(config.instanceType).toBe("g6-standard-8");
    });

    it("should return this for chaining", () => {
      const result = builder.setInstanceType("g6-standard-4");

      expect(result).toBe(builder);
    });
  });

  describe("setLabels", () => {
    it("should set labels", () => {
      const labels = { env: "production", tier: "worker" };
      builder.setLabels(labels);
      const config = builder.build();

      expect(config.labels).toEqual(labels);
    });

    it("should set multiple labels", () => {
      const labels = {
        env: "staging",
        tier: "worker",
        zone: "us-east",
        team: "platform"
      };
      builder.setLabels(labels);
      const config = builder.build();

      expect(config.labels).toEqual(labels);
    });

    it("should have no labels by default", () => {
      const config = builder.build();

      expect(config.labels).toBeUndefined();
    });

    it("should return this for chaining", () => {
      const result = builder.setLabels({ env: "test" });

      expect(result).toBe(builder);
    });
  });

  describe("setNodes", () => {
    it("should set individual node configurations", () => {
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-4" },
        { name: "worker-1", instanceType: "g6-standard-4" },
        { name: "worker-2", instanceType: "g6-standard-4" },
      ];

      builder.setCount(3).setNodes(nodes);
      const config = builder.build();

      expect(config.nodes).toEqual(nodes);
    });

    it("should throw error if nodes length does not match count", () => {
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-4" },
        { name: "worker-1", instanceType: "g6-standard-4" },
      ];

      expect(() => builder.setCount(3).setNodes(nodes)).toThrow(
        "Nodes array length (2) must match count (3)"
      );
    });

    it("should throw error if nodes length is greater than count", () => {
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-4" },
        { name: "worker-1", instanceType: "g6-standard-4" },
        { name: "worker-2", instanceType: "g6-standard-4" },
      ];

      expect(() => builder.setCount(2).setNodes(nodes)).toThrow(
        "Nodes array length (3) must match count (2)"
      );
    });

    it("should have no nodes by default", () => {
      const config = builder.build();

      expect(config.nodes).toBeUndefined();
    });

    it("should return this for chaining", () => {
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-2" },
        { name: "worker-1", instanceType: "g6-standard-2" },
      ];
      const result = builder.setCount(2).setNodes(nodes);

      expect(result).toBe(builder);
    });

    it("should accept empty nodes array when count is 0", () => {
      builder.setCount(0).setNodes([]);
      const config = builder.build();

      expect(config.nodes).toEqual([]);
    });
  });

  describe("addNode", () => {
    it("should add a single node", () => {
      const node = { name: "worker-0", instanceType: "g6-standard-4" };

      builder.setCount(1).addNode(node);
      const config = builder.build();

      expect(config.nodes).toEqual([node]);
    });

    it("should add multiple nodes", () => {
      const node1 = { name: "worker-0", instanceType: "g6-standard-4" };
      const node2 = { name: "worker-1", instanceType: "g6-standard-4" };
      const node3 = { name: "worker-2", instanceType: "g6-standard-4" };

      builder.setCount(3).addNode(node1).addNode(node2).addNode(node3);
      const config = builder.build();

      expect(config.nodes).toEqual([node1, node2, node3]);
    });

    it("should initialize nodes array if not exists", () => {
      const node = { name: "worker-0", instanceType: "g6-standard-2" };

      builder.addNode(node);
      const config = builder.setCount(1).build();

      expect(config.nodes).toBeDefined();
      expect(config.nodes).toHaveLength(1);
    });

    it("should append to existing nodes", () => {
      const node1 = { name: "worker-0", instanceType: "g6-standard-2" };
      const node2 = { name: "worker-1", instanceType: "g6-standard-2" };

      builder.addNode(node1).addNode(node2);
      const config = builder.setCount(2).build();

      expect(config.nodes).toHaveLength(2);
    });

    it("should return this for chaining", () => {
      const node = { name: "worker-0", instanceType: "g6-standard-2" };
      const result = builder.addNode(node);

      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build with default values", () => {
      const config = builder.build();

      expect(config.count).toBe(2);
      expect(config.instanceType).toBe("g6-standard-2");
      expect(config.labels).toBeUndefined();
      expect(config.nodes).toBeUndefined();
    });

    it("should build with all properties set", () => {
      const labels = { env: "production", workload: "web" };
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-4" },
        { name: "worker-1", instanceType: "g6-standard-4" },
      ];

      const config = builder
        .setCount(2)
        .setInstanceType("g6-standard-4")
        .setLabels(labels)
        .setNodes(nodes)
        .build();

      expect(config.count).toBe(2);
      expect(config.instanceType).toBe("g6-standard-4");
      expect(config.labels).toEqual(labels);
      expect(config.nodes).toEqual(nodes);
    });

    it("should throw error if nodes length does not match count on build", () => {
      builder.setCount(3);
      builder.addNode({ name: "worker-0", instanceType: "g6-standard-2" });
      builder.addNode({ name: "worker-1", instanceType: "g6-standard-2" });

      expect(() => builder.build()).toThrow(
        "Nodes array length (2) must match count (3)"
      );
    });

    it("should build with zero workers", () => {
      const config = builder.setCount(0).build();

      expect(config.count).toBe(0);
      expect(config.instanceType).toBe("g6-standard-2");
    });

    it("should build large worker pool", () => {
      const config = builder.setCount(20).setInstanceType("g6-standard-8").build();

      expect(config.count).toBe(20);
      expect(config.instanceType).toBe("g6-standard-8");
    });

    it("should build with labels and custom instance", () => {
      const config = builder
        .setCount(5)
        .setInstanceType("g6-standard-4")
        .setLabels({ tier: "worker", zone: "us-west" })
        .build();

      expect(config.count).toBe(5);
      expect(config.labels).toEqual({ tier: "worker", zone: "us-west" });
    });
  });

  describe("fluent interface", () => {
    it("should support method chaining", () => {
      const config = builder
        .setCount(3)
        .setInstanceType("g6-standard-4")
        .setLabels({ env: "production" })
        .build();

      expect(config.count).toBe(3);
      expect(config.instanceType).toBe("g6-standard-4");
      expect(config.labels).toEqual({ env: "production" });
    });

    it("should support chaining with addNode", () => {
      const config = builder
        .setCount(3)
        .addNode({ name: "worker-0", instanceType: "g6-standard-4" })
        .addNode({ name: "worker-1", instanceType: "g6-standard-4" })
        .addNode({ name: "worker-2", instanceType: "g6-standard-4" })
        .build();

      expect(config.nodes).toHaveLength(3);
    });

    it("should support complex chaining", () => {
      const config = builder
        .setCount(5)
        .setInstanceType("g6-standard-8")
        .setLabels({ env: "staging", tier: "worker" })
        .addNode({ name: "worker-0", instanceType: "g6-standard-8" })
        .addNode({ name: "worker-1", instanceType: "g6-standard-8" })
        .addNode({ name: "worker-2", instanceType: "g6-standard-8" })
        .addNode({ name: "worker-3", instanceType: "g6-standard-8" })
        .addNode({ name: "worker-4", instanceType: "g6-standard-8" })
        .build();

      expect(config.count).toBe(5);
      expect(config.nodes).toHaveLength(5);
    });
  });

  describe("validation scenarios", () => {
    it("should validate zero worker configuration", () => {
      const config = builder.setCount(0).build();

      expect(config.count).toBe(0);
    });

    it("should validate small worker pool", () => {
      const config = builder.setCount(2).build();

      expect(config.count).toBe(2);
    });

    it("should validate medium worker pool", () => {
      const config = builder.setCount(5).build();

      expect(config.count).toBe(5);
    });

    it("should validate large worker pool", () => {
      const config = builder.setCount(10).build();

      expect(config.count).toBe(10);
    });

    it("should validate heterogeneous node configuration", () => {
      const nodes = [
        { name: "worker-0", instanceType: "g6-standard-2" },
        { name: "worker-1", instanceType: "g6-standard-4" },
        { name: "worker-2", instanceType: "g6-standard-8" },
      ];

      const config = builder.setCount(3).setNodes(nodes).build();

      expect(config.nodes).toEqual(nodes);
      expect(config.nodes?.[0].instanceType).toBe("g6-standard-2");
      expect(config.nodes?.[1].instanceType).toBe("g6-standard-4");
      expect(config.nodes?.[2].instanceType).toBe("g6-standard-8");
    });
  });

  describe("edge cases", () => {
    it("should handle empty labels object", () => {
      builder.setLabels({});
      const config = builder.build();

      expect(config.labels).toEqual({});
    });

    it("should handle overriding labels", () => {
      builder.setLabels({ env: "dev" });
      builder.setLabels({ env: "prod" });
      const config = builder.build();

      expect(config.labels).toEqual({ env: "prod" });
    });

    it("should handle overriding instance type", () => {
      builder.setInstanceType("g6-standard-2");
      builder.setInstanceType("g6-standard-8");
      const config = builder.build();

      expect(config.instanceType).toBe("g6-standard-8");
    });

    it("should handle overriding count", () => {
      builder.setCount(2);
      builder.setCount(5);
      const config = builder.build();

      expect(config.count).toBe(5);
    });

    it("should handle nodes with additional properties", () => {
      const nodes = [
        {
          name: "worker-0",
          instanceType: "g6-standard-4",
          labels: { role: "database" }
        },
      ];

      builder.setCount(1).setNodes(nodes);
      const config = builder.build();

      expect(config.nodes?.[0]).toEqual(nodes[0]);
    });
  });
});
