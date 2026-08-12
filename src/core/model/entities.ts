import {
  EntityId, ProjectId, RelationshipId, TransactionId, TimeValue, FrameRate, Resolution, Timestamp, AnnouncementLevel,
} from "./types";

export type MediaType = "video" | "audio" | "image";
export type TrackType = "video" | "audio" | "subtitle" | "effect";
export type TransitionKind = "cut" | "fade" | "dissolve" | "wipe" | "custom";
export type CueType = "chapter" | "edit" | "bookmark" | "annotation";
export type EntityKind = "media_asset" | "track" | "clip" | "transition" | "title" | "effect" | "marker" | "cue_point";

export interface MediaMetadata {
  codec: string;
  width: number | null;
  height: number | null;
  frameRate: FrameRate | null;
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
  bitrate: number;
  container: string;
}

export interface MediaAsset {
  readonly kind: "media_asset";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  sourcePath: string;
  sourceHash: string;
  mediaType: MediaType;
  duration: TimeValue;
  metadata: MediaMetadata;
  analysis: AnalysisResult | null;
}

export interface Track {
  readonly kind: "track";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  trackType: TrackType;
  index: number;
  muted: boolean;
  locked: boolean;
  volume: number;
  opacity: number;
  clips: EntityId[];
}

export interface Clip {
  readonly kind: "clip";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  sourceMediaId: EntityId;
  inPoint: TimeValue;
  outPoint: TimeValue;
  timelineIn: TimeValue;
  duration: TimeValue;
  speed: number;
  volume: number;
  opacity: number;
  effects: EntityId[];
}

export interface Transition {
  readonly kind: "transition";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  transitionType: TransitionKind;
  duration: TimeValue;
  clipA: EntityId;
  clipB: EntityId;
  parameters: Record<string, unknown>;
}

export interface Title {
  readonly kind: "title";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  text: string;
  timelineIn: TimeValue;
  duration: TimeValue;
  trackId: EntityId;
  style: TitleStyle;
}

export interface Effect {
  readonly kind: "effect";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  effectType: string;
  targetClipId: EntityId;
  parameters: Record<string, unknown>;
  enabled: boolean;
}

export interface Marker {
  readonly kind: "marker";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  position: TimeValue;
  color: string;
  notes: string;
  category: string;
}

export interface CuePoint {
  readonly kind: "cue_point";
  readonly id: EntityId;
  readonly projectId: ProjectId;
  name: string;
  position: TimeValue;
  cueType: CueType;
  metadata: Record<string, unknown>;
}

export type Entity = MediaAsset | Track | Clip | Transition | Title | Effect | Marker | CuePoint;

export interface TitleStyle {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  backgroundColor: string;
}

export interface ProjectMetadata {
  name: string;
  description: string;
  tags: string[];
  template: string | null;
  settings: ProjectSettings;
  notes: string;
}

export interface ProjectSettings {
  frameRate: FrameRate;
  resolution: Resolution;
  audioSampleRate: number;
  audioChannels: number;
  exportFormat: string;
  exportQuality: string;
  autoAnalysis: boolean;
  announcementLevel: AnnouncementLevel;
  commandPaletteKey: string;
}

export interface AnalysisResult {
  summary: string;
  data: Record<string, unknown>;
  analyzedAt: Timestamp;
}

export interface Project {
  readonly id: ProjectId;
  readonly version: 1;
  metadata: ProjectMetadata;
  media: MediaAsset[];
  tracks: Track[];
  clips: Clip[];
  markers: Marker[];
  relationships: Relationship[];
  journal: TransactionJournal;
  modified: Timestamp;
}

export interface Relationship {
  readonly id: RelationshipId;
  readonly type: RelationshipType;
  readonly from: EntityId;
  readonly to: EntityId;
  readonly metadata: Record<string, unknown>;
}

export type RelationshipType =
  | "contains"
  | "references"
  | "adjacent"
  | "depends_on"
  | "overlaps"
  | "syncs_to"
  | "derived_from"
  | "analysis_of";

export interface JournalEntry {
  readonly id: TransactionId;
  readonly timestamp: Timestamp;
  readonly engine: string;
  readonly operation: string;
  readonly payload: Record<string, unknown>;
  readonly inverseEvent: InverseEvent;
  readonly forwardEvent: InverseEvent;
  readonly stateHashBefore: string;
  readonly stateHashAfter: string;
  readonly duration: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface TransactionJournal {
  readonly entries: JournalEntry[];
  readonly undoStack: JournalEntry[];
  readonly redoStack: JournalEntry[];
}

export interface InverseEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
}
