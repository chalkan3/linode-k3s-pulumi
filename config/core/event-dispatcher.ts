/**
 * Event Dispatcher (Observer Pattern)
 * Manages cluster lifecycle events and notifications
 */

export enum ClusterEventType {
  CONFIGURATION_LOADED = "configuration:loaded",
  CLUSTER_CREATING = "cluster:creating",
  CLUSTER_CREATED = "cluster:created",
  NODE_CREATING = "node:creating",
  NODE_CREATED = "node:created",
  NODE_FAILED = "node:failed",
  VPC_CREATED = "vpc:created",
  NETWORK_CREATED = "network:created",
  BASTION_CREATED = "bastion:created",
  K3S_INSTALLING = "k3s:installing",
  K3S_INSTALLED = "k3s:installed",
  VALIDATION_STARTED = "validation:started",
  VALIDATION_COMPLETED = "validation:completed",
  ARGOCD_INSTALLING = "argocd:installing",
  ARGOCD_INSTALLED = "argocd:installed",
  ERROR = "error",
}

export interface ClusterEvent {
  type: ClusterEventType;
  timestamp: Date;
  message: string;
  data?: any;
}

export type EventListener = (event: ClusterEvent) => void;

/**
 * Event Dispatcher for cluster lifecycle events
 * Implements Observer pattern for decoupled event handling
 */
export class EventDispatcher {
  private static instance: EventDispatcher;
  private listeners: Map<ClusterEventType, EventListener[]> = new Map();
  private eventHistory: ClusterEvent[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  /**
   * Subscribe to an event type
   */
  public on(eventType: ClusterEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  /**
   * Subscribe to multiple event types
   */
  public onMany(eventTypes: ClusterEventType[], listener: EventListener): void {
    eventTypes.forEach((type) => this.on(type, listener));
  }

  /**
   * Subscribe to all events
   */
  public onAll(listener: EventListener): void {
    Object.values(ClusterEventType).forEach((type) => {
      this.on(type as ClusterEventType, listener);
    });
  }

  /**
   * Unsubscribe from an event type
   */
  public off(eventType: ClusterEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  public emit(eventType: ClusterEventType, message: string, data?: any): void {
    const event: ClusterEvent = {
      type: eventType,
      timestamp: new Date(),
      message,
      data,
    };

    // Store in history
    this.eventHistory.push(event);

    // Notify listeners
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get event history
   */
  public getHistory(): ClusterEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get events by type
   */
  public getEventsByType(eventType: ClusterEventType): ClusterEvent[] {
    return this.eventHistory.filter((event) => event.type === eventType);
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Clear all listeners
   */
  public clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Reset dispatcher (useful for testing)
   */
  public static reset(): void {
    EventDispatcher.instance = null as any;
  }
}

/**
 * Default console logger for events
 */
export class ConsoleEventLogger {
  private static emojis: Record<ClusterEventType, string> = {
    [ClusterEventType.CONFIGURATION_LOADED]: "📋",
    [ClusterEventType.CLUSTER_CREATING]: "🏗️",
    [ClusterEventType.CLUSTER_CREATED]: "✅",
    [ClusterEventType.NODE_CREATING]: "⚙️",
    [ClusterEventType.NODE_CREATED]: "✅",
    [ClusterEventType.NODE_FAILED]: "❌",
    [ClusterEventType.VPC_CREATED]: "🔒",
    [ClusterEventType.NETWORK_CREATED]: "🌐",
    [ClusterEventType.BASTION_CREATED]: "🏰",
    [ClusterEventType.K3S_INSTALLING]: "📦",
    [ClusterEventType.K3S_INSTALLED]: "✅",
    [ClusterEventType.VALIDATION_STARTED]: "🔍",
    [ClusterEventType.VALIDATION_COMPLETED]: "✅",
    [ClusterEventType.ARGOCD_INSTALLING]: "🚀",
    [ClusterEventType.ARGOCD_INSTALLED]: "✅",
    [ClusterEventType.ERROR]: "💥",
  };

  public static setup(): void {
    const dispatcher = EventDispatcher.getInstance();

    dispatcher.onAll((event) => {
      const emoji = this.emojis[event.type] || "📌";
      const timestamp = event.timestamp.toISOString();
      console.log(`${emoji} [${timestamp}] ${event.message}`);

      if (event.data) {
        console.log("   Data:", JSON.stringify(event.data, null, 2));
      }
    });
  }
}
