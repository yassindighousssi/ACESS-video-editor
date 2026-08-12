import { RoomNavigation } from "./room-navigation";
import { RoomId } from "./room-types";
import { IRoom } from "./room-interface";
import { RoomContext } from "./room-context";
import { createTestRoomContext } from "./mocks";
import { AppEvent } from "./event-bus";
import { ErrorCode } from "../../infrastructure/common/types";

class FakeRoom implements IRoom {
  entered = 0;
  exited = 0;
  constructor(public readonly id: RoomId) {}

  get nameAr(): string {
    return `غرفة ${this.id}`;
  }

  get nameEn(): string {
    return `${this.id} room`;
  }

  onEnter(_context: RoomContext): void {
    this.entered++;
  }

  onExit(_context: RoomContext): void {
    this.exited++;
  }

  getElements() {
    return [];
  }
}

describe("RoomNavigation", () => {
  const harness = () => createTestRoomContext();
  let nav: RoomNavigation;

  beforeEach(() => {
    nav = new RoomNavigation(harness().context);
  });

  describe("registerRoom", () => {
    it("should register a room", () => {
      const result = nav.registerRoom(new FakeRoom("project"));
      expect(result.success).toBe(true);
      expect(nav.getRegisteredRoomIds()).toEqual(["project"]);
    });

    it("should reject duplicate registration", () => {
      nav.registerRoom(new FakeRoom("project"));
      const result = nav.registerRoom(new FakeRoom("project"));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("navigateTo", () => {
    it("should reject unknown rooms", () => {
      const result = nav.navigateTo("help");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should enter the target room and set it current", () => {
      const project = new FakeRoom("project");
      nav.registerRoom(project);
      const result = nav.navigateTo("project");
      expect(result.success).toBe(true);
      expect(project.entered).toBe(1);
      expect(project.exited).toBe(0);
      expect(nav.getCurrentRoomId()).toBe("project");
      expect(nav.getCurrentRoom()).toBe(project);
    });

    it("should exit the previous room when navigating", () => {
      const project = new FakeRoom("project");
      const timeline = new FakeRoom("timeline");
      nav.registerRoom(project);
      nav.registerRoom(timeline);
      nav.navigateTo("project");
      const result = nav.navigateTo("timeline");
      expect(result.success).toBe(true);
      expect(project.entered).toBe(1);
      expect(project.exited).toBe(1);
      expect(timeline.entered).toBe(1);
      expect(nav.getCurrentRoomId()).toBe("timeline");
    });

    it("should announce and stay when already in the room", () => {
      const h = harness();
      nav = new RoomNavigation(h.context);
      const project = new FakeRoom("project");
      nav.registerRoom(project);
      nav.navigateTo("project");
      const result = nav.navigateTo("project");
      expect(result.success).toBe(true);
      expect(project.entered).toBe(1);
      expect(project.exited).toBe(0);
      expect(h.announcement.getLast()?.textEn).toContain("already");
    });

    it("should emit enter and exit events", () => {
      const h = harness();
      nav = new RoomNavigation(h.context);
      const events: Array<{ event: string; payload: { roomId: string; from?: string | null } }> = [];
      h.eventBus.on(AppEvent.ROOM_ENTER, (p: { roomId: string; from?: string | null }) => events.push({ event: AppEvent.ROOM_ENTER, payload: p }));
      h.eventBus.on(AppEvent.ROOM_EXIT, (p: { roomId: string; from?: string | null }) => events.push({ event: AppEvent.ROOM_EXIT, payload: p }));
      nav.registerRoom(new FakeRoom("project"));
      nav.registerRoom(new FakeRoom("timeline"));
      nav.navigateTo("project");
      nav.navigateTo("timeline");
      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ event: "room.enter", payload: { roomId: "project", from: null } });
      expect(events[1]).toEqual({ event: "room.exit", payload: { roomId: "project", to: "timeline" } });
      expect(events[2]).toEqual({ event: "room.enter", payload: { roomId: "timeline", from: "project" } });
    });

    it("should record navigation history", () => {
      nav.registerRoom(new FakeRoom("project"));
      nav.registerRoom(new FakeRoom("timeline"));
      nav.navigateTo("project");
      nav.navigateTo("timeline");
      const history = nav.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.from).toBeNull();
      expect(history[0]?.to).toBe("project");
      expect(history[1]?.from).toBe("project");
      expect(history[1]?.to).toBe("timeline");
    });
  });

  describe("queries", () => {
    it("should return null current room before any navigation", () => {
      expect(nav.getCurrentRoomId()).toBeNull();
      expect(nav.getCurrentRoom()).toBeNull();
    });

    it("should get a room by id", () => {
      const project = new FakeRoom("project");
      nav.registerRoom(project);
      expect(nav.getRoom("project")).toBe(project);
      expect(nav.getRoom("media")).toBeUndefined();
    });
  });
});
