import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { createTestRoomContext } from "../rooms/common/mocks";
import { ProjectRoomModel } from "../rooms/project/project-room.model";
import { TransactionEngine } from "../model/transaction";
import { AppEvent } from "../rooms/common/event-bus";
import { ErrorCode } from "../infrastructure/common/types";
import { createTrack, createClip } from "../model/factory";
import { MockMediaEngine, encodeMockMedia } from "./mock-media-engine";
import { MediaRoomModel } from "./media-room.model";

function setup() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const mediaEngine = new MockMediaEngine();
  const txn = new TransactionEngine();
  const model = new MediaRoomModel(store, h.file, mediaEngine, h.eventBus, h.announcement, txn);
  return { ...h, fs, store, model, txn };
}

function seedFiles(fs: MockFileSystem): void {
  fs.createFile("/videos/intro.mp4", encodeMockMedia({ kind: "video", durationMs: 8000, width: 1920, height: 1080, frameRate: 30, codec: "h264" }));
  fs.createFile("/audio/music.mp3", encodeMockMedia({ kind: "audio", durationMs: 15000, sampleRate: 44100, channels: 2 }));
  fs.createFile("/images/logo.png", encodeMockMedia({ kind: "image", durationMs: 0, width: 800, height: 600 }));
}

function openProject(h: ReturnType<typeof setup>, name = "Media Project"): void {
  const created = h.store.createProject(name);
  if (!created.success) throw new Error("createProject failed");
}

describe("MediaRoomModel", () => {
  describe("importMedia", () => {
    it("should import a media asset into the current project", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      const result = await h.model.importMedia("/videos/intro.mp4");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mediaType).toBe("video");
      expect(result.value.sourcePath).toBe("/videos/intro.mp4");
      expect(result.value.sourceHash).toHaveLength(64);
      expect(h.store.getCurrentProject()?.media).toHaveLength(1);
      expect(h.store.isDirty()).toBe(true);
      expect(h.announcement.getLast()?.textEn).toContain("Imported video");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.MEDIA_IMPORTED)).toBe(true);
      expect(h.model.getState().lastOperation).toBe("import");
    });

    it("should record an undoable transaction entry", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      await h.model.importMedia("/videos/intro.mp4");
      const project = h.store.getCurrentProject()!;
      expect(h.txn.getUndoCount(project)).toBe(1);
    });

    it("should reject import when no project is open", async () => {
      const h = setup();
      seedFiles(h.fs);
      const result = await h.model.importMedia("/videos/intro.mp4");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.store.getCurrentProject()).toBeNull();
    });

    it("should propagate a missing-file error", async () => {
      const h = setup();
      openProject(h);
      const result = await h.model.importMedia("/videos/missing.mp4");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
    });

    it("should reject unsupported media formats", async () => {
      const h = setup();
      h.fs.createFile("/junk.bin", new TextEncoder().encode("nope"));
      openProject(h);
      const result = await h.model.importMedia("/junk.bin");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.UNSUPPORTED_FORMAT);
    });

    it("should reject an empty path", async () => {
      const h = setup();
      openProject(h);
      const result = await h.model.importMedia("   ");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should allow importing the same file more than once", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      const first = await h.model.importMedia("/videos/intro.mp4");
      const second = await h.model.importMedia("/videos/intro.mp4");
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;
      expect(first.value.id).not.toBe(second.value.id);
      expect(h.store.getCurrentProject()?.media).toHaveLength(2);
    });
  });

  describe("removeMedia", () => {
    it("should remove a media asset that is not in use", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      const imported = await h.model.importMedia("/audio/music.mp3");
      if (!imported.success) throw new Error("import failed");
      const result = await h.model.removeMedia(imported.value.id);
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.media).toHaveLength(0);
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.MEDIA_REMOVED)).toBe(true);
      expect(h.announcement.getLast()?.textEn).toContain("Media removed");
      expect(h.model.getState().lastOperation).toBe("remove");
    });

    it("should reject removal when no project is open", async () => {
      const h = setup();
      const result = await h.model.removeMedia("nope" as never);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("should reject removal of an unknown media asset", async () => {
      const h = setup();
      openProject(h);
      const result = await h.model.removeMedia("nope" as never);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("should reject removal of media that is referenced by a clip", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      const imported = await h.model.importMedia("/videos/intro.mp4");
      if (!imported.success) throw new Error("import failed");
      const project = h.store.getCurrentProject()!;
      const track = createTrack(project.id, "V1", "video", 0);
      const clip = createClip(project.id, "Intro", imported.value.id, 0, 1000, 0);
      const seeded = {
        ...project,
        tracks: [...project.tracks, track],
        clips: [...project.clips, clip],
      };
      const updated = h.store.updateProject(seeded);
      if (!updated.success) throw new Error("update failed");
      const result = await h.model.removeMedia(imported.value.id);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.MEDIA_IN_USE);
      expect(h.store.getCurrentProject()?.media).toHaveLength(1);
    });

    it("should allow undo after removal via the transaction journal", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      const imported = await h.model.importMedia("/audio/music.mp3");
      if (!imported.success) throw new Error("import failed");
      const removed = await h.model.removeMedia(imported.value.id);
      if (!removed.success) throw new Error("remove failed");
      const project = h.store.getCurrentProject()!;
      const undo = h.txn.undo(project);
      expect(undo.success).toBe(true);
      if (!undo.success) return;
      const restored = h.store.updateProject(undo.value.newState);
      expect(restored.success).toBe(true);
      expect(h.store.getCurrentProject()?.media).toHaveLength(1);
      expect(h.store.getCurrentProject()?.media[0]?.id).toBe(imported.value.id);
    });
  });

  describe("getStats", () => {
    it("should break down media by type and total duration", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      await h.model.importMedia("/videos/intro.mp4");
      await h.model.importMedia("/audio/music.mp3");
      await h.model.importMedia("/images/logo.png");
      const stats = h.model.getStats();
      expect(stats.count).toBe(3);
      expect(stats.videoCount).toBe(1);
      expect(stats.audioCount).toBe(1);
      expect(stats.imageCount).toBe(1);
      expect(stats.totalDurationMs).toBe(23000);
    });

    it("should report zero stats when no project is open", () => {
      const h = setup();
      const stats = h.model.getStats();
      expect(stats.count).toBe(0);
      expect(stats.videoCount).toBe(0);
      expect(stats.audioCount).toBe(0);
      expect(stats.imageCount).toBe(0);
      expect(stats.totalDurationMs).toBe(0);
    });
  });

  describe("state helpers", () => {
    it("should report hasProject and list media through getState", async () => {
      const h = setup();
      seedFiles(h.fs);
      openProject(h);
      await h.model.importMedia("/images/logo.png");
      const state = h.model.getState();
      expect(state.hasProject).toBe(true);
      expect(state.mediaCount).toBe(1);
      expect(state.media).toHaveLength(1);
      const media = h.model.getMedia(state.media[0]!.id);
      expect(media?.mediaType).toBe("image");
    });

    it("should report no project through getState", () => {
      const h = setup();
      const state = h.model.getState();
      expect(state.hasProject).toBe(false);
      expect(state.mediaCount).toBe(0);
      expect(state.media).toHaveLength(0);
      expect(h.model.getProject()).toBeNull();
    });
  });
});
