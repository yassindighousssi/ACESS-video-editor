import { projectId, timeValueFromMs, EntityId } from "../types";
import { createProject, createMediaAsset, createTrack } from "../factory";
import { Project } from "../entities";
import { TransactionEngine } from "../transaction";
import {
  insertClip, splitClip, mergeClips, moveClip, deleteClip, createTrack as transitionCreateTrack,
  deleteTrack, reorderTrack, importMedia, addTransition, addMarker,
} from "../transitions";
import { ModelError } from "../types";

const ticks = (ms: number) => ({ ticks: timeValueFromMs(ms).ticks });

interface Fixture { project: Project; mediaId: EntityId; trackId: EntityId }

function freshProject(): Fixture {
  const pid = projectId();
  const project = createProject("Cycle", pid);
  const media = createMediaAsset(pid, "src.mp4", "h", "video", 60000);
  project.media.push(media);
  const track = createTrack(pid, "V1", "video", 0);
  project.tracks.push(track);
  return { project, mediaId: media.id, trackId: track.id };
}

function run(engine: TransactionEngine, state: Project, op: string, fn: (s: Project) => ReturnType<typeof insertClip>): Project {
  const result = engine.run(state, op, "Model", fn);
  if (!result.success) throw new Error(`failed to run ${op}`);
  return result.value.newState;
}

function undo(engine: TransactionEngine, state: Project): Project {
  const result = engine.undo(state);
  if (!result.success) throw new Error("failed to undo");
  return result.value.newState;
}

function redo(engine: TransactionEngine, state: Project): Project {
  const result = engine.redo(state);
  if (!result.success) throw new Error("failed to redo");
  return result.value.newState;
}

describe("undo/redo cycles for every transition", () => {
  let engine: TransactionEngine;

  beforeEach(() => {
    engine = new TransactionEngine();
  });

  it("insertClip → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insert", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
    expect(state.clips.length).toBe(1);
    const originalId = state.clips[0]!.id;
    state = undo(engine, state);
    expect(state.clips.length).toBe(0);
    state = redo(engine, state);
    expect(state.clips.length).toBe(1);
    expect(state.clips[0]!.id).toBe(originalId);
  });

  it("splitClip → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insert", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(4000)));
    const clipId = state.clips[0]!.id;
    state = run(engine, state, "split", s => splitClip(s, clipId, ticks(2000)));
    expect(state.clips.length).toBe(2);
    state = undo(engine, state);
    expect(state.clips.length).toBe(1);
    expect(state.clips[0]!.id).toBe(clipId);
    expect(state.clips[0]!.duration.ticks.toString()).toBe("4000000000");
    state = redo(engine, state);
    expect(state.clips.length).toBe(2);
  });

  it("mergeClips → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insertA", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(2000)));
    const idA = state.clips.find(c => c.timelineIn.ticks === BigInt(0))!.id;
    state = run(engine, state, "insertB", s => insertClip(s, mediaId, trackId, ticks(2000), ticks(0), ticks(2000)));
    const idB = state.clips.find(c => c.id !== idA)!.id;
    state = run(engine, state, "merge", s => mergeClips(s, idA, idB));
    expect(state.clips.length).toBe(1);
    state = undo(engine, state);
    expect(state.clips.length).toBe(2);
    expect(state.clips.some(c => c.id === idA)).toBe(true);
    expect(state.clips.some(c => c.id === idB)).toBe(true);
    state = redo(engine, state);
    expect(state.clips.length).toBe(1);
  });

  it("moveClip → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insert", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
    const clipId = state.clips[0]!.id;
    state = run(engine, state, "createTrack", s => transitionCreateTrack(s, "V2", "video"));
    const trackB = state.tracks[1]!.id;
    state = run(engine, state, "move", s => moveClip(s, clipId, trackB, ticks(0)));
    expect(state.tracks[0]!.clips.length).toBe(0);
    expect(state.tracks[1]!.clips.length).toBe(1);
    state = undo(engine, state);
    expect(state.tracks[0]!.clips.length).toBe(1);
    state = redo(engine, state);
    expect(state.tracks[1]!.clips.length).toBe(1);
  });

  it("deleteClip → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insert", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
    const clipId = state.clips[0]!.id;
    state = run(engine, state, "delete", s => deleteClip(s, clipId));
    expect(state.clips.length).toBe(0);
    state = undo(engine, state);
    expect(state.clips.length).toBe(1);
    expect(state.clips[0]!.id).toBe(clipId);
    const contains = state.relationships.some(r => r.type === "contains" && r.to === clipId);
    expect(contains).toBe(true);
    state = redo(engine, state);
    expect(state.clips.length).toBe(0);
  });

  it("createTrack → undo → redo", () => {
    const { project } = freshProject();
    let state = run(engine, project, "createTrack", s => transitionCreateTrack(s, "A1", "audio"));
    expect(state.tracks.length).toBe(2);
    const trackId = state.tracks[1]!.id;
    state = undo(engine, state);
    expect(state.tracks.length).toBe(1);
    state = redo(engine, state);
    expect(state.tracks.length).toBe(2);
    expect(state.tracks[1]!.id).toBe(trackId);
  });

  it("deleteTrack → undo → redo", () => {
    const { project } = freshProject();
    let state = run(engine, project, "createTrack", s => transitionCreateTrack(s, "A1", "audio"));
    const trackId = state.tracks[1]!.id;
    state = run(engine, state, "deleteTrack", s => deleteTrack(s, trackId));
    expect(state.tracks.length).toBe(1);
    state = undo(engine, state);
    expect(state.tracks.length).toBe(2);
    expect(state.tracks.some(t => t.id === trackId)).toBe(true);
    state = redo(engine, state);
    expect(state.tracks.length).toBe(1);
  });

  it("reorderTrack → undo → redo", () => {
    const { project } = freshProject();
    let state = run(engine, project, "createA", s => transitionCreateTrack(s, "A1", "audio"));
    state = run(engine, state, "createB", s => transitionCreateTrack(s, "A2", "audio"));
    const first = state.tracks[0]!.id;
    const second = state.tracks[1]!.id;
    state = run(engine, state, "reorder", s => reorderTrack(s, second, 0));
    expect(state.tracks[0]!.id).toBe(second);
    state = undo(engine, state);
    expect(state.tracks[0]!.id).toBe(first);
    state = redo(engine, state);
    expect(state.tracks[0]!.id).toBe(second);
  });

  it("importMedia → undo → redo", () => {
    const { project } = freshProject();
    let state = run(engine, project, "import", s => importMedia(s, "/m.mp4", "audio", 5000));
    expect(state.media.length).toBe(2);
    state = undo(engine, state);
    expect(state.media.length).toBe(1);
    state = redo(engine, state);
    expect(state.media.length).toBe(2);
  });

  it("addTransition → undo → redo", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insertA", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(2000)));
    const idA = state.clips.find(c => c.timelineIn.ticks === BigInt(0))!.id;
    state = run(engine, state, "insertB", s => insertClip(s, mediaId, trackId, ticks(2000), ticks(0), ticks(2000)));
    const idB = state.clips.find(c => c.id !== idA)!.id;
    state = run(engine, state, "transition", s => addTransition(s, idA, idB, "fade", 500));
    expect(state.relationships.filter(r => r.type === "depends_on").length).toBe(2);
    state = undo(engine, state);
    expect(state.relationships.filter(r => r.type === "depends_on").length).toBe(0);
    state = redo(engine, state);
    expect(state.relationships.filter(r => r.type === "depends_on").length).toBe(2);
  });

  it("addMarker → undo → redo", () => {
    const { project } = freshProject();
    let state = run(engine, project, "marker", s => addMarker(s, "Intro", 1500));
    expect(state.markers.length).toBe(1);
    state = undo(engine, state);
    expect(state.markers.length).toBe(0);
    state = redo(engine, state);
    expect(state.markers.length).toBe(1);
  });

  it("should still redo after new transaction clears redo stack", () => {
    const { project, mediaId, trackId } = freshProject();
    let state = run(engine, project, "insert", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(1000)));
    state = undo(engine, state);
    expect(engine.getRedoCount(state)).toBe(1);
    state = run(engine, state, "insert2", s => insertClip(s, mediaId, trackId, ticks(0), ticks(0), ticks(500)));
    expect(engine.getRedoCount(state)).toBe(0);
    const result = engine.redo(state);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.OPERATION_FAILED);
  });
});
