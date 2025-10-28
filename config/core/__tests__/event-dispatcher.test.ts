import {
  EventDispatcher,
  ClusterEventType,
  ClusterEvent,
  ConsoleEventLogger,
} from "../event-dispatcher";

describe("EventDispatcher", () => {
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    EventDispatcher.reset();
    dispatcher = EventDispatcher.getInstance();
  });

  afterEach(() => {
    dispatcher.clearListeners();
    dispatcher.clearHistory();
  });

  describe("singleton pattern", () => {
    it("should return same instance", () => {
      const instance1 = EventDispatcher.getInstance();
      const instance2 = EventDispatcher.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = EventDispatcher.getInstance();
      EventDispatcher.reset();
      const instance2 = EventDispatcher.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("on", () => {
    it("should subscribe to event", () => {
      const listener = jest.fn();

      dispatcher.on(ClusterEventType.CLUSTER_CREATED, listener);
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Cluster created");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should receive event data", () => {
      const listener = jest.fn();

      dispatcher.on(ClusterEventType.NODE_CREATED, listener);
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Node created", { nodeId: "node-1" });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ClusterEventType.NODE_CREATED,
          message: "Node created",
          data: { nodeId: "node-1" },
        })
      );
    });

    it("should support multiple listeners for same event", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      dispatcher.on(ClusterEventType.CLUSTER_CREATING, listener1);
      dispatcher.on(ClusterEventType.CLUSTER_CREATING, listener2);
      dispatcher.emit(ClusterEventType.CLUSTER_CREATING, "Creating cluster");

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("onMany", () => {
    it("should subscribe to multiple events", () => {
      const listener = jest.fn();

      dispatcher.onMany(
        [ClusterEventType.VPC_CREATED, ClusterEventType.NETWORK_CREATED],
        listener
      );

      dispatcher.emit(ClusterEventType.VPC_CREATED, "VPC created");
      dispatcher.emit(ClusterEventType.NETWORK_CREATED, "Network created");

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("onAll", () => {
    it("should subscribe to all events", () => {
      const listener = jest.fn();

      dispatcher.onAll(listener);

      dispatcher.emit(ClusterEventType.CLUSTER_CREATING, "Creating");
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Node created");
      dispatcher.emit(ClusterEventType.K3S_INSTALLED, "K3s installed");

      expect(listener).toHaveBeenCalledTimes(3);
    });
  });

  describe("off", () => {
    it("should unsubscribe from event", () => {
      const listener = jest.fn();

      dispatcher.on(ClusterEventType.CLUSTER_CREATED, listener);
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created 1");

      dispatcher.off(ClusterEventType.CLUSTER_CREATED, listener);
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created 2");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should only remove specified listener", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      dispatcher.on(ClusterEventType.NODE_CREATING, listener1);
      dispatcher.on(ClusterEventType.NODE_CREATING, listener2);

      dispatcher.off(ClusterEventType.NODE_CREATING, listener1);
      dispatcher.emit(ClusterEventType.NODE_CREATING, "Creating node");

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should handle removing non-existent listener", () => {
      const listener = jest.fn();

      expect(() => {
        dispatcher.off(ClusterEventType.CLUSTER_CREATED, listener);
      }).not.toThrow();
    });
  });

  describe("emit", () => {
    it("should create event with timestamp", () => {
      const listener = jest.fn();

      dispatcher.on(ClusterEventType.CLUSTER_CREATED, listener);
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Test message");

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });

    it("should handle listener errors gracefully", () => {
      const errorListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      dispatcher.on(ClusterEventType.ERROR, errorListener);
      dispatcher.on(ClusterEventType.ERROR, goodListener);

      dispatcher.emit(ClusterEventType.ERROR, "Error occurred");

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not throw when no listeners registered", () => {
      expect(() => {
        dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "No listeners");
      }).not.toThrow();
    });
  });

  describe("getHistory", () => {
    it("should return event history", () => {
      dispatcher.emit(ClusterEventType.CLUSTER_CREATING, "Creating");
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created");

      const history = dispatcher.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(ClusterEventType.CLUSTER_CREATING);
      expect(history[1].type).toBe(ClusterEventType.CLUSTER_CREATED);
    });

    it("should return copy of history", () => {
      dispatcher.emit(ClusterEventType.VPC_CREATED, "VPC");

      const history1 = dispatcher.getHistory();
      const history2 = dispatcher.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("getEventsByType", () => {
    it("should filter events by type", () => {
      dispatcher.emit(ClusterEventType.NODE_CREATING, "Creating node 1");
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Created node 1");
      dispatcher.emit(ClusterEventType.NODE_CREATING, "Creating node 2");
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Created node 2");

      const creatingEvents = dispatcher.getEventsByType(ClusterEventType.NODE_CREATING);
      const createdEvents = dispatcher.getEventsByType(ClusterEventType.NODE_CREATED);

      expect(creatingEvents).toHaveLength(2);
      expect(createdEvents).toHaveLength(2);
    });

    it("should return empty array for no matches", () => {
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created");

      const events = dispatcher.getEventsByType(ClusterEventType.NODE_FAILED);

      expect(events).toHaveLength(0);
    });
  });

  describe("clearHistory", () => {
    it("should clear all event history", () => {
      dispatcher.emit(ClusterEventType.CLUSTER_CREATING, "Creating");
      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created");

      expect(dispatcher.getHistory()).toHaveLength(2);

      dispatcher.clearHistory();

      expect(dispatcher.getHistory()).toHaveLength(0);
    });
  });

  describe("clearListeners", () => {
    it("should remove all listeners", () => {
      const listener = jest.fn();

      dispatcher.on(ClusterEventType.CLUSTER_CREATED, listener);
      dispatcher.on(ClusterEventType.NODE_CREATED, listener);

      dispatcher.clearListeners();

      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created");
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Node");

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("event types", () => {
    it("should support all cluster event types", () => {
      const listener = jest.fn();

      Object.values(ClusterEventType).forEach((type) => {
        dispatcher.on(type as ClusterEventType, listener);
        dispatcher.emit(type as ClusterEventType, `Event: ${type}`);
      });

      expect(listener).toHaveBeenCalledTimes(Object.values(ClusterEventType).length);
    });
  });
});

describe("ConsoleEventLogger", () => {
  let dispatcher: EventDispatcher;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    EventDispatcher.reset();
    dispatcher = EventDispatcher.getInstance();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    dispatcher.clearListeners();
    dispatcher.clearHistory();
    consoleSpy.mockRestore();
  });

  describe("setup", () => {
    it("should log events to console", () => {
      ConsoleEventLogger.setup();

      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Cluster created successfully");

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain("Cluster created successfully");
    });

    it("should include emoji in log", () => {
      ConsoleEventLogger.setup();

      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Created");

      expect(consoleSpy.mock.calls[0][0]).toContain("✅");
    });

    it("should log event data when present", () => {
      ConsoleEventLogger.setup();

      dispatcher.emit(ClusterEventType.CLUSTER_CREATED, "Cluster created", {
        clusterName: "test-cluster",
        region: "us-east",
      });

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[1][0]).toContain("Data:");
      expect(consoleSpy.mock.calls[1][1]).toContain("test-cluster");
    });

    it("should include timestamp in log", () => {
      ConsoleEventLogger.setup();

      dispatcher.emit(ClusterEventType.VPC_CREATED, "VPC created");

      const logMessage = consoleSpy.mock.calls[0][0];
      expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should log all event types", () => {
      ConsoleEventLogger.setup();

      dispatcher.emit(ClusterEventType.CONFIGURATION_LOADED, "Config loaded");
      dispatcher.emit(ClusterEventType.CLUSTER_CREATING, "Creating");
      dispatcher.emit(ClusterEventType.NODE_CREATED, "Node created");
      dispatcher.emit(ClusterEventType.K3S_INSTALLING, "Installing K3s");
      dispatcher.emit(ClusterEventType.ARGOCD_INSTALLED, "ArgoCD installed");
      dispatcher.emit(ClusterEventType.ERROR, "Error occurred");

      expect(consoleSpy).toHaveBeenCalledTimes(6);
    });
  });
});
