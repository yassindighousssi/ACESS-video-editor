import { Result } from "../infrastructure/common/types";
import { ModelError } from "./types";
import {
  EntityId, TimeValue, timeValueCmp, timeValueAdd, timeValueSub, isZeroOrPositive, timeValueFromMs,
} from "./types";
import { randomUUID } from "crypto";
import {
  Project, Clip, Track, MediaAsset, Relationship, InverseEvent, Transition,
} from "./entities";
import {
  cloneProjectState, createClip, createTrack as makeTrack, createMediaAsset as makeMediaAsset,
  createTransition as makeTransition, createRelationship,
} from "./factory";

export interface TransitionMeta {
  readonly newState: Project;
  readonly inverse: InverseEvent;
  readonly forward: InverseEvent;
}

export type TransitionResult = Result<TransitionMeta, ModelError>;

// ─── Lookup helpers ─────────────────────────────────────────────────────

export function findClip(project: Project, clipId: EntityId): Clip | undefined {
  return project.clips.find(c => c.id === clipId);
}

export function findTrack(project: Project, trackId: EntityId): Track | undefined {
  return project.tracks.find(t => t.id === trackId);
}

export function findMedia(project: Project, mediaId: EntityId): MediaAsset | undefined {
  return project.media.find(m => m.id === mediaId);
}

function removeClip(state: Project, clipId: EntityId): Project {
  return {
    ...state,
    clips: state.clips.filter(c => c.id !== clipId),
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.filter(id => id !== clipId),
    })),
    relationships: state.relationships.filter(r => r.from !== clipId && r.to !== clipId),
  };
}

function trackWithClipIds(state: Project, trackId: EntityId, clipIds: EntityId[]): Project {
  return {
    ...state,
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, clips: clipIds } : t),
  };
}

function withMedia(state: Project, media: MediaAsset): Project {
  return {
    ...state,
    media: state.media.some(m => m.id === media.id)
      ? state.media.map(m => m.id === media.id ? media : m)
      : [...state.media, media],
  };
}

function withMarker(state: Project, marker: Project["markers"][number]): Project {
  return {
    ...state,
    markers: state.markers.some(m => m.id === marker.id)
      ? state.markers.map(m => m.id === marker.id ? marker : m)
      : [...state.markers, marker],
  };
}

function addTrack(state: Project, track: Track): Project {
  return { ...state, tracks: [...state.tracks, track] };
}

function removeTrack(state: Project, trackId: EntityId): Project {
  return {
    ...state,
    tracks: state.tracks.filter(t => t.id !== trackId),
    relationships: state.relationships.filter(r => r.from !== trackId && r.to !== trackId),
  };
}

export function getTrackClipIds(state: Project, trackId: EntityId): EntityId[] {
  const track = findTrack(state, trackId);
  return track ? track.clips : [];
}

export function getOrderedClips(state: Project, trackId: EntityId): Clip[] {
  return getTrackClipIds(state, trackId)
    .map(id => findClip(state, id))
    .filter((c): c is Clip => c !== undefined);
}

// ─── Validation helpers ─────────────────────────────────────────────────

export function clipEnd(clip: Clip): TimeValue {
  return timeValueAdd(clip.timelineIn, clip.duration);
}

export function clipEndsAt(clip: Clip, tv: TimeValue): boolean {
  return timeValueCmp(clipEnd(clip), tv) === 0;
}

export function checkOverlap(
  state: Project,
  trackId: EntityId,
  timelineIn: TimeValue,
  duration: TimeValue,
  excludeClipId?: EntityId,
): { overlapping: Clip | undefined } {
  if (!isZeroOrPositive(timelineIn)) {
    return { overlapping: undefined };
  }
  const candidateEnd = timeValueAdd(timelineIn, duration);
  for (const clip of getOrderedClips(state, trackId)) {
    if (clip.id === excludeClipId) continue;
    const start = clip.timelineIn;
    const end = clipEnd(clip);
    const overlaps = timeValueCmp(timelineIn, end) < 0 && timeValueCmp(start, candidateEnd) < 0;
    if (overlaps) return { overlapping: clip };
  }
  return { overlapping: undefined };
}

export function areAdjacent(state: Project, clipIdA: EntityId, clipIdB: EntityId): boolean {
  const trackOfA = findTrack(state, state.tracks.find(t => t.clips.includes(clipIdA))?.id ?? ("" as EntityId));
  const trackOfB = findTrack(state, state.tracks.find(t => t.clips.includes(clipIdB))?.id ?? ("" as EntityId));
  if (!trackOfA || !trackOfB || trackOfA.id !== trackOfB.id) return false;
  const a = findClip(state, clipIdA);
  const b = findClip(state, clipIdB);
  if (!a || !b) return false;
  return clipEndsAt(a, b.timelineIn) || clipEndsAt(b, a.timelineIn);
}

export function sameMedia(state: Project, clipA: Clip, clipB: Clip): boolean {
  return clipA.sourceMediaId === clipB.sourceMediaId;
}

// ─── Transition 1: splitClip ────────────────────────────────────────────

export function splitClip(
  state: Project,
  clipId: EntityId,
  splitPoint: { ticks: bigint },
): TransitionResult {
  const clip = findClip(state, clipId);
  if (!clip) return { success: false, error: ModelError.CLIP_NOT_FOUND };
  const splitTicks = splitPoint.ticks;
  const clipStart = clip.timelineIn.ticks;
  const clipEndTicks = clipEnd(clip).ticks;
  if (splitTicks <= clipStart || splitTicks >= clipEndTicks) {
    return { success: false, error: ModelError.SPLIT_POINT_OUT_OF_BOUNDS };
  }
  const offsetTicks = splitTicks - clipStart;
  const splitOffset = { ticks: offsetTicks };
  const newInPoint = { ticks: clip.inPoint.ticks + offsetTicks };
  const partBStart = { ticks: splitTicks };

  const clipA: Clip = {
    ...clip,
    id: `${clip.id}__a` as EntityId,
    name: `${clip.name} (A)`,
    outPoint: newInPoint,
    duration: { ticks: offsetTicks },
  };
  const clipB: Clip = {
    ...clip,
    id: `${clip.id}__b` as EntityId,
    name: `${clip.name} (B)`,
    inPoint: newInPoint,
    timelineIn: partBStart,
    duration: { ticks: clipEndTicks - splitTicks },
  };

  const trackId = state.tracks.find(t => t.clips.includes(clipId))?.id;
  if (!trackId) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  const newTrackIds = state.tracks.find(t => t.id === trackId)!.clips
    .flatMap(id => id === clipId ? [clipA.id, clipB.id] : [id]);

  const newState: Project = {
    ...state,
    clips: [...state.clips.filter(c => c.id !== clipId), clipA, clipB],
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, clips: newTrackIds } : t),
    relationships: [
      ...state.relationships.filter(r => r.from !== clipId && r.to !== clipId),
      createRelationship("contains", trackId, clipA.id),
      createRelationship("contains", trackId, clipB.id),
      createRelationship("references", clipA.id, clip.sourceMediaId),
      createRelationship("references", clipB.id, clip.sourceMediaId),
    ],
  };

  const inverse: InverseEvent = {
    type: "restoreClipAfterSplit",
    payload: {
      clip,
      trackId,
      relationships: state.relationships.filter(r => r.from === clipId || r.to === clipId),
      parts: [clipA.id, clipB.id],
    },
  };
  const forward: InverseEvent = {
    type: "splitClip",
    payload: { clipId, splitPoint: { ticks: splitTicks } },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 2: mergeClips ───────────────────────────────────────────

export function mergeClips(
  state: Project,
  clipIdA: EntityId,
  clipIdB: EntityId,
): TransitionResult {
  const clipA = findClip(state, clipIdA);
  const clipB = findClip(state, clipIdB);
  if (!clipA || !clipB) return { success: false, error: ModelError.CLIP_NOT_FOUND };
  if (!sameMedia(state, clipA, clipB)) return { success: false, error: ModelError.INCOMPATIBLE_MEDIA };
  if (!areAdjacent(state, clipIdA, clipIdB)) return { success: false, error: ModelError.NOT_ADJACENT };

  const [first, second] = timeValueCmp(clipA.timelineIn, clipB.timelineIn) <= 0 ? [clipA, clipB] : [clipB, clipA];

  const merged: Clip = {
    ...first,
    id: first.id,
    name: `${first.name} + ${second.name}`,
    outPoint: second.outPoint,
    duration: timeValueAdd(
      first.duration,
      timeValueSub(clipEnd(second), clipEnd(first)),
    ),
  };

  const trackId = state.tracks.find(t => t.clips.includes(clipIdA))?.id;
  if (!trackId) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  const newTrackIds = state.tracks.find(t => t.id === trackId)!.clips
    .filter(id => id !== clipIdB);

  const newState: Project = {
    ...state,
    clips: [...state.clips.filter(c => c.id !== clipIdB).map(c => c.id === merged.id ? merged : c)],
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, clips: newTrackIds } : t),
    relationships: state.relationships.filter(r => r.from !== clipIdB && r.to !== clipIdB),
  };

  const inverse: InverseEvent = {
    type: "restoreClipAfterMerge",
    payload: {
      clipA: first,
      clipB: second,
      trackId,
      relationships: state.relationships.filter(
        r => r.from === clipA.id || r.to === clipA.id || r.from === clipB.id || r.to === clipB.id,
      ),
    },
  };
  const forward: InverseEvent = {
    type: "mergeClips",
    payload: { clipIdA, clipIdB },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 3: moveClip ─────────────────────────────────────────────

export function moveClip(
  state: Project,
  clipId: EntityId,
  targetTrackId: EntityId,
  newTimelineIn: { ticks: bigint },
): TransitionResult {
  const clip = findClip(state, clipId);
  if (!clip) return { success: false, error: ModelError.CLIP_NOT_FOUND };
  const targetTrack = findTrack(state, targetTrackId);
  if (!targetTrack) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  if (targetTrack.locked) return { success: false, error: ModelError.TRACK_LOCKED };

  const timelineIn = { ticks: newTimelineIn.ticks };
  if (!isZeroOrPositive(timelineIn)) return { success: false, error: ModelError.INVALID_TIME };

  const overlap = checkOverlap(state, targetTrackId, timelineIn, clip.duration, clipId);
  if (overlap.overlapping) return { success: false, error: ModelError.CLIP_OVERLAP };

  const sourceTrackId = state.tracks.find(t => t.clips.includes(clipId))?.id;

  const newState: Project = {
    ...state,
    clips: state.clips.map(c => c.id === clipId ? { ...c, timelineIn } : c),
    tracks: state.tracks.map(t => {
      if (t.id === targetTrackId) return { ...t, clips: t.clips.includes(clipId) ? t.clips : [...t.clips, clipId] };
      if (t.id === sourceTrackId) return { ...t, clips: t.clips.filter(id => id !== clipId) };
      return t;
    }),
    relationships: [
      ...state.relationships.filter(r => !(r.from === sourceTrackId && r.to === clipId)),
      createRelationship("contains", targetTrackId, clipId),
    ],
  };

  const inverse: InverseEvent = {
    type: "moveClip",
    payload: {
      clipId,
      targetTrackId: sourceTrackId ?? targetTrackId,
      newTimelineIn: { ticks: clip.timelineIn.ticks },
    },
  };
  const forward: InverseEvent = {
    type: "moveClip",
    payload: { clipId, targetTrackId, newTimelineIn: timelineIn },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 4: deleteClip ───────────────────────────────────────────

export function deleteClip(state: Project, clipId: EntityId): TransitionResult {
  const clip = findClip(state, clipId);
  if (!clip) return { success: false, error: ModelError.CLIP_NOT_FOUND };
  const trackId = state.tracks.find(t => t.clips.includes(clipId))?.id;
  const deletedRelationships = state.relationships.filter(r => r.from === clipId || r.to === clipId);

  const newState = removeClip(state, clipId);

  const inverse: InverseEvent = {
    type: "reinsertClip",
    payload: {
      clip,
      trackId,
      relationships: deletedRelationships,
    },
  };
  const forward: InverseEvent = { type: "deleteClip", payload: { clipId } };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 5: insertClip ───────────────────────────────────────────

export function insertClip(
  state: Project,
  mediaAssetId: EntityId,
  trackId: EntityId,
  timelineIn: { ticks: bigint },
  inPoint: { ticks: bigint },
  outPoint: { ticks: bigint },
  clipId?: EntityId,
): TransitionResult {
  const media = findMedia(state, mediaAssetId);
  if (!media) return { success: false, error: ModelError.MEDIA_ASSET_NOT_FOUND };
  const track = findTrack(state, trackId);
  if (!track) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  if (track.locked) return { success: false, error: ModelError.TRACK_LOCKED };
  if (timeValueCmp(outPoint as { ticks: bigint }, inPoint as { ticks: bigint }) <= 0) {
    return { success: false, error: ModelError.NEGATIVE_DURATION };
  }
  const duration = { ticks: outPoint.ticks - inPoint.ticks };
  const tlIn = { ticks: timelineIn.ticks };
  const overlap = checkOverlap(state, trackId, tlIn, duration);
  if (overlap.overlapping) return { success: false, error: ModelError.CLIP_OVERLAP };

  const clip = createClip(state.id, media.sourcePath.split(/[\\/]/).pop() ?? "clip", mediaAssetId, 0, 0, 0, clipId);
  const withTicks: Clip = {
    ...clip,
    inPoint,
    outPoint,
    timelineIn: tlIn,
    duration,
  };

  const newState: Project = {
    ...state,
    clips: [...state.clips, withTicks],
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, withTicks.id] } : t),
    relationships: [
      ...state.relationships,
      createRelationship("contains", trackId, withTicks.id),
      createRelationship("references", withTicks.id, mediaAssetId),
    ],
  };

  const inverse: InverseEvent = {
    type: "deleteClip",
    payload: { clipId: withTicks.id },
  };
  const forward: InverseEvent = {
    type: "insertClip",
    payload: { clipId: withTicks.id, mediaAssetId, trackId, timelineIn: tlIn, inPoint, outPoint },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 6: createTrack ──────────────────────────────────────────

export function createTrack(
  state: Project,
  name: string,
  trackType: Track["trackType"],
  trackId?: EntityId,
): TransitionResult {
  if (!name.trim()) return { success: false, error: ModelError.INVALID_INPUT };
  const nextIndex = state.tracks.length;
  const track = makeTrack(state.id, name, trackType, nextIndex, trackId);
  const newState: Project = {
    ...state,
    tracks: [...state.tracks, track],
    relationships: [
      ...state.relationships,
      createRelationship("contains", state.id as unknown as EntityId, track.id),
    ],
  };
  const inverse: InverseEvent = { type: "deleteTrack", payload: { trackId: track.id } };
  const forward: InverseEvent = { type: "createTrack", payload: { name, trackType, trackId: track.id } };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 7: deleteTrack ──────────────────────────────────────────

export function deleteTrack(state: Project, trackId: EntityId): TransitionResult {
  const track = findTrack(state, trackId);
  if (!track) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  if (track.clips.length > 0) return { success: false, error: ModelError.TRACK_NOT_EMPTY };

  const newState = removeTrack(state, trackId);
  const inverse: InverseEvent = { type: "recreateTrack", payload: { track } };
  const forward: InverseEvent = { type: "deleteTrack", payload: { trackId } };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 8: reorderTrack ─────────────────────────────────────────

export function reorderTrack(state: Project, trackId: EntityId, newIndex: number): TransitionResult {
  const track = findTrack(state, trackId);
  if (!track) return { success: false, error: ModelError.TRACK_NOT_FOUND };
  if (newIndex < 0 || newIndex >= state.tracks.length) {
    return { success: false, error: ModelError.INVALID_INPUT };
  }
  const oldIndex = track.index;
  const others = state.tracks.filter(t => t.id !== trackId);
  const reordered = [...others];
  reordered.splice(newIndex, 0, track);
  const reindexed = reordered.map((t, i) => ({ ...t, index: i }));

  const newState: Project = { ...state, tracks: reindexed };
  const inverse: InverseEvent = {
    type: "reorderTrack",
    payload: { trackId, newIndex: oldIndex },
  };
  const forward: InverseEvent = {
    type: "reorderTrack",
    payload: { trackId, newIndex },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 9: importMedia ──────────────────────────────────────────

export function importMedia(
  state: Project,
  filePath: string,
  mediaType: MediaAsset["mediaType"],
  durationMs: number,
  sourceHash = "unknown",
  mediaAssetId?: EntityId,
): TransitionResult {
  if (!filePath.trim()) return { success: false, error: ModelError.INVALID_INPUT };
  if (mediaType !== "image" && durationMs <= 0) return { success: false, error: ModelError.NEGATIVE_DURATION };
  const asset = makeMediaAsset(state.id, filePath, sourceHash, mediaType, durationMs, mediaAssetId);
  const newState = withMedia(state, asset);
  const inverse: InverseEvent = { type: "removeMedia", payload: { mediaAssetId: asset.id } };
  const forward: InverseEvent = {
    type: "importMedia",
    payload: { filePath, mediaType, durationMs, sourceHash, mediaAssetId: asset.id },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 10: addTransition ───────────────────────────────────────

export function addTransition(
  state: Project,
  clipIdA: EntityId,
  clipIdB: EntityId,
  transitionType: Transition["transitionType"],
  durationMs: number,
  transitionId?: EntityId,
): TransitionResult {
  const clipA = findClip(state, clipIdA);
  const clipB = findClip(state, clipIdB);
  if (!clipA || !clipB) return { success: false, error: ModelError.CLIP_NOT_FOUND };
  if (!areAdjacent(state, clipIdA, clipIdB)) return { success: false, error: ModelError.NOT_ADJACENT };

  const [outClip, inClip] = timeValueCmp(clipA.timelineIn, clipB.timelineIn) <= 0 ? [clipA, clipB] : [clipB, clipA];
  const maxDurMs = Number(timeValueSub(inClip.timelineIn, outClip.timelineIn).ticks) / 1_000_000;
  if (durationMs <= 0) return { success: false, error: ModelError.INVALID_TIME };
  if (durationMs > maxDurMs) return { success: false, error: ModelError.INVALID_TIME };

  const transition = makeTransition(state.id, transitionType, clipIdA, clipIdB, durationMs, transitionId);
  const newState: Project = {
    ...state,
    relationships: [
      ...state.relationships,
      createRelationship("depends_on", transition.id, clipIdA),
      createRelationship("depends_on", transition.id, clipIdB),
    ],
  };
  const inverse: InverseEvent = { type: "removeTransition", payload: { transitionId: transition.id } };
  const forward: InverseEvent = {
    type: "addTransition",
    payload: { clipIdA, clipIdB, transitionType, durationMs, transitionId: transition.id },
  };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Transition 11: addMarker ───────────────────────────────────────────

export function addMarker(state: Project, name: string, positionMs: number, markerId?: EntityId): TransitionResult {
  if (positionMs < 0) return { success: false, error: ModelError.INVALID_TIME };
  const marker = {
    kind: "marker" as const,
    id: (markerId ?? randomUUID()) as EntityId,
    projectId: state.id,
    name,
    position: timeValueFromMs(positionMs),
    color: "#FF0000",
    notes: "",
    category: "",
  };
  const newState = withMarker(state, marker);
  const inverse: InverseEvent = { type: "removeMarker", payload: { markerId: marker.id } };
  const forward: InverseEvent = { type: "addMarker", payload: { name, positionMs, markerId: marker.id } };
  return { success: true, value: { newState, inverse, forward } };
}

// ─── Reapply helper (used by undo/redo) ─────────────────────────────────

export function applyEvent(state: Project, event: InverseEvent): TransitionResult {
  switch (event.type) {
    case "mergeClips": {
      const p = event.payload as { clipIdA: EntityId; clipIdB: EntityId };
      return mergeClips(state, p.clipIdA, p.clipIdB);
    }
    case "splitClip": {
      const p = event.payload as { clipId: EntityId; splitPoint: { ticks: bigint } };
      return splitClip(state, p.clipId, p.splitPoint);
    }
    case "moveClip": {
      const p = event.payload as { clipId: EntityId; targetTrackId: EntityId; newTimelineIn: { ticks: bigint } };
      return moveClip(state, p.clipId, p.targetTrackId, p.newTimelineIn);
    }
    case "insertClip": {
      const p = event.payload as {
        clipId?: EntityId; mediaAssetId: EntityId; trackId: EntityId;
        timelineIn: { ticks: bigint }; inPoint: { ticks: bigint }; outPoint: { ticks: bigint };
      };
      return insertClip(state, p.mediaAssetId, p.trackId, p.timelineIn, p.inPoint, p.outPoint, p.clipId);
    }
    case "createTrack": {
      const p = event.payload as { name: string; trackType: Track["trackType"]; trackId?: EntityId };
      return createTrack(state, p.name, p.trackType, p.trackId);
    }
    case "importMedia": {
      const p = event.payload as {
        filePath: string; mediaType: MediaAsset["mediaType"]; durationMs: number;
        sourceHash: string; mediaAssetId?: EntityId;
      };
      return importMedia(state, p.filePath, p.mediaType, p.durationMs, p.sourceHash, p.mediaAssetId);
    }
    case "addTransition": {
      const p = event.payload as {
        clipIdA: EntityId; clipIdB: EntityId; transitionType: Transition["transitionType"];
        durationMs: number; transitionId?: EntityId;
      };
      return addTransition(state, p.clipIdA, p.clipIdB, p.transitionType, p.durationMs, p.transitionId);
    }
    case "addMarker": {
      const p = event.payload as { name: string; positionMs: number; markerId?: EntityId };
      return addMarker(state, p.name, p.positionMs, p.markerId);
    }
    case "restoreClipAfterSplit": {
      const p = event.payload as { clip: Clip; trackId: EntityId; relationships: Relationship[]; parts: EntityId[] };
      const next: Project = {
        ...state,
        clips: [...state.clips.filter(c => !p.parts.includes(c.id)), p.clip],
        tracks: state.tracks.map(t => t.id === p.trackId
          ? { ...t, clips: t.clips.flatMap(id => p.parts.includes(id) ? [p.clip.id] : [id]) }
          : t),
        relationships: [
          ...state.relationships.filter(r => !p.parts.includes(r.from) && !p.parts.includes(r.to)),
          ...p.relationships,
        ],
      };
      return {
        success: true,
        value: {
          newState: next,
          inverse: { type: "deleteClip", payload: { clipId: p.clip.id } },
          forward: event,
        },
      };
    }
    case "restoreClipAfterMerge": {
      const p = event.payload as { clipA: Clip; clipB: Clip; trackId: EntityId; relationships: Relationship[] };
      const next: Project = {
        ...state,
        clips: [...state.clips.filter(c => c.id !== p.clipA.id), p.clipA, p.clipB],
        tracks: state.tracks.map(t => t.id === p.trackId
          ? { ...t, clips: t.clips.flatMap(id => id === p.clipA.id ? [p.clipA.id, p.clipB.id] : [id]) }
          : t),
        relationships: [
          ...state.relationships.filter(r => r.from !== p.clipA.id && r.to !== p.clipA.id),
          ...p.relationships,
        ],
      };
      return {
        success: true,
        value: {
          newState: next,
          inverse: { type: "deleteClip", payload: { clipId: p.clipA.id } },
          forward: event,
        },
      };
    }
    case "reinsertClip": {
      const p = event.payload as { clip: Clip; trackId?: EntityId; relationships: Relationship[] };
      let next: Project = {
        ...state,
        clips: [...state.clips, p.clip],
        relationships: [
          ...state.relationships.filter(r => r.from !== p.clip.id && r.to !== p.clip.id),
          ...p.relationships,
        ],
      };
      if (p.trackId) {
        next = trackWithClipIds(next, p.trackId, [...(findTrack(next, p.trackId)?.clips ?? []), p.clip.id]);
      }
      return {
        success: true,
        value: {
          newState: next,
          inverse: { type: "deleteClip", payload: { clipId: p.clip.id } },
          forward: event,
        },
      };
    }
    case "deleteClip": {
      const p = event.payload as { clipId: EntityId };
      return deleteClip(state, p.clipId);
    }
    case "deleteTrack": {
      const p = event.payload as { trackId: EntityId };
      return deleteTrack(state, p.trackId);
    }
    case "recreateTrack": {
      const p = event.payload as { track: Track };
      return {
        success: true,
        value: {
          newState: addTrack(state, p.track),
          inverse: { type: "deleteTrack", payload: { trackId: p.track.id } },
          forward: event,
        },
      };
    }
    case "reorderTrack": {
      const p = event.payload as { trackId: EntityId; newIndex: number };
      return reorderTrack(state, p.trackId, p.newIndex);
    }
    case "removeMedia": {
      const p = event.payload as { mediaAssetId: EntityId };
      return {
        success: true,
        value: {
          newState: {
            ...state,
            media: state.media.filter(m => m.id !== p.mediaAssetId),
            relationships: state.relationships.filter(r => r.from !== p.mediaAssetId && r.to !== p.mediaAssetId),
          },
          inverse: { type: "restoreMedia", payload: {} },
          forward: event,
        },
      };
    }
    case "removeTransition": {
      const p = event.payload as { transitionId: EntityId };
      return {
        success: true,
        value: {
          newState: {
            ...state,
            relationships: state.relationships.filter(r => r.from !== p.transitionId && r.to !== p.transitionId),
          },
          inverse: { type: "addTransition", payload: {} },
          forward: event,
        },
      };
    }
    case "removeMarker": {
      const p = event.payload as { markerId: EntityId };
      return {
        success: true,
        value: {
          newState: { ...state, markers: state.markers.filter(m => m.id !== p.markerId) },
          inverse: { type: "addMarker", payload: {} },
          forward: event,
        },
      };
    }
    default:
      return { success: false, error: ModelError.OPERATION_FAILED };
  }
}

export const applyInverse = applyEvent;

// Re-export types used by consumers
export type { InverseEvent };
