import { ProjectRoomModel } from "./project-room.model";
import { createTestRoomContext } from "../common/mocks";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { ErrorCode } from "../../infrastructure/common/types";
import { AppEvent } from "../common/event-bus";
import { projectId, timeValueFromMs } from "../../model/types";
import { createProject, createMediaAsset, createTrack } from "../../model/factory";
import { insertClip, importMedia, createTrack as transitionCreateTrack } from "../../model/transitions";
import { TransactionEngine } from "../../model/transaction";
import { serializeProjectToBytes } from "../../model/project-file";

function makeProjectFile(project: ReturnType<typeof createProject>): Uint8Array {
  const serialized = serializeProjectToBytes(project);
  if (!serialized.success) throw new Error("serialize failed");
  return serialized.value;
}

function harness() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const model = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  return { ...h, model };
}

async function loadSettings(h: ReturnType<typeof harness>) {
  await h.settings.load();
}

describe("ProjectRoomModel", () => {
  describe("createProject", () => {
    it("should create and set the current project", () => {
      const h = harness();
      const result = h.model.createProject("  My Film  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.metadata.name).toBe("My Film");
      }
      const state = h.model.getState();
      expect(state.currentProject?.metadata.name).toBe("My Film");
      expect(state.isDirty).toBe(true);
      expect(h.announcement.getLast()?.textEn).toContain("Created new project");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_CREATED)).toBe(true);
    });

    it("should reject an empty name", () => {
      const h = harness();
      const result = h.model.createProject("   ");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("loadProject", () => {
    it("should return FILE_NOT_FOUND for a missing file", async () => {
      const h = harness();
      const result = await h.model.loadProject("missing.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
    });

    it("should load a serialized project", async () => {
      const h = harness();
      const pid = projectId();
      const project = createProject("Loaded", pid);
      project.media.push(createMediaAsset(pid, "/a.mp4", "h", "video", 1000));
      h.fs.createFile("proj.tprj", makeProjectFile(project));
      const result = await h.model.loadProject("proj.tprj");
      expect(result.success).toBe(true);
      expect(h.model.getCurrentProjectPath()).toBe("proj.tprj");
      expect(h.model.isDirty()).toBe(false);
      expect(h.model.getRecentProjects()[0]?.name).toBe("Loaded");
      expect(h.announcement.getLast()?.textEn).toContain("Opened project");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_OPENED)).toBe(true);
    });

    it("should return CORRUPT_FILE for invalid content", async () => {
      const h = harness();
      h.fs.createFile("bad.tprj", new TextEncoder().encode("{ nope"));
      const result = await h.model.loadProject("bad.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
    });
  });

  describe("saveProject", () => {
    it("should fail when no project is open", async () => {
      const h = harness();
      const result = await h.model.saveProject("x.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("should fail when no path is available", async () => {
      const h = harness();
      h.model.createProject("NoPath");
      const result = await h.model.saveProject();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_PATH);
    });

    it("should save to the given path", async () => {
      const h = harness();
      await loadSettings(h);
      h.model.createProject("SaveMe");
      const result = await h.model.saveProject("out.tprj");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value).toBe("out.tprj");
      expect(h.fs.exists("out.tprj")).toBe(true);
      expect(h.model.getCurrentProjectPath()).toBe("out.tprj");
      expect(h.model.isDirty()).toBe(false);
      expect(h.announcement.getLast()?.textEn).toBe("Project saved");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_SAVED)).toBe(true);
    });

    it("should save to the current path when no path given", async () => {
      const h = harness();
      const pid = projectId();
      const project = createProject("RoundTrip", pid);
      h.fs.createFile("rt.tprj", makeProjectFile(project));
      await h.model.loadProject("rt.tprj");
      h.model.updateProject({ ...project, metadata: { ...project.metadata, name: "Renamed" } });
      const result = await h.model.saveProject();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value).toBe("rt.tprj");
      const read = h.fs.readFile("rt.tprj");
      expect(read.success).toBe(true);
      if (read.success) {
        const parsed = JSON.parse(new TextDecoder().decode(read.data));
        expect(parsed.project.metadata.name).toBe("Renamed");
      }
    });

    it("should propagate write errors", async () => {
      const h = harness();
      h.model.createProject("DiskFull");
      h.fs.simulateWriteError("out.tprj");
      const result = await h.model.saveProject("out.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
    });
  });

  describe("exportProject", () => {
    it("should reject export when there are no video tracks", async () => {
      const h = harness();
      h.model.createProject("Empty");
      const result = await h.model.exportProject("out.json");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.NO_VIDEO_TRACKS);
      expect(h.announcement.getLast()?.level).toBe("critical_only");
    });

    it("should reject export when no project is open", async () => {
      const h = harness();
      const result = await h.model.exportProject("out.json");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("should propagate write errors during export", async () => {
      const h = harness();
      h.model.createProject("ExportMe");
      const txn = new TransactionEngine();
      const seed = buildSeededProject(h.model.getCurrentProject()!, txn);
      h.model.updateProject(seed);
      h.fs.simulateWriteError("out.json");
      const result = await h.model.exportProject("out.json");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
    });

    it("should export a manifest when the project has content", async () => {
      const h = harness();
      h.model.createProject("ExportMe");
      const txn = new TransactionEngine();
      const seed = buildSeededProject(h.model.getCurrentProject()!, txn);
      h.model.updateProject(seed);
      const result = await h.model.exportProject("out.json");
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value).toBe("out.json");
      expect(h.fs.exists("out.json")).toBe(true);
      expect(h.announcement.getLast()?.textEn).toContain("Project exported");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_EXPORTED)).toBe(true);
    });
  });

  describe("restoreBackup / closeProject", () => {
    it("should restore a backup project", async () => {
      const h = harness();
      const pid = projectId();
      const project = createProject("Backup", pid);
      h.fs.createFile("backup.tprj", makeProjectFile(project));
      const result = await h.model.restoreBackup("backup.tprj");
      expect(result.success).toBe(true);
      expect(h.model.getCurrentProject()?.metadata.name).toBe("Backup");
      expect(h.model.isDirty()).toBe(true);
      expect(h.announcement.getLast()?.textEn).toContain("Restored backup");
    });

    it("should reject restoring a missing backup file", async () => {
      const h = harness();
      const result = await h.model.restoreBackup("missing.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
    });

    it("should reject restoring a corrupt backup file", async () => {
      const h = harness();
      h.fs.createFile("corrupt.tprj", new TextEncoder().encode("nope"));
      const result = await h.model.restoreBackup("corrupt.tprj");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
    });

    it("should close the project", async () => {
      const h = harness();
      h.model.createProject("Temp");
      h.model.closeProject();
      expect(h.model.getCurrentProject()).toBeNull();
      expect(h.model.getCurrentProjectPath()).toBeNull();
      expect(h.model.isDirty()).toBe(false);
      expect(h.announcement.getLast()?.textEn).toBe("Project closed");
      expect(h.eventBus.getEventLog().some(e => e.event === AppEvent.PROJECT_CLOSED)).toBe(true);
    });
  });

  describe("updateProject", () => {
    it("should reject updates for a different project", async () => {
      const h = harness();
      h.model.createProject("A");
      const other = createProject("B", projectId());
      const result = h.model.updateProject(other);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("should accept updates for the current project and mark dirty", async () => {
      const h = harness();
      h.model.createProject("A");
      const current = h.model.getCurrentProject()!;
      const result = h.model.updateProject({ ...current, metadata: { ...current.metadata, name: "A2" } });
      expect(result.success).toBe(true);
      expect(h.model.getCurrentProject()?.metadata.name).toBe("A2");
      expect(h.model.isDirty()).toBe(true);
    });

    it("should update the current path when one is supplied", async () => {
      const h = harness();
      h.model.createProject("A");
      const current = h.model.getCurrentProject()!;
      const result = h.model.updateProject({ ...current, metadata: { ...current.metadata, name: "A3" } }, "renamed.tprj");
      expect(result.success).toBe(true);
      expect(h.model.getCurrentProjectPath()).toBe("renamed.tprj");
    });
  });

  describe("getStats", () => {
    it("should compute project statistics", async () => {
      const h = harness();
      h.model.createProject("Stats");
      const seeded = buildSeededProject(h.model.getCurrentProject()!, new TransactionEngine());
      h.model.updateProject(seeded);
      const stats = h.model.getStats(seeded);
      expect(stats.name).toBe("Stats");
      expect(stats.mediaCount).toBe(2);
      expect(stats.trackCount).toBe(1);
      expect(stats.clipCount).toBe(2);
      expect(stats.effectCount).toBe(0);
      expect(stats.durationMs).toBe(4000);
    });

    it("should skip clip references that resolve to nothing", async () => {
      const h = harness();
      h.model.createProject("Orphan");
      const project = h.model.getCurrentProject()!;
      project.tracks.push(createTrack(project.id, "V1", "video", 0));
      project.tracks[0]!.clips.push("missing-clip-id" as never);
      const stats = h.model.getStats(project);
      expect(stats.trackCount).toBe(1);
      expect(stats.clipCount).toBe(0);
      expect(stats.durationMs).toBe(0);
    });
  });

  describe("recent projects", () => {
    it("should deduplicate and cap recent projects", async () => {
      const h = harness();
      for (let i = 0; i < 7; i++) {
        const pid = projectId();
        const project = createProject(`P${i}`, pid);
        h.fs.createFile(`p${i}.tprj`, makeProjectFile(project));
        await h.model.loadProject(`p${i}.tprj`);
      }
      const recent = h.model.getRecentProjects();
      expect(recent).toHaveLength(5);
      expect(recent[0]?.name).toBe("P6");
      await h.model.loadProject("p3.tprj");
      expect(h.model.getRecentProjects()[0]?.name).toBe("P3");
      expect(h.model.getRecentProjects().filter(r => r.name === "P3")).toHaveLength(1);
    });
  });
});

function buildSeededProject(project: ReturnType<typeof createProject>, txn: TransactionEngine) {
  const step1 = txn.run(project, "import", "seed", s => importMedia(s, "/a.mp4", "video", 2000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = txn.run(step1.value.newState, "import", "seed", s => importMedia(s, "/b.mp4", "video", 3000, "h2"));
  if (!step2.success) throw new Error("seed import failed");
  const step3 = txn.run(step2.value.newState, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
  if (!step3.success) throw new Error("seed track failed");
  const mediaA = step3.value.newState.media[0]!.id;
  const mediaB = step3.value.newState.media[1]!.id;
  const track = step3.value.newState.tracks[0]!.id;
  const step4 = txn.run(step3.value.newState, "clip", "seed", s => insertClip(s, mediaA, track, { ticks: timeValueFromMs(0).ticks }, { ticks: timeValueFromMs(0).ticks }, { ticks: timeValueFromMs(1000).ticks }));
  if (!step4.success) throw new Error("seed clip failed");
  const step5 = txn.run(step4.value.newState, "clip", "seed", s => insertClip(s, mediaB, track, { ticks: timeValueFromMs(1000).ticks }, { ticks: timeValueFromMs(0).ticks }, { ticks: timeValueFromMs(3000).ticks }));
  if (!step5.success) throw new Error("seed clip failed");
  return step5.value.newState;
}
