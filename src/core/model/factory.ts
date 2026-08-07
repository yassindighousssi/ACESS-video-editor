import {
  EntityId, ProjectId, RelationshipId, entityId, relationshipId, timeValueFromMs, createTimestamp, FrameRate, Resolution,
} from "./types";
import {
  MediaAsset, Track, Clip, Transition, Title, Effect, Marker, CuePoint, Project, ProjectMetadata,
  ProjectSettings, Relationship, RelationshipType, TransactionJournal, MediaType, TrackType,
} from "./entities";

const DEFAULT_SETTINGS: ProjectSettings = {
  frameRate: 30,
  resolution: { width: 1920, height: 1080 },
  audioSampleRate: 48000,
  audioChannels: 2,
  exportFormat: "mp4",
  exportQuality: "high",
  autoAnalysis: false,
  announcementLevel: "all",
  commandPaletteKey: "Ctrl+Shift+P",
};

export function createProject(name: string, projectIdValue: ProjectId): Project {
  const now = createTimestamp();
  return {
    id: projectIdValue,
    version: 1,
    metadata: {
      name,
      description: "",
      tags: [],
      template: null,
      settings: { ...DEFAULT_SETTINGS },
      notes: "",
    },
    media: [],
    tracks: [],
    clips: [],
    markers: [],
    relationships: [],
    journal: {
      entries: [],
      undoStack: [],
      redoStack: [],
    },
    modified: now,
  };
}

export function createMediaAsset(
  projectIdValue: ProjectId,
  sourcePath: string,
  sourceHash: string,
  mediaType: MediaType,
  durationMs: number,
  id: EntityId = entityId(),
): MediaAsset {
  return {
    kind: "media_asset",
    id,
    projectId: projectIdValue,
    sourcePath,
    sourceHash,
    mediaType,
    duration: timeValueFromMs(durationMs),
    metadata: {
      codec: "unknown",
      width: null,
      height: null,
      frameRate: null,
      sampleRate: null,
      channels: null,
      bitDepth: null,
      bitrate: 0,
      container: "unknown",
    },
    analysis: null,
  };
}

export function createTrack(
  projectIdValue: ProjectId,
  name: string,
  trackType: TrackType,
  index: number,
  id: EntityId = entityId(),
): Track {
  return {
    kind: "track",
    id,
    projectId: projectIdValue,
    name,
    trackType,
    index,
    muted: false,
    locked: false,
    volume: 1.0,
    opacity: 1.0,
    clips: [],
  };
}

export function createClip(
  projectIdValue: ProjectId,
  name: string,
  sourceMediaId: EntityId,
  inPointMs: number,
  outPointMs: number,
  timelineInMs: number,
  id: EntityId = entityId(),
): Clip {
  return {
    kind: "clip",
    id,
    projectId: projectIdValue,
    name,
    sourceMediaId,
    inPoint: timeValueFromMs(inPointMs),
    outPoint: timeValueFromMs(outPointMs),
    timelineIn: timeValueFromMs(timelineInMs),
    duration: timeValueFromMs(outPointMs - inPointMs),
    speed: 1.0,
    volume: 1.0,
    opacity: 1.0,
    effects: [],
  };
}

export function createTransition(
  projectIdValue: ProjectId,
  transitionType: Transition["transitionType"],
  clipA: EntityId,
  clipB: EntityId,
  durationMs: number,
  id: EntityId = entityId(),
): Transition {
  return {
    kind: "transition",
    id,
    projectId: projectIdValue,
    name: `Transition ${transitionType}`,
    transitionType,
    duration: timeValueFromMs(durationMs),
    clipA,
    clipB,
    parameters: {},
  };
}

export function createTitle(
  projectIdValue: ProjectId,
  text: string,
  timelineInMs: number,
  durationMs: number,
  trackId: EntityId,
  id: EntityId = entityId(),
): Title {
  return {
    kind: "title",
    id,
    projectId: projectIdValue,
    name: "Title",
    text,
    timelineIn: timeValueFromMs(timelineInMs),
    duration: timeValueFromMs(durationMs),
    trackId,
    style: {
      fontFamily: "Arial",
      fontSize: 48,
      bold: false,
      italic: false,
      color: "#FFFFFF",
      backgroundColor: "transparent",
    },
  };
}

export function createEffect(
  projectIdValue: ProjectId,
  effectType: string,
  targetClipId: EntityId,
  id: EntityId = entityId(),
): Effect {
  return {
    kind: "effect",
    id,
    projectId: projectIdValue,
    name: `Effect ${effectType}`,
    effectType,
    targetClipId,
    parameters: {},
    enabled: true,
  };
}

export function createMarker(
  projectIdValue: ProjectId,
  name: string,
  positionMs: number,
  id: EntityId = entityId(),
): Marker {
  return {
    kind: "marker",
    id,
    projectId: projectIdValue,
    name,
    position: timeValueFromMs(positionMs),
    color: "#FF0000",
    notes: "",
    category: "",
  };
}

export function createCuePoint(
  projectIdValue: ProjectId,
  name: string,
  positionMs: number,
  cueType: CuePoint["cueType"],
  id: EntityId = entityId(),
): CuePoint {
  return {
    kind: "cue_point",
    id,
    projectId: projectIdValue,
    name,
    position: timeValueFromMs(positionMs),
    cueType,
    metadata: {},
  };
}

export function createRelationship(
  type: RelationshipType,
  from: EntityId,
  to: EntityId,
  metadata: Record<string, unknown> = {},
  id: RelationshipId = relationshipId(),
): Relationship {
  return { id, type, from, to, metadata };
}

export function createEmptyJournal(): TransactionJournal {
  return { entries: [], undoStack: [], redoStack: [] };
}

export function createDefaultSettings(overrides: Partial<ProjectSettings> = {}): ProjectSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

export function cloneProjectState(project: Project): Project {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      settings: { ...project.metadata.settings },
    },
    media: project.media.map(m => ({ ...m, metadata: { ...m.metadata }, duration: { ...m.duration } })),
    tracks: project.tracks.map(t => ({ ...t, clips: [...t.clips] })),
    clips: project.clips.map(c => ({ ...c, inPoint: { ...c.inPoint }, outPoint: { ...c.outPoint }, timelineIn: { ...c.timelineIn }, duration: { ...c.duration }, effects: [...c.effects] })),
    markers: project.markers.map(m => ({ ...m, position: { ...m.position } })),
    relationships: project.relationships.map(r => ({ ...r, metadata: { ...r.metadata } })),
    journal: {
      entries: [...project.journal.entries],
      undoStack: [...project.journal.undoStack],
      redoStack: [...project.journal.redoStack],
    },
    modified: { ...project.modified },
  };
}
