import { MediaRoom } from "./media-room";
import { MediaRoomModel } from "./media-room.model";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { createTestRoomContext } from "../rooms/common/mocks";
import { ProjectRoomModel } from "../rooms/project/project-room.model";
import { TransactionEngine } from "../model/transaction";
import { AppEvent } from "../rooms/common/event-bus";
import { MockMediaEngine, encodeMockMedia } from "./mock-media-engine";

function setup() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const mediaEngine = new MockMediaEngine();
  const txn = new TransactionEngine();
  const model = new MediaRoomModel(store, h.file, mediaEngine, h.eventBus, h.announcement, txn);
  const room = new MediaRoom(model);
  return { ...h, fs, store, model, room };
}

async function seedMedia(h: ReturnType<typeof setup>, name = "Film"): Promise<void> {
  const created = h.store.createProject(name);
  if (!created.success) throw new Error("createProject failed");
  h.fs.createFile("/videos/intro.mp4", encodeMockMedia({ kind: "video", durationMs: 8000, width: 1920, height: 1080 }));
  h.fs.createFile("/audio/music.mp3", encodeMockMedia({ kind: "audio", durationMs: 15000, sampleRate: 44100 }));
  const video = await h.model.importMedia("/videos/intro.mp4");
  const audio = await h.model.importMedia("/audio/music.mp3");
  if (!video.success || !audio.success) throw new Error("import failed");
}

describe("MediaRoom (IRoom)", () => {
  it("should expose media room identity", () => {
    const { room } = setup();
    expect(room.id).toBe("media");
    expect(room.nameAr).toBe("غرفة الوسائط");
    expect(room.nameEn).toBe("Media Room");
  });

  describe("onEnter", () => {
    it("should announce when no project is open", () => {
      const { room, context, announcement } = setup();
      room.onEnter(context);
      expect(announcement.getLast()?.textEn).toContain("No project is open");
    });

    it("should announce the media library summary", async () => {
      const h = setup();
      await seedMedia(h);
      h.room.onEnter(h.context);
      const last = h.announcement.getLast();
      expect(last?.textEn).toContain("media assets");
      expect(last?.textEn).toContain("2 media assets");
      expect(last?.textEn).toContain("1 videos");
      expect(last?.textEn).toContain("1 audio");
    });

    it("should announce when new media is imported while active", async () => {
      const h = setup();
      await seedMedia(h);
      h.room.onEnter(h.context);
      h.fs.createFile("/extra.png", encodeMockMedia({ kind: "image", durationMs: 0, width: 100, height: 100 }));
      const imported = await h.model.importMedia("/extra.png");
      if (!imported.success) throw new Error("import failed");
      expect(h.announcement.getLast()?.textEn).toContain("New media imported");
    });

    it("should stop announcing media imports after exit", async () => {
      const h = setup();
      await seedMedia(h);
      h.room.onEnter(h.context);
      h.room.onExit(h.context);
      h.fs.createFile("/extra.png", encodeMockMedia({ kind: "image", durationMs: 0, width: 100, height: 100 }));
      const before = h.announcement.getHistory().length;
      const imported = await h.model.importMedia("/extra.png");
      if (!imported.success) throw new Error("import failed");
      expect(h.announcement.getHistory().length).toBe(before + 1);
      expect(h.announcement.getLast()?.textEn).not.toContain("New media imported");
    });
  });

  describe("getElements", () => {
    it("should show an empty status when the library has no media", () => {
      const { room } = setup();
      const elements = room.getElements();
      expect(elements).toHaveLength(1);
      expect(elements[0]?.id).toBe("media-empty");
      expect(elements[0]?.labelEn).toContain("No media imported");
    });

    it("should list each media asset with a summary label", async () => {
      const h = setup();
      await seedMedia(h);
      const elements = h.room.getElements();
      const items = elements.filter(e => e.type === "listitem");
      expect(items).toHaveLength(2);
      expect(items[0]?.labelEn).toContain("intro.mp4");
      expect(items[0]?.labelEn).toContain("video");
      expect(items[1]?.labelEn).toContain("music.mp3");
      expect(items[1]?.labelEn).toContain("audio");
      expect(items.every(i => i.focusable)).toBe(true);
      const stats = elements.find(e => e.id === "media-stats");
      expect(stats?.labelEn).toBe("Total media: 2");
    });

    it("should label image assets as images in Arabic", async () => {
      const h = setup();
      const created = h.store.createProject("Still");
      if (!created.success) throw new Error("createProject failed");
      h.fs.createFile("/images/logo.png", encodeMockMedia({ kind: "image", durationMs: 0, width: 800, height: 600 }));
      const imported = await h.model.importMedia("/images/logo.png");
      if (!imported.success) throw new Error("import failed");
      const items = h.room.getElements().filter(e => e.type === "listitem");
      expect(items).toHaveLength(1);
      expect(items[0]?.labelEn).toContain("logo.png");
      expect(items[0]?.labelEn).toContain("image");
      expect(items[0]?.labelAr).toContain("صورة");
    });
  });
});
