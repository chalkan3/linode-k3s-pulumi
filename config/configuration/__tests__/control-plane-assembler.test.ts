import { ControlPlaneBuilder } from "../control-plane-assembler";

describe("ControlPlaneBuilder", () => {
  let builder: ControlPlaneBuilder;

  beforeEach(() => {
    builder = new ControlPlaneBuilder();
  });

  describe("setCount", () => {
    it("should set count to 1", () => {
      builder.setCount(1);
      const config = builder.build();

      expect(config.count).toBe(1);
    });

    it("should set count to 3", () => {
      builder.setCount(3);
      const config = builder.build();

      expect(config.count).toBe(3);
    });

    it("should set count to 5", () => {
      builder.setCount(5);
      const config = builder.build();

      expect(config.count).toBe(5);
    });

    it("should throw error for count less than 1", () => {
      expect(() => builder.setCount(0)).toThrow("Control plane count must be at least 1");
    });

    it("should throw error for negative count", () => {
      expect(() => builder.setCount(-1)).toThrow("Control plane count must be at least 1");
    });

    it("should throw error for count of 2", () => {
      expect(() => builder.setCount(2)).toThrow(
        "Control plane count of 2 is not recommended. Use 1 or 3+ for HA"
      );
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

    it("should return this for chaining", () => {
      const result = builder.setInstanceType("g6-standard-4");

      expect(result).toBe(builder);
    });
  });

  describe("setLabels", () => {
    it("should set labels", () => {
      const labels = { env: "production", tier: "control" };
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
        { name: "cp-0", instanceType: "g6-standard-4" },
        { name: "cp-1", instanceType: "g6-standard-4" },
        { name: "cp-2", instanceType: "g6-standard-4" },
      ];

      builder.setCount(3).setNodes(nodes);
      const config = builder.build();

      expect(config.nodes).toEqual(nodes);
    });

    it("should throw error if nodes length does not match count", () => {
      const nodes = [
        { name: "cp-0", instanceType: "g6-standard-4" },
        { name: "cp-1", instanceType: "g6-standard-4" },
      ];

      expect(() => builder.setCount(3).setNodes(nodes)).toThrow(
        "Nodes array length (2) must match count (3)"
      );
    });

    it("should have no nodes by default", () => {
      const config = builder.build();

      expect(config.nodes).toBeUndefined();
    });

    it("should return this for chaining", () => {
      const nodes = [{ name: "cp-0", instanceType: "g6-standard-2" }];
      const result = builder.setCount(1).setNodes(nodes);

      expect(result).toBe(builder);
    });
  });

  describe("addNode", () => {
    it("should add a single node", () => {
      const node = { name: "cp-0", instanceType: "g6-standard-4" };

      builder.setCount(1).addNode(node);
      const config = builder.build();

      expect(config.nodes).toEqual([node]);
    });

    it("should add multiple nodes", () => {
      const node1 = { name: "cp-0", instanceType: "g6-standard-4" };
      const node2 = { name: "cp-1", instanceType: "g6-standard-4" };
      const node3 = { name: "cp-2", instanceType: "g6-standard-4" };

      builder.setCount(3).addNode(node1).addNode(node2).addNode(node3);
      const config = builder.build();

      expect(config.nodes).toEqual([node1, node2, node3]);
    });

    it("should initialize nodes array if not exists", () => {
      const node = { name: "cp-0", instanceType: "g6-standard-2" };

      builder.addNode(node);
      const config = builder.setCount(1).build();

      expect(config.nodes).toBeDefined();
      expect(config.nodes).toHaveLength(1);
    });

    it("should return this for chaining", () => {
      const node = { name: "cp-0", instanceType: "g6-standard-2" };
      const result = builder.addNode(node);

      expect(result).toBe(builder);
    });
  });

  describe("build", () => {
    it("should build with default values", () => {
      const config = builder.build();

      expect(config.count).toBe(1);
      expect(config.instanceType).toBe("g6-standard-2");
      expect(config.labels).toBeUndefined();
      expect(config.nodes).toBeUndefined();
    });

    it("should build with all properties set", () => {
      const labels = { env: "production" };
      const nodes = [{ name: "cp-0", instanceType: "g6-standard-4" }];

      const config = builder
        .setCount(1)
        .setInstanceType("g6-standard-4")
        .setLabels(labels)
        .setNodes(nodes)
        .build();

      expect(config.count).toBe(1);
      expect(config.instanceType).toBe("g6-standard-4");
      expect(config.labels).toEqual(labels);
      expect(config.nodes).toEqual(nodes);
    });

    it("should throw error if nodes length does not match count on build", () => {
      builder.setCount(3);
      builder.addNode({ name: "cp-0", instanceType: "g6-standard-2" });
      builder.addNode({ name: "cp-1", instanceType: "g6-standard-2" });

      expect(() => builder.build()).toThrow(
        "Nodes array length (2) must match count (3)"
      );
    });

    it("should build HA configuration", () => {
      const config = builder.setCount(3).setInstanceType("g6-standard-4").build();

      expect(config.count).toBe(3);
      expect(config.instanceType).toBe("g6-standard-4");
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
        .addNode({ name: "cp-0", instanceType: "g6-standard-4" })
        .addNode({ name: "cp-1", instanceType: "g6-standard-4" })
        .addNode({ name: "cp-2", instanceType: "g6-standard-4" })
        .build();

      expect(config.nodes).toHaveLength(3);
    });
  });

  describe("validation scenarios", () => {
    it("should validate single node configuration", () => {
      const config = builder.setCount(1).build();

      expect(config.count).toBe(1);
    });

    it("should validate HA configuration with 3 nodes", () => {
      const config = builder.setCount(3).build();

      expect(config.count).toBe(3);
    });

    it("should validate HA configuration with 5 nodes", () => {
      const config = builder.setCount(5).build();

      expect(config.count).toBe(5);
    });
  });
});
