import { projectId, timeValueFromMs, timeValueToMs, EntityId } from "../types";
import { createProject, createMediaAsset, createTrack, createClip } from "../factory";
import { Project } from "../entities";
import { TransactionEngine } from "../transaction";
import { insertClip, importMedia, createTrack as transitionCreateTrack, deleteClip, splitClip } from "../transitions";

const ticks = (ms: number) => ({ ticks: timeValueFromMs(ms).ticks });

function freshProject(): { project: Project; mediaId: EntityId; trackId: EntityId } {
  const pid = projectId();
  const project = createProject("Txn", pid);
  const media = createMediaAsset(pid, "src.mp4", "h", "video", 60000);
  project.media.push(media);
  const track = createTrack(pid, "V1", "video", 0);
  project.tracks.push(track);
  return { project, mediaId: media.id, trackId: track.id };
}

describe("TransactionEngine", () => {
  let engine: TransactionEngine;

  beforeEach(() => {
    engine = new TransactionEngine();
  });

  describe("run", () => {
    it("should run a successful transaction", () => {
      const { project, mediaId, trackId } = freshProject();
      const result = engine.run(project, "insert_clip", "Model", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.newState.clips.length).toBe(1);
        expect(result.value.entry.operation).toBe("insert_clip");
        expect(result.value.entry.success).toBe(true);
        expect(result.value.entry.stateHashBefore).not.toBe(result.value.entry.stateHashAfter);
        expect(engine.getUndoCount(result.value.newState)).toBe(1);
      }
    });

    it("should not record failed transactions", () => {
      const { project, trackId } = freshProject();
      const result = engine.run(project, "insert_bad", "Model", s => insertClip(s, "ghost" as never, trackId, ticks(0), ticks(0), ticks(100)));
      expect(result.success).toBe(false);
      expect(engine.getUndoCount(project)).toBe(0);
    });

    it("should reject nested transactions while one is running", () => {
      const { project, mediaId, trackId } = freshProject();
      let nestedSuccess: boolean | null = null;
      const result = engine.run(project, "outer", "Model", s => {
        const nested = engine.run(s, "nested", "Model", ss => insertClip(ss, mediaId, trackId, ticks(0), ticks(0), ticks(500)));
        nestedSuccess = nested.success;
        return insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(500));
      });
      expect(result.success).toBe(true);
      expect(nestedSuccess).toBe(false);
    });
  });

  describe("undo", () => {
    it("should undo insert clip", () => {
      const { project, mediaId, trackId } = freshProject();
      const run = engine.run(project, "insert_clip", "Model", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
      if (!run.success) return;
      const undone = engine.undo(run.value.newState);
      expect(undone.success).toBe(true);
      if (undone.success) {
        expect(undone.value.newState.clips.length).toBe(0);
        expect(engine.getUndoCount(undone.value.newState)).toBe(0);
        expect(engine.getRedoCount(undone.value.newState)).toBe(1);
      }
    });

    it("should undo import media", () => {
      const { project } = freshProject();
      const run = engine.run(project, "import", "Model", s => importMedia(s, "/m.mp4", "audio", 5000));
      if (!run.success) return;
      const undone = engine.undo(run.value.newState);
      expect(undone.success).toBe(true);
      if (undone.success) {
        expect(undone.value.newState.media.length).toBe(1);
      }
    });

    it("should report failure when nothing to undo", () => {
      const { project } = freshProject();
      const result = engine.undo(project);
      expect(result.success).toBe(false);
    });

    it("should report failure when the inverse event cannot be applied", () => {
      const { project, mediaId, trackId } = freshProject();
      const run = engine.run(project, "insert_clip", "Model", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
      if (!run.success) return;
      const broken: Project = {
        ...run.value.newState,
        journal: {
          ...run.value.newState.journal,
          undoStack: [{ ...run.value.entry, inverseEvent: { type: "unknownInverse", payload: {} } }],
        },
      };
      const result = engine.undo(broken);
      expect(result.success).toBe(false);
    });
  });

  describe("redo", () => {
    it("should redo after undo", () => {
      const { project, mediaId, trackId } = freshProject();
      const run = engine.run(project, "insert_clip", "Model", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
      if (!run.success) return;
      const undone = engine.undo(run.value.newState);
      if (!undone.success) return;
      const redone = engine.redo(undone.value.newState);
      expect(redone.success).toBe(true);
      if (redone.success) {
        expect(redone.value.newState.clips.length).toBe(1);
        expect(engine.getUndoCount(redone.value.newState)).toBe(1);
        expect(engine.getRedoCount(redone.value.newState)).toBe(0);
      }
    });

    it("should report failure when nothing to redo", () => {
      const { project } = freshProject();
      const result = engine.redo(project);
      expect(result.success).toBe(false);
    });

    it("should report failure when the forward event cannot be reapplied", () => {
      const { project, mediaId, trackId } = freshProject();
      const run = engine.run(project, "insert_clip", "Model", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
      if (!run.success) return;
      const broken: Project = {
        ...run.value.newState,
        journal: {
          ...run.value.newState.journal,
          undoStack: [],
          redoStack: [{ ...run.value.entry, forwardEvent: { type: "unknownForward", payload: {} } }],
        },
      };
      const result = engine.redo(broken);
      expect(result.success).toBe(false);
    });
  });

  describe("synthetic stress project", () => {
    it("should create 100 clips and undo them all", () => {
      const { project, mediaId, trackId } = freshProject();
      let state = project;
      const inserted: string[] = [];
      for (let i = 0; i < 100; i++) {
        const tlIn = i * 1000;
        const run = engine.run(state, `insert_${i}`, "Model", s =>
          insertClip(s, mediaId, trackId, ticks(tlIn), ticks(0), ticks(1000)),
        );
        if (!run.success) throw new Error("failed to insert");
        state = run.value.newState;
        inserted.push(run.value.newState.clips[run.value.newState.clips.length - 1]!.id);
      }
      expect(state.clips.length).toBe(100);
      expect(state.tracks[0]!.clips.length).toBe(100);

      while (engine.getUndoCount(state) > 0) {
        const undone = engine.undo(state);
        if (!undone.success) throw new Error("failed to undo");
        state = undone.value.newState;
      }
      expect(state.clips.length).toBe(0);
      expect(state.tracks[0]!.clips.length).toBe(0);
    });

    it("should redo all after undo-all", () => {
      const { project, mediaId, trackId } = freshProject();
      let state = project;
      for (let i = 0; i < 20; i++) {
        const run = engine.run(state, `insert_${i}`, "Model", s =>
          insertClip(s, mediaId, trackId, ticks(i * 500), ticks(0), ticks(500)),
        );
        if (!run.success) throw new Error("failed to insert");
        state = run.value.newState;
      }
      while (engine.getUndoCount(state) > 0) {
        const undone = engine.undo(state);
        if (!undone.success) throw new Error("failed to undo");
        state = undone.value.newState;
      }
      expect(state.clips.length).toBe(0);
      while (engine.getRedoCount(state) > 0) {
        const redone = engine.redo(state);
        if (!redone.success) throw new Error("failed to redo");
        state = redone.value.newState;
      }
      expect(state.clips.length).toBe(20);
      expect(state.tracks[0]!.clips.length).toBe(20);
    });

    it("should maintain data consistency across mixed edits", () => {
      const { project, mediaId, trackId } = freshProject();
      let state = project;
      for (let i = 0; i < 30; i++) {
        const run = engine.run(state, `edit_${i}`, "Model", s =>
          insertClip(s, mediaId, trackId, ticks(i * 1000), ticks(0), ticks(1000)),
        );
        if (!run.success) throw new Error("failed to insert");
        state = run.value.newState;
      }
      const firstClip = state.clips[0]!;
      const split = engine.run(state, "split_0", "Model", s => splitClip(s, firstClip.id, ticks(500)));
      if (!split.success) throw new Error("failed to split");
      state = split.value.newState;
      expect(state.clips.length).toBe(31);

      const del = engine.run(state, "delete_last", "Model", s => deleteClip(s, state.clips[state.clips.length - 1]!.id));
      if (!del.success) throw new Error("failed to delete");
      state = del.value.newState;
      expect(state.clips.length).toBe(30);

      const undoAll = engine.undo(state);
      if (!undoAll.success) throw new Error("failed to undo");
      state = undoAll.value.newState;
      expect(state.clips.length).toBe(31);

      for (const clip of state.clips) {
        expect(timeValueToMs(clip.duration)).toBeGreaterThan(0);
        expect(timeValueToMs(clip.timelineIn)).toBeGreaterThanOrEqual(0);
      }
    });

    it("should create and manage multiple tracks", () => {
      const { project, mediaId, trackId } = freshProject();
      let state = project;
      const trackRun = engine.run(state, "create_track", "Model", s => transitionCreateTrack(s, "A1", "audio"));
      if (!trackRun.success) throw new Error("failed to create track");
      state = trackRun.value.newState;
      const audioTrackId = state.tracks[1]!.id;
      expect(state.tracks.length).toBe(2);

      for (let i = 0; i < 10; i++) {
        const run = engine.run(state, `insert_audio_${i}`, "Model", s =>
          insertClip(s, mediaId, audioTrackId, ticks(i * 1000), ticks(0), ticks(1000)),
        );
        if (!run.success) throw new Error("failed to insert audio clip");
        state = run.value.newState;
      }
      expect(state.tracks[1]!.clips.length).toBe(10);

      const undone = engine.undo(state);
      if (!undone.success) throw new Error("failed to undo");
      state = undone.value.newState;
      expect(state.tracks[1]!.clips.length).toBe(9);
    });
  });

  describe("journal integrity", () => {
    it("should append journal entries for every transaction", () => {
      const { project, mediaId, trackId } = freshProject();
      let state = project;
      for (let i = 0; i < 5; i++) {
        const run = engine.run(state, `op_${i}`, "Model", s =>
          insertClip(s, mediaId, trackId, ticks(i * 1000), ticks(0), ticks(500)),
        );
        if (!run.success) throw new Error("failed to run");
        state = run.value.newState;
      }
      expect(state.journal.entries.length).toBe(5);
      for (const entry of state.journal.entries) {
        expect(entry.id).toBeTruthy();
        expect(entry.engine).toBe("Model");
        expect(entry.success).toBe(true);
        expect(entry.stateHashBefore).toHaveLength(64);
        expect(entry.stateHashAfter).toHaveLength(64);
      }
    });
  });
});
