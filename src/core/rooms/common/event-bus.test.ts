import { EventBus, AppEvent } from "./event-bus";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe("on / emit", () => {
    it("should deliver payloads to listeners", () => {
      const received: string[] = [];
      bus.on("test", (p: string) => received.push(p));
      bus.emit("test", "hello");
      bus.emit("test", "world");
      expect(received).toEqual(["hello", "world"]);
    });

    it("should deliver structured payloads", () => {
      const received: Array<{ id: number }> = [];
      bus.on("room.enter", (p: { id: number }) => received.push(p));
      bus.emit("room.enter", { id: 7 });
      expect(received).toEqual([{ id: 7 }]);
    });

    it("should return the number of listeners invoked", () => {
      bus.on("test", () => {});
      bus.on("test", () => {});
      const count = bus.emit("test", undefined);
      expect(count).toBe(2);
    });

    it("should return 0 when an event has no listeners", () => {
      expect(bus.emit("test", undefined)).toBe(0);
    });

    it("should notify multiple listeners in registration order", () => {
      const order: string[] = [];
      bus.on("test", () => order.push("a"));
      bus.on("test", () => order.push("b"));
      bus.emit("test", undefined);
      expect(order).toEqual(["a", "b"]);
    });
  });

  describe("unsubscribe", () => {
    it("should remove a listener via the returned function", () => {
      const received: number[] = [];
      const off = bus.on("test", (p: number) => received.push(p));
      bus.emit("test", 1);
      off();
      bus.emit("test", 2);
      expect(received).toEqual([1]);
    });

    it("should remove a listener by direct call", () => {
      const received: number[] = [];
      const handler = (p: number) => received.push(p);
      bus.on("test", handler);
      bus.emit("test", 1);
      expect(bus.unsubscribe("test", handler)).toBe(true);
      bus.emit("test", 2);
      expect(received).toEqual([1]);
      expect(bus.unsubscribe("test", handler)).toBe(false);
    });

    it("should report false for unknown events", () => {
      expect(bus.unsubscribe("missing", () => {})).toBe(false);
    });
  });

  describe("once", () => {
    it("should invoke the handler only once", () => {
      const received: number[] = [];
      bus.once("test", (p: number) => received.push(p));
      bus.emit("test", 1);
      bus.emit("test", 2);
      bus.emit("test", 3);
      expect(received).toEqual([1]);
    });

    it("should allow removal via the returned function before firing", () => {
      const received: number[] = [];
      const off = bus.once("test", (p: number) => received.push(p));
      off();
      bus.emit("test", 1);
      expect(received).toEqual([]);
    });
  });

  describe("removeAllListeners", () => {
    it("should remove listeners for a single event", () => {
      const received: string[] = [];
      bus.on("a", () => received.push("a"));
      bus.on("b", () => received.push("b"));
      bus.removeAllListeners("a");
      bus.emit("a", undefined);
      bus.emit("b", undefined);
      expect(received).toEqual(["b"]);
    });

    it("should remove all listeners when no event is given", () => {
      const received: string[] = [];
      bus.on("a", () => received.push("a"));
      bus.on("b", () => received.push("b"));
      bus.removeAllListeners();
      bus.emit("a", undefined);
      bus.emit("b", undefined);
      expect(received).toEqual([]);
    });
  });

  describe("listener introspection", () => {
    it("should report handler counts", () => {
      expect(bus.getHandlerCount("test")).toBe(0);
      bus.on("test", () => {});
      bus.on("test", () => {});
      expect(bus.getHandlerCount("test")).toBe(2);
      expect(bus.hasListeners("test")).toBe(true);
      expect(bus.hasListeners("other")).toBe(false);
    });
  });

  describe("event log", () => {
    it("should record emitted events", () => {
      bus.on("test", () => {});
      bus.emit("test", { value: 1 });
      bus.emit("other", 2);
      const log = bus.getEventLog();
      expect(log).toHaveLength(2);
      expect(log[0]?.event).toBe("test");
      expect(log[0]?.handlerCount).toBe(1);
      expect(log[0]?.payload).toEqual({ value: 1 });
      expect(log[1]?.event).toBe("other");
      expect(log[1]?.handlerCount).toBe(0);
    });

    it("should record events with no listeners", () => {
      bus.emit("lonely", "x");
      expect(bus.getEventLog()).toHaveLength(1);
      expect(bus.getEventLog()[0]?.handlerCount).toBe(0);
    });

    it("should clear the log", () => {
      bus.emit("test", undefined);
      bus.clearLog();
      expect(bus.getEventLog()).toHaveLength(0);
    });

    it("should cap the event log at the maximum size", () => {
      for (let i = 0; i < 1050; i++) {
        bus.emit("burst", i);
      }
      expect(bus.getEventLog()).toHaveLength(1000);
      expect(bus.getEventLog()[0]?.payload).toBe(50);
    });
  });

  describe("AppEvent constants", () => {
    it("should expose standard app event names", () => {
      expect(AppEvent.ROOM_ENTER).toBe("room.enter");
      expect(AppEvent.PROJECT_SAVED).toBe("project.saved");
      expect(AppEvent.MEDIA_IMPORTED).toBe("media.imported");
      expect(AppEvent.SETTINGS_CHANGED).toBe("settings.changed");
    });
  });
});
