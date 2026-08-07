import { RoomNavigation } from "../common/room-navigation";
import { AppEvent } from "../common/event-bus";
import { createTestRoomContext } from "../common/mocks";
import { ProjectRoomModel } from "../project/project-room.model";
import { ProjectRoom } from "../project/project-room";
import { TimelineRoomModel } from "../timeline/timeline-room.model";
import { TimelineRoom } from "../timeline/timeline-room";
import { MediaRoomModel } from "../../media/media-room.model";
import { MediaRoom } from "../../media/media-room";
import { MockMediaEngine, encodeMockMedia } from "../../media/mock-media-engine";
import { TransactionEngine } from "../../model/transaction";
import { timeValueFromMs } from "../../model/types";
import { ErrorCode } from "../../infrastructure/common/types";
import { insertClip, importMedia, createTrack as transitionCreateTrack } from "../../model/transitions";
import { CommandSystem } from "../../commands/command-system";
import { CommandPalette } from "../../commands/command-palette";

function build() {
  const h = createTestRoomContext();
  const navigation = new RoomNavigation(h.context);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const txn = new TransactionEngine();
  const timelineModel = new TimelineRoomModel(store, h.eventBus, h.announcement, txn);
  const mediaModel = new MediaRoomModel(store, h.file, new MockMediaEngine(), h.eventBus, h.announcement, txn);
  const projectRoom = new ProjectRoom(store);
  const timelineRoom = new TimelineRoom(timelineModel);
  const mediaRoom = new MediaRoom(mediaModel);
  navigation.registerRoom(projectRoom);
  navigation.registerRoom(timelineRoom);
  navigation.registerRoom(mediaRoom);
  return { ...h, navigation, store, txn, timelineModel, mediaModel, projectRoom, timelineRoom, mediaRoom };
}

function tv(ms: number) {
  return { ticks: timeValueFromMs(ms).ticks };
}

function seedContent(h: ReturnType<typeof build>) {
  const base = h.store.getCurrentProject()!;
  const step1 = h.txn.run(base, "import", "seed", s => importMedia(s, "/intro.mp4", "video", 2000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = h.txn.run(step1.value.newState, "import", "seed", s => importMedia(s, "/main.mp4", "video", 3000, "h2"));
  if (!step2.success) throw new Error("seed import failed");
  const step3 = h.txn.run(step2.value.newState, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
  if (!step3.success) throw new Error("seed track failed");
  const mediaA = step3.value.newState.media[0]!.id;
  const mediaB = step3.value.newState.media[1]!.id;
  const track = step3.value.newState.tracks[0]!.id;
  const step4 = h.txn.run(step3.value.newState, "clip", "seed", s => insertClip(s, mediaA, track, tv(0), tv(0), tv(1000)));
  if (!step4.success) throw new Error("seed clip failed");
  const step5 = h.txn.run(step4.value.newState, "clip", "seed", s => insertClip(s, mediaB, track, tv(1000), tv(0), tv(3000)));
  if (!step5.success) throw new Error("seed clip failed");
  const update = h.store.updateProject(step5.value.newState);
  if (!update.success) throw new Error("update failed");
}

describe("Room integration scenario", () => {
  it("guides a blind user through a complete project + timeline editing flow", async () => {
    const h = build();

    // 1. Open the app: Project Room is the first stop.
    expect(h.navigation.navigateTo("project").success).toBe(true);
    expect(h.navigation.getCurrentRoomId()).toBe("project");
    expect(h.announcement.getLast()?.textEn).toContain("Entered Project Room");
    expect(h.announcement.getLast()?.textEn).toContain("No project is open");
    expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.ROOM_ENTER)).toBe(true);

    // 2. Create a new project.
    const created = h.store.createProject("My Film");
    expect(created.success).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("Created new project");
    expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_CREATED)).toBe(true);

    // 3. Media, track and clips are imported (stand-in for Media Room work).
    seedContent(h);
    expect(h.store.getStats(h.store.getCurrentProject()!).clipCount).toBe(2);

    // 4. Move to the Timeline Room.
    expect(h.navigation.navigateTo("timeline").success).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("Entered Timeline Room");
    expect(h.announcement.getLast()?.textEn).toContain("V1 has 2 clips");
    expect(h.navigation.getCurrentRoomId()).toBe("timeline");

    // 5. Split the clip under the playhead.
    h.timelineModel.setPlayheadMs(500);
    expect(h.announcement.getLast()?.textEn).toBe("Playhead at 0.5 seconds");
    expect(h.timelineModel.splitClipAtPlayhead().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
    expect(h.announcement.getLast()?.textEn).toContain("Split clip");
    expect(h.timelineModel.getElementsData()[0]?.clips).toHaveLength(3);

    // 6. Undo and redo the split.
    expect(h.timelineModel.undo().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
    expect(h.announcement.getLast()?.textEn).toBe("Undid the last operation");
    expect(h.timelineModel.redo().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
    expect(h.announcement.getLast()?.textEn).toBe("Redid the last operation");

    // 7. Delete a single clip, then undo.
    h.timelineModel.setPlayheadMs(750);
    expect(h.timelineModel.selectCurrentClip().success).toBe(true);
    expect(h.timelineModel.deleteSelection().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
    expect(h.announcement.getLast()?.textEn).toBe("Deleted 1 clips");
    expect(h.timelineModel.undo().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(3);

    // 8. Copy a clip and paste it at the end of the timeline.
    h.timelineModel.setPlayheadMs(1500);
    expect(h.timelineModel.selectCurrentClip().success).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("Selected clip");
    expect(h.timelineModel.copySelection().success).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("Clipboard contains 1 clips");
    h.timelineModel.movePlayheadToEnd();
    expect(h.timelineModel.pasteClipboard().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(4);
    expect(h.announcement.getLast()?.textEn).toBe("Pasted 1 clips");
    expect(h.timelineModel.getState().clipboardMode).toBe("copy");

    // 9. Return to the Project Room and confirm the updated stats are announced.
    expect(h.navigation.navigateTo("project").success).toBe(true);
    const stats = h.store.getStats(h.store.getCurrentProject()!);
    expect(stats.clipCount).toBe(4);
    expect(stats.trackCount).toBe(1);
    expect(stats.durationMs).toBe(7000);
    expect(h.announcement.getLast()?.textEn).toContain("Entered Project Room");
    expect(h.announcement.getLast()?.textEn).toContain("4 clips");

    // 10. Save the project to disk.
    const saved = await h.store.saveProject("my-film.tprj");
    expect(saved.success).toBe(true);
    expect(h.fs.exists("my-film.tprj")).toBe(true);
    expect(h.announcement.getLast()?.textEn).toBe("Project saved");
    expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_SAVED)).toBe(true);

    // 11. Export a manifest.
    const exported = await h.store.exportProject("my-film.json");
    expect(exported.success).toBe(true);
    expect(h.fs.exists("my-film.json")).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("Project exported");

    // 12. The navigation history matches the flow.
    expect(h.navigation.getHistory().map(t => t.to)).toEqual(["project", "timeline", "project"]);
    expect(h.navigation.getCurrentRoomId()).toBe("project");
  });

  it("prevents navigation to rooms that are not registered", () => {
    const h = build();
    const result = h.navigation.navigateTo("settings");
    expect(result.success).toBe(false);
    expect(h.navigation.getCurrentRoomId()).toBeNull();
  });

  it("imports media through the Media Room and edits it in the Timeline Room", async () => {
    const h = build();

    // 1. The Media Room is the first stop; with no project it guides the user.
    expect(h.navigation.navigateTo("media").success).toBe(true);
    expect(h.navigation.getCurrentRoomId()).toBe("media");
    expect(h.announcement.getLast()?.textEn).toContain("No project is open");

    // 2. Create a project and import media through the Media Room model.
    expect(h.store.createProject("Commercial").success).toBe(true);
    h.fs.createFile("/footage/a.mp4", encodeMockMedia({ kind: "video", durationMs: 4000, width: 1280, height: 720, frameRate: 30 }));
    h.fs.createFile("/audio/score.mp3", encodeMockMedia({ kind: "audio", durationMs: 12000, sampleRate: 48000 }));
    const importVideo = await h.mediaModel.importMedia("/footage/a.mp4");
    expect(importVideo.success).toBe(true);
    if (!importVideo.success) return;
    const importAudio = await h.mediaModel.importMedia("/audio/score.mp3");
    expect(importAudio.success).toBe(true);
    if (!importAudio.success) return;

    // 3. Re-entering the Media Room announces the refreshed library.
    expect(h.navigation.navigateTo("project").success).toBe(true);
    expect(h.navigation.navigateTo("media").success).toBe(true);
    expect(h.announcement.getLast()?.textEn).toContain("2 media assets");

    // 4. The imported assets belong to the open project.
    expect(h.store.getCurrentProject()?.media).toHaveLength(2);

    // 5. Build a timeline clip from the media imported through the Media Room.
    const project = h.store.getCurrentProject()!;
    const track = h.txn.run(project, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
    if (!track.success) throw new Error("track failed");
    const trackId = track.value.newState.tracks[0]!.id;
    const withClip = h.txn.run(track.value.newState, "clip", "seed", s =>
      insertClip(s, importVideo.value.id, trackId, tv(0), tv(0), tv(2000)));
    if (!withClip.success) throw new Error("clip failed");
    expect(h.store.updateProject(withClip.value.newState).success).toBe(true);

    // 6. Edit the clip in the Timeline Room: split and undo.
    expect(h.navigation.navigateTo("timeline").success).toBe(true);
    h.timelineModel.setPlayheadMs(1000);
    expect(h.timelineModel.splitClipAtPlayhead().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
    expect(h.timelineModel.undo().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(1);

    // 7. Media guards: unused audio is removable; the video in use is not.
    const removeAudio = await h.mediaModel.removeMedia(importAudio.value.id);
    expect(removeAudio.success).toBe(true);
    const removeVideo = await h.mediaModel.removeMedia(importVideo.value.id);
    expect(removeVideo.success).toBe(false);
    if (!removeVideo.success) expect(removeVideo.error).toBe(ErrorCode.MEDIA_IN_USE);
    expect(h.store.getCurrentProject()?.media.map(m => m.id)).toEqual([importVideo.value.id]);
  });

  it("handles media failures and navigation errors without corrupting the project", async () => {
    const h = build();

    // 1. Import without a project is rejected with a clear announcement.
    expect(h.navigation.navigateTo("media").success).toBe(true);
    const noProject = await h.mediaModel.importMedia("/whatever.mp4");
    expect(noProject.success).toBe(false);
    if (!noProject.success) expect(noProject.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(h.announcement.getLast()?.textEn).toContain("No project is open");

    // 2. Open a project and feed the Media Room unsupported and missing files.
    expect(h.store.createProject("Fragile").success).toBe(true);
    h.fs.createFile("/junk.bin", new TextEncoder().encode("not media"));
    const unsupported = await h.mediaModel.importMedia("/junk.bin");
    expect(unsupported.success).toBe(false);
    if (!unsupported.success) expect(unsupported.error).toBe(ErrorCode.UNSUPPORTED_FORMAT);
    const missing = await h.mediaModel.importMedia("/missing.mp4");
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error).toBe(ErrorCode.FILE_NOT_FOUND);

    // 3. Removing an unknown asset fails cleanly.
    const unknown = await h.mediaModel.removeMedia("nope" as never);
    expect(unknown.success).toBe(false);

    // 4. Navigation to an unregistered room fails and keeps the current room.
    const bad = h.navigation.navigateTo("settings");
    expect(bad.success).toBe(false);
    expect(h.navigation.getCurrentRoomId()).toBe("media");

    // 5. The project survives every failed operation unchanged.
    expect(h.store.getCurrentProject()?.media).toHaveLength(0);
    expect(h.store.isDirty()).toBe(true);
    expect(h.announcement.getLast()?.textEn).not.toContain("Media removed");
  });

  it("drives the editor through the unified command system and palette", () => {
    const h = build();
    const system = new CommandSystem(() => h.navigation.getCurrentRoomId());
    const okResult = { success: true as const, value: undefined };

    system.register({
      id: "new-project", labelAr: "مشروع جديد", labelEn: "New project",
      shortcut: "Ctrl+N", scope: "global", category: "Project",
      description: "Creates a new project",
      handler: () => {
        const created = h.store.createProject("Palette Film");
        return created.success ? okResult : { success: false, error: created.error };
      },
    });
    system.register({
      id: "go-project", labelAr: "مشروع", labelEn: "Project room",
      shortcut: "Ctrl+1", scope: "global", category: "Navigation",
      description: "Go to the project room",
      handler: () => (h.navigation.navigateTo("project").success ? okResult : { success: false as const, error: ErrorCode.OPERATION_FAILED }),
    });
    system.register({
      id: "go-timeline", labelAr: "الخط الزمني", labelEn: "Timeline room",
      shortcut: "Ctrl+2", scope: "global", category: "Navigation",
      description: "Go to the timeline room",
      handler: () => (h.navigation.navigateTo("timeline").success ? okResult : { success: false as const, error: ErrorCode.OPERATION_FAILED }),
    });
    system.register({
      id: "split", labelAr: "قص", labelEn: "Split at playhead",
      shortcut: "S", scope: "timeline", category: "Editing",
      description: "Split the clip at the playhead",
      handler: () => h.timelineModel.splitClipAtPlayhead(),
    });

    // 1. Global commands dispatch from anywhere, even with no room active.
    expect(system.dispatchByShortcut("Ctrl+N").success).toBe(true);
    expect(h.store.getCurrentProject()?.metadata.name).toBe("Palette Film");
    expect(h.announcement.getLast()?.textEn).toContain("Created new project");
    expect(system.dispatchByShortcut("Ctrl+1").success).toBe(true);
    expect(h.navigation.getCurrentRoomId()).toBe("project");

    // 2. Room-scoped commands are blocked outside their room.
    const blocked = system.dispatchByShortcut("S");
    expect(blocked.success).toBe(false);
    if (!blocked.success) expect(blocked.error).toBe(ErrorCode.INVALID_INPUT);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(0);

    // 3. Shortcut aliases and casing are normalized.
    expect(system.getByShortcut("ctrl+n")?.id).toBe("new-project");

    // 4. Seed content, then navigate by shortcut and split in the timeline room.
    seedContent(h);
    expect(system.dispatchByShortcut("Ctrl+2").success).toBe(true);
    expect(h.navigation.getCurrentRoomId()).toBe("timeline");
    expect(h.announcement.getLast()?.textEn).toContain("Entered Timeline Room");
    h.timelineModel.setPlayheadMs(500);
    expect(system.dispatchByShortcut("s").success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(3);

    // 5. The palette searches by Arabic label and dispatches the highlighted item.
    const palette = new CommandPalette(system);
    palette.setQuery("قص");
    expect(palette.getCurrentItem()?.id).toBe("split");
    h.timelineModel.setPlayheadMs(250);
    expect(palette.selectCurrent().success).toBe(true);
    expect(h.store.getCurrentProject()?.clips).toHaveLength(4);

    // 6. Unknown shortcuts fail cleanly.
    const unknown = system.dispatchByShortcut("Ctrl+F9");
    expect(unknown.success).toBe(false);
    if (!unknown.success) expect(unknown.error).toBe(ErrorCode.INVALID_INPUT);
  });
});
