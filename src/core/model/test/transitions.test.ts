import { projectId, timeValueFromMs, EntityId } from "../types";
import { createProject, createMediaAsset, createTrack, createClip } from "../factory";
import { Project, Clip } from "../entities";
import {
  splitClip, mergeClips, moveClip, deleteClip, insertClip, createTrack as transitionCreateTrack,
  deleteTrack, reorderTrack, importMedia, addTransition, addMarker, findClip, findTrack, findMedia,
  getOrderedClips, getTrackClipIds, areAdjacent, checkOverlap, applyEvent,
} from "../transitions";
import { ModelError } from "../types";

function setupProject(): { project: Project; pid: string; trackId: EntityId; mediaId: EntityId } {
  const pid = projectId();
  const project = createProject("Test", pid as never);
  const media = createMediaAsset(pid as never, "movie.mp4", "hash1", "video", 10000);
  project.media.push(media);
  const track = createTrack(pid as never, "V1", "video", 0);
  project.tracks.push(track);
  return { project, pid, trackId: track.id, mediaId: media.id };
}

function addClipToProject(project: Project, name: string, inMs: number, outMs: number, tlInMs: number): Clip {
  const mediaId = project.media[0]!.id;
  const trackId = project.tracks[0]!.id;
  const clip = createClip(project.id, name, mediaId, inMs, outMs, tlInMs);
  project.clips.push(clip);
  project.tracks[0]!.clips.push(clip.id);
  return clip;
}

const ticks = (ms: number) => ({ ticks: timeValueFromMs(ms).ticks });

describe("insertClip", () => {
  it("should insert a clip into a track", () => {
    const { project, trackId, mediaId } = setupProject();
    const result = insertClip(project, mediaId, trackId, ticks(0), ticks(0), ticks(2000));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.length).toBe(1);
      expect(result.value.newState.tracks[0]!.clips.length).toBe(1);
      const contains = result.value.newState.relationships.some(r => r.type === "contains" && r.from === trackId);
      const references = result.value.newState.relationships.some(r => r.type === "references" && r.to === mediaId);
      expect(contains).toBe(true);
      expect(references).toBe(true);
    }
  });

  it("should reject overlap", () => {
    const { project, trackId, mediaId } = setupProject();
    const first = insertClip(project, mediaId, trackId, ticks(0), ticks(0), ticks(2000));
    if (!first.success) throw new Error("setup insert failed");
    const result = insertClip(first.value.newState, mediaId, trackId, ticks(1000), ticks(0), ticks(2000));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.CLIP_OVERLAP);
  });

  it("should reject missing media asset", () => {
    const { project, trackId } = setupProject();
    const result = insertClip(project, "ghost" as never, trackId, ticks(0), ticks(0), ticks(100));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.MEDIA_ASSET_NOT_FOUND);
  });

  it("should reject negative duration", () => {
    const { project, trackId, mediaId } = setupProject();
    const result = insertClip(project, mediaId, trackId, ticks(0), ticks(2000), ticks(1000));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.NEGATIVE_DURATION);
  });
});

describe("splitClip", () => {
  it("should split a clip in two", () => {
    const { project, trackId } = setupProject();
    addClipToProject(project, "orig", 0, 4000, 0);
    const origId = project.clips[0]!.id;
    const result = splitClip(project, origId, ticks(2000));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.length).toBe(2);
      const ids = result.value.newState.tracks.find(t => t.id === trackId)!.clips;
      expect(ids.length).toBe(2);
      const clipA = result.value.newState.clips.find(c => c.id === ids[0])!;
      const clipB = result.value.newState.clips.find(c => c.id === ids[1])!;
      expect(clipA.duration.ticks.toString()).toBe("2000000000");
      expect(clipB.duration.ticks.toString()).toBe("2000000000");
      expect(clipB.timelineIn.ticks.toString()).toBe("2000000000");
    }
  });

  it("should reject split at clip boundaries", () => {
    const { project } = setupProject();
    addClipToProject(project, "orig", 0, 4000, 0);
    const result = splitClip(project, project.clips[0]!.id, ticks(0));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.SPLIT_POINT_OUT_OF_BOUNDS);
  });

  it("should reject split of missing clip", () => {
    const { project } = setupProject();
    const result = splitClip(project, "ghost" as never, ticks(100));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.CLIP_NOT_FOUND);
  });
});

describe("mergeClips", () => {
  it("should merge adjacent clips of same media", () => {
    const { project, trackId } = setupProject();
    const a = addClipToProject(project, "A", 0, 2000, 0);
    const b = addClipToProject(project, "B", 2000, 4000, 2000);
    const result = mergeClips(project, a.id, b.id);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.length).toBe(1);
      const merged = result.value.newState.clips[0]!;
      expect(merged.duration.ticks.toString()).toBe("4000000000");
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips.length).toBe(1);
    }
  });

  it("should reject non-adjacent clips", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const b = addClipToProject(project, "B", 2000, 3000, 2000);
    const result = mergeClips(project, a.id, b.id);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.NOT_ADJACENT);
  });

  it("should reject clips on different tracks", () => {
    const { project, mediaId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const b = createClip(project.id, "B", mediaId, 0, 1000, 0);
    project.clips.push(b);
    project.tracks[1]!.clips.push(b.id);
    const result = mergeClips(project, a.id, b.id);
    expect(result.success).toBe(false);
  });
});

describe("moveClip", () => {
  it("should move clip to another track", () => {
    const { project, mediaId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = moveClip(project, a.id, trackB.id, ticks(0));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.tracks[0]!.clips.length).toBe(0);
      expect(result.value.newState.tracks[1]!.clips.length).toBe(1);
    }
  });

  it("should reject move into overlapping position", () => {
    const { project, mediaId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    addClipToProject(project, "A", 0, 2000, 0);
    const b = createClip(project.id, "B", mediaId, 0, 1000, 500);
    project.clips.push(b);
    project.tracks[1]!.clips.push(b.id);
    const result = moveClip(project, b.id, project.tracks[0]!.id, ticks(500));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.CLIP_OVERLAP);
  });

  it("should reject move to locked track", () => {
    const { project, mediaId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    trackB.locked = true;
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = moveClip(project, a.id, trackB.id, ticks(0));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_LOCKED);
  });
});

describe("deleteClip", () => {
  it("should remove clip and relationships", () => {
    const { project, trackId } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = deleteClip(project, a.id);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.length).toBe(0);
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips.length).toBe(0);
      const orphanRels = result.value.newState.relationships.filter(r => r.from === a.id || r.to === a.id);
      expect(orphanRels.length).toBe(0);
    }
  });

  it("should reject deleting missing clip", () => {
    const { project } = setupProject();
    const result = deleteClip(project, "ghost" as never);
    expect(result.success).toBe(false);
  });
});

describe("createTrack transition", () => {
  it("should add a track", () => {
    const { project } = setupProject();
    const result = transitionCreateTrack(project, "A1", "audio");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.tracks.length).toBe(2);
      expect(result.value.newState.tracks[1]!.trackType).toBe("audio");
      expect(result.value.newState.tracks[1]!.index).toBe(1);
    }
  });

  it("should reject empty name", () => {
    const { project } = setupProject();
    const result = transitionCreateTrack(project, "   ", "video");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.INVALID_INPUT);
  });
});

describe("deleteTrack transition", () => {
  it("should delete empty track", () => {
    const { project } = setupProject();
    const result = deleteTrack(project, project.tracks[0]!.id);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.newState.tracks.length).toBe(0);
  });

  it("should reject deleting non-empty track", () => {
    const { project } = setupProject();
    addClipToProject(project, "A", 0, 1000, 0);
    const result = deleteTrack(project, project.tracks[0]!.id);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_EMPTY);
  });
});

describe("reorderTrack", () => {
  it("should reorder tracks", () => {
    const { project } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    const trackC = createTrack(project.id, "V3", "video", 2);
    project.tracks.push(trackB, trackC);
    const result = reorderTrack(project, trackC.id, 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.tracks[0]!.id).toBe(trackC.id);
      expect(result.value.newState.tracks[0]!.index).toBe(0);
      expect(result.value.newState.tracks[1]!.index).toBe(1);
    }
  });

  it("should reject out-of-range index", () => {
    const { project } = setupProject();
    const result = reorderTrack(project, project.tracks[0]!.id, 5);
    expect(result.success).toBe(false);
  });
});

describe("importMedia", () => {
  it("should import media asset", () => {
    const { project } = setupProject();
    const result = importMedia(project, "/media/extra.mp4", "audio", 5000, "hash2");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.media.length).toBe(2);
      const asset = result.value.newState.media[1]!;
      expect(asset.mediaType).toBe("audio");
      expect(asset.duration.ticks.toString()).toBe("5000000000");
    }
  });

  it("should reject empty path", () => {
    const { project } = setupProject();
    const result = importMedia(project, "", "video", 1000);
    expect(result.success).toBe(false);
  });

  it("should reject zero duration", () => {
    const { project } = setupProject();
    const result = importMedia(project, "/media/x.mp4", "video", 0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.NEGATIVE_DURATION);
  });

  it("should allow an image with zero duration", () => {
    const { project } = setupProject();
    const result = importMedia(project, "/media/still.png", "image", 0);
    expect(result.success).toBe(true);
    if (result.success) {
      const asset = result.value.newState.media[result.value.newState.media.length - 1]!;
      expect(asset.mediaType).toBe("image");
      expect(asset.duration.ticks.toString()).toBe("0");
    }
  });
});

describe("addTransition", () => {
  it("should add transition between adjacent clips", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 2000, 0);
    const b = addClipToProject(project, "B", 2000, 4000, 2000);
    const result = addTransition(project, a.id, b.id, "fade", 500);
    expect(result.success).toBe(true);
    if (result.success) {
      const deps = result.value.newState.relationships.filter(r => r.type === "depends_on");
      expect(deps.length).toBe(2);
    }
  });

  it("should reject transition longer than gap", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 2000, 0);
    const b = addClipToProject(project, "B", 2000, 4000, 2000);
    const result = addTransition(project, a.id, b.id, "fade", 3000);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.INVALID_TIME);
  });
});

describe("addMarker", () => {
  it("should add a marker", () => {
    const { project } = setupProject();
    const result = addMarker(project, "Intro", 1500);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.markers.length).toBe(1);
      expect(result.value.newState.markers[0]!.name).toBe("Intro");
      expect(result.value.newState.markers[0]!.position.ticks.toString()).toBe("1500000000");
    }
  });

  it("should reject negative position", () => {
    const { project } = setupProject();
    const result = addMarker(project, "Bad", -1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.INVALID_TIME);
  });
});

describe("query helpers", () => {
  it("should find clips, tracks, media", () => {
    const { project, mediaId, trackId } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    expect(findClip(project, a.id)).toBeDefined();
    expect(findTrack(project, trackId)).toBeDefined();
    expect(findMedia(project, mediaId)).toBeDefined();
    expect(findClip(project, "ghost" as never)).toBeUndefined();
  });

  it("should return empty ids for missing track", () => {
    const { project } = setupProject();
    expect(getTrackClipIds(project, "ghost" as never)).toEqual([]);
  });

  it("should not detect overlap for negative timeline", () => {
    const { project, trackId } = setupProject();
    const overlap = checkOverlap(project, trackId, ticks(-100), ticks(1000));
    expect(overlap.overlapping).toBeUndefined();
  });

  it("should detect adjacency", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const b = addClipToProject(project, "B", 1000, 2000, 1000);
    const c = addClipToProject(project, "C", 3000, 4000, 3000);
    expect(areAdjacent(project, a.id, b.id)).toBe(true);
    expect(areAdjacent(project, a.id, c.id)).toBe(false);
  });

  it("should get ordered clips", () => {
    const { project, trackId } = setupProject();
    addClipToProject(project, "A", 0, 1000, 0);
    addClipToProject(project, "B", 1000, 2000, 1000);
    const clips = getOrderedClips(project, trackId);
    expect(clips.length).toBe(2);
  });

  it("should detect overlap", () => {
    const { project, trackId } = setupProject();
    addClipToProject(project, "A", 0, 1000, 0);
    const overlap = checkOverlap(project, trackId, ticks(500), ticks(1000));
    expect(overlap.overlapping).toBeDefined();
  });
});

describe("additional coverage branches", () => {
  it("should replace an existing media asset when re-importing the same id", () => {
    const { project, mediaId } = setupProject();
    const first = importMedia(project, "/extra.mp4", "audio", 5000, "h2");
    if (!first.success) throw new Error("setup failed");
    const result = importMedia(first.value.newState, "/renamed.mp4", "video", 1234, "h1", mediaId);
    expect(result.success).toBe(true);
    if (result.success) {
      const asset = result.value.newState.media.find(m => m.id === mediaId)!;
      expect(asset.sourcePath).toBe("/renamed.mp4");
      expect(result.value.newState.media.length).toBe(2);
    }
  });

  it("should replace an existing marker when the same id is added", () => {
    const { project } = setupProject();
    const first = addMarker(project, "A", 1000);
    if (!first.success) throw new Error("setup failed");
    const markerId = first.value.newState.markers[0]!.id;
    const second = addMarker(first.value.newState, "B", 2000);
    if (!second.success) throw new Error("setup failed");
    const result = addMarker(second.value.newState, "A2", 1500, markerId);
    expect(result.success).toBe(true);
    if (result.success) {
      const marker = result.value.newState.markers.find(m => m.id === markerId)!;
      expect(marker.name).toBe("A2");
      expect(result.value.newState.markers.length).toBe(2);
    }
  });

  it("should move a clip within the same track to a free position", () => {
    const { project, trackId } = setupProject();
    addClipToProject(project, "A", 0, 1000, 0);
    const result = moveClip(project, project.clips[0]!.id, trackId, ticks(5000));
    expect(result.success).toBe(true);
    if (result.success) {
      const moved = result.value.newState.clips.find(c => c.id === project.clips[0]!.id)!;
      expect(moved.timelineIn.ticks.toString()).toBe("5000000000");
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips).toHaveLength(1);
    }
  });

  it("should report non-adjacent when a clip is not on any track", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    expect(areAdjacent(project, "ghost" as never, a.id)).toBe(false);
    expect(areAdjacent(project, a.id, "ghost" as never)).toBe(false);
  });

  it("should report non-adjacent when a track references a missing clip", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    project.tracks[0]!.clips.push("ghost" as EntityId);
    expect(areAdjacent(project, "ghost" as never, a.id)).toBe(false);
    expect(areAdjacent(project, a.id, "ghost" as never)).toBe(false);
  });

  it("should reject a split when the clip is not on any track", () => {
    const { project, mediaId } = setupProject();
    const orphan = createClip(project.id, "orphan", mediaId, 0, 4000, 0);
    project.clips.push(orphan);
    const result = splitClip(project, orphan.id, ticks(2000));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_FOUND);
  });

  it("should split a clip when the project has multiple tracks", () => {
    const { project, trackId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 4000, 0);
    const result = splitClip(project, a.id, ticks(2000));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips.length).toBe(2);
    }
  });

  it("should reject merging a missing clip", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const r1 = mergeClips(project, "ghost" as never, a.id);
    expect(r1.success).toBe(false);
    if (!r1.success) expect(r1.error).toBe(ModelError.CLIP_NOT_FOUND);
    const r2 = mergeClips(project, a.id, "ghost" as never);
    expect(r2.success).toBe(false);
  });

  it("should merge clips passed in reversed timeline order with extra clips and tracks", () => {
    const { project } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    addClipToProject(project, "A", 0, 2000, 0);
    addClipToProject(project, "B", 2000, 4000, 2000);
    const c = addClipToProject(project, "C", 4000, 5000, 4000);
    const later = project.clips.find(c => c.id === project.clips[1]!.id)!;
    const earlier = project.clips.find(c => c.id === project.clips[0]!.id)!;
    const result = mergeClips(project, later.id, earlier.id);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.length).toBe(2);
      expect(result.value.newState.clips.some(clip => clip.id === c.id)).toBe(true);
    }
  });

  it("should reject moving a missing clip", () => {
    const { project } = setupProject();
    const result = moveClip(project, "ghost" as never, project.tracks[0]!.id, ticks(0));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.CLIP_NOT_FOUND);
  });

  it("should reject moving to a missing track", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = moveClip(project, a.id, "ghost" as never, ticks(0));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_FOUND);
  });

  it("should reject moving to a negative timeline position", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = moveClip(project, a.id, project.tracks[0]!.id, ticks(-100));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.INVALID_TIME);
  });

  it("should move a clip not on any track while leaving other clips untouched", () => {
    const { project, mediaId, trackId } = setupProject();
    addClipToProject(project, "A", 0, 1000, 0);
    const orphan = createClip(project.id, "orphan", mediaId, 0, 1000, 0);
    project.clips.push(orphan);
    const result = moveClip(project, orphan.id, trackId, ticks(5000));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.inverse.payload.targetTrackId).toBe(trackId);
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips).toContain(orphan.id);
    }
  });

  it("should reject inserting into a missing track", () => {
    const { project, mediaId } = setupProject();
    const result = insertClip(project, mediaId, "ghost" as never, ticks(0), ticks(0), ticks(100));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_FOUND);
  });

  it("should reject inserting into a locked track", () => {
    const { project, mediaId, trackId } = setupProject();
    project.tracks[0]!.locked = true;
    const result = insertClip(project, mediaId, trackId, ticks(0), ticks(0), ticks(100));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_LOCKED);
  });

  it("should reject deleting a missing track", () => {
    const { project } = setupProject();
    const result = deleteTrack(project, "ghost" as never);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_FOUND);
  });

  it("should reject reordering a missing track", () => {
    const { project } = setupProject();
    const result = reorderTrack(project, "ghost" as never, 0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.TRACK_NOT_FOUND);
  });

  it("should reject a transition involving a missing clip", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const result = addTransition(project, a.id, "ghost" as never, "fade", 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.CLIP_NOT_FOUND);
  });

  it("should reject a transition between non-adjacent clips", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const c = addClipToProject(project, "C", 2000, 3000, 2000);
    const result = addTransition(project, a.id, c.id, "fade", 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.NOT_ADJACENT);
  });

  it("should add a transition when clips are passed in reversed order", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 2000, 0);
    const b = addClipToProject(project, "B", 2000, 4000, 2000);
    const result = addTransition(project, b.id, a.id, "fade", 500);
    expect(result.success).toBe(true);
  });

  it("should reject a transition with non-positive duration", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 2000, 0);
    const b = addClipToProject(project, "B", 2000, 4000, 2000);
    const result = addTransition(project, a.id, b.id, "fade", 0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.INVALID_TIME);
  });

  it("should restore a deleted clip via its inverse event", () => {
    const { project, trackId } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const deleted = deleteClip(project, a.id);
    if (!deleted.success) throw new Error("setup failed");
    const result = applyEvent(deleted.value.newState, deleted.value.inverse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.some(c => c.id === a.id)).toBe(true);
      expect(result.value.newState.tracks.find(t => t.id === trackId)!.clips).toContain(a.id);
    }
  });

  it("should reinsert a clip into a missing track via its inverse", () => {
    const { project } = setupProject();
    const a = addClipToProject(project, "A", 0, 1000, 0);
    const deleted = deleteClip(project, a.id);
    if (!deleted.success) throw new Error("setup failed");
    const result = applyEvent(deleted.value.newState, {
      type: "reinsertClip",
      payload: { clip: a, trackId: "ghost", relationships: [] },
    } as never);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.some(c => c.id === a.id)).toBe(true);
    }
  });

  it("should remove a media asset and its relationships via its inverse", () => {
    const { project, trackId } = setupProject();
    const imported = importMedia(project, "/extra.mp4", "video", 5000, "h2");
    if (!imported.success) throw new Error("setup failed");
    const mediaB = imported.value.newState.media[1]!.id;
    const withClip = insertClip(imported.value.newState, mediaB, trackId, ticks(0), ticks(0), ticks(1000));
    if (!withClip.success) throw new Error("setup failed");
    const result = applyEvent(withClip.value.newState, { type: "removeMedia", payload: { mediaAssetId: mediaB } } as never);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.media).toHaveLength(1);
      expect(result.value.newState.relationships.some(r => r.to === mediaB)).toBe(false);
    }
  });

  it("should restore a split when the project has multiple tracks", () => {
    const { project } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    const a = addClipToProject(project, "A", 0, 4000, 0);
    const split = splitClip(project, a.id, ticks(2000));
    if (!split.success) throw new Error("setup failed");
    const result = applyEvent(split.value.newState, split.value.inverse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips.some(c => c.id === a.id)).toBe(true);
    }
  });

  it("should restore a merge when extra clips and tracks exist", () => {
    const { project } = setupProject();
    const trackB = createTrack(project.id, "V2", "video", 1);
    project.tracks.push(trackB);
    addClipToProject(project, "A", 0, 2000, 0);
    addClipToProject(project, "B", 2000, 4000, 2000);
    const c = addClipToProject(project, "C", 4000, 5000, 4000);
    const merged = mergeClips(project, project.clips[0]!.id, project.clips[1]!.id);
    if (!merged.success) throw new Error("setup failed");
    const result = applyEvent(merged.value.newState, merged.value.inverse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.newState.clips).toHaveLength(3);
      expect(result.value.newState.clips.some(x => x.id === c.id)).toBe(true);
    }
  });

  it("should fail for an unknown inverse event type", () => {
    const { project } = setupProject();
    const result = applyEvent(project, { type: "not-a-real-event" } as never);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ModelError.OPERATION_FAILED);
  });
});
