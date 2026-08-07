export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventEntry {
  readonly event: string;
  readonly payload: unknown;
  readonly handlerCount: number;
  readonly timestamp: number;
}

export const AppEvent = {
  ROOM_ENTER: "room.enter",
  ROOM_EXIT: "room.exit",
  PROJECT_CREATED: "project.created",
  PROJECT_OPENED: "project.opened",
  PROJECT_SAVED: "project.saved",
  PROJECT_EXPORTED: "project.exported",
  PROJECT_CLOSED: "project.closed",
  MEDIA_IMPORTED: "media.imported",
  MEDIA_REMOVED: "media.removed",
  TIMELINE_CHANGED: "timeline.changed",
  SETTINGS_CHANGED: "settings.changed",
} as const;

export type AppEvent = (typeof AppEvent)[keyof typeof AppEvent];

interface ListenerEntry {
  readonly handler: EventHandler;
  readonly once: boolean;
}

export class EventBus {
  private listeners: Map<string, Set<ListenerEntry>> = new Map();
  private log: EventEntry[] = [];
  private maxLogSize: number = 1000;

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const entry: ListenerEntry = { handler: handler as EventHandler, once: false };
    this.addEntry(event, entry);
    return () => this.unsubscribe(event, handler as EventHandler);
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const wrapper: EventHandler = (payload) => {
      this.unsubscribe(event, wrapper);
      handler(payload as T);
    };
    const entry: ListenerEntry = { handler: wrapper, once: true };
    this.addEntry(event, entry);
    return () => this.unsubscribe(event, wrapper);
  }

  emit<T = unknown>(event: string, payload: T): number {
    const set = this.listeners.get(event);
    const entries = set ? [...set] : [];
    for (const entry of entries) {
      entry.handler(payload);
    }
    this.record(event, payload, entries.length);
    return entries.length;
  }

  unsubscribe<T = unknown>(event: string, handler: EventHandler<T>): boolean {
    const set = this.listeners.get(event);
    if (!set) return false;
    const target = handler as EventHandler;
    let removed = false;
    for (const entry of set) {
      if (entry.handler === target) {
        set.delete(entry);
        removed = true;
      }
    }
    if (set.size === 0) this.listeners.delete(event);
    return removed;
  }

  removeAllListeners(event?: string): void {
    if (event === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(event);
    }
  }

  getHandlerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  hasListeners(event: string): boolean {
    return this.getHandlerCount(event) > 0;
  }

  getEventLog(): readonly EventEntry[] {
    return [...this.log];
  }

  clearLog(): void {
    this.log = [];
  }

  private addEntry(event: string, entry: ListenerEntry): void {
    const set = this.listeners.get(event) ?? new Set<ListenerEntry>();
    set.add(entry);
    this.listeners.set(event, set);
  }

  private record(event: string, payload: unknown, handlerCount: number): void {
    this.log.push({ event, payload, handlerCount, timestamp: Date.now() });
    if (this.log.length > this.maxLogSize) {
      this.log.splice(0, this.log.length - this.maxLogSize);
    }
  }
}
