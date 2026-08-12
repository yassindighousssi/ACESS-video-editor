import { TimelineRoom } from "./timeline-room";
import { TimelineRoomModel } from "./timeline-room.model";
import { ProjectRoomModel } from "../project/project-room.model";
import { createTestRoomContext } from "../common/mocks";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { TransactionEngine } from "../../model/transaction";
import { timeValueFromMs } from "../../model/types";
import { insertClip, importMedia, createTrack as transitionCreateTrack } from "../../model/transitions";
import { RoomElement } from "../common/room-interface";

function build() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const txn = new TransactionEngine();
  const model = new TimelineRoomModel(store, h.eventBus, h.announcement, txn);
  const room = new TimelineRoom(model);
  return { ...h, store, txn, model, room };
}

function seed(h: ReturnType<typeof build>) {
  h.store.createProject("Timeline");
  const base = h.store.getCurrentProject()!;
  const step1 = h.txn.run(base, "import", "seed", s => importMedia(s, "/a.mp4", "video", 2000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = h.txn.run(step1.value.newState, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
  if (!step2.success) throw new Error("seed track failed");
  const media = step2.value.newState.media[0]!.id;
  const track = step2.value.newState.tracks[0]!.id;
  const step3 = h.txn.run(step2.value.newState, "clip", "seed", s => insertClip(s, media, track, tv(0), tv(0), tv(2000)));
  if (!step3.success) throw new Error("seed clip failed");
  const update = h.store.updateProject(step3.value.newState);
  if (!update.success) throw new Error("update failed");
}

function tv(ms: number) {
  return { ticks: timeValueFromMs(ms).ticks };
}

describe("TimelineRoom", () => {
  it("should expose timeline room identity", () => {
    const h = build();
    expect(h.room.id).toBe("timeline");
    expect(h.room.nameEn).toBe("Timeline Room");
    expect(h.room.nameAr).toBe("غرفة المخطط الزمني");
  });

  it("should announce entry with a track summary when a project is open", () => {
    const h = build();
    seed(h);
    h.room.onEnter(h.context);
    const last = h.announcement.getLast();
    expect(last?.textEn).toContain("Entered Timeline Room");
    expect(last?.textEn).toContain("Track V1 has 1 clips");
    expect(last?.textEn).toContain("Playhead at 0.0 seconds");
  });

  it("should announce entry when no project is open", () => {
    const h = build();
    h.room.onEnter(h.context);
    const last = h.announcement.getLast();
    expect(last?.textEn).toContain("Entered Timeline Room");
    expect(last?.textEn).toContain("No project is open");
  });

  it("should announce the active track and playhead on entry", () => {
    const h = build();
    seed(h);
    h.model.moveActiveTrack(0);
    h.model.setPlayheadMs(1500);
    h.room.onEnter(h.context);
    expect(h.announcement.getLast()?.textEn).toContain("Playhead at 1.5 seconds");
  });

  it("should expose playhead, selection, clipboard, tracks and clips as elements", () => {
    const h = build();
    seed(h);
    h.model.setPlayheadMs(0);
    h.model.selectCurrentClip();
    const elements: readonly RoomElement[] = h.room.getElements();
    const ids = elements.map(e => e.id);
    expect(ids).toContain("timeline-playhead");
    expect(ids).toContain("timeline-selection");
    expect(ids).toContain("timeline-clipboard");
    expect(ids.some(id => id.startsWith("track-"))).toBe(true);
    expect(ids.some(id => id.startsWith("clip-"))).toBe(true);
    const clipElement = elements.find(e => e.id.startsWith("clip-"));
    expect(clipElement?.labelEn).toContain("selected");
  });

  it("should show empty state elements when no project is open", () => {
    const h = build();
    const elements = h.room.getElements();
    expect(elements.find(e => e.id === "timeline-playhead")?.labelEn).toBe("Playhead at 0.0 seconds");
    expect(elements.some(e => e.id.startsWith("track-"))).toBe(false);
  });

  it("should not throw when exiting", () => {
    const h = build();
    seed(h);
    expect(() => h.room.onExit(h.context)).not.toThrow();
  });
});
