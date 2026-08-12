import { TimelineRoomModel } from "./timeline-room.model";
import { ProjectRoomModel } from "../project/project-room.model";
import { createTestRoomContext } from "../common/mocks";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { ErrorCode } from "../../infrastructure/common/types";
import { TransactionEngine } from "../../model/transaction";
import { timeValueFromMs, EntityId } from "../../model/types";
import { insertClip, importMedia, createTrack as transitionCreateTrack, deleteClip as transitionDeleteClip } from "../../model/transitions";

function harness() {
  const fs = new MockFileSystem();
  const h = createTestRoomContext(fs);
  const store = new ProjectRoomModel(h.file, h.eventBus, h.announcement, h.settings);
  const txn = new TransactionEngine();
  const timeline = new TimelineRoomModel(store, h.eventBus, h.announcement, txn);
  return { ...h, fs, store, txn, timeline };
}

type Harness = ReturnType<typeof harness>;

function seedTwoMedia(h: Harness) {
  h.store.createProject("Timeline");
  const base = h.store.getCurrentProject()!;
  const step1 = h.txn.run(base, "import", "seed", s => importMedia(s, "/a.mp4", "video", 2000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = h.txn.run(step1.value.newState, "import", "seed", s => importMedia(s, "/b.mp4", "video", 3000, "h2"));
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
  return step5.value.newState;
}

function seedSameMedia(h: Harness) {
  h.store.createProject("Timeline");
  const base = h.store.getCurrentProject()!;
  const step1 = h.txn.run(base, "import", "seed", s => importMedia(s, "/a.mp4", "video", 3000, "h1"));
  if (!step1.success) throw new Error("seed import failed");
  const step2 = h.txn.run(step1.value.newState, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
  if (!step2.success) throw new Error("seed track failed");
  const media = step2.value.newState.media[0]!.id;
  const track = step2.value.newState.tracks[0]!.id;
  const step3 = h.txn.run(step2.value.newState, "clip", "seed", s => insertClip(s, media, track, tv(0), tv(0), tv(1000)));
  if (!step3.success) throw new Error("seed clip failed");
  const step4 = h.txn.run(step3.value.newState, "clip", "seed", s => insertClip(s, media, track, tv(1000), tv(0), tv(2000)));
  if (!step4.success) throw new Error("seed clip failed");
  const update = h.store.updateProject(step4.value.newState);
  if (!update.success) throw new Error("update failed");
  return step4.value.newState;
}

function tv(ms: number) {
  return { ticks: timeValueFromMs(ms).ticks };
}

describe("TimelineRoomModel", () => {
  describe("initial state", () => {
    it("should report no project by default", () => {
      const h = harness();
      const state = h.timeline.getState();
      expect(state.hasProject).toBe(false);
      expect(state.playheadMs).toBe(0);
      expect(state.selection).toHaveLength(0);
      expect(state.clipboardCount).toBe(0);
      expect(state.clipboardMode).toBeNull();
      expect(state.activeTrackId).toBeNull();
      expect(state.undoCount).toBe(0);
      expect(state.redoCount).toBe(0);
    });
  });

  describe("playhead", () => {
    it("should move the playhead and announce it", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(500);
      expect(h.timeline.getPlayheadMs()).toBe(500);
      expect(h.announcement.getLast()?.textEn).toBe("Playhead at 0.5 seconds");
      expect(h.announcement.getLast()?.textAr).toBe("المؤشر عند 0.5 ثانية");
    });

    it("should clamp the playhead to the project duration", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(99999);
      expect(h.timeline.getPlayheadMs()).toBe(4000);
    });

    it("should move by seconds", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(500);
      h.timeline.movePlayheadBySeconds(1);
      expect(h.timeline.getPlayheadMs()).toBe(1500);
      expect(h.announcement.getLast()?.textEn).toBe("Playhead at 1.5 seconds");
    });

    it("should move by frames using the project frame rate", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.movePlayheadByFrames(30);
      expect(result.success).toBe(true);
      expect(h.timeline.getPlayheadMs()).toBe(1000);
    });

    it("should move to timeline start and end", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(2000);
      h.timeline.movePlayheadToStart();
      expect(h.timeline.getPlayheadMs()).toBe(0);
      h.timeline.movePlayheadToEnd();
      expect(h.timeline.getPlayheadMs()).toBe(4000);
    });

    it("should move the playhead to the focused clip start and end", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(2500);
      h.timeline.movePlayheadToClipStart();
      expect(h.timeline.getPlayheadMs()).toBe(1000);
      h.timeline.movePlayheadToClipEnd();
      expect(h.timeline.getPlayheadMs()).toBe(4000);
    });

    it("should reject clip-boundary moves when no clip is focused", () => {
      const h = harness();
      h.store.createProject("Empty");
      const result = h.timeline.movePlayheadToClipStart();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
    });
  });

  describe("active track", () => {
    it("should move between tracks and announce the active track", () => {
      const h = harness();
      seedTwoMedia(h);
      h.store.updateProject(addSecondTrack(h));
      const result = h.timeline.moveActiveTrack(1);
      expect(result.success).toBe(true);
      expect(h.timeline.getActiveTrackId()).not.toBeNull();
      expect(h.announcement.getLast()?.textEn).toContain("Active track");
    });

    it("should reject track navigation when the project has no tracks", () => {
      const h = harness();
      h.store.createProject("NoTracks");
      const result = h.timeline.moveActiveTrack(1);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.TRACK_NOT_FOUND);
    });
  });

  describe("selection", () => {
    it("should select the clip under the playhead", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(1500);
      const result = h.timeline.selectCurrentClip();
      expect(result.success).toBe(true);
      expect(h.timeline.getSelection()).toHaveLength(1);
      const expected = h.store.getCurrentProject()!.clips.find(c => c.timelineIn.ticks === tv(1000).ticks);
      expect(h.timeline.getSelection()[0]).toBe(expected?.id);
      expect(h.announcement.getLast()?.textEn).toContain("Selected clip");
    });

    it("should reject selection when no clip is under the playhead", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(4000);
      const result = h.timeline.selectCurrentClip();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
    });

    it("should navigate to the next and previous clip", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectNextClip();
      expect(h.timeline.getSelection()).toHaveLength(1);
      expect(h.timeline.getPlayheadMs()).toBe(0);
      const first = h.timeline.getSelection()[0];
      h.timeline.selectNextClip();
      const second = h.timeline.getSelection()[0];
      expect(second).not.toBe(first);
      h.timeline.selectPreviousClip();
      expect(h.timeline.getSelection()[0]).toBe(first);
    });

    it("should select and deselect all clips", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      expect(h.timeline.getSelection()).toHaveLength(2);
      expect(h.announcement.getLast()?.textEn).toBe("Selected 2 clips");
      h.timeline.deselectAll();
      expect(h.timeline.getSelection()).toHaveLength(0);
      expect(h.announcement.getLast()?.textEn).toBe("Deselected all clips");
    });
  });

  describe("split and merge", () => {
    it("should split the clip under the playhead", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(500);
      const result = h.timeline.splitClipAtPlayhead();
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
      expect(h.announcement.getLast()?.textEn).toContain("Split clip");
      expect(h.timeline.getState().undoCount).toBeGreaterThan(0);
    });

    it("should reject a split when no clip is under the playhead", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(4000);
      const result = h.timeline.splitClipAtPlayhead();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
    });

    it("should merge two adjacent selected clips", () => {
      const h = harness();
      seedSameMedia(h);
      h.timeline.selectAll();
      const result = h.timeline.mergeSelected();
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(1);
      expect(h.announcement.getLast()?.textEn).toBe("Merged the two clips");
    });

    it("should require at least two selected clips to merge", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.mergeSelected();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should announce an incompatible-media merge failure", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      const result = h.timeline.mergeSelected();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clips come from different media.");
    });
  });

  describe("duplicate", () => {
    it("should duplicate the selected clips", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(1500);
      h.timeline.selectCurrentClip();
      const result = h.timeline.duplicateSelected();
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
      expect(h.announcement.getLast()?.textEn).toBe("Duplicated 1 clips");
    });

    it("should reject duplication with nothing selected", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.duplicateSelected();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("clipboard", () => {
    it("should copy selected clips into the clipboard", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      const result = h.timeline.copySelection();
      expect(result.success).toBe(true);
      expect(h.timeline.getState().clipboardMode).toBe("copy");
      expect(h.timeline.getState().clipboardCount).toBe(1);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
      expect(h.announcement.getLast()?.textEn).toContain("Clipboard contains 1 clips");
    });

    it("should paste copied clips at the playhead", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      h.timeline.copySelection();
      h.timeline.movePlayheadToEnd();
      const result = h.timeline.pasteClipboard();
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
      expect(h.announcement.getLast()?.textEn).toBe("Pasted 1 clips");
    });

    it("should cut selected clips and allow pasting them back", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      const cut = h.timeline.cutSelection();
      expect(cut.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(1);
      expect(h.timeline.getState().clipboardMode).toBe("cut");
      const paste = h.timeline.pasteClipboard();
      expect(paste.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
      expect(h.timeline.getState().clipboardMode).toBeNull();
    });

    it("should reject pasting from an empty clipboard", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.pasteClipboard();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      expect(h.announcement.getLast()?.textEn).toBe("The clipboard is empty");
    });

    it("should reject copy with nothing selected", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.copySelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });
  });

  describe("delete and undo/redo", () => {
    it("should delete the selected clips", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      const result = h.timeline.deleteSelection();
      expect(result.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(0);
      expect(h.announcement.getLast()?.textEn).toBe("Deleted 2 clips");
    });

    it("should reject deletion with nothing selected", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.deleteSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("should undo and redo a split", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(500);
      h.timeline.splitClipAtPlayhead();
      expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
      const undo = h.timeline.undo();
      expect(undo.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(2);
      expect(h.announcement.getLast()?.textEn).toBe("Undid the last operation");
      const redo = h.timeline.redo();
      expect(redo.success).toBe(true);
      expect(h.store.getCurrentProject()?.clips).toHaveLength(3);
      expect(h.announcement.getLast()?.textEn).toBe("Redid the last operation");
    });

    it("should report nothing to undo when the stack is empty", () => {
      const h = harness();
      h.store.createProject("Empty");
      const result = h.timeline.undo();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.NOTHING_TO_UNDO);
      expect(h.announcement.getLast()?.textEn).toBe("Nothing to undo");
    });
  });

  describe("refreshFromProject", () => {
    it("should reset state when the project is closed", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(1000);
      h.timeline.selectAll();
      h.store.closeProject();
      h.timeline.refreshFromProject();
      const state = h.timeline.getState();
      expect(state.hasProject).toBe(false);
      expect(state.playheadMs).toBe(0);
      expect(state.selection).toHaveLength(0);
      expect(state.clipboardCount).toBe(0);
    });

    it("should preserve a valid selection across a refresh", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      const before = h.timeline.getSelection();
      h.timeline.refreshFromProject();
      expect(h.timeline.getSelection()).toEqual(before);
    });
  });

  describe("getElementsData", () => {
    it("should expose the track tree with clips", () => {
      const h = harness();
      const seeded = seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      const tree = h.timeline.getElementsData();
      expect(tree).toHaveLength(1);
      expect(tree[0]?.trackName).toBe("V1");
      expect(tree[0]?.clips).toHaveLength(2);
      const clip0 = tree[0]!.clips[0]!;
      expect(clip0.startMs).toBe(0);
      expect(clip0.endMs).toBe(1000);
      expect(clip0.isSelected).toBe(true);
      expect(clip0.isUnderPlayhead).toBe(true);
      expect(seeded.tracks[0]!.clips).toHaveLength(2);
    });

    it("should return an empty tree when no project is open", () => {
      const h = harness();
      expect(h.timeline.getElementsData()).toEqual([]);
    });
  });

  describe("edge branches", () => {
    it("returns clipboard snapshots isolated from the live project", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      h.timeline.copySelection();
      const cb = h.timeline.getClipboard();
      expect(cb).toHaveLength(1);
      expect(cb[0]!.sourceMediaId).toBe(h.store.getCurrentProject()!.clips[0]!.sourceMediaId);
    });

    it("rejects clip-end moves when no clip is focused", () => {
      const h = harness();
      h.store.createProject("Empty");
      const result = h.timeline.movePlayheadToClipEnd();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
      expect(h.announcement.getLast()?.textEn).toBe("No clip is focused");
    });

    it("rejects moves when no project is open", () => {
      const h = harness();
      const bySeconds = h.timeline.movePlayheadBySeconds(1);
      expect(bySeconds.success).toBe(false);
      const toStart = h.timeline.movePlayheadToStart();
      expect(toStart.success).toBe(false);
      if (!bySeconds.success) expect(bySeconds.error).toBe(ErrorCode.OPERATION_FAILED);
    });

    it("recomputes the active track index from the current track id", () => {
      const h = harness();
      seedTwoMedia(h);
      h.store.updateProject(addSecondTrack(h));
      h.timeline.moveActiveTrack(1);
      const v2 = h.timeline.getActiveTrackId();
      h.timeline.moveActiveTrack(0);
      expect(h.timeline.getActiveTrackId()).toBe(v2);
    });

    it("rejects selectAll when there are no clips", () => {
      const h = harness();
      h.store.createProject("Empty");
      const result = h.timeline.selectAll();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("There are no clips to select");
    });

    it("rejects duplicate when insertion would overlap", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      const result = h.timeline.duplicateSelected();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clips cannot overlap.");
    });

    it("rejects duplicate when the selection is stale", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      h.store.createProject("Fresh");
      const result = h.timeline.duplicateSelected();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Could not duplicate the selected clips");
    });

    it("rejects cut with nothing selected", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.cutSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.INVALID_INPUT);
    });

    it("rejects cut when the selection is stale", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      h.store.createProject("Fresh");
      const result = h.timeline.cutSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
    });

    it("rejects copy when the selection is stale", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      h.store.createProject("Fresh");
      const result = h.timeline.copySelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
    });

    it("reports a partial cut failure through the model error table", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      const project = h.store.getCurrentProject()!;
      deleteClipDirectly(h, project.clips[1]!.id);
      const result = h.timeline.cutSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clip not found.");
    });

    it("rejects paste when the project has no tracks", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      h.timeline.copySelection();
      h.store.createProject("Fresh");
      const result = h.timeline.pasteClipboard();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.TRACK_NOT_FOUND);
      expect(h.announcement.getLast()?.textEn).toBe("There is no track to paste into");
    });

    it("rejects paste when it would overlap", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      h.timeline.selectCurrentClip();
      h.timeline.copySelection();
      h.timeline.setPlayheadMs(500);
      const result = h.timeline.pasteClipboard();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clips cannot overlap.");
    });

    it("reports a partial delete failure through the model error table", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      const project = h.store.getCurrentProject()!;
      deleteClipDirectly(h, project.clips[1]!.id);
      const result = h.timeline.deleteSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clip not found.");
    });

    it("rejects delete when every selected clip is stale", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      h.store.createProject("Fresh");
      const result = h.timeline.deleteSelection();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Clip not found.");
    });

    it("rejects redo when there is nothing to redo", () => {
      const h = harness();
      seedTwoMedia(h);
      const result = h.timeline.redo();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.NOTHING_TO_REDO);
      expect(h.announcement.getLast()?.textEn).toBe("Nothing to redo");
    });

    it("resets a stale active track during refresh", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.moveActiveTrack(0);
      expect(h.timeline.getActiveTrackId()).not.toBeNull();
      h.store.createProject("Fresh");
      h.timeline.refreshFromProject();
      expect(h.timeline.getActiveTrackId()).toBeNull();
    });

    it("falls back to the clip under the playhead when the focused selection is stale", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectAll();
      const project = h.store.getCurrentProject()!;
      deleteClipDirectly(h, project.clips[0]!.id);
      h.timeline.setPlayheadMs(1500);
      const result = h.timeline.movePlayheadToClipStart();
      expect(result.success).toBe(true);
      expect(h.timeline.getPlayheadMs()).toBe(1000);
    });

    it("rejects next-clip navigation when the project has no tracks", () => {
      const h = harness();
      h.store.createProject("NoTracks");
      const result = h.timeline.selectNextClip();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.TRACK_NOT_FOUND);
      expect(h.announcement.getLast()?.textEn).toBe("The project has no tracks");
    });

    it("rejects next-clip navigation when the track has no clips", () => {
      const h = harness();
      h.store.createProject("NoClips");
      const base = h.store.getCurrentProject()!;
      const step = h.txn.run(base, "track", "seed", s => transitionCreateTrack(s, "V1", "video"));
      if (!step.success) throw new Error("seed track failed");
      h.store.updateProject(step.value.newState);
      const result = h.timeline.selectNextClip();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CLIP_NOT_FOUND);
      expect(h.announcement.getLast()?.textEn).toBe("The track has no clips");
    });
  });

  describe("coverage branches", () => {
    const noProject = (name: string, op: (h: Harness) => { success: boolean }) => {
      it(`rejects ${name} when no project is open`, () => {
        const h = harness();
        const result = op(h);
        expect(result.success).toBe(false);
      });
    };

    noProject("frame moves", h => h.timeline.movePlayheadByFrames(30));
    noProject("moves to the end", h => h.timeline.movePlayheadToEnd());
    noProject("moves to the clip start", h => h.timeline.movePlayheadToClipStart());
    noProject("moves to the clip end", h => h.timeline.movePlayheadToClipEnd());
    noProject("active track navigation", h => h.timeline.moveActiveTrack(1));
    noProject("clip selection", h => h.timeline.selectCurrentClip());
    noProject("select all", h => h.timeline.selectAll());
    noProject("split at playhead", h => h.timeline.splitClipAtPlayhead());
    noProject("merging", h => h.timeline.mergeSelected());
    noProject("duplication", h => h.timeline.duplicateSelected());
    noProject("cutting", h => h.timeline.cutSelection());
    noProject("copying", h => h.timeline.copySelection());
    noProject("pasting", h => h.timeline.pasteClipboard());
    noProject("deleting", h => h.timeline.deleteSelection());
    noProject("undo", h => h.timeline.undo());
    noProject("redo", h => h.timeline.redo());
    noProject("next-clip navigation", h => h.timeline.selectNextClip());

    it("rejects a split exactly at the clip boundary", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(0);
      const result = h.timeline.splitClipAtPlayhead();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
      expect(h.announcement.getLast()?.textEn).toBe("Split point is outside the clip.");
    });

    it("clamps the playhead to zero when no project is open", () => {
      const h = harness();
      h.timeline.setPlayheadMs(500);
      expect(h.timeline.getPlayheadMs()).toBe(0);
      expect(h.announcement.getLast()?.textEn).toBe("Playhead at 0.0 seconds");
    });

    it("moves to the start of the focused selection when it is valid", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.setPlayheadMs(1500);
      h.timeline.selectCurrentClip();
      h.timeline.setPlayheadMs(2500);
      const result = h.timeline.movePlayheadToClipStart();
      expect(result.success).toBe(true);
      expect(h.timeline.getPlayheadMs()).toBe(1000);
    });

    it("selects the last clip when navigating backwards without a selection", () => {
      const h = harness();
      seedTwoMedia(h);
      h.timeline.selectPreviousClip();
      expect(h.timeline.getSelection()).toHaveLength(1);
      expect(h.timeline.getPlayheadMs()).toBe(1000);
    });
  });
});

function addSecondTrack(h: Harness) {
  const current = h.store.getCurrentProject()!;
  const result = h.txn.run(current, "track", "seed", s => transitionCreateTrack(s, "V2", "video"));
  if (!result.success) throw new Error("seed track failed");
  h.store.updateProject(result.value.newState);
  return result.value.newState;
}

function deleteClipDirectly(h: Harness, clipId: EntityId) {
  const current = h.store.getCurrentProject()!;
  const result = h.txn.run(current, "x", "seed", s => transitionDeleteClip(s, clipId));
  if (!result.success) throw new Error("seed delete failed");
  h.store.updateProject(result.value.newState);
}

export type { Harness };
