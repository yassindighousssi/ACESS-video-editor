import { ProjectRoom } from "./project-room";
import { ProjectRoomModel } from "./project-room.model";
import { createTestRoomContext } from "../common/mocks";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { AppEvent } from "../common/event-bus";
import { createMediaAsset, createTrack, createClip } from "../../model/factory";

function setup() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const model = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const room = new ProjectRoom(model);
  return { ...h, model, room };
}

function seedProject(model: ProjectRoomModel, name: string): void {
  const created = model.createProject(name);
  if (!created.success) throw new Error("seed create failed");
  const p = model.getCurrentProject()!;
  p.media.push(createMediaAsset(p.id, "/a.mp4", "h", "video", 10000));
  p.tracks.push(createTrack(p.id, "V1", "video", 0));
  p.clips.push(createClip(p.id, "Intro", p.media[0]!.id, 0, 1000, 0));
}

describe("ProjectRoom (IRoom)", () => {
  it("should expose project room identity", () => {
    const { room } = setup();
    expect(room.id).toBe("project");
    expect(room.nameAr).toBe("غرفة المشروع");
    expect(room.nameEn).toBe("Project Room");
  });

  describe("onEnter", () => {
    it("should announce when no project is open", () => {
      const { room, context, announcement } = setup();
      room.onEnter(context);
      expect(announcement.getLast()?.textEn).toContain("No project is open");
    });

    it("should announce the current project summary", () => {
      const { room, context, announcement, model } = setup();
      seedProject(model, "Film");
      room.onEnter(context);
      const last = announcement.getLast();
      expect(last?.textEn).toContain("Current project: Film");
      expect(last?.textEn).toContain("1 tracks");
      expect(last?.textEn).toContain("1 clips");
    });

    it("should announce project updates on MEDIA_IMPORTED while active", () => {
      const { room, context, announcement, eventBus, model } = setup();
      seedProject(model, "Film");
      room.onEnter(context);
      eventBus.emit(AppEvent.MEDIA_IMPORTED, { path: "/x.mp4" });
      expect(announcement.getLast()?.textEn).toContain("Project updated");
    });

    it("should ignore MEDIA_IMPORTED when no project is open", () => {
      const { room, context, announcement, eventBus } = setup();
      room.onEnter(context);
      eventBus.emit(AppEvent.MEDIA_IMPORTED, { path: "/x.mp4" });
      expect(announcement.getLast()?.textEn).toContain("No project is open");
      expect(announcement.getLast()?.textEn).not.toContain("Project updated");
    });

    it("should stop announcing updates after exit", () => {
      const { room, context, announcement, eventBus, model } = setup();
      seedProject(model, "Film");
      room.onEnter(context);
      room.onExit(context);
      eventBus.emit(AppEvent.MEDIA_IMPORTED, { path: "/x.mp4" });
      expect(announcement.getLast()?.textEn).not.toContain("Project updated");
    });
  });

  describe("getElements", () => {
    it("should include action buttons", () => {
      const { room } = setup();
      const elements = room.getElements();
      const actions = elements.filter(e => e.action !== undefined).map(e => e.action);
      expect(actions).toEqual(["Ctrl+Shift+N", "Ctrl+O", "Ctrl+S", "Ctrl+Shift+S", "Ctrl+E"]);
    });

    it("should include a status element only when a project is open", () => {
      const { room, model } = setup();
      expect(room.getElements().some(e => e.id === "project-stats")).toBe(false);
      seedProject(model, "Film");
      const stats = room.getElements().find(e => e.id === "project-stats");
      expect(stats).toBeDefined();
      expect(stats?.labelEn).toContain("Clips: 1");
    });
  });
});
