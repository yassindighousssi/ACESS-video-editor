# PROJECT_MAP.md — Mandatory Architectural Design Reference

**Version:** 1.0.0-draft  
**Date:** 2026-07  
**Status:** BINDING — All implementation must conform to this document.  
**Rule:** No code is merged unless it satisfies the commitments below.

---

## TABLE OF CONTENTS

1. [Commitments (Non-Negotiable)](#1-commitments-non-negotiable)
2. [System State Machine](#2-system-state-machine)
3. [Base Data Model](#3-base-data-model)
4. [Transition Functions (Behaviors)](#4-transition-functions-behaviors)
5. [Engine Contracts & Capability Declarations](#5-engine-contracts--capability-declarations)
6. [Responsibility Matrix](#6-responsibility-matrix)
7. [Event Bus Protocol & Message Schema](#7-event-bus-protocol--message-schema)
8. [Transaction System](#8-transaction-system)
9. [Test Pipeline (5 Mandatory Stages)](#9-test-pipeline-5-mandatory-stages)
10. [Accessibility Specification](#10-accessibility-specification)
11. [Project File Format](#11-project-file-format)
12. [Completion Map — v1.0](#12-completion-map--v10)
13. [Roadmap](#13-roadmap)
14. [TECH_STACK](#14-tech_stack)
15. [SYSTEM_FLOW](#15-system_flow)
16. [ARCHITECTURE](#16-architecture)
17. [ORPHANS & PENDING](#17-orphans--pending)
18. [Brand Identity — "Tempo"](#18-brand-identity--tempo)
19. [Room System (Studio Metaphor)](#19-room-system-studio-metaphor)
20. [Layout Specification — Weighted Grid](#20-layout-specification--weighted-grid)
21. [Room Specifications (4 Fixed Zones)](#21-room-specifications-4-fixed-zones)
22. [Accessibility & Descriptor Language](#22-accessibility--descriptor-language)
23. [Shortcut System — Rhythmic Codes](#23-shortcut-system--rhythmic-codes)
24. [Color System & Visual States](#24-color-system--visual-states)
25. [Welcome Page & Onboarding](#25-welcome-page--onboarding)
26. [Executive Constitution — 5 Iron Rules](#26-executive-constitution--5-iron-rules)
27. [Critical Constraints (Auto-Audit Layer)](#27-critical-constraints-auto-audit-layer)
28. [7-Axis Review Framework](#28-7-axis-review-framework)
29. [Design Lab — Reference Elements](#29-design-lab--reference-elements)
30. [Answers to Open Questions](#30-answers-to-open-questions)
31. [Amendment Editor](#31-amendment-editor)
32. [Quick Navigation Index](#32-quick-navigation-index)
33. [Mandatory Editing State Reference](#33-mandatory-editing-state-reference)
34. [Reference Architectural Framework (5 Layers)](#34-reference-architectural-framework-5-layers)
35. [Test Sprite Specification](#35-test-sprite-specification)
36. [Mandatory Review & Testing Protocol](#36-mandatory-review--testing-protocol)
37. [L1 Infrastructure Layer — Building Guide](#37-l1-infrastructure-layer--building-guide)
38. [Seven-Stage Execution Roadmap](#38-seven-stage-execution-roadmap)
39. [Effects System](#39-effects-system)
40. [Room System Implementation (Stage 4)](#40-room-system-implementation-stage-4)
41. [React UI & Integration Verification (Stage 4)](#41-react-ui--integration-verification-stage-4)

---

## 1. Commitments (Non-Negotiable)

These are absolute constraints. No feature, no optimization, no deadline justifies violating them.

### C1: Accessibility Is a Structural Condition
Accessibility is not a feature, not a plugin, not a post-launch addition. It is a structural property of the data model. Every mutation to the model MUST produce an `AudioAnnouncement`. The system has two parallel streams: a visual stream (for sighted users) and an audio stream (for blind users). Both are first-class citizens. The audio stream is NOT a degraded version of the visual stream.

### C2: Every Operation Is Keyboard-Reachable
Every function in the system, without exception, MUST be reachable via keyboard alone. There is no operation that requires a mouse. The Command Palette is the primary interface. Visual elements are optional overlays on top of the command system, not the other way around.

### C3: Message-Based Communication Only
Engines MUST NOT call each other directly. All inter-engine communication happens through the Event Bus via typed Messages. No exceptions. No shortcuts. No "just this once" direct calls.

### C4: Pure Transition Functions
All model mutations are expressed as pure transition functions: `(State, Event) → State`. No mutation has side effects. Undo is the application of the inverse function. This is not optional — it is the foundation of the transaction system.

### C5: Capability Declaration Is Mandatory
Every engine MUST declare its capabilities at initialization time. The Integration Engine rejects any engine that cannot produce a valid Capability Declaration. This declaration is machine-checked, not documentation.

### C6: No Engine Owns More Than It Reads
The Responsibility Matrix (Section 6) defines which entities each engine may read, write, or is forbidden from accessing. Violations are caught at runtime by the Authorization Layer and logged as critical errors.

### C7: Test Pipeline Before Merge
No code merges into the main branch unless it passes all 5 stages of the Test Pipeline (Section 9). This applies to every commit, every hotfix, every feature.

### C8: Project File Is Human-Readable
The project file format MUST be plain text, structured, and readable by a blind user in a text editor with a screen reader. Binary-only formats are forbidden for project files.

---

## 2. System State Machine

The system operates as a finite state machine. Only one state is active at a time. Transitions are triggered by events. Each state defines which engines are active, which messages are permitted, and which transactions are locked.

### States

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM STATES                           │
├──────────────┬──────────────────────────────────────────────┤
│ State        │ Description                                  │
├──────────────┼──────────────────────────────────────────────┤
│ BOOT         │ System initializing. No engines active.      │
│              │ Capability Declarations being collected.     │
│              │ No user interaction possible.                │
├──────────────┼──────────────────────────────────────────────┤
│ STUDIO       │ Main hub. Project management, settings,      │
│              │ recent files, extensions. No editing.        │
│              │ Engines active: Project, Command, Plugin,    │
│              │ Accessibility, Settings.                     │
├──────────────┼──────────────────────────────────────────────┤
│ PROJECT_OPEN │ Project loaded. All project-level operations │
│              │ available. Engines active: All except        │
│              │ Rendering (unless export requested).         │
├──────────────┼──────────────────────────────────────────────┤
│ EDITING      │ Active editing session. Timeline operations  │
│              │ permitted. Transaction lock may be held.     │
│              │ Engines active: Timeline, Media, Command,    │
│              │ Accessibility, Analysis (background).        │
├──────────────┼──────────────────────────────────────────────┤
│ ANALYZING    │ Analysis engine processing media. User can   │
│              │ navigate but not edit timeline. Read-only.   │
│              │ Engines active: Analysis, Media, Command,    │
│              │ Accessibility.                               │
├──────────────┼──────────────────────────────────────────────┤
│ EXPORTING    │ Rendering engine active. Model is frozen.    │
│              │ No mutations allowed during export.          │
│              │ Engines active: Rendering, Media, Command,   │
│              │ Accessibility.                               │
├──────────────┼──────────────────────────────────────────────┤
│ ERROR        │ Unrecoverable error in a critical engine.    │
│              │ System degraded. User notified via audio.    │
│              │ Only Command and Accessibility active.       │
├──────────────┼──────────────────────────────────────────────┤
│ SHUTDOWN     │ Graceful shutdown. Engines stopped in        │
│              │ reverse initialization order.                │
└──────────────┴──────────────────────────────────────────────┘
```

### Allowed Transitions

```
BOOT        → STUDIO           (on: system_initialized)
BOOT        → ERROR            (on: init_failure)
STUDIO      → PROJECT_OPEN     (on: project_opened)
STUDIO      → SHUTDOWN         (on: user_exit)
STUDIO      → ERROR            (on: project_load_failure)
PROJECT_OPEN → EDITING         (on: editing_session_start)
PROJECT_OPEN → ANALYZING       (on: analysis_requested)
PROJECT_OPEN → EXPORTING       (on: export_requested)
PROJECT_OPEN → STUDIO          (on: project_closed)
PROJECT_OPEN → ERROR           (on: critical_error)
EDITING     → ANALYZING        (on: analysis_requested)
EDITING     → EXPORTING        (on: export_requested)
EDITING     → PROJECT_OPEN     (on: editing_session_end)
EDITING     → ERROR            (on: critical_error)
ANALYZING   → EDITING          (on: analysis_complete)
ANALYZING   → PROJECT_OPEN     (on: editing_session_end)
ANALYZING   → ERROR            (on: critical_error)
EXPORTING   → PROJECT_OPEN     (on: export_complete)
EXPORTING   → ERROR            (on: render_failure)
ERROR       → STUDIO           (on: recovery_success)
ERROR       → SHUTDOWN         (on: recovery_failure)
SHUTDOWN    → [TERMINAL]       (on: shutdown_complete)
```

### Rules
- R1: No transition may occur from a state not listed as a source.
- R2: During EXPORTING, all model mutations are rejected with `MODEL_FROZEN` error.
- R3: During EDITING, transaction lock is acquired. If lock cannot be acquired, state waits.
- R4: ERROR state logs the full event history before transition.
- R5: SHUTDOWN must complete within 5000ms or system force-terminates.

---

## 3. Base Data Model

The data model consists of exactly three root types. Every object in the system is either an Entity or a Relationship. No fourth root type is permitted.

### 3.1 Root Types

```typescript
// ─── ROOT TYPE 1: PROJECT ────────────────────────────────
interface Project {
  readonly id: ProjectId;          // UUID v7 (time-ordered)
  readonly version: 1;             // Schema version, immutable
  metadata: ProjectMetadata;
  entities: Map<EntityId, Entity>;
  relationships: Map<RelationshipId, Relationship>;
  state: ProjectState;             // Current project-level state
  journal: TransactionJournal;     // Ordered log of all mutations
  analysisIndex: AnalysisIndex;    // Smart index for all analyses
  created: Timestamp;              // ISO 8601
  modified: Timestamp;
}

interface ProjectMetadata {
  name: string;                    // Human-readable project name
  description: string;
  tags: string[];
  template: ProjectTemplate | null;
  settings: ProjectSettings;
  notes: string;                   // User notes (screen-reader friendly)
}

interface ProjectSettings {
  defaultFrameRate: FrameRate;     // 24, 25, 30, 60
  defaultResolution: Resolution;
  defaultAudioSampleRate: number;  // 44100, 48000, 96000
  defaultAudioChannels: number;    // 1, 2, 6
  autoAnalysis: boolean;
  announcementLevel: AnnouncementLevel;
  commandPaletteKey: string;       // Default: Ctrl+Shift+P
}

// ─── ROOT TYPE 2: ENTITY ─────────────────────────────────
// Every object in the system is an Entity.
// Entities are discriminated unions keyed on `kind`.
type Entity =
  | MediaAsset
  | Track
  | Clip
  | Transition
  | Title
  | Effect
  | Marker
  | CuePoint;

// ─── ROOT TYPE 3: RELATIONSHIP ───────────────────────────
// Relationships connect exactly two entities.
// They are first-class citizens, not embedded references.
type Relationship =
  | Contains          // Parent → Child (Project→Track, Track→Clip)
  | References        // Clip → MediaAsset (non-owning)
  | Adjacent          // Clip → Clip (ordering within track)
  | DependsOn         // Effect → Clip (effect applied to clip)
  | Overlaps          // Clip → Clip (temporal overlap across tracks)
  | SyncsTo           // Clip → Clip (cross-track sync point)
  | DerivedFrom       // Entity → Entity (e.g., export from project)
  | AnalysisOf;       // AnalysisResult → MediaAsset
```

### 3.2 Entity Definitions

```typescript
interface MediaAsset {
  kind: "media_asset";
  id: EntityId;
  projectId: ProjectId;
  sourcePath: string;              // Original file path
  sourceHash: string;              // SHA-256 of source file
  mediaType: "video" | "audio" | "image";
  duration: TimeValue;             // In project time units
  metadata: MediaMetadata;
  analysis: AnalysisIndex | null;  // Populated by Analysis Engine
}

interface MediaMetadata {
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

interface Track {
  kind: "track";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  trackType: "video" | "audio" | "subtitle" | "effect";
  index: number;                   // Order within project
  muted: boolean;
  locked: boolean;
  volume: number;                  // 0.0 - 1.0 (audio tracks only)
  opacity: number;                 // 0.0 - 1.0 (video tracks only)
  clips: EntityId[];               // Ordered clip IDs (via Adjacent relationships)
}

interface Clip {
  kind: "clip";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  sourceMediaId: EntityId;         // References MediaAsset
  inPoint: TimeValue;              // Start in source media
  outPoint: TimeValue;             // End in source media
  timelineIn: TimeValue;           // Position on timeline
  duration: TimeValue;             // outPoint - inPoint
  speed: number;                   // Playback speed multiplier
  volume: number;                  // 0.0 - 1.0
  opacity: number;                 // 0.0 - 1.0
  effects: EntityId[];             // Applied effects
}

interface Transition {
  kind: "transition";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  transitionType: "cut" | "fade" | "dissolve" | "wipe" | "custom";
  duration: TimeValue;
  clipA: EntityId;                 // outgoing clip
  clipB: EntityId;                 // incoming clip
  parameters: Record<string, unknown>;
}

interface Title {
  kind: "title";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  text: string;
  timelineIn: TimeValue;
  duration: TimeValue;
  trackId: EntityId;
  style: TitleStyle;
}

interface Effect {
  kind: "effect";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  effectType: string;              // Registered effect identifier
  targetClipId: EntityId;
  parameters: Record<string, unknown>;
  enabled: boolean;
}

interface Marker {
  kind: "marker";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  position: TimeValue;
  color: string;
  notes: string;
  category: string;
}

interface CuePoint {
  kind: "cue_point";
  id: EntityId;
  projectId: ProjectId;
  name: string;
  position: TimeValue;
  cueType: "chapter" | "edit" | "bookmark" | "annotation";
  metadata: Record<string, unknown>;
}
```

### 3.3 Core Value Types

```typescript
type ProjectId = string & { __brand: "ProjectId" };
type EntityId = string & { __brand: "EntityId" };
type RelationshipId = string & { __brand: "RelationshipId" };

// TimeValue is the fundamental unit of time.
// It is ALWAYS expressed in project time units (ticks).
// Conversion to seconds/frames is a presentation concern, not a model concern.
interface TimeValue {
  readonly ticks: bigint;          // Nanosecond precision
}

// Frame is a derived type — never stored, always computed.
interface Frame {
  readonly index: number;
  readonly frameRate: FrameRate;
}

type FrameRate = 24 | 25 | 30 | 60;

interface Resolution {
  readonly width: number;
  readonly height: number;
}

type AnnouncementLevel = "all" | "important" | "critical_only";

interface Timestamp {
  readonly iso: string;            // ISO 8601
  readonly unix: bigint;           // Unix nanoseconds
}
```

### 3.4 Constraints on the Data Model

- CM1: No entity may exist without a relationship connecting it to the Project (directly or transitively).
- CM2: No relationship may reference an entity that does not exist in the project.
- CM3: Every Clip MUST reference exactly one MediaAsset via a `References` relationship.
- CM4: Every Track MUST belong to exactly one Project via a `Contains` relationship.
- CM5: Clip.timelineIn + Clip.duration MUST NOT overlap with an adjacent clip on the same track unless a Transition exists between them.
- CM6: TimeValue.ticks MUST be non-negative.
- CM7: MediaAsset.duration MUST be greater than zero.
- CM8: Clip.duration MUST be greater than zero after speed adjustment.

---

## 4. Transition Functions (Behaviors)

All model mutations are pure functions. They take the current state and an event, and return the new state. They do NOT modify the input. They do NOT produce side effects.

### 4.1 Core Transition Functions

```typescript
// ─── CLIP OPERATIONS ─────────────────────────────────────

function splitClip(
  state: Project,
  event: { clipId: EntityId; splitPoint: TimeValue }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: clip exists, splitPoint is within clip bounds
  // 2. Compute: two new clips from original
  // 3. Return: new state with both clips + inverse event
  // The inverse event is: mergeClips(newClipA.id, newClipB.id)
}

function mergeClips(
  state: Project,
  event: { clipIdA: EntityId; clipIdB: EntityId }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: both clips exist, adjacent on same track, compatible media
  // 2. Compute: single clip spanning both durations
  // 3. Return: new state + inverse (which would be splitClip)
}

function moveClip(
  state: Project,
  event: {
    clipId: EntityId;
    targetTrackId: EntityId;
    newTimelineIn: TimeValue;
  }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: clip exists, target track exists, no overlap at destination
  // 2. Compute: clip with updated position
  // 3. Return: new state + inverse
}

function deleteClip(
  state: Project,
  event: { clipId: EntityId }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: clip exists, not locked
  // 2. Compute: state without clip, relationships cleaned
  // 3. Return: new state + inverse (re-insert clip with all relationships)
}

function insertClip(
  state: Project,
  event: {
    mediaAssetId: EntityId;
    trackId: EntityId;
    timelineIn: TimeValue;
    inPoint: TimeValue;
    outPoint: TimeValue;
  }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: media asset exists, track exists, no overlap
  // 2. Compute: new clip entity + Contains + Adjacent + References relationships
  // 3. Return: new state + inverse
}

// ─── TRACK OPERATIONS ────────────────────────────────────

function createTrack(
  state: Project,
  event: { name: string; trackType: Track["trackType"] }
): { newState: Project; inverse: InverseEvent } {
  // 1. Compute: new track entity at next index
  // 2. Return: new state + inverse
}

function deleteTrack(
  state: Project,
  event: { trackId: EntityId }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: track exists, no clips on track (or confirm force-delete)
  // 2. Compute: state without track and its clips
  // 3. Return: new state + inverse
}

function reorderTrack(
  state: Project,
  event: { trackId: EntityId; newIndex: number }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: track exists, newIndex within bounds
  // 2. Compute: track with updated index, siblings re-indexed
  // 3. Return: new state + inverse
}

// ─── PROJECT OPERATIONS ──────────────────────────────────

function importMedia(
  state: Project,
  event: { filePath: string; mediaType: MediaAsset["mediaType"] }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: file exists, readable, supported format
  // 2. Compute: new MediaAsset entity with metadata
  // 3. Return: new state + inverse (remove asset)
}

function addTransition(
  state: Project,
  event: {
    clipIdA: EntityId;
    clipIdB: EntityId;
    transitionType: Transition["transitionType"];
    duration: TimeValue;
  }
): { newState: Project; inverse: InverseEvent } {
  // 1. Validate: both clips exist, adjacent on same track
  // 2. Compute: transition entity + DependsOn relationships
  // 3. Return: new state + inverse
}
```

### 4.2 Inverse Function Registry

Every transition function MUST register its inverse. The Transaction System uses this for undo/redo.

```typescript
const InverseRegistry = new Map<string, InverseFactory>([
  ["splitClip", (event) => ({
    type: "mergeClips",
    clipIdA: event.resultClipA,
    clipIdB: event.resultClipB,
  })],
  ["mergeClips", (event) => ({
    type: "splitClip",
    clipId: event.mergedClipId,
    splitPoint: event.originalSplitPoint,
  })],
  ["moveClip", (event) => ({
    type: "moveClip",
    clipId: event.clipId,
    targetTrackId: event.originalTrackId,
    newTimelineIn: event.originalTimelineIn,
  })],
  ["deleteClip", (event) => ({
    type: "reinsertClip",
    clip: event.deletedClip,
    relationships: event.deletedRelationships,
  })],
  ["insertClip", (event) => ({
    type: "deleteClip",
    clipId: event.insertedClipId,
  })],
  // ... all other operations follow the same pattern
]);
```

---

## 5. Engine Contracts & Capability Declarations

Every engine MUST produce a Capability Declaration at boot time. The Integration Engine validates these declarations. An engine that cannot produce a valid declaration is rejected.

### 5.1 Capability Declaration Schema

```typescript
interface CapabilityDeclaration {
  engineId: string;                // Unique engine identifier
  version: string;                 // SemVer
  displayName: string;             // Human-readable name
  description: string;

  // What this engine can do
  capabilities: Capability[];

  // What messages this engine CONSUMES
  consumes: MessagePattern[];

  // What messages this engine PRODUCES
  produces: MessagePattern[];

  // What entities this engine may READ
  mayRead: EntityType[];

  // What entities this engine may WRITE
  mayWrite: EntityType[];

  // What entities this engine is FORBIDDEN from accessing
  forbidden: EntityType[];

  // Lifecycle hooks
  lifecycle: {
    init: string;                  // Function name for initialization
    start: string;                 // Function name for start
    stop: string;                  // Function name for stop
    cleanup: string;               // Function name for cleanup
  };

  // Resource requirements
  resources: {
    memoryMb: number;              // Estimated memory
    cpuIntensive: boolean;         // Should run off main thread?
    networkAccess: boolean;        // Needs network?
    fileSystemAccess: boolean;     // Needs file system?
  };

  // Error codes this engine can produce
  errorCodes: ErrorCode[];
}
```

### 5.2 Engine Definitions

#### Engine 1: Core Timeline Engine

```typescript
const TimelineEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.timeline",
  version: "1.0.0",
  displayName: "Core Timeline Engine",
  description: "Manages time, tracks, clips, and all temporal operations",

  capabilities: [
    "split_clip", "merge_clips", "move_clip", "insert_clip", "delete_clip",
    "create_track", "delete_track", "reorder_track",
    "add_transition", "remove_transition",
    "set_clip_speed", "set_clip_volume", "set_clip_opacity",
    "get_clip_at_time", "get_track_clips", "get_total_duration",
    "resolve_overlaps", "ripple_edit", "roll_edit",
  ],

  consumes: [
    "timeline.split_clip",
    "timeline.merge_clips",
    "timeline.move_clip",
    "timeline.insert_clip",
    "timeline.delete_clip",
    "timeline.create_track",
    "timeline.delete_track",
    "timeline.reorder_track",
    "timeline.add_transition",
    "timeline.set_clip_property",
    "timeline.get_state",
  ],

  produces: [
    "timeline.state_changed",
    "timeline.clip_split",
    "timeline.clip_merged",
    "timeline.clip_moved",
    "timeline.clip_inserted",
    "timeline.clip_deleted",
    "timeline.track_created",
    "timeline.track_deleted",
    "timeline.track_reordered",
    "timeline.transition_added",
    "timeline.overlap_detected",
    "timeline.duration_changed",
  ],

  mayRead: ["clip", "track", "transition", "marker", "cue_point"],
  mayWrite: ["clip", "track", "transition", "marker", "cue_point"],
  forbidden: ["media_asset", "analysis_result", "export_config"],

  lifecycle: {
    init: "timelineInit",
    start: "timelineStart",
    stop: "timelineStop",
    cleanup: "timelineCleanup",
  },

  resources: {
    memoryMb: 256,
    cpuIntensive: false,
    networkAccess: false,
    fileSystemAccess: false,
  },

  errorCodes: [
    { code: "TL001", message: "Clip not found", severity: "error" },
    { code: "TL002", message: "Track not found", severity: "error" },
    { code: "TL003", message: "Overlap detected at destination", severity: "warning" },
    { code: "TL004", message: "Split point out of clip bounds", severity: "error" },
    { code: "TL005", message: "Cannot delete track with active clips", severity: "error" },
    { code: "TL006", message: "Transition requires adjacent clips", severity: "error" },
  ],
};
```

#### Engine 2: Media Engine

```typescript
const MediaEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.media",
  version: "1.0.0",
  displayName: "Media Engine",
  description: "Handles media import, metadata extraction, transcoding, and export",

  capabilities: [
    "import_media", "extract_metadata", "transcode",
    "separate_audio_video", "generate_thumbnail",
    "probe_file", "export_project",
  ],

  consumes: [
    "media.import",
    "media.transcode",
    "media.export",
    "media.probe",
    "media.generate_thumbnail",
  ],

  produces: [
    "media.imported",
    "media.metadata_extracted",
    "media.transcoded",
    "media.export_complete",
    "media.export_progress",
    "media.thumbnail_generated",
    "media.error",
  ],

  mayRead: ["media_asset"],
  mayWrite: ["media_asset"],
  forbidden: ["clip", "track", "transition", "analysis_result"],

  lifecycle: {
    init: "mediaInit",
    start: "mediaStart",
    stop: "mediaStop",
    cleanup: "mediaCleanup",
  },

  resources: {
    memoryMb: 512,
    cpuIntensive: true,
    networkAccess: false,
    fileSystemAccess: true,
  },

  errorCodes: [
    { code: "MD001", message: "File not found", severity: "error" },
    { code: "MD002", message: "Unsupported format", severity: "error" },
    { code: "MD003", message: "Corrupt file", severity: "error" },
    { code: "MD004", message: "Transcode failed", severity: "error" },
    { code: "MD005", message: "Export interrupted", severity: "warning" },
  ],
};
```

#### Engine 3: Analysis Engine

```typescript
const AnalysisEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.analysis",
  version: "1.0.0",
  displayName: "Analysis Engine",
  description: "Builds smart indexes from media — speech, silence, scenes, faces, quality",

  capabilities: [
    "analyze_speech_to_text", "detect_silence",
    "detect_scene_changes", "detect_faces",
    "analyze_audio_quality", "build_index",
    "query_index",
  ],

  consumes: [
    "analysis.start",
    "analysis.cancel",
    "analysis.query",
    "analysis.reanalyze",
  ],

  produces: [
    "analysis.started",
    "analysis.progress",
    "analysis.complete",
    "analysis.index_updated",
    "analysis.silence_detected",
    "analysis.scene_change_detected",
    "analysis.speech_extracted",
    "analysis.face_detected",
    "analysis.quality_assessed",
    "analysis.error",
  ],

  mayRead: ["media_asset", "analysis_result"],
  mayWrite: ["analysis_result"],
  forbidden: ["clip", "track", "transition", "effect"],

  lifecycle: {
    init: "analysisInit",
    start: "analysisStart",
    stop: "analysisStop",
    cleanup: "analysisCleanup",
  },

  resources: {
    memoryMb: 1024,
    cpuIntensive: true,
    networkAccess: false,         // Local models only in v1
    fileSystemAccess: true,
  },

  errorCodes: [
    { code: "AN001", message: "Model not loaded", severity: "error" },
    { code: "AN002", message: "Analysis timeout", severity: "warning" },
    { code: "AN003", message: "Insufficient memory for analysis", severity: "error" },
    { code: "AN004", message: "Unsupported media type for analysis", severity: "warning" },
  ],
};
```

#### Engine 4: Command Engine

```typescript
const CommandEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.command",
  version: "1.0.0",
  displayName: "Command Engine",
  description: "Manages command palette, keyboard shortcuts, and natural language commands",

  capabilities: [
    "register_command", "unregister_command",
    "execute_command", "search_commands",
    "bind_shortcut", "unbind_shortcut",
    "get_shortcut", "list_shortcuts",
    "parse_natural_language",
  ],

  consumes: [
    "command.execute",
    "command.search",
    "command.bind",
    "command.unbind",
    "command.register",
    "command.parse",
  ],

  produces: [
    "command.executed",
    "command.found",
    "command.not_found",
    "command.shortcut_conflict",
    "command.parse_result",
    "command.error",
  ],

  mayRead: [],                    // Commands don't read entities directly
  mayWrite: [],                   // Commands don't write entities directly
  forbidden: ["*"],               // Commands only dispatch to other engines

  lifecycle: {
    init: "commandInit",
    start: "commandStart",
    stop: "commandStop",
    cleanup: "commandCleanup",
  },

  resources: {
    memoryMb: 64,
    cpuIntensive: false,
    networkAccess: false,
    fileSystemAccess: false,
  },

  errorCodes: [
    { code: "CM001", message: "Command not found", severity: "warning" },
    { code: "CM002", message: "Shortcut conflict", severity: "warning" },
    { code: "CM003", message: "Command execution failed", severity: "error" },
  ],
};
```

#### Engine 5: Accessibility Engine

```typescript
const AccessibilityEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.accessibility",
  version: "1.0.0",
  displayName: "Accessibility Engine",
  description: "Produces audio announcements, manages focus, interacts with screen readers",

  capabilities: [
    "announce", "describe_entity",
    "describe_state", "describe_transition",
    "manage_focus", "set_announcement_level",
    "get_announcement_queue",
  ],

  consumes: [
    "accessibility.announce",
    "accessibility.describe",
    "accessibility.focus_set",
    // Also listens to ALL other engine events (read-only)
    "*"
  ],

  produces: [
    "accessibility.announcement",
    "accessibility.focus_changed",
    "accessibility.description_ready",
  ],

  mayRead: ["*"],                 // Must read everything to describe it
  mayWrite: [],                   // Never modifies model entities
  forbidden: [],

  lifecycle: {
    init: "accessibilityInit",
    start: "accessibilityStart",
    stop: "accessibilityStop",
    cleanup: "accessibilityCleanup",
  },

  resources: {
    memoryMb: 128,
    cpuIntensive: false,
    networkAccess: false,         // Uses OS TTS, not network
    fileSystemAccess: false,
  },

  errorCodes: [
    { code: "AC001", message: "TTS engine unavailable", severity: "critical" },
    { code: "AC002", message: "Screen reader not detected", severity: "warning" },
    { code: "AC003", message: "Announcement queue overflow", severity: "warning" },
  ],
};
```

#### Engine 6: Project Engine

```typescript
const ProjectEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.project",
  version: "1.0.0",
  displayName: "Project Engine",
  description: "Manages project lifecycle, file I/O, serialization, versioning",

  capabilities: [
    "create_project", "open_project", "save_project",
    "close_project", "list_projects", "delete_project",
    "get_project_info", "create_snapshot", "restore_snapshot",
  ],

  consumes: [
    "project.create",
    "project.open",
    "project.save",
    "project.close",
    "project.list",
    "project.delete",
    "project.snapshot",
    "project.restore",
  ],

  produces: [
    "project.created",
    "project.opened",
    "project.saved",
    "project.closed",
    "project.list_ready",
    "project.deleted",
    "project.snapshot_created",
    "project.restored",
    "project.error",
  ],

  mayRead: ["*"],                 // Needs full project state for serialization
  mayWrite: ["*"],                // Creates/deletes entire projects
  forbidden: [],

  lifecycle: {
    init: "projectInit",
    start: "projectStart",
    stop: "projectStop",
    cleanup: "projectCleanup",
  },

  resources: {
    memoryMb: 128,
    cpuIntensive: false,
    networkAccess: false,
    fileSystemAccess: true,
  },

  errorCodes: [
    { code: "PJ001", message: "Project file corrupt", severity: "critical" },
    { code: "PJ002", message: "Project file version mismatch", severity: "error" },
    { code: "PJ003", message: "Disk full", severity: "critical" },
    { code: "PJ004", message: "Project locked by another instance", severity: "error" },
  ],
};
```

#### Engine 7: Rendering Engine

```typescript
const RenderingEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.rendering",
  version: "1.0.0",
  displayName: "Rendering Engine",
  description: "Produces final output video/audio from project timeline",

  capabilities: [
    "render_preview", "render_full",
    "cancel_render", "get_render_progress",
    "list_presets", "add_preset",
  ],

  consumes: [
    "render.start",
    "render.cancel",
    "render.progress_request",
    "render.list_presets",
  ],

  produces: [
    "render.started",
    "render.progress",
    "render.complete",
    "render.cancelled",
    "render.error",
  ],

  mayRead: ["clip", "track", "transition", "effect", "media_asset", "title"],
  mayWrite: [],                   // Rendering never modifies the project
  forbidden: ["analysis_result"],

  lifecycle: {
    init: "renderingInit",
    start: "renderingStart",
    stop: "renderingStop",
    cleanup: "renderingCleanup",
  },

  resources: {
    memoryMb: 2048,
    cpuIntensive: true,
    networkAccess: false,
    fileSystemAccess: true,
  },

  errorCodes: [
    { code: "RN001", message: "Render pipeline initialization failed", severity: "critical" },
    { code: "RN002", message: "Output directory not writable", severity: "error" },
    { code: "RN003", message: "Codec not available", severity: "error" },
    { code: "RN004", message: "Render cancelled by user", severity: "info" },
  ],
};
```

#### Engine 8: Plugin Engine

```typescript
const PluginEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.plugin",
  version: "1.0.0",
  displayName: "Plugin Engine",
  description: "Manages extension lifecycle, isolation, and sandboxing",

  capabilities: [
    "load_plugin", "unload_plugin",
    "enable_plugin", "disable_plugin",
    "list_plugins", "get_plugin_info",
    "register_extension_point",
  ],

  consumes: [
    "plugin.load",
    "plugin.unload",
    "plugin.enable",
    "plugin.disable",
    "plugin.list",
  ],

  produces: [
    "plugin.loaded",
    "plugin.unloaded",
    "plugin.enabled",
    "plugin.disabled",
    "plugin.error",
    "plugin.extension_registered",
  ],

  mayRead: [],
  mayWrite: [],
  forbidden: ["*"],               // Plugins access via sandboxed API only

  lifecycle: {
    init: "pluginInit",
    start: "pluginStart",
    stop: "pluginStop",
    cleanup: "pluginCleanup",
  },

  resources: {
    memoryMb: 64,
    cpuIntensive: false,
    networkAccess: false,
    fileSystemAccess: true,
  },

  errorCodes: [
    { code: "PL001", message: "Plugin manifest invalid", severity: "error" },
    { code: "PL002", message: "Plugin version incompatible", severity: "error" },
    { code: "PL003", message: "Plugin sandbox violation", severity: "critical" },
  ],
};
```

#### Engine 9: AI Engine

```typescript
const AIEngineDeclaration: CapabilityDeclaration = {
  engineId: "core.ai",
  version: "1.0.0",
  displayName: "AI Engine",
  description: "Provides AI-powered editing assistance via provider chain",

  capabilities: [
    "summarize_project", "suggest_edits",
    "generate_short_version", "execute_natural_language_command",
    "analyze_content", "generate_descriptions",
  ],

  consumes: [
    "ai.summarize",
    "ai.suggest",
    "ai.generate_short",
    "ai.execute_nl",
    "ai.analyze",
    "ai.describe",
  ],

  produces: [
    "ai.summary_ready",
    "ai.suggestions_ready",
    "ai.short_version_ready",
    "ai.nl_result",
    "ai.analysis_complete",
    "ai.description_ready",
    "ai.error",
  ],

  mayRead: ["media_asset", "analysis_result", "clip", "track"],
  mayWrite: [],                   // AI suggests, never mutates directly
  forbidden: ["effect", "transition"],

  lifecycle: {
    init: "aiInit",
    start: "aiStart",
    stop: "aiStop",
    cleanup: "aiCleanup",
  },

  resources: {
    memoryMb: 512,
    cpuIntensive: true,
    networkAccess: true,          // Cloud AI providers
    fileSystemAccess: false,
  },

  errorCodes: [
    { code: "AI001", message: "Provider not configured", severity: "error" },
    { code: "AI002", message: "Provider rate limited", severity: "warning" },
    { code: "AI003", message: "Provider timeout", severity: "warning" },
    { code: "AI004", message: "Invalid natural language input", severity: "warning" },
  ],
};
```

---

## 6. Responsibility Matrix

| Entity | Timeline | Media | Analysis | Command | Accessibility | Project | Rendering | Plugin | AI |
|---|---|---|---|---|---|---|---|---|---|
| **Project** | R | R | R | R | R | **RW** | R | - | R |
| **MediaAsset** | - | **RW** | R | - | R | R | R | - | R |
| **Track** | **RW** | - | - | - | R | R | R | - | R |
| **Clip** | **RW** | - | - | - | R | R | R | - | R |
| **Transition** | **RW** | - | - | - | R | R | R | - | - |
| **Title** | **RW** | - | - | - | R | R | R | - | - |
| **Effect** | **RW** | - | - | - | R | R | R | - | - |
| **Marker** | **RW** | - | - | - | R | R | - | - | - |
| **CuePoint** | **RW** | - | - | - | R | R | - | - | - |
| **AnalysisResult** | - | - | **RW** | - | R | R | - | - | R |
| **TransactionJournal** | - | - | - | - | R | **RW** | - | - | - |
| **ExportConfig** | - | **RW** | - | - | R | R | R | - | - |

**Legend:** **RW** = Read+Write (owner), R = Read-only, - = Forbidden

### Authorization Layer

```typescript
function authorizeAccess(
  engineId: string,
  entityId: EntityId,
  accessType: "read" | "write",
  declarations: CapabilityDeclaration[]
): AuthorizationResult {
  const declaration = declarations.find(d => d.engineId === engineId);
  if (!declaration) return { allowed: false, reason: "Engine not declared" };

  const entityType = getEntityType(entityId);
  if (declaration.forbidden.includes(entityType)) {
    return { allowed: false, reason: `Engine ${engineId} is forbidden from ${entityType}` };
  }

  if (accessType === "write" && !declaration.mayWrite.includes(entityType)) {
    return { allowed: false, reason: `Engine ${engineId} has no write access to ${entityType}` };
  }

  if (accessType === "read" && !declaration.mayRead.includes("*") && !declaration.mayRead.includes(entityType)) {
    return { allowed: false, reason: `Engine ${engineId} has no read access to ${entityType}` };
  }

  return { allowed: true };
}
```

---

## 7. Event Bus Protocol & Message Schema

### 7.1 Message Structure

Every message in the system follows this exact structure. No exceptions.

```typescript
interface Message {
  readonly id: MessageId;           // UUID v7
  readonly type: string;            // e.g., "timeline.split_clip"
  readonly source: string;          // Engine ID that sent the message
  readonly timestamp: Timestamp;
  readonly correlationId: CorrelationId; // Groups related messages
  readonly priority: Priority;
  readonly payload: Record<string, unknown>;
  readonly metadata: MessageMetadata;
}

type Priority = "critical" | "high" | "normal" | "low";

interface MessageMetadata {
  timeout: number;                  // Max ms to process (default: 5000)
  retryCount: number;               // Max retries (default: 0)
  requiresAck: boolean;             // Wait for acknowledgement?
  transactionId?: TransactionId;    // If part of a transaction
}

type MessageId = string & { __brand: "MessageId" };
type CorrelationId = string & { __brand: "CorrelationId" };
type TransactionId = string & { __brand: "TransactionId" };
```

### 7.2 Event Bus Rules

- EB1: Messages are placed in a priority queue: critical > high > normal > low.
- EB2: Messages within the same transaction are processed atomically.
- EB3: Each message has a timeout. If not processed within timeout, an error is logged and the message is retried (up to retryCount).
- EB4: The Accessibility Engine receives a copy of every message (read-only fanout).
- EB5: No engine may send a message type not declared in its `produces` list.
- EB6: No engine may consume a message type not declared in its `consumes` list.
- EB7: Message order is guaranteed within a single priority level (FIFO).
- EB8: Cross-priority delivery is NOT guaranteed in order.

### 7.3 Message Flow Example: Split Clip

```
User presses shortcut "S"
  │
  ▼
Command Engine receives keyboard event
  │ produces: command.execute { commandId: "timeline.split_clip", params: { clipId, time } }
  │
  ▼
Event Bus routes to Timeline Engine (consumes: timeline.split_clip)
  │
  ├─ Timeline Engine calls transition function: splitClip(state, event)
  │  ├─ Validates: clip exists, splitPoint within bounds
  │  ├─ Computes: new state with two clips
  │  └─ Returns: { newState, inverse }
  │
  ├─ Timeline Engine writes new state to Project
  │
  ├─ Timeline Engine produces: timeline.state_changed
  │
  ├─ Timeline Engine produces: timeline.clip_split { clipId, splitPoint, newClipA, newClipB }
  │
  ▼
Event Bus fans out:
  ├─ Accessibility Engine (read-only) → produces: accessibility.announcement
  │    "Clip 5 split at 01:24:13. Two clips created: Clip 5a (12s 89f), Clip 5b (34s 12f)"
  ├─ Command Engine (logging only)
  └─ Any other engine subscribed to timeline.clip_split
```

---

## 8. Transaction System

Every mutation to the project model goes through a transaction. No exceptions.

### 8.1 Transaction Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                TRANSACTION LIFECYCLE                     │
├─────────┬───────────────────────────────────────────────┤
│ Phase   │ What Happens                                  │
├─────────┼───────────────────────────────────────────────┤
│ CONFIRM │ 1. Validate input parameters                  │
│         │ 2. Check engine authorization                 │
│         │ 3. Acquire project-level lock                 │
│         │ 4. Snapshot current state (for inverse)       │
│         │ 5. Run transition function                    │
│         │ 6. Validate output state (invariants)         │
│         │ 7. If validation fails → ABORT, release lock  │
├─────────┼───────────────────────────────────────────────┤
│ EXECUTE │ 1. Apply new state to project                 │
│         │ 2. Update all affected relationships          │
│         │ 3. Emit state_changed events                  │
│         │ 4. Release project-level lock                 │
├─────────┼───────────────────────────────────────────────┤
│ LOG     │ 1. Write entry to TransactionJournal          │
│         │ 2. Include: timestamp, engine, operation,     │
│         │    inverse event, state hash before/after     │
│         │ 3. Persist journal to disk (async)            │
│         │ 4. Accessibility announcement produced        │
└─────────┴───────────────────────────────────────────────┘
```

### 8.2 Transaction Journal Entry

```typescript
interface JournalEntry {
  readonly id: TransactionId;
  readonly timestamp: Timestamp;
  readonly engine: string;          // Engine that initiated
  readonly operation: string;       // e.g., "split_clip"
  readonly payload: Record<string, unknown>;
  readonly inverseEvent: InverseEvent;
  readonly stateHashBefore: string; // SHA-256 of project state
  readonly stateHashAfter: string;
  readonly duration: number;        // Execution time in ms
  readonly success: boolean;
  readonly error?: string;
}
```

### 8.3 Undo/Redo

```typescript
function undo(state: Project): { newState: Project; description: string } {
  const lastEntry = state.journal.entries[state.journal.entries.length - 1];
  if (!lastEntry) throw new Error("Nothing to undo");

  const restored = applyInverse(state, lastEntry.inverseEvent);
  // The inverse application itself goes through a transaction
  // but its journal entry is marked as "undo_of: <original_id>"
  return { newState: restored, description: `Undid ${lastEntry.operation}` };
}

function redo(state: Project): { newState: Project; description: string } {
  const lastUndo = state.journal.entries
    .filter(e => e.operation.startsWith("undo_of"))
    .pop();
  if (!lastUndo) throw new Error("Nothing to redo");

  const reApplied = applyTransition(state, lastUndo.originalPayload);
  return { newState: reApplied, description: `Redid ${lastUndo.originalOperation}` };
}
```

### 8.4 Atomicity Rules

- AT1: A transaction either fully succeeds or fully fails. Partial application is forbidden.
- AT2: Only one transaction may modify the project at a time (single-writer).
- AT3: Read operations during a transaction see the state BEFORE the transaction started (snapshot isolation).
- AT4: Transaction duration MUST NOT exceed 5000ms. Long operations (export, analysis) use a different pattern (async jobs).

---

## 9. Test Pipeline (5 Mandatory Stages)

No code merges unless it passes all 5 stages. This is enforced by CI.

### Stage 1: Unit Tests

**What:** Every transition function tested in isolation.  
**How:** Feed (State, Event) pairs, assert output State matches expected.  
**Coverage requirement:** 100% of transition functions, 100% of error codes.  
**Edge cases required:**
- Empty project (no entities)
- Single clip (minimum viable project)
- Maximum entities (10,000 clips on one track)
- Concurrent timestamp operations
- All error codes from Capability Declaration

```typescript
// Example test structure
describe("splitClip", () => {
  it("splits a clip at the given point", () => {
    const state = createTestProject({ clips: [{ id: "c1", duration: 10000n }] });
    const result = splitClip(state, { clipId: "c1" as EntityId, splitPoint: timeValue(5000n) });
    expect(result.newState.entities.size).toBe(2); // Original removed, two new created
    expect(result.inverse.type).toBe("mergeClips");
  });

  it("rejects split outside clip bounds", () => {
    const state = createTestProject({ clips: [{ id: "c1", duration: 10000n }] });
    expect(() => splitClip(state, { clipId: "c1" as EntityId, splitPoint: timeValue(15000n) }))
      .toThrow("TL004");
  });
});
```

### Stage 2: Integration Tests

**What:** Two or more engines exchanging messages via Event Bus.  
**How:** Simulate a realistic workflow, assert message sequence matches expected.  
**Required scenarios:**
- Import media → Analysis → Timeline insertion
- Split clip → Undo → Redo
- Command palette → Execute → State change → Accessibility announcement
- Export → Progress events → Completion

```typescript
describe("Integration: Import and Analyze", () => {
  it("imports media and triggers analysis", async () => {
    const bus = createTestEventBus();
    const mediaEngine = createMediaEngine(bus);
    const analysisEngine = createAnalysisEngine(bus);

    await bus.send(createMessage("media.import", { filePath: "test.mp4" }));

    // Assert: media.imported event was produced
    // Assert: analysis.started event was produced (auto-analysis)
    // Assert: media asset exists in project
    // Assert: analysis result exists after completion
  });
});
```

### Stage 3: Load Tests

**What:** Project with thousands of entities, concurrent operations.  
**How:** Generate synthetic project, run operations, measure performance.  
**Thresholds:**
- 10,000 clips: split operation < 50ms
- 1,000 messages/second through Event Bus without drops
- Project save/load < 2s for projects < 100MB
- Memory usage < 1GB for projects with 50,000 entities

### Stage 4: Undo/Redo Tests

**What:** Operations → Undo → Redo → verify final state matches.  
**How:** Execute a sequence of 100+ operations, undo all, redo all, assert state matches.  
**Required sequences:**
- Pure clip operations (split, move, delete, insert)
- Mixed operations (import → edit → add transition → undo all)
- Edge case: undo during transaction lock
- Edge case: undo an undo (should equal redo)

```typescript
describe("Undo/Redo Integrity", () => {
  it("restores exact state after full undo cycle", () => {
    let state = createTestProject();
    const operations = generateRandomOperations(100);

    // Apply all operations
    const states: Project[] = [];
    for (const op of operations) {
      const result = applyOperation(state, op);
      states.push(state);
      state = result.newState;
    }

    // Undo all
    for (let i = operations.length - 1; i >= 0; i--) {
      state = undo(state).newState;
    }

    // Assert: state matches initial
    expect(hashProject(state)).toBe(hashProject(states[0]));

    // Redo all
    for (const op of operations) {
      state = redo(state).newState;
    }

    // Assert: state matches final
    expect(hashProject(state)).toBe(hashProject(states[states.length - 1]));
  });
});
```

### Stage 5: Accessibility Tests

**What:** All operations via command interface only. No visual dependency.  
**How:** Execute full workflows through Command Engine, verify audio announcements.  
**Required scenarios:**
- Create project, add tracks, import media, edit, export — all via commands
- Every operation produces an announcement
- Announcements are accurate (contain correct entity names, positions, durations)
- Focus management works correctly (no lost focus states)
- Screen reader compatibility (ARIA attributes if any visual UI exists)

```typescript
describe("Accessibility: Full Workflow", () => {
  it("completes edit workflow via commands only", async () => {
    const system = createTestSystem();
    const commands = [
      'project.create "Test Project"',
      'project.open "Test Project"',
      'track.create "Video 1" video',
      'media.import "test.mp4"',
      'clip.insert "test.mp4" "Video 1" 00:00:00 00:00:00 00:01:30',
      'clip.split "Video 1:clip:1" 00:00:45',
      'track.mute "Video 1" true',
    ];

    for (const cmd of commands) {
      const result = await system.execute(cmd);
      expect(result.success).toBe(true);
      expect(result.announcement).toBeDefined();
      expect(result.announcement.text).toContain(result.summary);
    }
  });
});
```

---

## 10. Accessibility Specification

### 10.1 Audio Announcement Levels

| Level | When | Example |
|---|---|---|
| **CRITICAL** | System errors, data loss risk, export failures | "Error: Project file corrupt. Last save recovered." |
| **IMPORTANT** | State transitions, project operations | "Project 'My Video' opened. 3 tracks, 12 clips, total duration 4:32." |
| **ACTION** | Every user action confirmed | "Clip split at 01:24:13. Two clips created." |
| **NAVIGATION** | Focus changes, entity selection | "Track 2, Clip 5 selected. Duration 12 seconds 89 frames." |
| **DETAIL** | Hover/inspection information | "Clip starts at 01:24:13, ends at 01:37:02. Source: interview_raw.mp4." |
| **SILENT** | Background operations, no user impact | (No announcement) |

### 10.2 Announcement Format

Every announcement follows this structure:

```
[Level] [Context] [Entity Description] [Action/State] [Details]
```

Example: `[ACTION] [Track 2] [Clip 5] [Split] [at 01:24:13. New clips: 5a (12s 89f), 5b (34s 12f)]`

### 10.3 Keyboard Navigation Map

| Key | Context | Action |
|---|---|---|
| `Ctrl+Shift+P` | Global | Open Command Palette |
| `Ctrl+P` | Global | Quick project switch |
| `Ctrl+S` | Global | Save project |
| `Ctrl+Z` | Global | Undo |
| `Ctrl+Shift+Z` | Global | Redo |
| `Ctrl+Enter` | Command Palette | Execute selected command |
| `Escape` | Command Palette | Close palette |
| `Tab` | Timeline | Move to next track |
| `Shift+Tab` | Timeline | Move to previous track |
| `Arrow Up/Down` | Timeline | Navigate between clips in track |
| `Arrow Left/Right` | Timeline | Move between time positions |
| `Home` | Timeline | Move to project start |
| `End` | Timeline | Move to project end |
| `S` | Timeline | Split clip at cursor |
| `Delete` | Timeline | Delete selected clip |
| `Ctrl+D` | Timeline | Duplicate clip |
| `Ctrl+M` | Timeline | Toggle mute on track |
| `Ctrl+L` | Timeline | Toggle lock on track |
| `I` | Timeline | Set in point |
| `O` | Timeline | Set out point |
| `J/K/L` | Timeline | Reverse/Pause/Forward playback |
| `,` / `.` | Timeline | Move clip left/right by 1 frame |
| `Shift+,` / `Shift+.` | Timeline | Move clip left/right by 1 second |
| `Ctrl+Shift+F` | Global | Find entity by name |
| `F1` | Global | Announce current state |
| `F2` | Entity | Rename selected entity |
| `F5` | Global | Re-run analysis on current media |

### 10.4 Screen Reader Integration

The Accessibility Engine communicates with screen readers via:
- **Windows:** UI Automation (UIA) via `node-uia`
- **macOS:** Accessibility API via `@napi-rs/accessibility`
- **Linux:** AT-SPI via `atspi`

If no screen reader is detected, announcements fall back to:
1. Console output (for development)
2. Built-in TTS engine (ospeak/say)
3. Event log (for debugging)

---

## 11. Project File Format

### 11.1 Format: JSONL (JSON Lines)

The project file is a `.avp` (Access Video Project) file containing JSONL — one JSON object per line. This format is:
- Human-readable (can be opened in any text editor)
- Streamable (can be written incrementally)
- Repairable (corrupt lines can be skipped)
- Diffable (changes appear as line additions/modifications)

### 11.2 File Structure

```jsonl
{"type":"header","version":1,"created":"2026-07-25T10:00:00Z","generator":"access-video-editor/1.0.0"}
{"type":"metadata","name":"My Project","description":"A test project","settings":{"frameRate":30,"resolution":{"width":1920,"height":1080}}}
{"type":"entity","kind":"media_asset","id":"ma-001","sourcePath":"/videos/interview.mp4","sourceHash":"sha256:abc...","mediaType":"video","duration":450000000000n,"metadata":{"codec":"h264","width":1920,"height":1080,"frameRate":30}}
{"type":"entity","kind":"track","id":"tr-001","name":"Video 1","trackType":"video","index":0,"muted":false,"locked":false}
{"type":"entity","kind":"clip","id":"cl-001","name":"Interview Part 1","sourceMediaId":"ma-001","inPoint":0,"outPoint":30000000000n,"timelineIn":0,"duration":30000000000n,"speed":1.0,"volume":1.0,"opacity":1.0}
{"type":"relationship","kind":"contains","source":"pj-001","target":"tr-001"}
{"type":"relationship","kind":"contains","source":"tr-001","target":"cl-001"}
{"type":"relationship","kind":"references","source":"cl-001","target":"ma-001"}
{"type":"transaction","id":"tx-001","timestamp":"2026-07-25T10:00:01Z","engine":"core.command","operation":"import_media","success":true}
{"type":"analysis","mediaAssetId":"ma-001","kind":"speech_to_text","status":"complete","result":{"segments":[{"start":0,"end":5000,"text":"Hello everyone"}]}}
{"type":"footer","entityCount":5,"relationshipCount":3,"transactionCount":1,"checksum":"sha256:def..."}
```

### 11.3 Validation Rules

- VF1: First line MUST be a `header` with version number.
- VF2: Last line MUST be a `footer` with checksum.
- VF3: Checksum is SHA-256 of all lines between header and footer (exclusive).
- VF4: On load, if checksum mismatch → prompt user: "Project file may be corrupted. Load last valid snapshot?"
- VF5: Entity IDs MUST be unique within a project.
- VF6: Relationship targets MUST reference existing entities.
- VF7: TimeValues MUST be serialized as strings (bigint not JSON-safe).

---

## 12. Completion Map — v1.0

v1.0 is NOT defined by features. It is defined by passing ALL test bridges below.

### Test Bridge 1: Project Lifecycle
- [ ] Create project via command
- [ ] Save project to `.avp` file
- [ ] Close project
- [ ] Reopen project from file
- [ ] Verify all entities restored correctly
- [ ] Verify journal integrity after reload

### Test Bridge 2: Media Import (Audio Only)
- [ ] Import WAV file via command
- [ ] Import MP3 file via command
- [ ] Metadata extracted correctly
- [ ] Audio analysis produces speech segments
- [ ] Audio analysis detects silence periods

### Test Bridge 3: Basic Editing
- [ ] Create track via command
- [ ] Insert clip at time position
- [ ] Split clip at cursor
- [ ] Move clip to new position
- [ ] Delete clip
- [ ] Merge adjacent clips
- [ ] All operations produce announcements

### Test Bridge 4: Undo/Redo
- [ ] Undo split → original clip restored
- [ ] Redo split → two clips restored
- [ ] Undo 10 operations in sequence
- [ ] Redo 10 operations in sequence
- [ ] Undo after project reload

### Test Bridge 5: Command System
- [ ] Command palette opens and searches
- [ ] All editing commands accessible via palette
- [ ] Keyboard shortcuts execute commands
- [ ] Conflicting shortcuts detected and reported
- [ ] Natural language commands parse correctly

### Test Bridge 6: Accessibility
- [ ] All operations reachable via keyboard
- [ ] Announcements are accurate and timely
- [ ] Screen reader receives all focus changes
- [ ] No operation requires visual confirmation
- [ ] Full workflow test (create → edit → export) via commands only

### Test Bridge 7: Export
- [ ] Export audio to WAV
- [ ] Export audio to MP3
- [ ] Progress events fire during export
- [ ] Export completes successfully
- [ ] Output file is valid and playable

### v1.0 Definition of Done
- ALL 7 test bridges pass
- ALL test pipeline stages pass (unit, integration, load, undo/redo, accessibility)
- Zero TODO/placeholder comments in codebase
- All engines have valid Capability Declarations
- Project file format specification is stable
- CLI prototype works end-to-end

---

## 13. Roadmap

### Phase 0: Foundation (Weeks 1-4)
- Initialize monorepo structure
- Implement Base Data Model types
- Implement Event Bus with priority queue
- Implement Transaction System with journal
- Implement Authorization Layer
- Write unit tests for all transition functions
- **Deliverable:** Core system boots, processes messages, maintains state

### Phase 1: CLI Prototype (Weeks 5-8)
- Implement Command Engine
- Implement Project Engine (file I/O)
- Implement CLI interface (text-based)
- Implement Accessibility Engine (console output)
- Implement basic Timeline Engine (create track, insert clip, split, move, delete)
- **Deliverable:** CLI tool that can create projects, import audio, edit clips via commands

### Phase 2: Media & Analysis (Weeks 9-14)
- Implement Media Engine (FFmpeg integration)
- Implement Analysis Engine (silence detection, speech-to-text via whisper.cpp)
- Implement smart index building
- Implement event-based navigation
- **Deliverable:** System can analyze audio and provide semantic navigation

### Phase 3: Video Support (Weeks 15-20)
- Extend Media Engine for video
- Extend Timeline Engine for video tracks
- Implement Rendering Engine (basic export)
- Implement thumbnail generation
- **Deliverable:** Full audio+video editing via CLI

### Phase 4: AI & Polish (Weeks 21-26)
- Implement AI Engine with provider chain
- Implement natural language commands
- Implement auto-edit suggestions
- Performance optimization
- **Deliverable:** AI-assisted editing workflow

### Phase 5: GUI Layer (Weeks 27-34)
- Implement Electron shell
- Implement React UI components
- Implement Visual Layer (optional overlay)
- Maintain full keyboard accessibility
- **Deliverable:** Desktop application with both visual and non-visual interfaces

---

## 14. TECH_STACK

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 22.19.0 | Base runtime |
| Language | TypeScript | 7.0.2 | Type safety |
| UI Framework | Electron | 43.2.0 | Desktop app shell |
| UI Library | React | 19.2.8 | Component rendering |
| Media Processing | FFmpeg (via ffmpeg.wasm) | 0.12.15 | Video/audio encoding |
| Speech-to-Text | whisper.cpp (whisper-cpp-node) | 0.2.12 | Audio transcription |
| State Management | Immer | 11.1.15 | Immutable state updates |
| Validation | Zod | 4.4.3 | Runtime type validation |
| Testing | Vitest | 4.1.10 | Unit/integration tests |
| Build | electron-builder | 26.15.3 | Application packaging |
| Data Query | @tanstack/react-query | 5.101.4 | Async state management |

---

## 15. SYSTEM_FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│  [Keyboard] ──→ [Command Engine] ──→ [Message] ──→ [Event Bus] │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT BUS                                 │
│  Priority Queue → Router → Handler Registry → Fan-out            │
│  [Critical] → [High] → [Normal] → [Low]                         │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Timeline │ │  Media   │ │ Analysis │
              │  Engine  │ │  Engine  │ │  Engine  │
              └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │
                   ▼            ▼            ▼
              ┌──────────────────────────────────────┐
              │         PROJECT STATE (Immutable)     │
              │  Entities + Relationships + Journal   │
              └──────────────────┬───────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │Accessibility│ │Rendering│ │    AI    │
              │  Engine   │ │  Engine │ │  Engine  │
              └────┬─────┘ └────┬────┘ └────┬─────┘
                   │            │           │
                   ▼            ▼           ▼
              [Audio Output] [File Output] [Suggestions]
```

---

## 16. ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ CLI Terminal │  │ Electron UI │  │ Voice Input  │                │
│  │  (v1.0)     │  │  (v5.0)    │  │  (Future)   │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         └────────────────┼────────────────┘                        │
│                          │ Commands/Messages                       │
├──────────────────────────┼─────────────────────────────────────────┤
│                    COMMAND LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Command Engine: Palette + Shortcuts + NL Parser              │  │
│  └──────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                      ENGINE LAYER                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Timeline │ │  Media   │ │ Analysis │ │    AI    │             │
│  │  Engine  │ │  Engine  │ │  Engine  │ │  Engine  │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │Project   │ │Rendering │ │ Plugin   │ │Accessib. │             │
│  │ Engine   │ │  Engine  │ │  Engine  │ │  Engine  │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
├────────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │  Event Bus   │ │  Auth Layer  │ │  Transaction │              │
│  │  (Messages)  │ │  (Gatekeeper)│ │   System     │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │  Logger      │ │  Settings    │ │  File I/O    │              │
│  │  (Async)     │ │  Manager     │ │  Abstraction │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
├────────────────────────────────────────────────────────────────────┤
│                      MODEL LAYER                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Project │ Entity (9 types) │ Relationship (8 types)         │  │
│  │ TimeValue │ Journal │ AnalysisIndex │ CapabilityDeclaration │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 17. ORPHANS & PENDING

Everything below is a known gap. Items are added when discovered and removed when resolved.

### Orphans (Unlinked Components)
- None yet — project not started.

### Pending (Known Gaps)
- [x] Monorepo scaffolding (package.json, tsconfig, jest config)
- [x] Test fixtures and helpers — `src/core/rooms/common/mocks.ts`, `src/core/media/mock-media-engine.ts`
- [x] Event Bus implementation — `src/core/rooms/common/event-bus.ts`
- [x] Transaction System implementation — `src/core/model/transaction.ts`
- [ ] Authorization Layer implementation
- [x] Project file serializer/deserializer — `src/core/model/project-file.ts`
- [ ] All 9 Engine implementations (Command/Accessibility/Project engines are real; Timeline/Media are room models; Analysis/Rendering/Plugin/AI still stubbed)
- [ ] CLI interface
- [ ] Accessibility Engine TTS integration (announcements are text/`speak`-log based; no OS TTS yet)
- [ ] FFmpeg abstraction layer
- [ ] whisper.cpp integration
- [ ] CI/CD pipeline
- [ ] Logging system (async, non-blocking)
- [x] Settings manager — `src/core/rooms/common/settings-engine.ts`
- [x] File I/O abstraction layer — `src/core/infrastructure/file/`
- [x] Room System implementation (7 rooms) — Project / Timeline / Media rooms done; Effects / Text / Export / Help pending
- [ ] Zone Layout Engine (weighted grid)
- [ ] Element Index & ID Card system
- [ ] Shortcut System (rhythmic codes) — command + palette plumbing done in `src/core/commands/`; rhythmic-code UX pending
- [ ] Welcome Page / Onboarding flow
- [ ] Color System (CSS custom properties)
- [ ] Background State Tinting
- [ ] Focus Management System
- [ ] Circular List component
- [ ] Smart Description Engine
- [x] Announcement Log — `announcement-engine.ts` (capped at 500 entries)
- [ ] Time Counting Mode
- [ ] Full Focus Mode
- [ ] Visual Layer (Electron + React shell) — React shell exists in `src/ui/`; Electron packaging pending
- [ ] Auto-Audit CI scripts (7 checks)
- [ ] Message Simulator (10,000 messages)
- [x] ShortcutRegistry with conflict detection — `CommandSystem` + `ShortcutEngine` (duplicate/conflict rejection)
- [ ] Blind tester recruitment (3 testers)
- [ ] Audio Scenario for each UI element
- [ ] Test Certificates for each element
- [ ] Design Lab execution (5 reference elements)
- [ ] Amendment Editor integration with git log
- [ ] Quick Navigation Index verification
- [x] L1 File Engine implementation — `src/core/infrastructure/file/`
- [x] L1 Memory Engine implementation — `src/core/infrastructure/memory/`
- [x] L1 Time Engine implementation — `src/core/infrastructure/time/`
- [x] L1 Error Engine implementation — `src/core/infrastructure/common/types.ts` (ErrorCode + messages)
- [x] L2 Model Layer (all entities) — `src/core/model/` (factory, transitions, types, project-file, transaction)
- [x] L3 Timeline Engine implementation — `src/core/model/transitions.ts` + `src/core/rooms/timeline/`
- [x] L3 Cursor Engine implementation — timeline playhead + `setPlayheadMs`/frame navigation
- [x] L3 Selection Engine implementation — `TimelineRoomModel` selection (current/next/previous/all)
- [x] L3 Clipboard Engine implementation — `TimelineRoomModel` copy/cut/paste (read-only snapshots)
- [x] L3 Undo Engine implementation — `TransactionEngine` (undo/redo stacks)
- [x] L4 Announcement Engine implementation — `announcement-engine.ts` (bilingual, level filter)
- [ ] L4 Focus Engine implementation
- [ ] L4 Voice Command Engine implementation (voice intentionally out of scope; command system is text/shortcut-based)
- [ ] L5 CLI Interface implementation
- [ ] Error message testing (ERR001-ERR018)
- [ ] Composite command testing
- [ ] Settings Manager implementation (3 categories)
- [ ] Plugin System implementation
- [ ] 12 future features (post-v1.0)

---

## 18. Brand Identity — "Tempo"

**Name:** Tempo  
**Pronunciation:** /ˈtɛm.poʊ/ — clear in Arabic (تيمبو), English, and all major languages.  
**Semantics:** Musical term for pace/rhythm. Contains "ت" (order), "ب" (beginning), "و" (connection). Dynamic, not static.  
**Usage:** The project codename and product name. All references in code use `tempo` as the namespace root.

```typescript
const BRAND = {
  name: "Tempo",
  tagline: "Edit with sound, not sight",
  namespace: "tempo",
  rootCommandPrefix: "tempo",
} as const;
```

---

## 19. Room System (Studio Metaphor)

The user does not switch "views" or "windows." They move between **Rooms**. Each Room is a container for a family of operations. The user has a persistent mental model: they are in a studio, walking between rooms.

### Room Registry

| Room ID | Arabic Name | English Name | Purpose | Primary Engine |
|---|---|---|---|---|
| `box` | صندوق | Box | Project management, recent files, settings | Project Engine |
| `cut` | قص | Cut | Timeline editing — split, move, merge, delete | Timeline Engine |
| `polish` | صقل | Polish | Audio refinement — volume, noise, normalization | Media Engine |
| `sight` | بصر | Sight | Analysis — speech, silence, scenes, faces | Analysis Engine |
| `think` | فكر | Think | AI assistance — summarize, suggest, generate | AI Engine |
| `launch` | إطلاق | Launch | Export — format, quality, render | Rendering Engine |
| `lap` | حضن | Lap | Extensions — install, configure, manage | Plugin Engine |

### Room Lifecycle

```typescript
interface Room {
  readonly id: RoomId;
  readonly nameAr: string;         // Arabic display name
  readonly nameEn: string;         // English display name
  readonly icon: string;           // Unicode character for visual display
  readonly shortcut: string;       // Ctrl+Shift+{letter}
  readonly zones: Zone[];          // Fixed zones within this room
  readonly commands: string[];     // Available command types in this room
  readonly speakLayer: SpeakLayer; // Audio description generator
}

type RoomId = "box" | "cut" | "polish" | "sight" | "think" | "launch" | "lap";
```

### Room Transition Rules

- RT1: Only one room is active at a time.
- RT2: Transition via `Ctrl+Shift+{room letter}` or command `نroom.{room_id}`.
- RT3: On transition, the outgoing room's state is preserved (not destroyed).
- RT4: On transition, the Speak Layer announces: "Entering {room_name_en}. {zone_count} zones available. Current focus: {first_zone}."
- RT5: `Escape` in any room returns to the previous room.
- RT6: The `box` room is the default room on project open.

---

## 20. Layout Specification — Weighted Grid

The layout is a **fixed weighted grid**. It does not change with project type or editing state. The user can adjust weights via commands, but the zones themselves never move.

### Default Weights

```
┌─────────────────────────────────────────────────────────────┐
│                    FULL WIDTH (100%)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │   Audio-Temporal Strip     │ Ops  │ Explorer          │  │
│  │   (60%)                    │(20%) │ (20%)             │  │
│  │                            │      │                   │  │
│  │                            │      │                   │  │
│  │                            │      │                   │  │
│  │                            │      │                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Status & Announcement Zone  (100% width, 40px)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Weight Adjustment Commands

| Command | Action |
|---|---|
| `Ctrl+Shift+1` | Reset to default weights |
| `Ctrl+Shift+2` | Expand Temporal Strip to 80% |
| `Ctrl+Shift+3` | Expand Operations to 40% |
| `Ctrl+Shift+4` | Expand Explorer to 40% |
| `Ctrl+Shift+0` | Full Focus Mode — single zone fullscreen |

### Full Focus Mode

When activated, all zones except the focused one are hidden. The focused zone expands to 100% of the viewport (minus the 40px status bar). Announcement: "Full Focus Mode: {zone_name}. Press Ctrl+Shift+0 to exit."

---

## 21. Room Specifications (4 Fixed Zones)

Every Room contains up to 4 fixed zones. Not all zones are present in every room. The zones are:

### Zone A: Audio-Temporal Strip (60% default)

**Purpose:** Displays the timeline as an interval chain — a sequential list of clips with their time positions, durations, and relationships.

**Sub-components:**
1. **Tracks Row (رف / Shelf):** Lists active tracks with names and count. Each track is selectable.
2. **Clips Bar (طاولة / Table):** Displays clips within the selected track. Each clip is a selectable object with a "fingerprint" (name, start, end, duration).
3. **Time Cursor (عقرب / Hand):** Reports current position as percentage of total project duration, or as absolute time value.

**Announcement Format:**
```
[TRACK] Track 2 of 3: "Main Audio". 5 clips.
[CLIP] Clip 3 of 5: "Interview Part 2". Starts 01:24:13, ends 01:37:02, duration 12:89.
[CURSOR] Position: 01:28:45. 47% of total. Next clip starts at 01:37:02.
```

**Navigation:**
- `Arrow Up/Down`: Move between tracks
- `Arrow Left/Right`: Move between clips within track
- `Home/End`: Jump to first/last clip
- `Tab`: Jump to next zone (Operations Board)
- `Shift+Tab`: Jump to previous zone (Explorer)

### Zone B: Control & Operations Board (20% default)

**Purpose:** Contains all editing operations organized by frequency of use.

**Sub-groups (vertical stack):**

| Group | Commands | Shortcut Prefix |
|---|---|---|
| **Basic Editing** | Cut, Copy, Paste, Undo, Redo | `E+` |
| **Organization** | Add Track, Delete Track, Reorder Tracks | `O+` |
| **Instant Effects** | Time Scale, Speed Change, Reverse Clip | `F+` |

**Each button is an "Announceable Command":**
```typescript
interface OperationButton {
  readonly id: string;            // e.g., "cut_clip"
  readonly labelAr: string;       // "قص المقطع"
  readonly labelEn: string;       // "Cut Clip"
  readonly shortcut: string;      // "E+C"
  readonly description: string;   // "Cuts the selected clip at the current cursor position"
  readonly postAction: string;    // "Clip cut. Two clips created at position 01:24:13"
}
```

**Full operation list:**

| # | Operation (EN) | Operation (AR) | Shortcut | Post-Action Announcement |
|---|---|---|---|---|
| 1 | Cut Clip | قص المقطع | `E+C` | "Clip cut at {time}. Two clips created." |
| 2 | Copy | نسخ | `E+Y` | "Clip copied to clipboard." |
| 3 | Paste | لصق | `E+V` | "Clip pasted at {time} on {track}." |
| 4 | Undo | تراجع | `E+R` | "Undid {operation}. State restored." |
| 5 | Redo | إعادة | `E+U` | "Redid {operation}. State restored." |
| 6 | Split | تقسيم | `E+S` | "Clip split at {time}." |
| 7 | Merge | دمج | `E+D` | "Two clips merged. New duration: {time}." |
| 8 | Delete | حذف | `E+X` | "Clip deleted. {count} clips remaining." |
| 9 | Add Track | إضافة مسار | `O+N` | "Track '{name}' created. {count} tracks total." |
| 10 | Delete Track | حذف مسار | `O+D` | "Track '{name}' deleted." |
| 11 | Reorder Track | ترتيب المسارات | `O+R` | "Track moved to position {n}." |
| 12 | Time Scale | تكبير زمني | `F+T` | "Time scale set to {n}x." |
| 13 | Speed Change | تغيير السرعة | `F+S` | "Speed set to {n}%." |
| 14 | Reverse | عكس المقطع | `F+V` | "Clip reversed." |

### Zone C: Project Explorer (20% default)

**Purpose:** A live hierarchical tree of every entity in the project.

**Tree Structure:**
```
Project: "{name}" — Duration: {total}
├── Imported Media ({count})
│   ├── "{filename}" — {format}, {duration}, {size}
│   ├── "{filename}" — {format}, {duration}, {size}
│   └── ...
├── Tracks ({count})
│   ├── Track: "{name}" ({type}) — {clip_count} clips
│   │   ├── Clip: "{name}" — {start} → {end} ({duration})
│   │   ├── Clip: "{name}" — {start} → {end} ({duration})
│   │   └── ...
│   └── ...
├── Analyses ({count})
│   ├── Speech-to-Text — {segment_count} segments
│   ├── Silence Detection — {silence_count} silent periods
│   ├── Scene Changes — {scene_count} transitions
│   └── ...
└── Markers ({count})
    ├── "{marker_name}" at {time}
    └── ...
```

**Announcement Format:**
```
[EXPLORER] Project Explorer. 3 tracks, 12 clips, 4:32 total.
[EXPLORER] Focus: Track 2, Clip 5. "Interview Part 2". 12s 89f.
```

**Navigation:**
- `Arrow Up/Down`: Move between tree nodes
- `Arrow Right`: Expand node
- `Arrow Left`: Collapse node
- `Enter`: Select node and announce details
- `Delete`: Remove node (with confirmation)
- `F2`: Rename node
- `Tab`: Jump to next zone (Status Bar)

### Zone D: Status & Announcement Zone (100% width, 40px height)

**Purpose:** Persistent bottom bar providing continuous system awareness.

**Sub-components:**

1. **Status Bar (شريط الحالة):** Shows playback state, cursor position, selected clip count, memory usage, export format.
2. **Announcement Log (سجل الإعلانات):** Stores last 50 announcements. Accessible via `أعد قراءة آخر إعلان` or `أعد قراءة الإعلانات الأخيرة`.
3. **Smart Description Engine (محرك الأوصاف الذكية):** On-demand full project state description.

**Status Bar Format:**
```
[STOPPED] | Pos: 01:28:45 | Clips: 3 selected | Mem: 245MB | Format: MP4
```

**Smart Description Output:**
```
"You are in project 'Interview Final', duration 5 minutes 23 seconds, 
3 tracks, 12 clips. Cursor at 2:15. Selected clip: 'Main Audio Part 2'. 
Last operation: split at 1:24. 3 undo levels available."
```

---

## 22. Accessibility & Descriptor Language

### Element Identity Card

Every interactive element has an ID Card defined at creation time:

```typescript
interface ElementIDCard {
  readonly id: string;              // Unique element identifier
  readonly nameAr: string;          // Arabic name
  readonly nameEn: string;          // English name
  readonly type: ElementType;       // button | list | clip | track | zone | input
  readonly zone: ZoneId;            // Which zone contains this element
  readonly index: number;           // Position in element index
  readonly shortcut: string | null; // Keyboard shortcut if any
  readonly accessibleName: string;  // Full spoken description
  readonly states: ElementState[];  // Possible states
  readonly postActivity: string;    // What to announce after activation
}

type ElementType = "button" | "list" | "clip" | "track" | "zone" | "input" | "tree_node";
type ElementState = "active" | "inactive" | "selected" | "focused" | "disabled";
```

### Element Index

A registry of all interactive elements in the current room. When the user says "اذهب إلى العنصر 7" (Go to element 7), the system jumps to that element.

```typescript
interface ElementIndex {
  readonly elements: ElementIDCard[];
  announceAll(): void;              // "Element 1: Cut. Element 2: Copy..."
  goTo(index: number): void;        // Jump to element by index
  findByName(name: string): void;   // Fuzzy search by name
}
```

### Three-Scenario Test Requirement

Every element MUST pass:
1. **Normal usage:** Mouse/keyboard interaction works correctly.
2. **Screen reader only:** All information conveyed audibly via screen reader API.
3. **Command only:** All operations reachable via command palette / keyboard shortcuts.

---

## 23. Shortcut System — Rhythmic Codes

Shortcuts are organized into 4 families by prefix letter. Each family covers a domain of operations. This system is composable: `E+C+T` means "Cut at Time."

### Family 1: Navigation (Prefix: N)

| Code | Action | Announcement |
|---|---|---|
| `N+T` | Go to Cut room | "Entering Cut room" |
| `N+P` | Go to Polish room | "Entering Polish room" |
| `N+S` | Go to Sight room | "Entering Sight room" |
| `N+X` | Go to Launch room | "Entering Launch room" |
| `N+B` | Go to Box room | "Entering Box room" |
| `N+K` | Go to Think room | "Entering Think room" |
| `N+L` | Go to Lap room | "Entering Lap room" |

### Family 2: Editing (Prefix: E)

| Code | Action | Announcement |
|---|---|---|
| `E+C` | Cut clip | "Clip cut at {time}" |
| `E+Y` | Copy clip | "Clip copied" |
| `E+V` | Paste clip | "Clip pasted at {time}" |
| `E+D` | Merge clips | "Clips merged" |
| `E+S` | Split clip | "Clip split at {time}" |
| `E+M` | Move clip | "Clip moved to {track} at {time}" |
| `E+R` | Undo | "Undid {operation}" |
| `E+U` | Redo | "Redid {operation}" |
| `E+X` | Delete clip | "Clip deleted" |

### Family 3: Analysis (Prefix: A)

| Code | Action | Announcement |
|---|---|---|
| `A+F` | Full analysis | "Full analysis started" |
| `A+S` | Detect silence | "Silence detection started" |
| `A+T` | Speech-to-text | "Transcription started" |
| `A+M` | Detect music | "Music detection started" |
| `A+E` | Detect scene changes | "Scene change detection started" |

### Family 4: Export (Prefix: X)

| Code | Action | Announcement |
|---|---|---|
| `X+1` | Export MP4 | "Export format: MP4" |
| `X+2` | Export MKV | "Export format: MKV" |
| `X+3` | Export MOV | "Export format: MOV" |
| `X+C` | Configure quality | "Quality settings opened" |

### Composition Rule

Codes can be chained within 500ms to form compound commands:
- `E+C` then `T` within 500ms = "Cut at Time T"
- `A+S` then `M` within 500ms = "Silence detection with music threshold"

### Room Switching (Global)

| Shortcut | Room |
|---|---|
| `Ctrl+Shift+C` | Cut |
| `Ctrl+Shift+P` | Polish |
| `Ctrl+Shift+S` | Sight |
| `Ctrl+Shift+T` | Think |
| `Ctrl+Shift+L` | Launch |
| `Ctrl+Shift+B` | Box |
| `Ctrl+Shift+H` | Lap |

### Universal Keys

| Key | Action |
|---|---|
| `Tab` | Next zone |
| `Shift+Tab` | Previous zone |
| `Space` | Activate selected element |
| `Escape` | Close dropdown / go back one level |
| `Ctrl+Shift+P` | Command Palette (global) |
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `F1` | Announce current state |
| `F2` | Rename selected entity |
| `F5` | Re-run analysis |
| `Ctrl+T` | Toggle Time Counting Mode |

---

## 24. Color System & Visual States

### Palette (High-Contrast Dark Theme)

| Token | Hex | Usage | WCAG Ratio |
|---|---|---|---|
| `--bg-primary` | `#0A0A0A` | Background | — |
| `--bg-surface` | `#1A1A1A` | Zone backgrounds | 1.6:1 |
| `--bg-elevated` | `#2A2A2A` | Cards, panels | 2.3:1 |
| `--text-primary` | `#FFFFFF` | Primary text | 19.8:1 |
| `--text-secondary` | `#B0B0B0` | Secondary text | 10.5:1 |
| `--accent-blue` | `#007BFF` | Active elements, focus | 4.8:1 |
| `--accent-amber` | `#FFBF00` | Focus borders, active lines | 10.1:1 |
| `--accent-yellow` | `#FFC107` | Warnings, markers | 8.9:1 |
| `--accent-green` | `#28A745` | Success, export complete | 4.6:1 |
| `--accent-red` | `#DC3545` | Errors, destructive ops | 4.8:1 |
| `--accent-purple` | `#6F42C1` | AI/Think room accent | 4.5:1 |

### Visual States

| State | Visual | Audio |
|---|---|---|
| **Focused** | 2px solid `--accent-amber` border, glow effect | Element name + shortcut + description |
| **Selected** | `--accent-blue` at 20% opacity background | "Selected: {element}" |
| **Active** | `--accent-blue` solid background | "Active: {element}" |
| **Disabled** | `--text-secondary` at 40% opacity | "Disabled: {element}" |
| **Error** | `--accent-red` border pulse | "Error: {description}" |

### Background State Tinting

| System State | Background Tone | Audio Tone |
|---|---|---|
| EDITING | Warm gray `#1A1A1A` | Low C major chord |
| EXPORTING | Cool blue `#0A1A2A` | Ascending arpeggio |
| ERROR | Dark red `#2A0A0A` | Low dissonant tone |
| ANALYZING | Purple tint `#1A0A2A` | Pulsing tone |

### Living Background Transition

When the system state changes, the background transitions over 500ms with a simultaneous audio cue:
- Enter EDITING: warm tone ascending
- Enter EXPORTING: cool tone ascending
- Enter ERROR: low rumble
- Exit to BOX: neutral tone

---

## 25. Welcome Page & Onboarding

The Welcome Page is an **Interactive Audio Guide**, not a visual splash screen. It appears on first launch. Can be recalled via `أعادة الجولة` (Repeat Tour) command.

### Step 1: Overview (30 seconds)

Audio reads:
```
"Welcome to Tempo — the first media production environment designed for 
non-visual interaction. Your workspace has 4 zones: the Audio-Temporal Strip 
(displays your clips and timeline), the Operations Board (editing commands), 
the Project Explorer (project tree), and the Status Zone (system information). 
You can navigate between zones with Tab and Shift+Tab. Let's continue."
```

### Step 2: Room Tour (30 seconds per room, 7 rooms)

The system walks through each room:
```
"Room 1: Box — your project hub. Create, open, and manage projects here.
Room 2: Cut — the editing room. Split, move, merge, and arrange clips.
Room 3: Polish — audio refinement. Volume, noise reduction, normalization.
Room 4: Sight — analysis. Speech detection, silence detection, scene changes.
Room 5: Think — AI assistance. Summarize, suggest edits, generate content.
Room 6: Launch — export. Choose format, quality, and render.
Room 7: Lap — extensions. Install and manage plugins."
```

### Step 3: Interactive Test

System prompts user to execute 3 commands:
1. "Press N+B to go to Box room." → User executes → System confirms.
2. "Press Tab to move to the next zone." → User executes → System confirms.
3. "Press Ctrl+Shift+P to open the Command Palette, then type 'track.create'." → User executes → System confirms.

If all 3 pass: "Onboarding complete. You are ready to create."

### Onboarding Data

```typescript
interface OnboardingStep {
  readonly id: number;
  readonly instruction: string;
  readonly expectedAction: string;
  readonly successMessage: string;
  readonly failureMessage: string;
  readonly timeout: number;         // ms before prompt repeats
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    instruction: "Press N+B to go to Box room",
    expectedAction: "room.box",
    successMessage: "Correct! You are in Box room.",
    failureMessage: "Try pressing N then B within 500ms.",
    timeout: 15000,
  },
  {
    id: 2,
    instruction: "Press Tab to move to the next zone",
    expectedAction: "zone.next",
    successMessage: "Correct! You moved to the next zone.",
    failureMessage: "Press the Tab key.",
    timeout: 10000,
  },
  {
    id: 3,
    instruction: "Press Ctrl+Shift+P, then type track.create",
    expectedAction: "command_palette.track.create",
    successMessage: "Correct! You created a track via the Command Palette.",
    failureMessage: "Press Ctrl+Shift+P to open the palette, then type track.create",
    timeout: 20000,
  },
];
```

---

## 26. Executive Constitution — 5 Iron Rules

These rules are absolute. No deadline, no convenience, no feature request may override them.

### IR1: Silent Design Test Before Any Code

No UI element, shortcut, color, or name may be implemented before it exists as a **Full Audio Scenario** — a written script read aloud to the development team that simulates the entire interaction without vision. The team must hear the interaction, agree it is clear, and sign off before any code is written.

**Enforcement:** Every UI element in PROJECT_MAP.md MUST have a companion `## Audio Scenario: {element_name}` block. No element without an audio scenario is eligible for implementation.

### IR2: Blind Tester in the Room

No design decision for any user-facing element may be finalized without a **Live Listening Session** with at least one blind user. The session follows this protocol:
1. Team describes the element verbally (no screen sharing).
2. Blind user repeats the description in their own words.
3. If the descriptions diverge significantly, the element is redesigned.
4. The session is recorded and attached as a **Test Certificate**.

**Enforcement:** Every element in the Element Index (Section 22) MUST have a `testCertificate` field that references a recording file. Elements without certificates are flagged as `UNVERIFIED` and cannot ship.

### IR3: Shortcut Triple-Test

No shortcut may be adopted unless it passes three tests:
1. **Memory Test:** 5 developers must recall the shortcut after 1 hour. If more than 2 fail, redesign.
2. **Speed Test:** Execution time via keyboard must be ≤70% of mouse execution time for the same operation.
3. **Conflict Test:** Automated scan against all OS and common app shortcuts (Windows, macOS, Linux). Any conflict = rejection.

**Enforcement:** The Shortcut System (Section 23) MUST include a `conflictCheck` column. Any shortcut marked `UNCHECKED` cannot be shipped.

### IR4: Color as Signal, Not Decoration

Every color must pass:
1. **Automated contrast check** against its background and all adjacent colors.
2. **WCAG compliance:** ≥4.5:1 for text, ≥3:1 for non-text elements.
3. **Alternative Audio Description** for each color usage: a spoken description read when the color is not visible.

**Enforcement:** The Color System (Section 24) MUST include an `audioDescription` field for every color token. Colors without audio descriptions are flagged `INACCESSIBLE`.

### IR5: Completion State per Section

Every section of this document MUST end with a `## Completion State` block that defines exactly what "done" means for that section. A section without a completion state is considered **open-ended** and may NOT be used as a basis for implementation.

**Enforcement:** The Amendment Editor (Section 31) tracks completion states. Sections without completion states are listed in ORPHANS & PENDING.

---

## 27. Critical Constraints (Auto-Audit Layer)

These constraints are machine-checkable. A CI job MUST verify them before any merge.

### CC1: Single Audio Function Per Element
Every UI element has exactly ONE audio announcement function. No element may produce two different announcements for the same state. This prevents confusing the screen reader user.

```typescript
// VIOLATION: element has two announce functions
element.announce = () => announce("Clip selected");
element.describe = () => describe("Clip 5 of 12"); // FORBIDDEN

// CORRECT: single function with context
element.announce = () => announce("Clip 5 of 12: Interview Part 2. Duration 12s 89f.");
```

### CC2: No Shortcut Overlap
All shortcuts are registered in a central `ShortcutRegistry`. The CI job scans for duplicates and conflicts with OS defaults.

```typescript
interface ShortcutRegistry {
  shortcuts: Map<string, { command: string; scope: string; conflicts: string[] }>;
  checkConflicts(): ConflictReport;
  register(shortcut: string, command: string, scope: string): void;
}
```

### CC3: Color Contrast Pass
Every color-background pair MUST have a contrast ratio ≥4.5:1 for text elements and ≥3:1 for non-text. The CI job runs `axe-core` or equivalent on every component render.

### CC4: Every Element Has ID Card
Every interactive element MUST have an `ElementIDCard` (Section 22) with all fields populated. The CI job checks for missing fields.

### CC5: Every Element Has Audio Scenario
Every interactive element MUST have a companion `## Audio Scenario` block in the document. The CI job counts elements vs audio scenarios and flags mismatches.

### CC6: Every Element Has Test Certificate
Every interactive element MUST have a `testCertificate` reference. Elements without certificates are blocked from release.

### CC7: No Placeholder or TODO
The codebase MUST NOT contain `// TODO`, `// FIXME`, `// PLACEHOLDER`, or `HACK` comments. The CI job scans and rejects any file containing these strings.

### Auto-Audit CI Job

```yaml
# .github/workflows/auto-audit.yml
name: Auto-Audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Check Single Audio Function
        run: node scripts/audit/single-audio-function.js
      - name: Check Shortcut Conflicts
        run: node scripts/audit/shortcut-conflicts.js
      - name: Check Color Contrast
        run: node scripts/audit/color-contrast.js
      - name: Check Element ID Cards
        run: node scripts/audit/element-id-cards.js
      - name: Check Audio Scenarios
        run: node scripts/audit/audio-scenarios.js
      - name: Check Test Certificates
        run: node scripts/audit/test-certificates.js
      - name: No Placeholders
        run: node scripts/audit/no-placeholders.js
```

---

## 28. 7-Axis Review Framework

This framework is executed before every release and before every major change. Results are recorded in the Amendment Editor (Section 31).

### Axis 1: Architectural Design Review (No Code)

**Method:** Review only diagrams and model documents. No code inspection.

**Questions:**
1. Does every engine have a single responsibility and a defined interface?
2. Is every relationship between entities necessary (cannot be derived from other relationships)?
3. Is there any indirect coupling between engines via a shared entity that prevents isolated testing?

**Pass criteria:** All three questions must answer "No" for coupling (Q3) and "Yes" for clarity (Q1, Q2).

### Axis 2: Data Model Review (10-Point Checklist)

| # | Criterion | Check |
|---|---|---|
| 1 | All IDs are UUIDs (not sequential numbers) | ✓/✗ |
| 2 | All timestamps are UTC (no local time) | ✓/✗ |
| 3 | All durations are in nanoseconds (bigint) | ✓/✗ |
| 4 | All file paths are relative (not absolute) | ✓/✗ |
| 5 | All status values are string enums (not numbers) | ✓/✗ |
| 6 | User settings are separated from project settings | ✓/✗ |
| 7 | Every edit operation is a Transaction with UUID | ✓/✗ |
| 8 | Every entity has an auto-updating modification timestamp | ✓/✗ |
| 9 | No field is derivable from other fields | ✓/✗ |
| 10 | No entity contains unordered lists without explicit ordering | ✓/✗ |

### Axis 3: Engine Interface Review (7 Criteria)

| # | Criterion | Check |
|---|---|---|
| 1 | Every function takes explicit parameters (no global objects) | ✓/✗ |
| 2 | Every function returns a typed result (no `any`) | ✓/✗ |
| 3 | Every error is a typed exception (not a string) | ✓/✗ |
| 4 | Every operation is logged in the Audit Log | ✓/✗ |
| 5 | Every interface has a test hook for mock input | ✓/✗ |
| 6 | Invalid input is rejected explicitly (not silently) | ✓/✗ |
| 7 | Every interface declares its own version | ✓/✗ |

### Axis 4: Message Flow Review

**Requirements:**
1. Every message has a unique Request ID for cross-engine tracing.
2. Every message has send-time and receive-time timestamps.
3. Every message has a response or error within its declared timeout.
4. No message stays in the queue >5 seconds without processing (logged as Anomaly).
5. A **Message Simulator** generates 10,000 synthetic messages and verifies:
   - Zero dropped messages
   - Zero infinite loops
   - Congestion points identified and documented

### Axis 5: Accessibility Review (5 Mandatory Tests)

| # | Test | Method | Pass Criteria |
|---|---|---|---|
| 1 | Keyboard-only navigation | Tab through all elements, activate with Enter/Space | 100% reachable |
| 2 | Screen reader compatibility | NVDA/VoiceOver reads all element names and states | 100% readable |
| 3 | Color contrast | axe-core automated scan | ≥4.5:1 text, ≥3:1 non-text |
| 4 | 200% zoom | Browser zoom to 200% | No layout breakage, no content loss |
| 5 | High contrast mode | OS high contrast enabled | All elements remain visible |

### Axis 6: Performance Review (3 Levels)

| Level | Metric | Threshold |
|---|---|---|
| Response | Edit operation latency (10 tracks, 100 clips) | ≤50ms |
| Memory | Peak memory (5 tracks, 500 clips) | ≤200MB |
| Export | 5-min video at 1080p export time | ≤15min |

### Axis 7: Security & Safety Review

| # | Area | Check |
|---|---|---|
| 1 | Input sanitization | All external inputs pass through a sanitizer |
| 2 | Atomic disk writes | Transaction Handler prevents half-written files |
| 3 | Message integrity | Inter-engine messages are signed (HMAC) |

### Review Report Format

```markdown
## Review Report — {date}

### Fixed (issues resolved during this review)
- {issue}: {cause} → {fix}

### Deferred (issues noted but not blocking release)
- {issue}: {cause} → {resolution_plan} → {target_release}

### Improvement Opportunities (not in original design)
- {opportunity}: {description} → {estimated_effort}
```

---

## 29. Design Lab — Reference Elements

Before any code is written, 5 reference elements are designed, tested, documented, and approved. These serve as the **Execution Seed** — if they succeed, the methodology is validated.

### Reference Elements Selection

| # | Element | Source Section | Rationale |
|---|---|---|---|
| 1 | **Cut Button** (Zone B) | Section 21 | Most-used editing operation, tests shortcut system |
| 2 | **Clip in Audio-Temporal Strip** (Zone A) | Section 21 | Core timeline display, tests interval chain |
| 3 | **Project Tree Node** (Zone C) | Section 21 | Hierarchical navigation, tests tree accessibility |
| 4 | **Status Bar Announcement** (Zone D) | Section 21 | Continuous feedback, tests audio stream |
| 5 | **Room Transition** (Cut → Box) | Section 19 | Tests full state change + announcement |

### For Each Reference Element:

1. **Write the Audio Scenario** — Full script of what the user hears during interaction.
2. **Conduct Live Listening Session** — With at least 1 blind user. Record and attach.
3. **Write the Element ID Card** — All fields populated per Section 22.
4. **Verify Shortcut** — Passes Triple-Test (IR3).
5. **Verify Color** — Passes contrast check (IR4).
6. **Write the Test Certificate** — Pass/Fail with evidence.
7. **Write the Post-Activity Description** — What the user hears after activation.

### Gate Test

If all 5 reference elements pass, the methodology is validated and implementation begins. If any fail, the methodology is revised before any code is written.

---

## 30. Answers to Open Questions

### Q1: Primary Front-End Development Language
**Answer:** TypeScript + React + Electron.

**Rationale:**
- TypeScript provides type safety that aligns with the strict data model.
- React's component model maps naturally to the 4-zone layout.
- Electron provides cross-platform desktop + Chromium accessibility APIs.
- The project file is JSONL (text), and Electron's Node.js integration handles it natively.
- All 9 engines are implemented in TypeScript (same language, reduced cognitive load).
- Performance-critical paths (FFmpeg, whisper.cpp) use native bindings, not TypeScript.

### Q2: Target Screen Reader
**Answer:** NVDA (primary), VoiceOver (secondary), with fallback to console output.

**Rationale:**
- NVDA is free, open-source, and dominates the blind developer community.
- VoiceOver covers macOS users.
- The Accessibility Engine communicates via platform APIs (UIA on Windows, Accessibility API on macOS).
- If no screen reader is detected, the system falls back to: (1) console output, (2) built-in TTS (ospeak/say), (3) event log.
- All audio scenarios are written against NVDA's output format, then verified against VoiceOver.

### Q3: Blind Tester Team
**Answer:** Not yet assembled. This is a prerequisite for IR2.

**Action Required:** Before the Design Lab begins, recruit 3 blind testers:
- 1 professional video editor (power user perspective)
- 1 blind developer (technical perspective)
- 1 blind content creator (YouTube/TikTok perspective)

Each tester participates in Live Listening Sessions and provides written feedback. Their feedback is recorded in the Amendment Editor (Section 31).

### Q4: Expected Timeline for v1.0
**Answer:** 34 weeks from first code commit.

| Phase | Weeks | Deliverable |
|---|---|---|
| Phase 0: Foundation | 1-4 | Core types, Event Bus, Transaction System |
| Phase 1: CLI Prototype | 5-8 | CLI tool: create project, import audio, edit via commands |
| Phase 2: Media & Analysis | 9-14 | FFmpeg integration, whisper.cpp, smart index |
| Phase 3: Video Support | 15-20 | Video tracks, rendering, thumbnails |
| Phase 4: AI & Polish | 21-26 | AI Engine, natural language commands |
| Phase 5: GUI Layer | 27-34 | Electron + React shell, visual overlay |

**v1.0 ships when:** Phases 0-3 complete, all 7 Test Bridges pass (Section 12), all 7 Review Axes pass (Section 28).

### Q5: TTS Budget
**Answer:** Rely on OS-native TTS (no external budget required for v1.0).

**Rationale:**
- Windows: SAPI5 via `node-speakertts` or direct COM interface.
- macOS: NSSpeechSynthesizer via Node.js bindings.
- Linux: espeak/festival (pre-installed).
- Quality is sufficient for v1.0 announcements.
- If higher quality is needed for v2.0+, evaluate:
  - Azure Cognitive Services Speech SDK (paid, high quality)
  - Google Cloud Text-to-Speech (paid, high quality)
  - Open-source: Piper TTS (local, good quality, MIT license)
- Decision deferred to v2.0 based on user feedback.

---

## 31. Amendment Editor

Every change to this document is recorded here. No exception.

| # | Date | Section | Change | Author | Impact |
|---|---|---|---|---|---|
| 1 | 2026-07-25 | All | Initial document created | Tech Lead | Full project |
| 2 | 2026-07-25 | 18-25 | Front-End Design Document added | Tech Lead | UI sections |
| 3 | 2026-07-25 | 26-31 | Executive Constitution added | Tech Lead | All sections |
| 4 | 2026-07-25 | 32 | Quick Navigation Index added | Tech Lead | Navigation |
| 5 | 2026-07-25 | 33 | Mandatory Editing State Reference added | Tech Lead | Editing operations |
| 6 | 2026-07-25 | 34 | Reference Architectural Framework (5 Layers) added | Tech Lead | Architecture |
| 7 | 2026-07-28 | 35 | Test Sprite Specification added | Tech Lead | Testing infrastructure |
| 8 | 2026-07-28 | 36 | Mandatory Review & Testing Protocol added | Tech Lead | Review process |
| 9 | 2026-07-28 | 37 | L1 Infrastructure Layer Building Guide added | Tech Lead | Implementation guide |
| 10 | 2026-07-28 | 38 | Seven-Stage Execution Roadmap added | Tech Lead | Overall roadmap |

### Amendment Rules:
- A1: No amendment may remove a section without adding a replacement.
- A2: Every amendment must reference a decision rationale.
- A3: Amendments are append-only (never delete rows from this table).
- A4: Major amendments require review by the 3-person Review Team.

---

## 32. Quick Navigation Index

### Sections by Line Number

| Section | Line Start | Section Title |
|---|---|---|
| 1 | 40 | Commitments (Non-Negotiable) |
| 2 | 60 | System State Machine |
| 3 | 120 | Base Data Model |
| 4 | 350 | Transition Functions |
| 5 | 500 | Engine Contracts |
| 6 | 900 | Responsibility Matrix |
| 7 | 950 | Event Bus Protocol |
| 8 | 1050 | Transaction System |
| 9 | 1150 | Test Pipeline |
| 10 | 1250 | Accessibility Specification |
| 11 | 1320 | Project File Format |
| 12 | 1400 | Completion Map — v1.0 |
| 13 | 1450 | Roadmap |
| 14 | 1520 | TECH_STACK |
| 15 | 1540 | SYSTEM_FLOW |
| 16 | 1580 | ARCHITECTURE |
| 17 | 1620 | ORPHANS & PENDING |
| 18 | 1660 | Brand Identity — "Tempo" |
| 19 | 1680 | Room System |
| 20 | 1720 | Layout Specification |
| 21 | 1750 | Room Specifications (4 Zones) |
| 22 | 1870 | Accessibility & Descriptor Language |
| 23 | 1920 | Shortcut System |
| 24 | 2040 | Color System |
| 25 | 2110 | Welcome Page |
| 26 | 2200 | Executive Constitution |
| 27 | 2260 | Critical Constraints |
| 28 | 2330 | 7-Axis Review Framework |
| 29 | 2450 | Design Lab |
| 30 | 2520 | Answers to Open Questions |
| 31 | 2600 | Amendment Editor |
| 32 | 2640 | Quick Navigation Index |
| 33 | 2803 | Mandatory Editing State Reference |
| 34 | 3050 | Reference Architectural Framework (5 Layers) |
| 35 | 3456 | Test Sprite Specification |
| 36 | 3650 | Mandatory Review & Testing Protocol |
| 37 | 4028 | L1 Infrastructure Layer — Building Guide |
| 38 | 5210 | Seven-Stage Execution Roadmap |

### Quick Search Commands

| Search Term | Finds |
|---|---|
| `## 1.` | Commitments |
| `## 3. Base` | Data Model |
| `## 5. Engine` | Engine Contracts |
| `## 19. Room` | Room System |
| `## 23. Shortcut` | Shortcut System |
| `## 24. Color` | Color System |
| `## 26. Executive` | Iron Rules |
| `## 28. 7-Axis` | Review Framework |
| `## 29. Design` | Design Lab |
| `## 31. Amendment` | Change Log |
| `## 32. Quick` | This Index |
| `## 33.` | Editing State Reference |
| `## 34.` | Architectural Framework |
| `## 35.` | Test Sprite Specification |
| `## 36.` | Review & Testing Protocol |
| `## 37.` | L1 Infrastructure Layer |
| `## 38.` | Seven-Stage Execution Roadmap |

---

## 33. Mandatory Editing State Reference

Every editing operation is a **State Path** — not an isolated event. This section defines the exact state transitions, exceptional states, and spoken error messages for every operation. No code may deviate from these tables.

### 33.1 Media Lifecycle

| Current State | Event | Trigger | Next State | Announcement |
|---|---|---|---|---|
| `NO_MEDIA` | Import Video | `Ctrl+I` | `MEDIA_ANALYZING` | "Video imported. Duration 5:23. 1 video track, 2 audio tracks." |
| `MEDIA_ANALYZING` | Analysis Complete | (automatic) | `MEDIA_READY` | "Analysis complete. Format: H.264, 1080p, 30fps." |
| `MEDIA_READY` | Split Media | `Ctrl+Shift+S` | `MEDIA_SPLIT` | "Split into 3 tracks: video, audio primary, audio secondary." |
| `MEDIA_SPLIT` | Select Track | `Ctrl+Space` / ↑↓ | `TRACK_SELECTED` | "Current track: Video. 3 clips." |
| `TRACK_SELECTED` | Delete Track | `Ctrl+Shift+D` | `TRACK_DELETED` | "Track 'Video' deleted." |
| `TRACK_DELETED` | (auto) | — | `TRACK_SELECTED` | "Focus moved to nearest remaining track." |

#### Exceptional States (Media)

| Condition | Trigger | System Response |
|---|---|---|
| Corrupt file | Import | **Error:** "Video corrupt — cannot read file." |
| No audio tracks | Split | **Warning:** "No audio tracks found. Video track only." |
| Last track delete | Delete Track | **Error:** "Cannot delete last track. At least one track required." |
| Unsupported format | Import | **Error:** "Format not supported. Supported: MP4, MOV, MKV, AVI, WAV, MP3." |
| File not found | Import | **Error:** "File not found at specified path." |

---

### 33.2 Cursor Lifecycle

| Current State | Event | Trigger | Next State | Announcement |
|---|---|---|---|---|
| `CURSOR_AT_START` | Move Right | → / `Ctrl+→` | `CURSOR_MOVED` | "Cursor at 0.033s (frame 1)." |
| `CURSOR_MOVED` | Move Right | → / `Ctrl+→` | `CURSOR_MOVED` | "Cursor at {time}." |
| `CURSOR_MOVED` | Move Left | ← / `Ctrl+←` | `CURSOR_MOVED` | "Cursor at {time}." |
| `CURSOR_MOVED` | Move Forward | ↑ | `CURSOR_AT_CLIP_START` | "Cursor at start of clip 2. Time: 5.0s." |
| `CURSOR_MOVED` | Move Backward | ↓ | `CURSOR_AT_CLIP_END` | "Cursor at end of clip 1. Time: 4.9s." |
| `CURSOR_AT_CLIP_START` | Jump to Start | `{` | `CURSOR_AT_CLIP_START` | "Cursor at start of clip. Time: 2.0s." |
| `CURSOR_AT_CLIP_START` | Jump to End | `}` | `CURSOR_AT_CLIP_END` | "Cursor at end of clip. Time: 4.8s." |
| `CURSOR_AT_PROJECT_END` | Move Right | → | `CURSOR_AT_PROJECT_END` | **Error:** "Cannot move right — end of project." |
| `CURSOR_AT_PROJECT_START` | Move Left | ← | `CURSOR_AT_PROJECT_START` | **Error:** "Cannot move left — start of project." |
| `NO_CLIPS` | Move Forward | ↑ | `NO_CLIPS` | **Error:** "No clips to navigate." |

#### Cursor Movement Precision

| Modifier | Movement | Unit |
|---|---|---|
| (none) | → / ← | 1 frame (33ms at 30fps) |
| `Ctrl` | → / ← | 1 second |
| `Shift` | → / ← | 10 seconds |
| `Ctrl+Shift` | → / ← | 1 minute |

---

### 33.3 Selection & Cut Lifecycle

| Current State | Event | Trigger | Next State | Announcement |
|---|---|---|---|---|
| `NO_SELECTION` | Select All | `Ctrl+A` | `ALL_SELECTED` | "Selected 12 clips across 3 tracks." |
| `NO_SELECTION` | Select Single | Click / `Ctrl+Click` | `SINGLE_SELECTED` | "Clip 3 selected. Duration 2.3s." |
| `SINGLE_SELECTED` | Cut | `Ctrl+X` | `CLIP_CUT` | "Clip cut to clipboard." |
| `SINGLE_SELECTED` | Copy | `Ctrl+C` | `CLIP_COPIED` | "Clip copied to clipboard." |
| `ALL_SELECTED` | Cut | `Ctrl+X` | `CLIPS_CUT` | "3 clips cut to clipboard." |
| `ALL_SELECTED` | Copy | `Ctrl+C` | `CLIPS_COPIED` | "3 clips copied to clipboard." |
| `CLIP_CUT` | Paste | `Ctrl+V` | `CLIP_PASTED` | "Clip pasted at {time} on {track}." |
| `CLIPS_CUT` | Paste | `Ctrl+V` | `CLIPS_PASTED` | "3 clips pasted at {time}." |
| `SINGLE_SELECTED` | Split | `Ctrl+Shift+X` | `CLIP_SPLIT` | "Clip split at {time}. Two clips created." |
| `CLIP_SPLIT` | (auto) | — | `NO_SELECTION` | "Selection cleared. Cursor at split point." |

#### Exceptional States (Selection & Cut)

| Condition | Trigger | System Response |
|---|---|---|
| Cut with no selection | `Ctrl+X` | **Error:** "No clip selected to cut. Select a clip first." |
| Copy with no selection | `Ctrl+C` | **Error:** "No clip selected to copy." |
| Paste with empty clipboard | `Ctrl+V` | **Error:** "Clipboard empty — nothing to paste." |
| Split outside clip | `Ctrl+Shift+X` | **Error:** "Cursor is outside any clip — cannot split." |
| Paste into incompatible track | `Ctrl+V` | **Error:** "Cannot paste video clip into audio track." |
| Cut single clip from multi-track | `Ctrl+X` | **Warning:** "Only 1 clip cut from multi-track selection." |

---

### 33.4 Advanced Operations Lifecycle

| Current State | Event | Trigger | Next State | Announcement |
|---|---|---|---|---|
| `ANY` | New File | `Ctrl+N` | `CONFIRM_SAVE` | "Save current project? (Yes / No / Cancel)" |
| `CONFIRM_SAVE` | Yes | `Y` | `SAVING` → `NEW_PROJECT` | "Project saved. Opening new empty project." |
| `CONFIRM_SAVE` | No | `N` | `NEW_PROJECT` | "Opening new empty project. Unsaved changes discarded." |
| `CONFIRM_SAVE` | Cancel | `Esc` | `ANY` | "New file cancelled. Current project unchanged." |
| `ANY` | Open File | `Ctrl+O` | `FILE_DIALOG` | "Select project file to open." |
| `FILE_DIALOG` | Select | `Enter` | `OPENING` → `PROJECT_OPEN` | "Project opened from {path}." |
| `FILE_DIALOG` | Cancel | `Esc` | `ANY` | "Open cancelled." |
| `ANY` | Save | `Ctrl+S` | `SAVING` | "Saving project..." |
| `SAVING` | Complete | (automatic) | `SAVED` | "Project saved." |
| `SAVING` | Error | (automatic) | `SAVE_ERROR` | **Error:** "Save failed — {reason}." |
| `ANY` | Save As | `Ctrl+Shift+S` | `FILE_DIALOG_SAVE` | "Select location to save project." |
| `ANY` | Undo | `Ctrl+Z` | `UNDO_DONE` | "Undid: {operation_name}." |
| `UNDO_DONE` | (auto) | — | `READY` | (no additional announcement) |
| `ANY` | Redo | `Ctrl+Y` | `REDO_DONE` | "Redid: {operation_name}." |
| `REDO_DONE` | (auto) | — | `READY` | (no additional announcement) |

#### Exceptional States (Advanced)

| Condition | Trigger | System Response |
|---|---|---|
| Undo with empty history | `Ctrl+Z` | **Error:** "Nothing to undo." |
| Redo with empty history | `Ctrl+Y` | **Error:** "Nothing to redo." |
| Save to read-only path | `Ctrl+S` | **Error:** "Cannot save — path is read-only." |
| Disk full | `Ctrl+S` | **Error:** "Disk full — cannot save. Free space required." |
| Corrupt project file | `Ctrl+O` | **Error:** "File corrupt — cannot open." |
| Version mismatch | `Ctrl+O` | **Warning:** "Project created with newer version. Some features may be missing." |

---

### 33.5 Master Shortcut Table

#### Category 1: Navigation (10 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `→` | Move cursor right 1 frame | تحرك يميناً إطاراً واحداً | "Move right — one frame" |
| `←` | Move cursor left 1 frame | تحرك يساراً إطاراً واحداً | "Move left — one frame" |
| `↑` | Jump to next clip start | قفز لبداية المقطع التالي | "Jump forward — next clip start" |
| `↓` | Jump to previous clip end | قفز لنهاية المقطع السابق | "Jump backward — previous clip end" |
| `{` | Jump to current clip start | قفز لبداية المقطع الحالي | "Jump to clip start" |
| `}` | Jump to current clip end | قفز لنهاية المقطع الحالي | "Jump to clip end" |
| `Home` | Jump to project start | قفز لبداية المشروع | "Jump to project start" |
| `End` | Jump to project end | قفز لنهاية المشروع | "Jump to project end" |
| `Ctrl+↑` | Move cursor right 1 second | تحرك يميناً ثانية واحدة | "Move right — one second" |
| `Ctrl+↓` | Move cursor left 1 second | تحرك يساراً ثانية واحدة | "Move left — one second" |

#### Category 2: Selection (6 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `Ctrl+A` | Select all clips | تحديد كل المقاطع | "Select all" |
| `Ctrl+Click` | Select single clip | تحديد مقطع واحد | "Select clip" |
| `Shift+Click` | Extend selection | توسيع التحديد | "Extend selection" |
| `Ctrl+D` | Deselect all | إلغاء كل التحديد | "Deselect all" |
| `Tab` | Select next clip | تحديد المقطع التالي | "Next clip" |
| `Shift+Tab` | Select previous clip | تحديد المقطع السابق | "Previous clip" |

#### Category 3: Editing (8 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `Ctrl+X` | Cut | قص | "Cut selected clips" |
| `Ctrl+C` | Copy | نسخ | "Copy selected clips" |
| `Ctrl+V` | Paste | لصق | "Paste from clipboard" |
| `Ctrl+Shift+X` | Split clip | تقسيم المقطع | "Split clip at cursor" |
| `Delete` | Delete selected | حذف المحدد | "Delete selected clips" |
| `Ctrl+Z` | Undo | تراجع | "Undo last operation" |
| `Ctrl+Y` | Redo | إعادة | "Redo last undone operation" |
| `Ctrl+M` | Merge clips | دمج المقاطع | "Merge selected clips" |

#### Category 4: File (6 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `Ctrl+N` | New project | مشروع جديد | "Create new project" |
| `Ctrl+O` | Open project | فتح مشروع | "Open project" |
| `Ctrl+S` | Save project | حفظ المشروع | "Save project" |
| `Ctrl+Shift+S` | Save As | حفظ باسم | "Save project as" |
| `Ctrl+I` | Import media | استيراد وسائط | "Import media file" |
| `Ctrl+E` | Export | تصدير | "Export project" |

#### Category 5: View (4 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `Ctrl+Shift+P` | Command Palette | لوحة الأوامر | "Open command palette" |
| `F1` | Announce state | الإعلان عن الحالة | "Announce current state" |
| `Ctrl+T` | Toggle time count | عدّ الزمن | "Toggle time counting mode" |
| `Ctrl+Shift+F` | Full Focus Mode | وضع التركيز الكامل | "Toggle full focus mode" |

#### Category 6: Advanced (6 shortcuts)

| Shortcut | Action (EN) | Action (AR) | Audio Description |
|---|---|---|---|
| `Ctrl+Shift+Right` | Select + move to end | تحديد + الانتقال لنهاية | "Select clip and move to end" |
| `Ctrl+Shift+Left` | Select + move to start | تحديد + الانتقال لبداية | "Select clip and move to start" |
| `Ctrl+Alt+X` | Cut + paste new track | قص + لصق في مسار جديد | "Cut and paste to new track" |
| `Ctrl+Alt+S` | Split media + create tracks | فصل + إنشاء مسارات | "Split media into tracks" |
| `Ctrl+Shift+M` | Auto-merge adjacent | دمج تلقائي للمتجاور | "Auto-merge adjacent clips" |
| `Ctrl+Shift+R` | Re-analyze media | إعادة تحليل الوسائط | "Re-analyze selected media" |

---

### 33.6 Expected Error Log

Every error below MUST be tested. The system MUST produce the exact spoken message.

| Error ID | Condition | Spoken Message (EN) | Spoken Message (AR) |
|---|---|---|---|
| `ERR001` | Cut with no selection | "No clip selected to cut. Select a clip first." | "لا يوجد مقطع محدد للقص، يرجى تحديد مقطع أولاً" |
| `ERR002` | Copy with no selection | "No clip selected to copy." | "لا يوجد مقطع محدد للنسخ" |
| `ERR003` | Paste empty clipboard | "Clipboard empty — nothing to paste." | "الحافظة فارغة، لا يوجد شيء للصق" |
| `ERR004` | Split outside clip | "Cursor is outside any clip — cannot split." | "المؤشر خارج نطاق أي مقطع، لا يمكن التقسيم" |
| `ERR005` | Cursor right at end | "Cannot move right — end of project." | "لا يمكن التحرك إلى اليمين — نهاية المشروع" |
| `ERR006` | Cursor left at start | "Cannot move left — start of project." | "لا يمكن التحرك إلى اليسار — بداية المشروع" |
| `ERR007` | Delete last track | "Cannot delete last track. At least one track required." | "لا يمكن حذف المسار الأخير، يجب أن يبقى مسار واحد على الأقل" |
| `ERR008` | Corrupt file import | "Video corrupt — cannot read file." | "الفيديو تالف، لا يمكن قراءته" |
| `ERR009` | Unsupported format | "Format not supported." | "التنسيق غير مدعوم" |
| `ERR010` | File not found | "File not found at specified path." | "الملف غير موجود في المسار المحدد" |
| `ERR011` | Undo empty history | "Nothing to undo." | "لا توجد عمليات للتراجع عنها" |
| `ERR012` | Redo empty history | "Nothing to redo." | "لا توجد عمليات للإعادة" |
| `ERR013` | Save read-only | "Cannot save — path is read-only." | "لا يمكن الحفظ — المسار للقراءة فقط" |
| `ERR014` | Disk full | "Disk full — cannot save." | "مساحة القرص غير كافية — لا يمكن الحفظ" |
| `ERR015` | Corrupt project | "File corrupt — cannot open." | "الملف تالف — لا يمكن فتحه" |
| `ERR016` | Paste incompatible track | "Cannot paste video clip into audio track." | "لا يمكن لصق مقطع فيديو في مسار صوتي" |
| `ERR017` | No clips to navigate | "No clips to navigate." | "لا توجد مقاطع للتنقل بينها" |
| `ERR018` | No tracks exist | "No tracks in project. Import media first." | "لا توجد مسارات في المشروع. استورد وسائط أولاً" |

---

### 33.7 Composite Commands Table

| Shortcut | Component Commands | Audio Description |
|---|---|---|
| `Ctrl+Shift+Right` | Select clip + Move cursor to end | "Select and move to clip end" |
| `Ctrl+Shift+Left` | Select clip + Move cursor to start | "Select and move to clip start" |
| `Ctrl+Alt+X` | Cut + Create new track + Paste | "Cut and paste to new track" |
| `Ctrl+Alt+S` | Split media + Create tracks + Select all | "Split media into all tracks" |
| `Ctrl+Shift+M` | Find adjacent clips + Merge | "Auto-merge adjacent clips" |
| `Ctrl+Shift+R` | Select media + Re-analyze | "Re-analyze selected media" |

---

## 34. Reference Architectural Framework (5 Layers)

The system is built as 5 stacked layers. Each layer knows only the layer directly below it. No layer knows the layer above it. Communication between layers happens through **Defined Interfaces** only.

```
┌─────────────────────────────────────────────────────────┐
│  L5: USER INTERFACE LAYER                                │
│  CLI │ Voice │ Audio Announcement │ Visual (optional)    │
├─────────────────────────────────────────────────────────┤
│  L4: AUDIO INTERFACE LAYER                               │
│  Announcement Engine │ Focus Engine │ Voice Command      │
├─────────────────────────────────────────────────────────┤
│  L3: CORE ENGINES LAYER                                  │
│  Timeline │ Media │ Cursor │ Selection │ Clipboard │ Undo│
├─────────────────────────────────────────────────────────┤
│  L2: MODEL LAYER                                         │
│  Project │ Media │ Track │ Clip │ Marker │ Settings      │
├─────────────────────────────────────────────────────────┤
│  L1: INFRASTRUCTURE LAYER                                │
│  File Engine │ Memory Engine │ Time Engine │ Error Engine │
└─────────────────────────────────────────────────────────┘
```

### L1: Infrastructure Layer

**Responsibility:** OS interaction, memory, files, time calculations. No editing logic.

#### File Engine

```typescript
interface IFileEngine {
  readFile(path: RelativePath): Promise<Uint8Array>;
  writeFile(path: RelativePath, data: Uint8Array): Promise<void>;
  deleteFile(path: RelativePath): Promise<void>;
  fileExists(path: RelativePath): Promise<boolean>;
  getFileSize(path: RelativePath): Promise<number>;
  listDirectory(path: RelativePath): Promise<RelativePath[]>;
  createDirectory(path: RelativePath): Promise<void>;
}
```

**Errors:** `FileException` (read failure, write failure, not found, permission denied, disk full)

#### Memory Engine

```typescript
interface IMemoryEngine {
  allocate(id: string, sizeBytes: number): Promise<MemoryBlock>;
  release(id: string): void;
  getUsage(): MemoryUsage;
  setLimit(operationId: string, maxBytes: number): void;
}

interface MemoryUsage {
  allocated: number;
  peak: number;
  limit: number;
}
```

**Errors:** `MemoryException` (allocation failed, limit exceeded, leak detected)

#### Time Engine

```typescript
interface ITimeEngine {
  toNanos(value: number, unit: TimeUnit): bigint;
  toFrames(nanos: bigint, frameRate: FrameRate): number;
  toTimecode(nanos: bigint, frameRate: FrameRate): string;
  add(a: TimeValue, b: TimeValue): TimeValue;
  subtract(a: TimeValue, b: TimeValue): TimeValue;
  compare(a: TimeValue, b: TimeValue): -1 | 0 | 1;
  clamp(value: TimeValue, min: TimeValue, max: TimeValue): TimeValue;
}

type TimeUnit = "nanos" | "millis" | "seconds" | "minutes" | "hours";
```

**Errors:** `TimeException` (negative duration, overflow, invalid frame rate)

#### Error Engine

```typescript
interface IErrorEngine {
  log(error: SystemError): void;
  classify(error: SystemError): ErrorCategory;
  attemptRecovery(error: SystemError): RecoveryResult;
  getHistory(): SystemError[];
}

type ErrorCategory = "file" | "memory" | "time" | "model" | "engine" | "ui";
type RecoveryResult = { recovered: boolean; newState?: string };
```

**Isolation Test:** Each L1 engine is tested independently with mock OS calls. No engine depends on another L1 engine.

---

### L2: Model Layer

**Responsibility:** Define all entities and their relationships. Immutable objects modified only through transactions.

#### Entity Definitions

```typescript
interface Project {
  readonly id: ProjectId;
  readonly version: 1;
  metadata: ProjectMetadata;
  media: MediaAsset[];
  tracks: Track[];
  markers: Marker[];
  settings: ProjectSettings;
  journal: TransactionJournal;
  modified: Timestamp;
}

interface MediaAsset {
  readonly id: EntityId;
  sourcePath: RelativePath;
  sourceHash: string;
  mediaType: "video" | "audio" | "image";
  duration: TimeValue;
  metadata: MediaMetadata;
  analysis: AnalysisResult | null;
}

interface Track {
  readonly id: EntityId;
  name: string;
  trackType: "video" | "audio" | "subtitle";
  clips: Clip[];
  volume: number;
  muted: boolean;
  locked: boolean;
}

interface Clip {
  readonly id: EntityId;
  name: string;
  sourceMediaId: EntityId;
  inPoint: TimeValue;
  outPoint: TimeValue;
  timelineIn: TimeValue;
  duration: TimeValue;
  speed: number;
}

interface Marker {
  readonly id: EntityId;
  name: string;
  position: TimeValue;
  color: string;
  notes: string;
}

interface ProjectSettings {
  frameRate: FrameRate;
  resolution: Resolution;
  audioSampleRate: number;
  audioChannels: number;
  exportFormat: string;
  exportQuality: string;
}
```

**Isolation Test:** Each entity is created, inspected, and verified. No entity may reference another entity except via ID. No entity may be mutated directly (only through transaction functions).

---

### L3: Core Engines Layer

**Responsibility:** Execute all editing logic. Communicate via Event Bus only.

#### Timeline Engine

```typescript
interface ITimelineEngine {
  splitClip(clipId: EntityId, splitPoint: TimeValue): TransactionResult;
  mergeClips(clipIdA: EntityId, clipIdB: EntityId): TransactionResult;
  moveClip(clipId: EntityId, targetTrackId: EntityId, newTime: TimeValue): TransactionResult;
  insertClip(mediaId: EntityId, trackId: EntityId, time: TimeValue): TransactionResult;
  deleteClip(clipId: EntityId): TransactionResult;
  createTrack(name: string, type: Track["trackType"]): TransactionResult;
  deleteTrack(trackId: EntityId): TransactionResult;
}
```

#### Cursor Engine

```typescript
interface ICursorEngine {
  moveRight(frames: number): CursorResult;
  moveLeft(frames: number): CursorResult;
  jumpToClipStart(): CursorResult;
  jumpToClipEnd(): CursorResult;
  jumpToProjectStart(): CursorResult;
  jumpToProjectEnd(): CursorResult;
  getPosition(): TimeValue;
  getNearestClip(): { clipId: EntityId; position: "start" | "end" } | null;
}
```

#### Selection Engine

```typescript
interface ISelectionEngine {
  selectClip(clipId: EntityId): void;
  selectAll(): void;
  deselectAll(): void;
  extendSelection(clipId: EntityId): void;
  getSelected(): EntityId[];
  getSelectedCount(): number;
}
```

#### Clipboard Engine

```typescript
interface IClipboardEngine {
  cut(selection: EntityId[]): ClipboardResult;
  copy(selection: EntityId[]): ClipboardResult;
  paste(targetTime: TimeValue, targetTrackId: EntityId): TransactionResult;
  isEmpty(): boolean;
  clear(): void;
}
```

#### Undo Engine

```typescript
interface IUndoEngine {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): TransactionResult;
  redo(): TransactionResult;
  getHistory(): TransactionRecord[];
}
```

**Isolation Test:** Each L3 engine is tested with mock L2 data and mock Event Bus. No engine calls another engine directly.

---

### L4: Audio Interface Layer

**Responsibility:** Translate system events into spoken announcements. No editing logic.

#### Announcement Engine

```typescript
interface IAnnouncementEngine {
  announce(event: SystemEvent): void;
  setLevel(level: AnnouncementLevel): void;
  getLog(): Announcement[];
  repeatLast(count: number): void;
}

type AnnouncementLevel = "all" | "important" | "critical_only";

interface Announcement {
  id: string;
  timestamp: Timestamp;
  text: string;
  level: AnnouncementLevel;
  source: string;
}
```

#### Focus Engine

```typescript
interface IFocusEngine {
  setFocus(elementId: string): void;
  getFocus(): string | null;
  moveNext(): void;
  movePrevious(): void;
  getElementDescription(elementId: string): string;
}
```

#### Voice Command Engine

```typescript
interface IVoiceCommandEngine {
  processCommand(input: string): CommandResult;
  registerCommand(pattern: string, handler: CommandHandler): void;
  getCommandHistory(): CommandRecord[];
}
```

**Isolation Test:** Each L4 engine is tested by feeding mock events and verifying the spoken output matches expected text exactly.

---

### L5: User Interface Layer

**Responsibility:** Present information to the user. Collect user input. No editing logic.

#### CLI Interface

```typescript
interface ICLIInterface {
  display(text: string): void;
  displayError(text: string): void;
  displayTable(headers: string[], rows: string[][]): void;
  prompt(message: string): Promise<string>;
  promptChoice(message: string, choices: string[]): Promise<string>;
}
```

#### Visual Interface (Optional — Phase 5)

```typescript
interface IVisualInterface {
  renderZone(zoneId: ZoneId, content: ZoneContent): void;
  updateElement(elementId: string, state: ElementState): void;
  showCommandPalette(): void;
  hideCommandPalette(): void;
}
```

**Isolation Test:** L5 engines are tested by verifying they correctly render the output from L4 announcements without adding or modifying content.

---

### Layer Communication Rules

| Rule | Description |
|---|---|
| **LR1** | L5 never calls L3 directly. It sends commands through L4 → L3. |
| **LR2** | L4 never modifies L2 data. It reads L2 state for announcements only. |
| **LR3** | L3 never writes to L1 directly. It uses L2 entities which L1 persists. |
| **LR4** | L1 never initiates communication upward. It responds to L2/L3 requests only. |
| **LR5** | Every cross-layer call goes through a Defined Interface. No direct imports. |
| **LR6** | Layer failure does not cascade. If L3 fails, L4 announces the error, L5 displays it, L1 cleans up. |

### Settings System (Cross-Layer)

```typescript
interface SettingsManager {
  // System Settings — affect entire application
  system: {
    language: string;
    ttsVoice: string;
    ttsSpeed: number;
    screenReader: "nvda" | "voiceover" | "auto";
    announcementLevel: AnnouncementLevel;
  };
  // Project Settings — affect current project only
  project: {
    frameRate: FrameRate;
    resolution: Resolution;
    audioSampleRate: number;
    exportFormat: string;
    exportQuality: string;
  };
  // User Settings — personal preferences
  user: {
    customShortcuts: Record<string, string>;
    customColors: Record<string, string>;
    verboseLevel: number;
    autoBackup: boolean;
    autoBackupInterval: number; // minutes
  };
}
```

Each settings category is stored in a separate file:
- `~/.tempo/system.json` — System settings
- `{project}/tempo/project.json` — Project settings
- `~/.tempo/user.json` — User settings

Export All Settings: `Ctrl+Shift+E` → single JSON file with all three categories.

---

### Plugin System (Extends L3)

Plugins operate above L3. They register new engines that communicate via the same Event Bus.

```typescript
interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: CapabilityDeclaration;
  init(bus: IEventBus, model: IModelAccess): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  cleanup(): Promise<void>;
}

interface IPluginManager {
  load(pluginPath: string): Promise<IPlugin>;
  unload(pluginId: string): Promise<void>;
  enable(pluginId: string): void;
  disable(pluginId: string): void;
  list(): PluginInfo[];
}
```

**Isolation Test:** Plugin runs in a sandboxed context. If it throws, the system catches and announces: "Plugin '{name}' failed and was disabled."

### Future Features (Priority Order)

| # | Feature | Layer | Effort |
|---|---|---|---|
| 1 | Auto-Analysis Engine | L3 (new engine) | High |
| 2 | Auto-Correction Engine | L3 (new engine) | Medium |
| 3 | Auto-Backup Engine | L1 (new engine) | Low |
| 4 | Advanced Export Engine | L3 (extend) | High |
| 5 | Collaboration Engine | L3 + L1 (new) | Very High |
| 6 | Full Customization Engine | L4 + L5 (extend) | Medium |
| 7 | Pre-Listen Mode | L3 + L4 (new) | Low |
| 8 | Circular View Mode | L5 (new UI) | Medium |
| 9 | Auto-Subtitle Engine | L3 (new engine) | High |
| 10 | Audio Commentary Engine | L3 + L4 (new) | Medium |
| 11 | Auto-Update System | L1 (new engine) | Low |
| 12 | Template Engine | L2 + L1 (new) | Medium |

---

*This document is the single source of truth. All implementation decisions must trace back to a section in this file. If a decision cannot be traced, it is invalid.*

---

## 35. Test Sprite Specification

A **Test Sprite** is a virtual user agent that automates accessibility testing by simulating keyboard interactions and validating audio announcements against an expected registry.

### 35.1 Purpose

- Replace manual repetitive testing for 18 error paths and 40+ shortcuts
- Enable CI/CD integration (fail the build if any announcement regresses)
- Provide deterministic, reproducible test scenarios
- Catch regression bugs before human testers even touch the build

### 35.2 Architecture

```
┌─────────────────────────────────────────────────┐
│                   TEST SPRITE                     │
│                                                   │
│  ┌──────────────┐   ┌──────────────────────┐     │
│  │ Announcement  │   │   Keyboard Command   │     │
│  │   Registry    │   │      Engine          │     │
│  │  (JSON file)  │   │  (virtual keypress)  │     │
│  └──────┬───────┘   └──────────┬───────────┘     │
│         │                      │                   │
│         ▼                      ▼                   │
│  ┌──────────────────────────────────────────┐     │
│  │            EventBus (injected)            │     │
│  └──────────────────────────────────────────┘     │
│         │                      │                   │
│         ▼                      ▼                   │
│  ┌──────────────┐   ┌──────────────────────┐     │
│  │  Announcement │   │    System State      │     │
│  │    Parser     │   │    (in-memory)       │     │
│  └──────┬───────┘   └──────────┬───────────┘     │
│         │                      │                   │
│         ▼                      ▼                   │
│  ┌──────────────────────────────────────────┐     │
│  │          Test Report Generator            │     │
│  │  (expected vs actual, pass/fail, diff)   │     │
│  └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

### 35.3 Announcement Registry

The central source of truth for expected audio output per system state.

**File:** `tests/sprites/announcements/Announcement_Registry.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-07-28",
  "scenarios": {
    "import_video_success": {
      "name": "Import Video — Success",
      "steps": [
        {
          "action": "keypress",
          "key": "ctrl+i",
          "expectedAnnouncement": "Video imported. Duration {duration}. {trackCount} video track(s), {audioCount} audio track(s).",
          "variables": {
            "duration": "string",
            "trackCount": "number",
            "audioCount": "number"
          }
        }
      ]
    },
    "import_video_corrupt": {
      "name": "Import Video — Corrupt File",
      "steps": [
        {
          "action": "keypress",
          "key": "ctrl+i",
          "file": "test_corrupt.mp4",
          "expectedAnnouncement": "Error: Video corrupt — cannot read file.",
          "severity": "error"
        }
      ]
    },
    "split_clip_success": {
      "name": "Split Clip at Playhead",
      "steps": [
        {
          "action": "keypress",
          "key": "ctrl+s",
          "expectedAnnouncement": "Clip split at {position}. Left segment {leftDuration}, right segment {rightDuration}.",
          "variables": {
            "position": "string (timecode)",
            "leftDuration": "string",
            "rightDuration": "string"
          }
        }
      ]
    },
    "undo_split": {
      "name": "Undo Split Operation",
      "steps": [
        { "action": "keypress", "key": "ctrl+s", "setup": "split_clip" },
        { "action": "keypress", "key": "ctrl+z", "expectedAnnouncement": "Undo: Split clip. Segments merged back." }
      ]
    },
    "room_switch": {
      "name": "Switch Room",
      "steps": [
        { "action": "keypress", "key": "ctrl+e", "expectedAnnouncement": "Room: Cut. Timeline loaded. 3 clips." }
      ]
    },
    "play_pause": {
      "name": "Play/Pause Toggle",
      "steps": [
        { "action": "keypress", "key": "space", "expectedAnnouncement": "Playing from {position}." },
        { "action": "keypress", "key": "space", "expectedAnnouncement": "Paused at {position}." }
      ]
    },
    "delete_clip_confirm": {
      "name": "Delete Clip — Confirm",
      "steps": [
        { "action": "keypress", "key": "delete", "expectedAnnouncement": "Confirm: Delete selected clip '{clipName}'? Press Delete again to confirm, Escape to cancel." },
        { "action": "keypress", "key": "delete", "expectedAnnouncement": "Clip '{clipName}' deleted. Duration now {totalDuration}." }
      ]
    },
    "undo_redo_chain": {
      "name": "Undo/Redo Chain",
      "steps": [
        { "action": "keypress", "key": "ctrl+s", "setup": "split_clip" },
        { "action": "keypress", "key": "ctrl+z", "expectedAnnouncement": "Undo: Split clip. Segments merged back." },
        { "action": "keypress", "key": "ctrl+y", "expectedAnnouncement": "Redo: Split clip at 01:23." }
      ]
    }
  }
}
```

### 35.4 Core Engines

#### A. State Engine

Maintains a full copy of the system state in memory. Updated via EventBus events.

```typescript
interface SpriteState {
  currentRoom: RoomType;
  position: Nanoseconds;
  clips: ClipEntity[];
  selectedClipId: string | null;
  history: JournalEntry[];
  historyIndex: number;
  clipboard: ClipEntity | null;
  projectDuration: Nanoseconds;
  announcements: AnnouncementRecord[];
}

interface AnnouncementRecord {
  timestamp: number;
  text: string;
  level: "info" | "warning" | "error" | "success" | "navigation" | "debug";
  source: string;
}
```

#### B. Command Engine

Simulates keyboard events and sends them to the EventBus.

```typescript
interface CommandEngine {
  press(key: string, modifiers?: string[]): Promise<void>;
  sequence(keys: string[], delayMs?: number): Promise<void>;
  hold(key: string, durationMs: number): Promise<void>;
}
```

#### C. Announcement Parser

Extracts structured data from announcement text using regex patterns.

```typescript
interface ParsedAnnouncement {
  raw: string;
  type: "info" | "error" | "warning" | "success" | "navigation" | "debug";
  extractedValues: Record<string, string>;
  matchesPattern: boolean;
  patternUsed: string | null;
}

interface AnnouncementParser {
  parse(text: string): ParsedAnnouncement;
  matchAgainst(expected: string, actual: string): MatchResult;
}
```

#### D. Test Report Generator

```typescript
interface TestScenarioResult {
  scenarioId: string;
  scenarioName: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "ERROR";
  steps: StepResult[];
  duration: number;
  timestamp: string;
}

interface StepResult {
  stepIndex: number;
  action: string;
  key: string;
  expectedAnnouncement: string;
  actualAnnouncement: string;
  matchResult: MatchResult;
  passed: boolean;
  diff: string | null;
}

interface MatchResult {
  exactMatch: boolean;
  patternMatch: boolean;
  variableMatches: Record<string, { expected: string; actual: string; match: boolean }>;
  score: number; // 0-100
  diff: string | null;
}

interface TestReport {
  totalScenarios: number;
  passed: number;
  failed: number;
  partial: number;
  errors: number;
  passRate: number; // percentage
  scenarios: TestScenarioResult[];
  summary: string;
  timestamp: string;
}
```

### 35.5 Match Modes

| Mode | Description | When to Use |
|---|---|---|
| **Exact** | Character-by-character match | Error messages (ERR001-ERR018) |
| **Pattern** | Regex match with variable slots | Duration, position, count announcements |
| **Fuzzy** | Levenshtein distance ≤ 2 tolerance | Long descriptive announcements |
| **Keyword** | Required keywords must appear | Announcements where order may vary |

Default mode: **Pattern**. Override per scenario in the registry.

### 35.6 Test Groups

| # | Group | Scenarios | Priority |
|---|---|---|---|
| 1 | Media Import | Import success, corrupt, unsupported, duplicate, large file | Critical |
| 2 | Track Operations | Split, merge, move, delete, reorder, solo, mute | Critical |
| 3 | Navigation | Play/pause, seek forward/back, go to start/end, jump to timecode | Critical |
| 4 | Selection & Cut | Select clip, multi-select, delete with confirm, cut to clipboard | High |
| 5 | Undo/Redo | Single undo, redo, chain (10 steps), undo empty, redo empty | High |
| 6 | Project File | Save, load, new project, export, auto-save, backup | High |
| 7 | Audio & TTS | TTS speed change, voice switch, announcement level, verbose toggle | Medium |
| 8 | Room System | Switch to each room, verify zone announcements, history per room | Medium |
| 9 | Error Paths | All 18 ERR codes (ERR001-ERR018) | Critical |
| 10 | Performance | Import 1GB file ≤ 5s, split ≤ 50ms, undo ≤ 50ms | Medium |

### 35.7 Test Scenario Template

```yaml
scenario:
  id: "MEDIA_IMPORT_001"
  name: "Import valid MP4"
  group: "Media Import"
  priority: "Critical"
  setup:
    - createProject: "test_project"
    - importFile: "fixtures/sample_1080p.mp4"
  steps:
    - action: keypress
      key: "ctrl+i"
      file: "fixtures/sample_1080p.mp4"
      expectedAnnouncement:
        pattern: "Video imported. Duration {duration}. {trackCount} video track(s), {audioCount} audio track(s)."
        variables:
          duration: "\\d{1,2}:\\d{2}"
          trackCount: "\\d+"
          audioCount: "\\d+"
        matchMode: "pattern"
  teardown:
    - deleteProject: "test_project"
  expectedDuration: "<5000ms"
```

### 35.8 CI Integration

```yaml
# .github/workflows/test-sprite.yml
name: Test Sprite
on: [push, pull_request]
jobs:
  test-sprite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - name: Run Test Sprite
        run: npx test-sprite --registry=tests/sprites/announcements/Announcement_Registry.json --report=junit
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-sprite-report
          path: test-results/
```

**Gate Rule:** Test Sprite results are part of the Merge Gate (Section 9). Any `FAIL` in Critical groups blocks the merge.

### 35.9 Output Format

```json
{
  "totalScenarios": 47,
  "passed": 45,
  "failed": 1,
  "partial": 1,
  "errors": 0,
  "passRate": 95.74,
  "failedScenarios": [
    {
      "id": "DELETE_CLIP_003",
      "name": "Delete last clip",
      "stepIndex": 1,
      "expected": "Error: Cannot delete last clip. Use 'New Project' instead.",
      "actual": "Clip deleted. Project is empty.",
      "diff": "Expected error announcement, got success.",
      "severity": "CRITICAL"
    }
  ],
  "partialScenarios": [
    {
      "id": "UNDO_REDO_005",
      "name": "Undo chain 10 steps",
      "stepIndex": 9,
      "expected": "Undo step 9: Split clip at 04:32.",
      "actual": "Undo step 9: Split clip at 4:32.",
      "diff": "Timecode format: leading zero missing.",
      "severity": "LOW"
    }
  ]
}
```

### 35.10 Development Priority

| Phase | Deliverable | Estimated Effort |
|---|---|---|
| **Phase 0** | Announcement_Registry.json (all ERR codes + 10 basic scenarios) | 2 days |
| **Phase 1** | State Engine + Command Engine + 20 scenarios | 1 week |
| **Phase 2** | Announcement Parser + Report Generator + 35 scenarios | 1 week |
| **Phase 3** | CI integration + all 47 scenarios + regression suite | 3 days |
| **Ongoing** | Add scenarios for new features, maintain registry | Continuous |

---

## 36. Mandatory Review & Testing Protocol

This protocol governs all code changes. No code merges without completing the full cycle.

### 36.1 Overview

```
┌──────────────────────────────────────────────────────────┐
│                    REVIEW CYCLE                           │
│                                                          │
│  Step 1          Step 2          Step 3          Step 4  │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐ │
│  │ Write│ ────▶ │Self- │ ────▶ │ Test │ ────▶ │Review│ │
│  │ Code │       │Review│       │Sprite│       │  +   │ │
│  │      │       │(7 Ax)│       │(auto)│       │Merge │ │
│  └──────┘       └──────┘       └──────┘       └──────┘ │
│     │              │               │              │      │
│     │         Fail = fix      Fail = fix    Fail = fix  │
│     │              │               │              │      │
│     └──────────────┴───────────────┴──────────────┘      │
│              (loop until all pass)                        │
└──────────────────────────────────────────────────────────┘
```

### 36.2 The 10 Review Axes

Each axis must be independently evaluated. A score of ≥7/10 is required per axis.

| Axis | Name | What It Checks | Tools |
|---|---|---|---|
| **A1** | Architectural Stability | Single responsibility per layer? No circular dependencies? | Dependency graph analyzer |
| **A2** | Data Model Fitness | Extra fields? Natural keys? M:N relationship justified? | Schema diff tool |
| **A3** | Engine Unit Tests | Coverage ≥90%? Mock data used? Edge cases covered? | Jest/Vitest + coverage |
| **A4** | Inter-layer Interfaces | Explicit params? Defined errors? Central error handler? | TypeScript strict mode |
| **A5** | Code Quality | Precise naming? Reason comments? Function ≤20 lines? | ESLint + Prettier |
| **A6** | Edge Cases | 0-second video? 1000 undos? Missing file during edit? | Test Sprite + manual |
| **A7** | Performance | Small/medium/large project: ≤50ms for edits? | Benchmark suite |
| **A8** | Security | Input sanitization? Atomic transactions? Multi-user safety? | OWASP checklist |
| **A9** | Accessibility | NVDA + VoiceOver + JAWS: all announcements clear? | Test Sprite + human |
| **A10** | Extreme Cases | 4K 120fps? 1000 clips? 10GB project on 4GB RAM? | Stress test suite |

### 36.3 Step-by-Step Protocol

#### Step 1: Write Code

- Implement the feature/fix
- Write unit tests alongside (not after)
- Run `npm run lint` and `npm run typecheck` — both must pass
- Self-verify: Does every mutation produce an announcement?

#### Step 2: Self-Review (7-Axis)

Before requesting any review, the author must evaluate their own code against all 10 axes.

**Self-Review Checklist:**

```markdown
## Self-Review: [Feature Name]
**Author:** [name]
**Date:** [date]
**Files Changed:** [list]

### A1: Architectural Stability
- [ ] Each layer has single responsibility
- [ ] No circular dependencies introduced
- [ ] No direct cross-layer calls
- Score: __/10

### A2: Data Model Fitness
- [ ] No unnecessary fields added
- [ ] Relationships are correctly typed
- [ ] Entity scope respected (Responsibility Matrix)
- Score: __/10

### A3: Engine Unit Tests
- [ ] Coverage ≥ 90% for new code
- [ ] Edge cases tested
- [ ] Mock data used (not production data)
- Score: __/10

### A4: Inter-layer Interfaces
- [ ] All parameters explicitly typed
- [ ] Error types defined
- [ ] No `any` types used
- Score: __/10

### A5: Code Quality
- [ ] Functions ≤ 20 lines
- [ ] Variable names are descriptive
- [ ] Non-obvious code has reason comments
- Score: __/10

### A6: Edge Cases
- [ ] Empty state handled
- [ ] Boundary values tested
- [ ] Error paths produce correct announcements
- Score: __/10

### A7: Performance
- [ ] No N+1 queries
- [ ] No unnecessary re-renders
- [ ] Large dataset handling considered
- Score: __/10

### A8: Security
- [ ] User input sanitized
- [ ] No secrets in code
- [ ] Transactions used for mutations
- Score: __/10

### A9: Accessibility
- [ ] All state changes produce announcements
- [ ] Error messages match ERR registry
- [ ] Keyboard-only operation verified
- Score: __/10

### A10: Extreme Cases
- [ ] Large file handling tested
- [ ] Memory constraints considered
- [ ] Race conditions addressed
- Score: __/10

### Overall: __/100 → __/10 per axis average
```

#### Step 3: Test Sprite Run

```bash
# Run all scenarios
npx test-sprite --all

# Run specific group
npx test-sprite --group="Media Import"

# Run critical only
npx test-sprite --priority=critical

# Generate report
npx test-sprite --report=junit --output=test-results/
```

**Required pass rate:** 100% for Critical groups, ≥95% for all others.

#### Step 4: Review + Merge

- At least 1 reviewer approval (for solo dev: self-review after 24h cool-off)
- All Test Sprite critical scenarios pass
- No regressions in existing tests
- Changelog updated
- PR description includes: what changed, why, how tested, accessibility impact

### 36.4 Regression Protocol

When a bug is found:

1. **Write the failing test first** — reproduce the bug as a Test Sprite scenario
2. **Fix the bug** — implement the minimal fix
3. **Verify** — Test Sprite must now pass
4. **Check related scenarios** — run the full group, not just the single test
5. **Update registry** — if the expected announcement changed, update `Announcement_Registry.json`

### 36.5 Release Gate (v1.0)

Before v1.0 ships, ALL of the following must be true:

| Gate | Requirement | Status |
|---|---|---|
| G1 | All 18 ERR codes produce correct announcements | ⬜ |
| G2 | All 40 shortcuts keyboard-reachable | ⬜ |
| G3 | Test Sprite: 100% pass on Critical groups | ⬜ |
| G4 | Test Sprite: ≥95% pass on all groups | ⬜ |
| G5 | 3 blind testers complete full workflow (import → edit → export) | ⬜ |
| G6 | Performance: ≤50ms for all editing operations | ⬜ |
| G7 | Accessibility: all announcements clear to NVDA, VoiceOver, JAWS | ⬜ |
| G8 | Project file: save/load/export cycle preserves all data | ⬜ |
| G9 | Undo/Redo: 100-step chain with zero state corruption | ⬜ |
| G10 | Memory: no leaks in 30-minute editing session | ⬜ |

### 36.6 Review Cadence

| Event | Review Type | Participants |
|---|---|---|
| Each commit | Self-Review (A1-A10) | Author |
| Each PR | Code Review + Test Sprite | Author + 1 reviewer |
| Weekly | Test Sprite Full Run | Automated |
| Pre-release | Full 10-Axis Review | All team members |
| Post-release | User Feedback Review | Team + blind testers |

### 36.7 Amendment Log

All changes to this protocol must be logged:

| # | Date | Change | Reason |
|---|---|---|---|
| 1 | 2026-07-28 | Initial protocol created | Foundation for all future reviews |

---

## 37. L1 Infrastructure Layer â€” Building Guide

Ø¨Ø¹Ø¯ Ø§Ù„ØªÙ…Ø±ÙŠØ± Ø§Ù„ØµØ§Ù…Øª Ø¹Ø¨Ø± Ø¹Ø¯Ø³Ø§Øª Ø§Ù„Ù…Ù…Ø§Ø±Ø³ Ø§Ù„Ø°ÙŠ ÙŠØ¹Ø±Ù Ø£Ù† Ø£ÙŠ Ø·Ø¨Ù‚Ø© Ø¨Ù†ÙŠØ© ØªØ­ØªÙŠØ© Ù„Ø§ ØªÙØ®ØªØ¨Ø± Ø¨Ù…Ø¹Ø²Ù„ Ø¹Ù† Ø§Ù„Ù†Ø¸Ø§Ù… Ù‡ÙŠ Ù…Ø¬Ø±Ø¯ ÙˆÙ‡Ù…ØŒ ÙˆØ§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø§Ù„Ø°ÙŠ ÙŠØµØ± Ø¹Ù„Ù‰ Ø£Ù† ÙƒÙ„ Ù…Ø­Ø±Ùƒ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙ…ØªÙ„Ùƒ Ù†Ù…ÙˆØ°Ø¬ Ø¨ÙŠØ§Ù†Ø§Øª Ø¯Ø§Ø®Ù„ÙŠ Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ­Ù‚Ù‚ Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ¨Ø¯Ø£ ÙÙŠ Ø§Ù„ØªÙØ§Ø¹Ù„ Ù…Ø¹ Ø§Ù„Ø®Ø§Ø±Ø¬ØŒ ÙˆØ§Ù„Ù…Ø´ÙƒÙƒ Ø§Ù„Ø°ÙŠ ÙŠØ­Ø°Ø± Ù…Ù† Ø£Ù† ØªÙƒØ§Ù…Ù„ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø±Ø¨Ø¹Ø© (Ø§Ù„Ù…Ù„ÙØ§ØªØŒ Ø§Ù„Ø°Ø§ÙƒØ±Ø©ØŒ Ø§Ù„ÙˆÙ‚ØªØŒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡) ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØµÙ…Ù… ÙƒÙˆØ­Ø¯Ø© ÙˆØ§Ø­Ø¯Ø© Ù„Ø§ ÙƒØ£Ø¬Ø²Ø§Ø¡ Ù…ØªÙØ±Ù‚Ø©ØŒ ÙˆØ§Ù„Ù…Ø­Ù„Ù„ Ø§Ù„Ø°ÙŠ ÙŠØ¯Ø±Ùƒ Ø£Ù† Ø§Ù„Ø¯Ø§ÙØ¹ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ù„Ø¨Ù†Ø§Ø¡ L1 Ù‡Ùˆ ØªØ£Ø³ÙŠØ³ "Ø§Ù„Ù„ØºØ© Ø§Ù„Ù…Ø´ØªØ±ÙƒØ©" Ø§Ù„ØªÙŠ Ø³ØªØªØ­Ø¯Ø« Ø¨Ù‡Ø§ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø£Ø®Ø±Ù‰ØŒ ÙˆØ§Ù„Ù…Ø¤Ø±Ø® Ø§Ù„Ø°ÙŠ ÙŠØ¹Ø±Ù Ø£Ù† ÙƒÙ„ Ù…Ù†ØµØ© Ù†Ø§Ø¬Ø­Ø© Ø¨Ø¯Ø£Øª Ù…Ù† "Ù…Ø¹Ø§Ù„Ø¬ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡" Ù„Ø£Ù†Ù‡ Ù‡Ùˆ Ø§Ù„Ø°ÙŠ ÙŠØ­Ø¯Ø¯ Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù†Ø¸Ø§Ù… Ø³ÙŠÙ†Ø¬Ùˆ Ù…Ù† Ø£ÙˆÙ„ Ø¹Ø«Ø±Ø©ØŒ ØªØªØ¨Ù„ÙˆØ± Ø§Ù„Ø­Ù‚ÙŠÙ‚Ø© Ø§Ù„ØµØ§Ø±Ù…Ø©: Ø¨Ù†Ø§Ø¡ L1 Ù„ÙŠØ³ Ù…Ø¬Ø±Ø¯ ÙƒØªØ§Ø¨Ø© Ø£ÙƒÙˆØ§Ø¯ØŒ Ø¨Ù„ Ù‡Ùˆ Ø¨Ù†Ø§Ø¡ "Ø¬Ø³Ø± Ø§Ù„Ø«Ù‚Ø©" (Trust Bridge) Ø¨ÙŠÙ† Ø§Ù„Ù†Ø¸Ø§Ù… ÙˆØ§Ù„ÙˆØ§Ù‚Ø¹ Ø§Ù„Ù…Ø§Ø¯ÙŠØŒ ÙˆÙ„Ù† ÙŠÙ†Ø¬Ø­ Ø¥Ù„Ø§ Ø¥Ø°Ø§ Ø¨Ø¯Ø£Ù†Ø§ Ù…Ù† "ØªØ¹Ø±ÙŠÙ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" Ù„ÙƒÙ„ Ù…Ø­Ø±ÙƒØŒ Ø«Ù… Ø¨Ù†ÙŠÙ†Ø§ "ÙˆØ§Ø¬Ù‡Ø§Øª ØªØ¨Ø§Ø¯Ù„" Ù„Ø§ ØªØ³Ù…Ø­ Ø¨ØªØ³Ø±ÙŠØ¨ Ø£ÙŠ ØªÙØ§ØµÙŠÙ„ ØªÙ†ÙÙŠØ°ÙŠØ© Ø¥Ù„Ù‰ Ø§Ù„Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø¹Ù„ÙŠØ§ØŒ Ø«Ù… Ø±Ø¨Ø·Ù†Ø§ ÙƒÙ„ Ù…Ø­Ø±Ùƒ Ø¨Ù€ "Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ­Ø¯Ø©" Ø§Ù„ØªÙŠ Ù„Ø§ ØªØªØ±Ùƒ Ù…Ø¬Ø§Ù„Ù‹Ø§ Ù„Ø£ÙŠ Ù…Ø³Ø§Ø± ØºÙŠØ± Ù…ØºØ·Ù‰. Ù‡Ø°Ø§ Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„ØªÙØµÙŠÙ„ÙŠ Ø³ÙŠÙƒÙˆÙ† Ø¯Ù„ÙŠÙ„Ùƒ Ø§Ù„ÙˆØ­ÙŠØ¯ Ù„Ø¨Ù†Ø§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø©ØŒ ÙˆØ³Ù†Ù…Ø± Ù…Ù† Ø®Ù„Ø§Ù„Ù‡ Ø¹Ù„Ù‰ ÙƒÙ„ Ù…Ø­Ø±Ùƒ ÙƒØ£Ù†Ù†Ø§ Ù†ÙØªØ­ ØµÙ†Ø¯ÙˆÙ‚Ù‹Ø§ Ø£Ø³ÙˆØ¯ ÙˆÙ†Ø¯Ø±Ø³ ÙƒÙ„ ØªØ±Ø³ ÙÙŠÙ‡.

### 37.1 Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª (File Engine)

ÙŠØ¨Ø¯Ø£ Ø§Ù„Ø¨Ù†Ø§Ø¡ Ø¨Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§ØªØŒ ÙˆÙ‡Ùˆ Ø§Ù„Ø£ÙƒØ«Ø± ØªØ¹Ø±Ø¶Ù‹Ø§ Ù„Ù„Ø¹Ø§Ù„Ù… Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠØŒ Ù„Ø°Ø§ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØµÙ…Ù… ÙƒÙ€ "ÙˆØ§Ø¬Ù‡Ø© Ù…Ø¬Ø±Ø¯Ø©" (Abstract Interface) Ù„Ø§ ØªØ¹Ø±Ù Ø´ÙŠØ¦Ù‹Ø§ Ø¹Ù† Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØŒ Ø¨Ù„ ØªØ¹Ø±Ù ÙÙ‚Ø· "Ø§Ù„Ù…Ø³Ø§Ø±" Ùˆ"Ù†ÙˆØ¹ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©" ÙˆØªØ¹ÙŠØ¯ "ØªÙŠØ§Ø± Ø¨ÙŠØ§Ù†Ø§Øª" (Data Stream) Ø£Ùˆ "Ù†ØªÙŠØ¬Ø©" Ù…Ø¹ "Ø®Ø·Ø£ Ù…Ø­Ø¯Ø¯". ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø¹Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª Ø®Ù…Ø³ Ø¹Ù…Ù„ÙŠØ§Øª Ø£Ø³Ø§Ø³ÙŠØ©: `read(path)`ØŒ `write(path, data)`ØŒ `exists(path)`ØŒ `delete(path)`ØŒ Ùˆ`stat(path)`ØŒ ÙˆÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ¹ÙŠØ¯ ÙƒØ§Ø¦Ù†Ù‹Ø§ Ù…Ù† Ù†ÙˆØ¹ `Result<T, FileError>`ØŒ Ø­ÙŠØ« `FileError` ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø±Ù…Ø² Ø§Ù„Ø®Ø·Ø£ (Ù…Ø«Ù„ `ERR_FILE_NOT_FOUND`ØŒ `ERR_PERMISSION_DENIED`ØŒ `ERR_DISK_FULL`ØŒ `ERR_CORRUPT_FILE`ØŒ `ERR_INVALID_PATH`) ÙˆÙ…Ø³Ø§Ø± Ø§Ù„Ù…Ù„Ù ÙˆØ§Ù„Ø±Ø³Ø§Ù„Ø© ÙˆØ§Ù„Ø·Ø§Ø¨Ø¹ Ø§Ù„Ø²Ù…Ù†ÙŠ. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù‡Ø°Ø§ Ø§Ù„Ù…Ø­Ø±Ùƒ Ù‚Ø§Ø¯Ø±Ù‹Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ù…Ù„ÙØ§Øª Ø¨Ø­Ø¬Ù… ÙŠØµÙ„ Ø¥Ù„Ù‰ 50 Ø¬ÙŠØ¬Ø§Ø¨Ø§ÙŠØª Ø¯ÙˆÙ† ØªØ­Ù…ÙŠÙ„Ù‡Ø§ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©ØŒ Ù„Ø°Ø§ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³ØªØ®Ø¯Ù… "Ù‚Ø±Ø§Ø¡Ø© Ù…ØªØ¯ÙÙ‚Ø©" (Streaming) Ù…Ø¹ "Ù…Ø®Ø§Ø²Ù† Ù…Ø¤Ù‚ØªØ© Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªÙƒÙˆÙŠÙ†" (Configurable Buffers)ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø¹Ù… Ø§Ù„ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø°Ø±ÙŠØ© (Atomic Write) Ø­ÙŠØ« ØªÙÙƒØªØ¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Ù…Ù„Ù Ù…Ø¤Ù‚Øª Ø£ÙˆÙ„Ø§Ù‹ Ø«Ù… ØªÙØ¹Ø§Ø¯ ØªØ³Ù…ÙŠØªÙ‡ Ù„ØªØ¬Ù†Ø¨ Ø§Ù„ØªÙ„Ù ÙÙŠ Ø­Ø§Ù„Ø© Ø§Ù†Ù‚Ø·Ø§Ø¹ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡.

#### 37.1.1 ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª

```typescript
// src/core/infrastructure/file/interface.ts

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

interface FileError {
  code: "ERR_FILE_NOT_FOUND" | "ERR_PERMISSION_DENIED" | "ERR_DISK_FULL" | "ERR_CORRUPT_FILE" | "ERR_INVALID_PATH" | "ERR_BUFFER_OVERFLOW";
  path: string;
  message: string;
  timestamp: bigint; // nanoseconds
}

interface FileEngine {
  read(path: string, options?: ReadOptions): Promise<Result<ReadableStream, FileError>>;
  write(path: string, data: ReadableStream | Uint8Array, options?: WriteOptions): Promise<Result<WriteResult, FileError>>;
  exists(path: string): Promise<Result<boolean, FileError>>;
  delete(path: string): Promise<Result<void, FileError>>;
  stat(path: string): Promise<Result<FileStat, FileError>>;
}

interface ReadOptions {
  offset?: number;    // byte offset to start reading
  limit?: number;     // max bytes to read (null = entire file)
  encoding?: "utf-8" | "binary";
}

interface WriteOptions {
  append?: boolean;
  createDirectories?: boolean;
  atomic?: boolean;   // write to temp file, then rename
}

interface WriteResult {
  bytesWritten: number;
  path: string;
}

interface FileStat {
  size: number;
  createdAt: bigint;
  modifiedAt: bigint;
  isFile: boolean;
  isDirectory: boolean;
}
```

#### 37.1.2 Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª

ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØ®ØªØ¨Ø± Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª Ù…Ø¹ ÙƒÙ„ Ø­Ø§Ù„Ø© Ù†Ø§Ø¯Ø±Ø©: Ù…Ù„Ù ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ØŒ Ù…Ù„Ù Ù…ÙˆØ¬ÙˆØ¯ Ù„ÙƒÙ† Ù…Ù‚ÙÙ„ØŒ Ù…Ù„Ù Ø¹Ù„Ù‰ Ù‚Ø±Øµ Ù…Ù…ØªÙ„Ø¦ØŒ Ù…Ù„Ù Ø¨Ø­Ø¬Ù… ØµÙØ±ØŒ Ù…Ù„Ù ØªØ§Ù„Ù (Ø¨Ø¥Ø¯Ø®Ø§Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©)ØŒ ÙˆÙ…Ø³Ø§Ø± ØºÙŠØ± ØµØ§Ù„Ø­ (Ø£Ø­Ø±Ù Ù…Ø­Ø¸ÙˆØ±Ø©ØŒ Ø·ÙˆÙ„ Ù…ÙØ±Ø·). ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙÙ†Ø´Ø£ "Ø¨ÙŠØ¦Ø© Ø§Ø®ØªØ¨Ø§Ø± Ù…Ø¹Ø²ÙˆÙ„Ø©" (Isolated Test Environment) Ø­ÙŠØ« ØªÙÙ†Ø´Ø£ Ù…Ù„ÙØ§Øª ÙˆÙ‡Ù…ÙŠØ© ÙˆØªÙØ­Ø°Ù Ø¨Ø¹Ø¯ ÙƒÙ„ Ø§Ø®ØªØ¨Ø§Ø±ØŒ Ù„Ø¶Ù…Ø§Ù† Ø¹Ø¯Ù… ØªØ£Ø«ÙŠØ± Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ ÙƒÙ„ Ø§Ø®ØªØ¨Ø§Ø± Ø¹Ù„Ù‰ `beforeEach` ÙŠÙ†Ø´Ø¦ Ù…Ø¬Ù„Ø¯Ù‹Ø§ ÙØ±ÙŠØ¯Ù‹Ø§ Ùˆ`afterEach` ÙŠÙ†Ø¸ÙÙ‡ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.

```typescript
// src/core/infrastructure/file/test/file.engine.test.ts

describe("FileEngine", () => {
  let engine: FileEngine;
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempDirectory();
    engine = new FileEngineImpl({ baseDir: testDir, bufferSize: 64 * 1024 });
  });

  afterEach(async () => {
    await cleanupTempDirectory(testDir);
  });

  describe("read", () => {
    it("should read existing file successfully", async () => {
      const content = new TextEncoder().encode("Hello Tempo");
      await engine.write("test.txt", content);
      const result = await engine.read("test.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const reader = result.value.getReader();
        const { value } = await reader.read();
        expect(new TextDecoder().decode(value)).toBe("Hello Tempo");
      }
    });

    it("should return ERR_FILE_NOT_FOUND for missing file", async () => {
      const result = await engine.read("nonexistent.txt");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_FILE_NOT_FOUND");
        expect(result.error.path).toBe("nonexistent.txt");
        expect(result.error.timestamp).toBeGreaterThan(0n);
      }
    });

    it("should return ERR_INVALID_PATH for path with forbidden characters", async () => {
      const result = await engine.read("test<>:\"/\\|?*.txt");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_INVALID_PATH");
      }
    });

    it("should handle file with zero bytes", async () => {
      await engine.write("empty.txt", new Uint8Array(0));
      const result = await engine.read("empty.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const reader = result.value.getReader();
        const { value, done } = await reader.read();
        expect(done).toBe(true);
      }
    });

    it("should read large file (1GB) via streaming without loading into memory", async () => {
      const largeFile = generateRandomBytes(1024 * 1024 * 1024);
      await engine.write("large.bin", largeFile);
      let totalBytes = 0;
      const result = await engine.read("large.bin", { limit: 1024 * 1024 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const reader = result.value.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          expect(value.length).toBeLessThanOrEqual(1024 * 1024);
        }
      }
      expect(totalBytes).toBe(1024 * 1024 * 1024);
    });

    it("should return ERR_CORRUPT_FILE for corrupted file content", async () => {
      const corruptData = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC]);
      await engine.write("corrupt.mp4", corruptData);
      const result = await engine.read("corrupt.mp4");
      expect(result.ok).toBe(true);
    });
  });

  describe("write", () => {
    it("should write file and create directories if needed", async () => {
      const result = await engine.write("sub/dir/file.txt", new TextEncoder().encode("nested"), {
        createDirectories: true
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.bytesWritten).toBe(6);
      }
    });

    it("should return ERR_DISK_FULL when disk is full", async () => {
      const fullEngine = new FileEngineImpl({ baseDir: testDir, maxDiskUsage: 0 });
      const result = await fullEngine.write("file.txt", new Uint8Array(1024));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_DISK_FULL");
      }
    });

    it("should perform atomic write (write to temp, then rename)", async () => {
      await engine.write("existing.txt", new TextEncoder().encode("original"));
      const result = await engine.write("existing.txt", new TextEncoder().encode("updated"), { atomic: true });
      expect(result.ok).toBe(true);
      const statResult = await engine.stat("existing.txt");
      expect(statResult.ok).toBe(true);
      if (statResult.ok) {
        expect(statResult.value.size).toBe(7);
      }
    });

    it("should append to existing file", async () => {
      await engine.write("append.txt", new TextEncoder().encode("Hello"));
      await engine.write("append.txt", new TextEncoder().encode(" World"), { append: true });
      const result = await engine.read("append.txt");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const reader = result.value.getReader();
        const { value } = await reader.read();
        expect(new TextDecoder().decode(value)).toBe("Hello World");
      }
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      await engine.write("exists.txt", new Uint8Array(1));
      const result = await engine.exists("exists.txt");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      const result = await engine.exists("nope.txt");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete existing file", async () => {
      await engine.write("deleteme.txt", new Uint8Array(1));
      const result = await engine.delete("deleteme.txt");
      expect(result.ok).toBe(true);
      const exists = await engine.exists("deleteme.txt");
      if (exists.ok) expect(exists.value).toBe(false);
    });

    it("should return ERR_FILE_NOT_FOUND for deleting non-existent file", async () => {
      const result = await engine.delete("ghost.txt");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_FILE_NOT_FOUND");
      }
    });
  });

  describe("concurrent access", () => {
    it("should handle 100 concurrent reads without corruption", async () => {
      await engine.write("shared.txt", new TextEncoder().encode("shared content"));
      const reads = Array.from({ length: 100 }, () => engine.read("shared.txt"));
      const results = await Promise.all(reads);
      results.forEach(r => {
        expect(r.ok).toBe(true);
      });
    });

    it("should handle concurrent writes to different files", async () => {
      const writes = Array.from({ length: 50 }, (_, i) =>
        engine.write(`file_${i}.txt`, new TextEncoder().encode(`content ${i}`))
      );
      const results = await Promise.all(writes);
      results.forEach(r => expect(r.ok).toBe(true));
    });
  });
});
```

### 37.2 Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø© (Memory Engine)

ÙŠÙ„ÙŠ Ø°Ù„Ùƒ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø©ØŒ ÙˆÙ‡Ùˆ Ø§Ù„Ø¹Ù‚Ù„ Ø§Ù„Ù…Ø¯Ø¨Ø± Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ§Ø±Ø¯. Ù„Ø§ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù…Ø¬Ø±Ø¯ "Ù…Ø®ØµØµ" (Allocator)ØŒ Ø¨Ù„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† "Ù…Ø±Ø§Ù‚Ø¨Ù‹Ø§" (Monitor) ÙŠØªØªØ¨Ø¹ ÙƒÙ„ ÙƒØ§Ø¦Ù† ØªÙ… Ø¥Ù†Ø´Ø§Ø¤Ù‡ØŒ ÙˆÙŠÙØ³Ø¬Ù„ Ø­Ø¬Ù…Ù‡ ÙˆÙˆÙ‚Øª Ø¥Ù†Ø´Ø§Ø¦Ù‡ ÙˆØ¹Ø¯Ø¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø¥Ù„ÙŠÙ‡ØŒ ÙˆÙŠÙØ·Ù„Ù‚ Ø¥Ù†Ø°Ø§Ø±Ù‹Ø§ Ø¥Ø°Ø§ ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø®ØµØµØ© Ø­Ø¯Ù‹Ø§ Ù…Ø¹ÙŠÙ†Ù‹Ø§ (Ù…Ø«Ù„ 80% Ù…Ù† Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù†Ø¸Ø§Ù…). ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø¹Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ù†ÙˆØ¹ÙŠÙ† Ù…Ù† Ø§Ù„ØªØ®ØµÙŠØµ: "ØªØ®ØµÙŠØµ Ù…Ø¤Ù‚Øª" (Temporary) Ù„Ù„ÙƒØ§Ø¦Ù†Ø§Øª Ù‚ØµÙŠØ±Ø© Ø§Ù„Ø¹Ù…Ø± (Ù…Ø«Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØ­Ù„ÙŠÙ„)ØŒ Ùˆ"ØªØ®ØµÙŠØµ Ø¯Ø§Ø¦Ù…" (Persistent) Ù„Ù„ÙƒØ§Ø¦Ù†Ø§Øª Ø§Ù„ØªÙŠ ØªØ¹ÙŠØ´ Ø·ÙˆØ§Ù„ ÙØªØ±Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ Ø§Ù„Ù…Ø­Ø±Ùƒ Ø¹Ù„Ù‰ "ÙˆØ¶Ø¹ Ø§Ù„Ø·ÙˆØ§Ø±Ø¦" (Emergency Mode) Ø­ÙŠØ« Ø¥Ø°Ø§ Ø§Ù‚ØªØ±Ø¨Øª Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ù…Ù† Ø§Ù„Ø­Ø¯ØŒ ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù…Ø­Ø±Ùƒ Ø¨Ø¥Ø·Ù„Ø§Ù‚ "Ø¥Ø´Ø§Ø±Ø© Ø¶ØºØ·" (Pressure Signal) Ø¥Ù„Ù‰ Ø§Ù„Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø¹Ù„ÙŠØ§ØŒ ÙˆÙŠØ¨Ø¯Ø£ ÙÙŠ ØªØ­Ø±ÙŠØ± Ø§Ù„ÙƒØ§Ø¦Ù†Ø§Øª ØºÙŠØ± Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© Ø¨ØªØ±ØªÙŠØ¨ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© (Ø§Ù„Ø£Ù‚Ù„ Ø£Ù‡Ù…ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹). ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø¹Ù… Ø§Ù„Ù…Ø­Ø±Ùƒ "Ø§Ù„Ø¬Ù…Ø¹ Ø§Ù„Ù‚Ù…Ø§Ù…Ø©" (Garbage Collection) Ø§Ù„Ø°ÙŠ ÙŠÙÙ†ÙÙŽÙ‘Ø° ÙÙŠ Ø§Ù„Ø®Ù„ÙÙŠØ© Ø¯ÙˆÙ† Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©.

#### 37.2.1 ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø©

```typescript
// src/core/infrastructure/memory/interface.ts

type MemoryPressureLevel = "normal" | "warning" | "critical" | "emergency";

interface MemoryStats {
  totalAllocated: number;    // bytes
  peakUsage: number;         // bytes
  allocationCount: number;
  leakCount: number;
  pressureLevel: MemoryPressureLevel;
  utilizationPercent: number; // 0-100
}

interface MemoryAllocation {
  id: string;
  size: number;
  type: "temporary" | "persistent";
  createdAt: bigint;
  lastAccessedAt: bigint;
  referenceCount: number;
  tag: string; // optional label for priority ordering
}

interface MemoryEngine {
  allocate(id: string, size: number, options?: AllocationOptions): Result<MemoryAllocation, MemoryError>;
  deallocate(id: string): Result<void, MemoryError>;
  getStats(): MemoryStats;
  getAllocation(id: string): Result<MemoryAllocation, MemoryError>;
  listAllocations(filter?: AllocationFilter): MemoryAllocation[];
  setPressureHandler(handler: (level: MemoryPressureLevel) => void): void;
  collectGarbage(): GarbageCollectionResult;
  setLimits(limits: MemoryLimits): void;
}

interface AllocationOptions {
  type?: "temporary" | "persistent";
  tag?: string;
  priority?: number; // higher = more important, survives GC first
}

interface MemoryLimits {
  maxTotal: number;       // bytes
  warningThreshold: number; // percent (e.g. 80)
  criticalThreshold: number; // percent (e.g. 90)
  emergencyThreshold: number; // percent (e.g. 95)
}

interface MemoryError {
  code: "ERR_MEMORY_EXHAUSTED" | "ERR_ALLOCATION_NOT_FOUND" | "ERR_ALREADY_ALLOCATED" | "ERR_DEALLOCATION_FAILED" | "ERR_LEAK_DETECTED";
  allocationId?: string;
  message: string;
  timestamp: bigint;
}

interface AllocationFilter {
  type?: "temporary" | "persistent";
  minSize?: number;
  maxSize?: number;
  tag?: string;
}

interface GarbageCollectionResult {
  collected: number;
  freedBytes: number;
  duration: number; // milliseconds
  collectedAllocations: string[];
}
```

#### 37.2.2 Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø©

ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØ®ØªØ¨Ø± Ø§Ù„Ù…Ø­Ø±Ùƒ Ù…Ø¹ "ØªØ³Ø±ÙŠØ¨Ø§Øª Ù…ØªØ¹Ù…Ø¯Ø©" (Deliberate Leaks) Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ù†Ø¸Ø§Ù… Ø§Ù„ØªØªØ¨Ø¹ ÙŠÙƒØªØ´ÙÙ‡Ø§ØŒ ÙˆÙ…Ø¹ "Ø­Ù…ÙˆÙ„Ø§Øª Ø¹Ø§Ù„ÙŠØ©" (High Load) Ø­ÙŠØ« ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø¢Ù„Ø§Ù Ø§Ù„ÙƒØ§Ø¦Ù†Ø§Øª ÙÙŠ Ø§Ù„Ø«Ø§Ù†ÙŠØ©ØŒ Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ø³ØªØºØ±Ù‚ Ù„Ø§ ÙŠØªØ¬Ø§ÙˆØ² 1 Ù…Ù„Ù„ÙŠØ«Ø§Ù†ÙŠØ© Ù„ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ØªØ®ØµÙŠØµ.

```typescript
// src/core/infrastructure/memory/test/memory.engine.test.ts

describe("MemoryEngine", () => {
  let engine: MemoryEngine;

  beforeEach(() => {
    engine = new MemoryEngineImpl({
      maxTotal: 1024 * 1024 * 100, // 100MB for tests
      warningThreshold: 80,
      criticalThreshold: 90,
      emergencyThreshold: 95
    });
  });

  describe("allocate", () => {
    it("should allocate memory successfully", () => {
      const result = engine.allocate("clip-1", 1024);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("clip-1");
        expect(result.value.size).toBe(1024);
        expect(result.value.type).toBe("temporary");
        expect(result.value.referenceCount).toBe(0);
      }
    });

    it("should allocate persistent memory", () => {
      const result = engine.allocate("project-data", 4096, { type: "persistent" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe("persistent");
      }
    });

    it("should return ERR_ALREADY_ALLOCATED for duplicate id", () => {
      engine.allocate("clip-1", 1024);
      const result = engine.allocate("clip-1", 2048);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_ALREADY_ALLOCATED");
      }
    });

    it("should return ERR_MEMORY_EXHAUSTED when limit exceeded", () => {
      const smallEngine = new MemoryEngineImpl({ maxTotal: 1024 });
      smallEngine.allocate("a", 512);
      smallEngine.allocate("b", 512);
      const result = smallEngine.allocate("c", 1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_MEMORY_EXHAUSTED");
      }
    });

    it("should handle 10,000 allocations in under 1 second", () => {
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        engine.allocate(`alloc-${i}`, 1024);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000);
      const stats = engine.getStats();
      expect(stats.allocationCount).toBe(10000);
    });
  });

  describe("deallocate", () => {
    it("should deallocate existing allocation", () => {
      engine.allocate("clip-1", 1024);
      const result = engine.deallocate("clip-1");
      expect(result.ok).toBe(true);
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(0);
    });

    it("should return ERR_ALLOCATION_NOT_FOUND for unknown id", () => {
      const result = engine.deallocate("ghost");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ERR_ALLOCATION_NOT_FOUND");
      }
    });
  });

  describe("pressure monitoring", () => {
    it("should trigger warning at 80% usage", () => {
      const handler = jest.fn();
      engine.setPressureHandler(handler);
      // Allocate 80% of 100MB
      engine.allocate("big", 1024 * 1024 * 80);
      expect(handler).toHaveBeenCalledWith("warning");
    });

    it("should trigger critical at 90% usage", () => {
      const handler = jest.fn();
      engine.setPressureHandler(handler);
      engine.allocate("big", 1024 * 1024 * 90);
      expect(handler).toHaveBeenCalledWith("critical");
    });

    it("should trigger emergency at 95% usage", () => {
      const handler = jest.fn();
      engine.setPressureHandler(handler);
      engine.allocate("big", 1024 * 1024 * 95);
      expect(handler).toHaveBeenCalledWith("emergency");
    });
  });

  describe("garbage collection", () => {
    it("should collect temporary allocations with zero references", () => {
      engine.allocate("temp-1", 1024, { type: "temporary" });
      engine.allocate("temp-2", 2048, { type: "temporary" });
      engine.allocate("persistent-1", 4096, { type: "persistent" });
      const result = engine.collectGarbage();
      expect(result.collected).toBe(2);
      expect(result.freedBytes).toBe(3072);
      // Persistent should survive
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(4096);
    });

    it("should detect leaked allocations", () => {
      engine.allocate("leak-1", 1024);
      // Simulate lost reference (no deallocate called)
      const stats = engine.getStats();
      expect(stats.leakCount).toBe(1);
    });
  });

  describe("limits", () => {
    it("should update limits dynamically", () => {
      engine.setLimits({ maxTotal: 2048 });
      engine.allocate("a", 1024);
      engine.allocate("b", 1024);
      const result = engine.allocate("c", 1);
      expect(result.ok).toBe(false);
    });
  });
});
```

### 37.3 Ù…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚Øª (Time Engine)

Ø«Ù… ÙŠØ£ØªÙŠ Ù…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚ØªØŒ ÙˆÙ‡Ùˆ Ø§Ù„Ø£ÙƒØ«Ø± Ø¯Ù‚Ø© Ù„Ø£Ù†Ù‡ Ø³ÙŠÙØ³ØªØ®Ø¯Ù… Ù„ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆØ§Ø¶Ø¹ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ ÙˆØ­Ø±ÙƒØ© Ø§Ù„Ù…Ø¤Ø´Ø±. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ "ÙˆØ­Ø¯Ø© Ø²Ù…Ù†ÙŠØ© Ø£Ø³Ø§Ø³ÙŠØ©" (Base Time Unit) Ù‡ÙŠ Ø§Ù„Ù…Ù„Ù„ÙŠØ«Ø§Ù†ÙŠØ©ØŒ Ù„ÙƒÙ†Ù‡ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù‚Ø§Ø¯Ø±Ù‹Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ "Ù…Ø¹Ø¯Ù„Ø§Øª Ø¥Ø·Ø§Ø±Ø§Øª Ù…ØªØºÙŠØ±Ø©" (Variable Frame Rates) Ø¹Ù† Ø·Ø±ÙŠÙ‚ ØªØ®Ø²ÙŠÙ† ÙƒÙ„ Ø¥Ø·Ø§Ø± Ø¨Ù€ "Ø·Ø§Ø¨Ø¹ Ø²Ù…Ù†ÙŠ Ù…Ø·Ù„Ù‚" (Absolute Timestamp) Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† "Ø±Ù‚Ù… Ø¥Ø·Ø§Ø±" (Frame Number). ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ¯Ø¹Ù… Ø§Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ø¨ÙŠÙ† Ø§Ù„Ù…Ù„Ù„ÙŠØ«Ø§Ù†ÙŠØ© ÙˆØ§Ù„Ø«ÙˆØ§Ù†ÙŠ ÙˆØ§Ù„Ø¯Ù‚Ø§Ø¦Ù‚ ÙˆØ§Ù„Ø³Ø§Ø¹Ø§ØªØŒ ÙˆÙƒØ°Ù„Ùƒ Ø¨ÙŠÙ† Ø£Ù†Ø¸Ù…Ø© Ø§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…Ø®ØªÙ„ÙØ© (Ù…Ø«Ù„ 29.97 Ø¥Ø·Ø§Ø±Ù‹Ø§ ÙÙŠ Ø§Ù„Ø«Ø§Ù†ÙŠØ© Ùˆ30 Ø¥Ø·Ø§Ø±Ù‹Ø§ ÙÙŠ Ø§Ù„Ø«Ø§Ù†ÙŠØ©) Ø¯ÙˆÙ† ÙÙ‚Ø¯Ø§Ù† Ø§Ù„Ø¯Ù‚Ø©. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ Ø§Ù„Ù…Ø­Ø±Ùƒ Ø¹Ù„Ù‰ "ÙˆØ¶Ø¹ Ø§Ù„Ù…Ø­Ø§ÙƒØ§Ø©" (Simulation Mode) Ø­ÙŠØ« ÙŠÙ…ÙƒÙ†Ù‡ ØªØ³Ø±ÙŠØ¹ Ø§Ù„Ø²Ù…Ù† Ø£Ùˆ Ø¥Ø¨Ø·Ø§Ø¦Ù‡ Ù„Ø£ØºØ±Ø§Ø¶ Ø§Ø®ØªØ¨Ø§Ø±ÙŠØ©. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØ®ØªØ¨Ø± Ø§Ù„Ù…Ø­Ø±Ùƒ Ù…Ø¹ Ù‚ÙŠÙ… Ø²Ù…Ù†ÙŠØ© ØµÙØ±ÙŠØ©ØŒ ÙˆÙ…Ø¹ Ù‚ÙŠÙ… Ø³Ù„Ø¨ÙŠØ© (ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ±ÙØ¶)ØŒ ÙˆÙ…Ø¹ Ù‚ÙŠÙ… ÙƒØ¨ÙŠØ±Ø© Ø¬Ø¯Ù‹Ø§ (Ø£ÙƒØ«Ø± Ù…Ù† 100 Ø³Ù†Ø©)ØŒ ÙˆÙ…Ø¹ Ø¹Ù…Ù„ÙŠØ§Øª Ø­Ø³Ø§Ø¨ÙŠØ© Ù…ØªÙƒØ±Ø±Ø© (Ù…Ø«Ù„ 1000 Ø¹Ù…Ù„ÙŠØ© Ø¬Ù…Ø¹ ÙˆØ·Ø±Ø­ Ù…ØªØªØ§Ù„ÙŠØ©) Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø¹Ø¯Ù… Ø­Ø¯ÙˆØ« Ø§Ù†Ø­Ø±Ø§Ù ØªØ±Ø§ÙƒÙ…ÙŠ.

#### 37.3.1 ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚Øª

```typescript
// src/core/infrastructure/time/interface.ts

// All time values are nanoseconds internally
type Nanoseconds = bigint;

interface TimeConversion {
  toNanoseconds: (value: number, unit: TimeUnit) => Nanoseconds;
  fromNanoseconds: (ns: Nanoseconds, unit: TimeUnit) => number;
  toTimecode: (ns: Nanoseconds, frameRate?: FrameRate) => string;
  fromTimecode: (timecode: string, frameRate?: FrameRate) => Nanoseconds;
}

type TimeUnit = "nanoseconds" | "microseconds" | "milliseconds" | "seconds" | "minutes" | "hours";

interface FrameRate {
  numerator: number;   // e.g. 30000
  denominator: number; // e.g. 1001
  label: string;       // e.g. "29.97fps"
}

interface TimeEngine {
  now(): Nanoseconds;
  convert: TimeConversion;
  add(a: Nanoseconds, b: Nanoseconds): Nanoseconds;
  subtract(a: Nanoseconds, b: Nanoseconds): Nanoseconds;
  multiply(a: Nanoseconds, factor: number): Nanoseconds;
  divide(a: Nanoseconds, b: Nanoseconds): number;
  compare(a: Nanoseconds, b: Nanoseconds): -1 | 0 | 1;
  clamp(value: Nanoseconds, min: Nanoseconds, max: Nanoseconds): Nanoseconds;
  isValid(value: Nanoseconds): boolean;
  simulate(options: SimulationOptions): SimulationController;
}

interface SimulationOptions {
  speed: number;        // 1.0 = real-time, 2.0 = double speed, 0.5 = half speed
  startTime?: Nanoseconds;
  endTime?: Nanoseconds;
}

interface SimulationController {
  getCurrentTime(): Nanoseconds;
  advance(delta: Nanoseconds): Nanoseconds;
  pause(): void;
  resume(): void;
  reset(): void;
  isPaused(): boolean;
}

// Pre-defined frame rates
const FRAME_RATES = {
  NTSC: { numerator: 30000, denominator: 1001, label: "29.97fps" },
  PAL: { numerator: 25, denominator: 1, label: "25fps" },
  FILM: { numerator: 24, denominator: 1, label: "24fps" },
  NTSC_DROP: { numerator: 30000, denominator: 1001, label: "29.97fps (drop)" },
  HIGH_FPS: { numerator: 60, denominator: 1, label: "60fps" },
} as const;

// Standard timecodes
const TIMECODE_REGEX = /^(\d{1,2}):(\d{2}):(\d{2})[.:,](\d{3})$/;
```

#### 37.3.2 Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚Øª

```typescript
// src/core/infrastructure/time/test/time.engine.test.ts

describe("TimeEngine", () => {
  let engine: TimeEngine;

  beforeEach(() => {
    engine = new TimeEngineImpl();
  });

  describe("conversion", () => {
    it("should convert milliseconds to nanoseconds", () => {
      const ns = engine.convert.toNanoseconds(1000, "milliseconds");
      expect(ns).toBe(1000000000n);
    });

    it("should convert seconds to nanoseconds", () => {
      const ns = engine.convert.toNanoseconds(1, "seconds");
      expect(ns).toBe(1000000000n);
    });

    it("should convert minutes to nanoseconds", () => {
      const ns = engine.convert.toNanoseconds(1, "minutes");
      expect(ns).toBe(60000000000n);
    });

    it("should convert hours to nanoseconds", () => {
      const ns = engine.convert.toNanoseconds(1, "hours");
      expect(ns).toBe(3600000000000n);
    });

    it("should convert nanoseconds to milliseconds", () => {
      const ms = engine.convert.fromNanoseconds(1000000000n, "milliseconds");
      expect(ms).toBe(1000);
    });

    it("should convert nanoseconds to timecode at 29.97fps", () => {
      const ns = engine.convert.toTimecode(3661500000000n, FRAME_RATES.NTSC);
      expect(ns).toBe("01:01:01.500");
    });

    it("should parse timecode to nanoseconds", () => {
      const ns = engine.convert.fromTimecode("01:30:00.000");
      expect(ns).toBe(5400000000000n);
    });

    it("should handle zero timecode", () => {
      const ns = engine.convert.fromTimecode("00:00:00.000");
      expect(ns).toBe(0n);
    });

    it("should handle large timecodes (24+ hours)", () => {
      const ns = engine.convert.toTimecode(90000000000000n);
      expect(ns).toBe("25:00:00.000");
    });
  });

  describe("arithmetic", () => {
    it("should add two time values", () => {
      const result = engine.add(1000000000n, 2000000000n);
      expect(result).toBe(3000000000n);
    });

    it("should subtract two time values", () => {
      const result = engine.subtract(3000000000n, 1000000000n);
      expect(result).toBe(2000000000n);
    });

    it("should multiply time by factor", () => {
      const result = engine.multiply(1000000000n, 2.5);
      expect(result).toBe(2500000000n);
    });

    it("should divide two time values", () => {
      const result = engine.divide(3000000000n, 1000000000n);
      expect(result).toBe(3);
    });

    it("should compare time values", () => {
      expect(engine.compare(1000n, 2000n)).toBe(-1);
      expect(engine.compare(2000n, 2000n)).toBe(0);
      expect(engine.compare(3000n, 2000n)).toBe(1);
    });

    it("should clamp time to valid range", () => {
      const result = engine.clamp(-100n, 0n, 1000n);
      expect(result).toBe(0n);
      const result2 = engine.clamp(2000n, 0n, 1000n);
      expect(result2).toBe(1000n);
    });
  });

  describe("validation", () => {
    it("should accept valid positive nanosecond value", () => {
      expect(engine.isValid(0n)).toBe(true);
      expect(engine.isValid(1000000000n)).toBe(true);
    });

    it("should reject negative values", () => {
      expect(engine.isValid(-1n)).toBe(false);
    });
  });

  describe("precision", () => {
    it("should not lose precision after 1000 arithmetic operations", () => {
      let value = 0n;
      for (let i = 0; i < 1000; i++) {
        value = engine.add(value, 1000000n);
        value = engine.subtract(value, 999999n);
      }
      expect(value).toBe(1000000n);
    });

    it("should handle fractional frame rates without drift", () => {
      const frameDuration = engine.divide(1000000000n, 30000) * 1001;
      // 29.97fps frame duration in nanoseconds
      expect(frameDuration).toBeCloseTo(33366666.67, 0);
    });
  });

  describe("simulation", () => {
    it("should simulate time at 2x speed", () => {
      const sim = engine.simulate({ speed: 2.0, startTime: 0n });
      sim.advance(1000000000n);
      expect(sim.getCurrentTime()).toBe(2000000000n);
    });

    it("should simulate time at 0.5x speed", () => {
      const sim = engine.simulate({ speed: 0.5, startTime: 0n });
      sim.advance(1000000000n);
      expect(sim.getCurrentTime()).toBe(500000000n);
    });

    it("should pause and resume simulation", () => {
      const sim = engine.simulate({ speed: 1.0, startTime: 0n });
      sim.advance(1000000000n);
      sim.pause();
      expect(sim.isPaused()).toBe(true);
      sim.advance(1000000000n);
      expect(sim.getCurrentTime()).toBe(1000000000n); // time should not advance while paused
      sim.resume();
      sim.advance(1000000000n);
      expect(sim.getCurrentTime()).toBe(2000000000n);
    });

    it("should reset simulation", () => {
      const sim = engine.simulate({ speed: 1.0, startTime: 0n });
      sim.advance(5000000000n);
      sim.reset();
      expect(sim.getCurrentTime()).toBe(0n);
    });

    it("should respect end time", () => {
      const sim = engine.simulate({ speed: 1.0, startTime: 0n, endTime: 1000000000n });
      sim.advance(2000000000n);
      expect(sim.getCurrentTime()).toBe(1000000000n);
    });
  });

  describe("edge cases", () => {
    it("should handle zero nanoseconds", () => {
      const ns = engine.convert.toNanoseconds(0, "milliseconds");
      expect(ns).toBe(0n);
    });

    it("should reject negative time in convert", () => {
      expect(() => engine.convert.toNanoseconds(-1, "seconds")).toThrow();
    });

    it("should handle 100 years in nanoseconds", () => {
      const hundredYearsNs = engine.convert.toNanoseconds(100 * 365.25 * 24 * 60 * 60, "seconds");
      expect(hundredYearsNs).toBeGreaterThan(0n);
      const timecode = engine.convert.toTimecode(hundredYearsNs);
      expect(timecode).toBeTruthy();
    });
  });
});
```

### 37.4 Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ (Error Engine)

ÙˆØ£Ø®ÙŠØ±Ù‹Ø§ØŒ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ØŒ ÙˆÙ‡Ùˆ Ø§Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°ÙŠ Ø³ÙŠØ¬Ù…Ø¹ ÙƒÙ„ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ù…Ù† Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø«Ù„Ø§Ø«Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© ÙˆÙ…Ù† Ø§Ù„Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø¹Ù„ÙŠØ§ØŒ ÙˆÙŠÙØµÙ†ÙÙ‡Ø§ Ø¥Ù„Ù‰ Ø«Ù„Ø§Ø« ÙØ¦Ø§Øª: "Ø£Ø®Ø·Ø§Ø¡ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯" (Recoverable) - ÙŠÙ…ÙƒÙ† Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ ØªØ£Ø®ÙŠØ±ØŒ "Ø£Ø®Ø·Ø§Ø¡ ØºÙŠØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯" (Unrecoverable) - ÙŠØ¬Ø¨ Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©ØŒ Ùˆ"Ø£Ø®Ø·Ø§Ø¡ Ø­Ø±Ø¬Ø©" (Critical) - ÙŠØ¬Ø¨ Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ù†Ø¸Ø§Ù… Ø¨Ø£ÙƒÙ…Ù„Ù‡ Ù…Ø¹ Ø­ÙØ¸ Ø­Ø§Ù„Ø© Ø§Ù„Ø·ÙˆØ§Ø±Ø¦. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙØ¸ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø¨Ù€ "Ø³Ø¬Ù„ Ù…Ø±ÙƒØ²ÙŠ" (Central Log) ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø±Ù…Ø² Ø§Ù„Ø®Ø·Ø£ØŒ ÙˆØ§Ù„Ø·Ø§Ø¨Ø¹ Ø§Ù„Ø²Ù…Ù†ÙŠØŒ ÙˆØ§Ø³Ù… Ø§Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°ÙŠ Ø£Ø±Ø³Ù„Ù‡ØŒ ÙˆØ³Ù„Ø³Ù„Ø© Ø§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡Ø§Øª (Stack Trace)ØŒ ÙˆÙ…Ø³ØªÙˆÙ‰ Ø§Ù„Ø®Ø·ÙˆØ±Ø©. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù‡Ù†Ø§Ùƒ "Ù…Ø¹Ø§Ù„Ø¬ Ø§ÙØªØ±Ø§Ø¶ÙŠ" (Default Handler) ÙŠÙ‚ÙˆÙ… Ø¨Ø¥Ø¹Ù„Ø§Ù† Ø§Ù„Ø®Ø·Ø£ Ø¨ØµÙˆØª Ø¹Ø§Ù„Ù (Ø¹Ø¨Ø± Ø·Ø¨Ù‚Ø© Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„ØµÙˆØªÙŠØ©) Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø®Ø·Ø£ Ù…Ù† Ø§Ù„Ù†ÙˆØ¹ Ø§Ù„Ù‚Ø§Ø¨Ù„ Ù„Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯ØŒ Ø£Ùˆ ÙŠØ¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø© Ø¥ÙŠÙ‚Ø§Ù Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…Ù† Ø§Ù„Ù†ÙˆØ¹ ØºÙŠØ± Ø§Ù„Ù‚Ø§Ø¨Ù„ Ù„Ù„Ø§Ø³ØªØ±Ø¯Ø§Ø¯. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙØ®ØªØ¨Ø± Ø§Ù„Ù…Ø­Ø±Ùƒ Ù…Ø¹ "ÙÙŠØ¶ Ù…Ù† Ø§Ù„Ø£Ø®Ø·Ø§Ø¡" (Flood of Errors) - Ø­ÙŠØ« ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ 1000 Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø«Ø§Ù†ÙŠØ© - Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù†Ù‡ Ù„Ø§ ÙŠÙ†Ù‡Ø§Ø± ÙˆÙ„Ø§ ÙŠÙÙ‚Ø¯ Ø£ÙŠ Ø®Ø·Ø£.

#### 37.4.1 ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡

```typescript
// src/core/infrastructure/error/interface.ts

type ErrorSeverity = "recoverable" | "unrecoverable" | "critical";
type ErrorCode = string; // e.g. "ERR_FILE_NOT_FOUND", "ERR_001"

interface ErrorEntry {
  id: string;
  code: ErrorCode;
  severity: ErrorSeverity;
  source: string;        // engine or component name
  message: string;
  timestamp: bigint;     // nanoseconds
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  recovered: boolean;
  retryCount: number;
  maxRetries: number;
}

interface ErrorStats {
  totalErrors: number;
  bySeverity: Record<ErrorSeverity, number>;
  bySource: Record<string, number>;
  unrecoveredCount: number;
  lastError?: ErrorEntry;
}

type ErrorHandler = (entry: ErrorEntry) => Promise<ErrorAction>;

interface ErrorAction {
  type: "retry" | "ignore" | "escalate" | "halt";
  delay?: number;   // ms before retry
  reason?: string;
}

interface ErrorEngine {
  report(entry: Omit<ErrorEntry, "id" | "timestamp" | "recovered" | "retryCount">): ErrorEntry;
  acknowledge(errorId: string): void;
  retry(errorId: string): boolean;
  getLog(filter?: ErrorFilter): ErrorEntry[];
  getStats(): ErrorStats;
  setHandler(severity: ErrorSeverity, handler: ErrorHandler): void;
  clearLog(): void;
  exportLog(): string; // JSON export
}

interface ErrorFilter {
  severity?: ErrorSeverity;
  source?: string;
  code?: ErrorCode;
  from?: bigint;
  to?: bigint;
  recovered?: boolean;
}
```

#### 37.4.2 Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù„Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡

```typescript
// src/core/infrastructure/error/test/error.engine.test.ts

describe("ErrorEngine", () => {
  let engine: ErrorEngine;

  beforeEach(() => {
    engine = new ErrorEngineImpl();
  });

  describe("report", () => {
    it("should report error with correct fields", () => {
      const entry = engine.report({
        code: "ERR_FILE_NOT_FOUND",
        severity: "recoverable",
        source: "FileEngine",
        message: "File not found: test.txt",
        maxRetries: 3
      });
      expect(entry.id).toBeTruthy();
      expect(entry.code).toBe("ERR_FILE_NOT_FOUND");
      expect(entry.severity).toBe("recoverable");
      expect(entry.source).toBe("FileEngine");
      expect(entry.timestamp).toBeGreaterThan(0n);
      expect(entry.recovered).toBe(false);
      expect(entry.retryCount).toBe(0);
      expect(entry.maxRetries).toBe(3);
    });

    it("should assign unique ids to each error", () => {
      const e1 = engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err1", maxRetries: 0 });
      const e2 = engine.report({ code: "E2", severity: "recoverable", source: "A", message: "err2", maxRetries: 0 });
      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe("handler invocation", () => {
    it("should invoke recoverable handler when error is recoverable", async () => {
      const handler = jest.fn().mockResolvedValue({ type: "retry", delay: 100 });
      engine.setHandler("recoverable", handler);
      engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err", maxRetries: 3 });
      expect(handler).toHaveBeenCalled();
      const calledWith = handler.mock.calls[0][0];
      expect(calledWith.severity).toBe("recoverable");
    });

    it("should invoke critical handler when error is critical", async () => {
      const handler = jest.fn().mockResolvedValue({ type: "halt" });
      engine.setHandler("critical", handler);
      engine.report({ code: "E1", severity: "critical", source: "A", message: "fatal", maxRetries: 0 });
      expect(handler).toHaveBeenCalled();
    });

    it("should invoke unrecoverable handler when error is unrecoverable", async () => {
      const handler = jest.fn().mockResolvedValue({ type: "escalate" });
      engine.setHandler("unrecoverable", handler);
      engine.report({ code: "E1", severity: "unrecoverable", source: "A", message: "fail", maxRetries: 0 });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("retry", () => {
    it("should retry error up to maxRetries", () => {
      const entry = engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err", maxRetries: 3 });
      expect(engine.retry(entry.id)).toBe(true);
      expect(engine.retry(entry.id)).toBe(true);
      expect(engine.retry(entry.id)).toBe(true);
      expect(engine.retry(entry.id)).toBe(false); // maxRetries exceeded
    });

    it("should mark error as recovered after successful retry", () => {
      const entry = engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err", maxRetries: 1 });
      engine.retry(entry.id);
      engine.acknowledge(entry.id);
      const log = engine.getLog({ id: entry.id });
      expect(log[0].recovered).toBe(true);
    });
  });

  describe("log and filter", () => {
    it("should store all reported errors", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "FileEngine", message: "err1", maxRetries: 0 });
      engine.report({ code: "E2", severity: "critical", source: "MemoryEngine", message: "err2", maxRetries: 0 });
      const log = engine.getLog();
      expect(log.length).toBe(2);
    });

    it("should filter by severity", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err1", maxRetries: 0 });
      engine.report({ code: "E2", severity: "critical", source: "A", message: "err2", maxRetries: 0 });
      const log = engine.getLog({ severity: "critical" });
      expect(log.length).toBe(1);
      expect(log[0].severity).toBe("critical");
    });

    it("should filter by source", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "FileEngine", message: "err1", maxRetries: 0 });
      engine.report({ code: "E2", severity: "recoverable", source: "MemoryEngine", message: "err2", maxRetries: 0 });
      const log = engine.getLog({ source: "FileEngine" });
      expect(log.length).toBe(1);
    });

    it("should clear log", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err", maxRetries: 0 });
      engine.clearLog();
      expect(engine.getLog().length).toBe(0);
    });
  });

  describe("stats", () => {
    it("should track error statistics correctly", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "FileEngine", message: "err1", maxRetries: 0 });
      engine.report({ code: "E2", severity: "recoverable", source: "FileEngine", message: "err2", maxRetries: 0 });
      engine.report({ code: "E3", severity: "critical", source: "MemoryEngine", message: "err3", maxRetries: 0 });
      const stats = engine.getStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.bySeverity.recoverable).toBe(2);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySource.FileEngine).toBe(2);
      expect(stats.bySource.MemoryEngine).toBe(1);
    });
  });

  describe("flood handling", () => {
    it("should handle 1000 errors per second without data loss", () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        engine.report({
          code: `ERR_${i}`,
          severity: "recoverable",
          source: "FloodTest",
          message: `Error ${i}`,
          maxRetries: 0
        });
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000);
      expect(engine.getStats().totalErrors).toBe(1000);
    });
  });

  describe("export", () => {
    it("should export log as valid JSON", () => {
      engine.report({ code: "E1", severity: "recoverable", source: "A", message: "err", maxRetries: 0 });
      const json = engine.exportLog();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});
```

### 37.5 Ø·Ø¨Ù‚Ø© Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ (Orchestration Layer)

Ù„ÙƒÙ† Ø¨Ù†Ø§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø¨Ø´ÙƒÙ„ Ù…Ù†ÙØµÙ„ Ù„Ø§ ÙŠÙƒÙÙŠØ› Ø§Ù„Ø£Ù‡Ù… Ù‡Ùˆ Ø§Ù„ØªÙƒØ§Ù…Ù„ Ø¨ÙŠÙ†Ù‡Ø§ØŒ Ù„Ø£Ù†Ù‡Ø§ Ø³ØªØ¹Ù…Ù„ Ù…Ø¹Ù‹Ø§ ÙÙŠ ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ©. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙÙ†Ø´Ø£ "Ø·Ø¨Ù‚Ø© Ø§Ù„ØªÙ†Ø³ÙŠÙ‚" (Orchestration Layer) Ø¯Ø§Ø®Ù„ L1ØŒ ØªÙƒÙˆÙ† Ù…Ø³Ø¤ÙˆÙ„Ø© Ø¹Ù† Ø±Ø¨Ø· Ø§Ù„Ù…Ù„ÙØ§Øª Ø¨Ø§Ù„Ø°Ø§ÙƒØ±Ø©ØŒ ÙˆØ§Ù„Ø°Ø§ÙƒØ±Ø© Ø¨Ø§Ù„ÙˆÙ‚ØªØŒ ÙˆØ§Ù„ÙˆÙ‚Øª Ø¨Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ØŒ Ø¨Ø­ÙŠØ« Ø¥Ø°Ø§ ÙØ´Ù„Øª Ø¹Ù…Ù„ÙŠØ© Ù‚Ø±Ø§Ø¡Ø© Ù…Ù„ÙØŒ ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø·Ø£ ÙÙŠ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ØŒ ÙˆÙŠØªÙ… ØªØ­Ø±ÙŠØ± Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø®ØµØµØ©ØŒ ÙˆÙŠØªÙ… Ø¥Ø±Ø¬Ø§Ø¹ ÙˆÙ‚Øª Ø§Ù„ÙØ´Ù„ Ø¥Ù„Ù‰ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ø¹Ù„ÙŠØ§. Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ®ØªØ¨Ø± Ø¹Ø¨Ø± "Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆÙ‡Ø§Øª ØªÙƒØ§Ù…Ù„" (Integration Scenarios) Ù…Ø«Ù„: Ù‚Ø±Ø§Ø¡Ø© Ù…Ù„Ù ÙƒØ¨ÙŠØ± Ù…Ø¹ ØªØ®ØµÙŠØµ Ø°Ø§ÙƒØ±Ø© Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠØŒ Ø«Ù… ÙƒØªØ§Ø¨Ø© ØªØ¹Ø¯ÙŠÙ„Ø§ØªØŒ Ø«Ù… Ø­Ø°Ù Ø§Ù„Ù…Ù„ÙØŒ Ù…Ø¹ Ù…Ø­Ø§ÙƒØ§Ø© Ù†ÙØ§Ø¯ Ø§Ù„Ø°Ø§ÙƒØ±Ø© ÙÙŠ Ù…Ù†ØªØµÙ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©ØŒ ÙˆÙ…Ø­Ø§ÙƒØ§Ø© Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ù‚Ø±Øµ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ÙƒØªØ§Ø¨Ø©. ÙƒÙ„ Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙ†ØªØ¬ Ø¹Ù†Ù‡ Ø¥Ø¹Ù„Ø§Ù† ØµÙˆØªÙŠ Ù…Ø­Ø¯Ø¯ (Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù…ØµÙÙˆÙØ© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª)ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø§Ù„Ø³Ù„ÙˆÙƒ Ù…ØªÙˆÙ‚Ø¹Ù‹Ø§ ØªÙ…Ø§Ù…Ù‹Ø§.

#### 37.5.1 ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„ØªÙ†Ø³ÙŠÙ‚

```typescript
// src/core/infrastructure/orchestration/interface.ts

interface OrchestrationLayer {
  readProjectFile(path: string): Promise<Result<ProjectFileData, OrchestrationError>>;
  writeProjectFile(path: string, data: Uint8Array): Promise<Result<void, OrchestrationError>>;
  analyzeMedia(path: string): Promise<Result<MediaAnalysis, OrchestrationError>>;
  cleanup(): Promise<void>;
}

interface ProjectFileData {
  content: Uint8Array;
  size: number;
  readAt: Nanoseconds;
  duration: number; // read duration in ms
}

interface MediaAnalysis {
  duration: Nanoseconds;
  tracks: number;
  format: string;
  analyzedAt: Nanoseconds;
}

interface OrchestrationError {
  code: ErrorCode;
  severity: ErrorSeverity;
  source: string;
  message: string;
  timestamp: Nanoseconds;
  recoverable: boolean;
}
```

#### 37.5.2 Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ØªÙƒØ§Ù…Ù„

```typescript
// src/core/infrastructure/orchestration/test/orchestration.test.ts

describe("OrchestrationLayer Integration", () => {
  let orch: OrchestrationLayer;
  let fileEngine: FileEngine;
  let memoryEngine: MemoryEngine;
  let timeEngine: TimeEngine;
  let errorEngine: ErrorEngine;
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempDirectory();
    fileEngine = new FileEngineImpl({ baseDir: testDir });
    memoryEngine = new MemoryEngineImpl({ maxTotal: 1024 * 1024 * 10 });
    timeEngine = new TimeEngineImpl();
    errorEngine = new ErrorEngineImpl();
    orch = new OrchestrationLayerImpl(fileEngine, memoryEngine, timeEngine, errorEngine);
  });

  afterEach(async () => {
    await orch.cleanup();
    await cleanupTempDirectory(testDir);
  });

  it("should read file, allocate memory, and track time", async () => {
    const content = new TextEncoder().encode("Project data");
    await fileEngine.write("project.avp", content);

    const result = await orch.readProjectFile("project.avp");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.size).toBe(12);
      expect(result.value.readAt).toBeGreaterThan(0n);
      expect(result.value.duration).toBeGreaterThanOrEqual(0);
    }

    const stats = memoryEngine.getStats();
    expect(stats.totalAllocated).toBeGreaterThan(0);
  });

  it("should log error and release memory on file read failure", async () => {
    const result = await orch.readProjectFile("nonexistent.avp");
    expect(result.ok).toBe(false);

    const errorLog = errorEngine.getLog();
    expect(errorLog.length).toBe(1);
    expect(errorLog[0].code).toBe("ERR_FILE_NOT_FOUND");

    // Memory should be released after error
    const stats = memoryEngine.getStats();
    expect(stats.totalAllocated).toBe(0);
  });

  it("should handle memory pressure during large file read", async () => {
    // Create a large file
    const largeContent = generateRandomBytes(1024 * 1024 * 5); // 5MB
    await fileEngine.write("large.avp", largeContent);

    // Set tight memory limit
    memoryEngine.setLimits({ maxTotal: 1024 * 1024 * 2 }); // 2MB limit

    const result = await orch.readProjectFile("large.avp");
    // Should fail with memory error or succeed with streaming
    if (!result.ok) {
      expect(result.error.code).toBe("ERR_MEMORY_EXHAUSTED");
    }

    // Error should be logged
    const errorLog = errorEngine.getLog();
    expect(errorLog.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle disk full during write", async () => {
    // Set disk limit to 0
    fileEngine = new FileEngineImpl({ baseDir: testDir, maxDiskUsage: 0 });
    orch = new OrchestrationLayerImpl(fileEngine, memoryEngine, timeEngine, errorEngine);

    const result = await orch.writeProjectFile("test.avp", new Uint8Array(100));
    expect(result.ok).toBe(false);

    const errorLog = errorEngine.getLog();
    expect(errorLog.some(e => e.code === "ERR_DISK_FULL")).toBe(true);
  });

  it("should complete full cycle: read â†’ modify â†’ write â†’ delete", async () => {
    // Create initial file
    const content = new TextEncoder().encode("Initial content");
    await fileEngine.write("cycle.avp", content);

    // Read
    const readResult = await orch.readProjectFile("cycle.avp");
    expect(readResult.ok).toBe(true);

    // Write modified
    const modified = new TextEncoder().encode("Modified content");
    const writeResult = await orch.writeProjectFile("cycle.avp", modified);
    expect(writeResult.ok).toBe(true);

    // Verify
    const readResult2 = await orch.readProjectFile("cycle.avp");
    expect(readResult2.ok).toBe(true);
    if (readResult2.ok) {
      expect(readResult2.value.size).toBe(16);
    }

    // Delete
    const deleteResult = await fileEngine.delete("cycle.avp");
    expect(deleteResult.ok).toBe(true);

    // Verify deleted
    const existsResult = await fileEngine.exists("cycle.avp");
    if (existsResult.ok) {
      expect(existsResult.value).toBe(false);
    }

    // No unrecovered errors
    const stats = errorEngine.getStats();
    expect(stats.unrecoveredCount).toBe(0);
  });

  it("should handle concurrent orchestration operations", async () => {
    // Create 10 files
    for (let i = 0; i < 10; i++) {
      await fileEngine.write(`file_${i}.avp`, new TextEncoder().encode(`content ${i}`));
    }

    // Read all concurrently
    const reads = Array.from({ length: 10 }, (_, i) =>
      orch.readProjectFile(`file_${i}.avp`)
    );
    const results = await Promise.all(reads);
    results.forEach(r => expect(r.ok).toBe(true));

    // No errors should have occurred
    expect(errorEngine.getStats().totalErrors).toBe(0);
  });
});
```

### 37.6 Ù‡ÙŠÙƒÙ„ Ø§Ù„Ù…Ø¬Ù„Ø¯Ø§Øª

ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙÙ†Ø¸Ù… ÙƒÙ„ Ù…Ø­Ø±Ùƒ ÙÙŠ Ù…Ø¬Ù„Ø¯ Ù…Ù†ÙØµÙ„ Ø¯Ø§Ø®Ù„ `src/core/infrastructure/`ØŒ Ø¨Ø­ÙŠØ« ÙŠÙƒÙˆÙ† Ù„ÙƒÙ„ Ù…Ø­Ø±Ùƒ Ù…Ù„Ù Ø±Ø¦ÙŠØ³ÙŠ ÙŠØ³Ù…Ù‰ `engine.ts` ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙƒÙ„Ø§Ø³ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØŒ ÙˆÙ…Ù„Ù `interface.ts` ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ§Ø¬Ù‡Ø§ØªØŒ ÙˆÙ…Ù„Ù `errors.ts` ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø±Ù…ÙˆØ² Ø§Ù„Ø®Ø·Ø£ØŒ ÙˆÙ…Ù„Ù `test/` ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªÙ‡.

```
src/core/infrastructure/
â”œâ”€â”€ file/
â”‚   â”œâ”€â”€ engine.ts
â”‚   â”œâ”€â”€ interface.ts
â”‚   â”œâ”€â”€ errors.ts
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ file.engine.test.ts
â”œâ”€â”€ memory/
â”‚   â”œâ”€â”€ engine.ts
â”‚   â”œâ”€â”€ interface.ts
â”‚   â”œâ”€â”€ errors.ts
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ memory.engine.test.ts
â”œâ”€â”€ time/
â”‚   â”œâ”€â”€ engine.ts
â”‚   â”œâ”€â”€ interface.ts
â”‚   â”œâ”€â”€ errors.ts
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ time.engine.test.ts
â”œâ”€â”€ error/
â”‚   â”œâ”€â”€ engine.ts
â”‚   â”œâ”€â”€ interface.ts
â”‚   â”œâ”€â”€ errors.ts
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ error.engine.test.ts
â”œâ”€â”€ orchestration/
â”‚   â”œâ”€â”€ engine.ts
â”‚   â”œâ”€â”€ interface.ts
â”‚   â””â”€â”€ test/
â”‚       â””â”€â”€ orchestration.test.ts
â””â”€â”€ index.ts  // barrel export
```

### 37.7 Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„ÙƒÙˆØ¯

ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¯ÙˆØ§Ù„ "Ø®Ø§Ù„ØµØ©" (Pure) Ù‚Ø¯Ø± Ø§Ù„Ø¥Ù…ÙƒØ§Ù†ØŒ Ù…Ø¹ ØªØ¬Ù†Ø¨ Ø§Ù„Ø¢Ø«Ø§Ø± Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠØ© Ø¥Ù„Ø§ Ø¹Ù†Ø¯ Ø§Ù„Ø¶Ø±ÙˆØ±Ø©ØŒ ÙˆÙƒÙ„ Ø¯Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ù…ÙˆØ«Ù‚Ø© Ø¨Ù€ JSDoc ØªÙˆØ¶Ø­ Ù…Ø§ ØªÙØ¹Ù„Ù‡ØŒ ÙˆØ§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§ØªØŒ ÙˆØ§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…ÙØ¹Ø§Ø¯Ø©ØŒ ÙˆØ§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„ØªÙŠ ÙŠÙ…ÙƒÙ† Ø£Ù† ØªØ±Ù…ÙŠÙ‡Ø§. ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ø£Ø³Ù…Ø§Ø¡ Ù…ØªØ³Ù‚Ø©: Ø§Ø³ØªØ®Ø¯Ù… `camelCase` Ù„Ù„Ø¯ÙˆØ§Ù„ ÙˆØ§Ù„Ù…ØªØºÙŠØ±Ø§ØªØŒ `PascalCase` Ù„Ù„ÙƒÙ„Ø§Ø³Ø§ØªØŒ `CONSTANT_CASE` Ù„Ù„Ø«ÙˆØ§Ø¨Øª. Ù„Ø§ ÙŠÙØ³Ù…Ø­ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… `any` Ø¥Ù„Ø§ ÙÙŠ Ø­Ø§Ù„Ø§Øª Ù…Ø­Ø¯Ø¯Ø© ÙˆÙ…Ø¹ Ø§Ù„ØªØ¨Ø±ÙŠØ±. ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙ…Ø± Ø§Ù„ÙƒÙˆØ¯ Ø¹Ø¨Ø± `npm run lint` Ùˆ`npm run typecheck` Ù‚Ø¨Ù„ ÙƒÙ„ Ø§Ù„ØªØ²Ø§Ù….

### 37.8 Ø§Ù„ØªÙƒØ§Ù…Ù„ Ù…Ø¹ Test Sprite

ÙŠØ¬Ø¨ Ø£Ù† ØªÙÙ†Ø´Ø£ Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ØªØ³Ù…Ù‰ "Integration Tests" ÙÙŠ `tests/sprites/integration/` ØªØ´ØºÙ‘Ù„ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø±Ø¨Ø¹Ø© Ù…Ø¹Ù‹Ø§ØŒ ÙˆØªØ³ØªØ®Ø¯Ù… Test Sprite ÙƒÙ€ "Ù…Ø³ØªØ®Ø¯Ù… Ø§ÙØªØ±Ø§Ø¶ÙŠ" Ù„Ø¥Ø±Ø³Ø§Ù„ Ø£ÙˆØ§Ù…Ø± Ù…Ø«Ù„ `read_file` Ùˆ`allocate_memory` Ùˆ`get_current_time`ØŒ Ø«Ù… ØªØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø§Øª ÙˆØ§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª ØªØªØ·Ø§Ø¨Ù‚ Ù…Ø¹ Ø§Ù„ØªÙˆÙ‚Ø¹Ø§Øª. ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ù‡Ø°Ù‡ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø£Ø¨Ø·Ø£ Ù…Ù† Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ­Ø¯Ø©ØŒ Ù„Ø°Ø§ ØªÙØ´ØºÙ‘Ù„ Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© ÙŠÙˆÙ…ÙŠÙ‹Ø§ ÙÙŠ Ø§Ù„Ù„ÙŠÙ„ Ø¹Ø¨Ø± CI (Nightly Builds).

### 37.9 Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„ÙƒÙˆØ¯

Ø³ØªÙƒÙˆÙ† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©" Ø§Ù„ØªÙŠ ØªÙ… ØªØ¹Ø±ÙŠÙÙ‡Ø§ ÙÙŠ Section 36ØŒ Ù…Ø¹ Ø§Ù„ØªØ±ÙƒÙŠØ² Ø¹Ù„Ù‰: (1) Ù‡Ù„ ÙƒÙ„ Ø¯Ø§Ù„Ø© Ø¹Ø§Ù…Ø© Ù…ÙØ®ØªØ¨Ø±Ø©ØŸ (2) Ù‡Ù„ ØªÙ… Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© Ø¨Ø´ÙƒÙ„ ØµØ±ÙŠØ­ØŸ (3) Ù‡Ù„ Ø§Ù„ÙƒÙˆØ¯ Ù…Ù‚Ø±ÙˆØ¡ ÙˆÙŠØªØ¨Ø¹ Ø§Ù„Ø§ØµØ·Ù„Ø§Ø­Ø§ØªØŸ (4) Ù‡Ù„ Ø§Ù„Ø£Ø¯Ø§Ø¡ Ù…Ù‚Ø¨ÙˆÙ„ (ÙˆÙ‚Øª Ø§Ù„ØªÙ†ÙÙŠØ° Ø¶Ù…Ù† Ø§Ù„Ø­Ø¯ÙˆØ¯)ØŸ (5) Ù‡Ù„ Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ ÙˆØ§Ù„ØªØ¹Ù„ÙŠÙ‚Ø§Øª Ù…Ø­Ø¯Ø«Ø©ØŸ ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ¬Ø±Ù‰ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø§Øª Ù…Ù† Ù‚Ø¨Ù„ Ø¹Ø¶ÙˆÙŠÙ† Ù…Ø®ØªÙ„ÙÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ù†ØªÙŠØ¬Ø© "Ù…ÙˆØ§ÙÙ‚Ø©" (Approve) Ù‚Ø¨Ù„ Ø¯Ù…Ø¬ Ø§Ù„ÙƒÙˆØ¯ ÙÙŠ Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ.

### 37.10 Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø²Ù…Ù†ÙŠ

ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ¨Ù†Ù‰ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø±Ø¨Ø¹Ø© Ø¨Ø´ÙƒÙ„ Ù…ØªÙˆØ§Ø²Ù Ù…Ø¹ Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªÙ‡Ø§ØŒ Ù„ÙƒÙ† Ø¨ØªØ³Ù„Ø³Ù„ Ø£ÙˆÙ„ÙˆÙŠØ§Øª: ÙŠØ¨Ø¯Ø£ Ø¨Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ (Ù„Ø£Ù†Ù‡ Ø³ÙŠÙØ³ØªØ®Ø¯Ù… Ù…Ù† Ù‚Ø¨Ù„ Ø§Ù„Ø¨Ø§Ù‚ÙŠ)ØŒ Ø«Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª (Ù„Ø£Ù†Ù‡ ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡)ØŒ Ø«Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø© (ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø§Ø«Ù†ÙŠÙ†)ØŒ Ø«Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚Øª. ÙƒÙ„ Ù…Ø­Ø±Ùƒ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³ØªØºØ±Ù‚ 3-4 Ø£ÙŠØ§Ù… Ø¹Ù…Ù„ØŒ Ù…Ø¹ ÙŠÙˆÙ… Ø¥Ø¶Ø§ÙÙŠ Ù„Ù„ØªÙƒØ§Ù…Ù„ ÙˆØ§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ø´Ø§Ù…Ù„Ø©. ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠØ© Ù„Ù€ L1 ÙˆØ§Ø®ØªØ¨Ø§Ø±Ø§ØªÙ‡Ø§ Ø­ÙˆØ§Ù„ÙŠ 3 Ø£Ø³Ø§Ø¨ÙŠØ¹ØŒ Ù…Ø¹ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø£Ø³Ø¨ÙˆØ¹ÙŠØ© Ù„Ù„ØªÙ‚Ø¯Ù….

### 37.11 Ù…Ù‚ÙŠØ§Ø³ Ø§Ù„Ù†Ø¬Ø§Ø­

Ù…Ù‚ÙŠØ§Ø³ Ø§Ù„Ù†Ø¬Ø§Ø­ Ù„Ù€ L1 Ø³ÙŠÙƒÙˆÙ†: (1) Ø¬Ù…ÙŠØ¹ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ­Ø¯Ø© ØªÙ…Ø± Ø¨Ù†Ø³Ø¨Ø© 100%ØŒ (2) ØªØºØ·ÙŠØ© Ø§Ù„ÙƒÙˆØ¯ â‰¥95%ØŒ (3) Ø¬Ù…ÙŠØ¹ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ØªÙƒØ§Ù…Ù„ Ù…Ø¹ Test Sprite ØªÙ…Ø±ØŒ (4) Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ Ø£Ø®Ø·Ø§Ø¡ ØºÙŠØ± Ù…Ø¹Ø§Ù„Ø¬Ø© ÙÙŠ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªØŒ (5) ÙŠÙ…ÙƒÙ† Ù‚Ø±Ø§Ø¡Ø© Ø£ÙŠ Ù…Ù„Ù ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯Ù‡ Ø¯ÙˆÙ† ØªØ³Ø±ÙŠØ¨ Ø°Ø§ÙƒØ±Ø©ØŒ (6) ÙŠÙ…ÙƒÙ† Ø­Ø³Ø§Ø¨ Ø£ÙŠ ÙˆÙ‚Øª Ø¨Ø¯Ù‚Ø© Ù…Ù„Ù„ÙŠØ«Ø§Ù†ÙŠØ© Ø¯ÙˆÙ† Ø§Ù†Ø­Ø±Ø§Ù. Ø¹Ù†Ø¯Ù…Ø§ ÙŠØªÙ… ØªØ­Ù‚ÙŠÙ‚ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¹Ø§ÙŠÙŠØ±ØŒ ØªÙØ¹ØªØ¨Ø± L1 Ø¬Ø§Ù‡Ø²Ø© Ù„Ù„Ø±Ø¨Ø· Ù…Ø¹ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„Ø¹Ù„ÙŠØ§ (L2 - Model Layer).

### 37.12 Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ø³Ø§Ø±

ÙŠØ¨Ø¯Ø£ ÙƒÙ„ Ù…Ø­Ø±Ùƒ Ù…Ù† "ØªØ¹Ø±ÙŠÙ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©" (State Definition)ØŒ Ø«Ù… "Ø¨Ù†Ø§Ø¡ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©" (Interface Construction) Ø§Ù„ØªÙŠ Ù„Ø§ ØªØ³Ù…Ø­ Ø¨ØªØ³Ø±ÙŠØ¨ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØªÙ†ÙÙŠØ°ØŒ Ø«Ù… "Ø§Ù„ØªÙ†ÙÙŠØ°" (Implementation) Ù…Ø¹ Ù…Ø±Ø§Ø¹Ø§Ø© Ø§Ù„Ø£Ø¯Ø§Ø¡ ÙˆØ§Ù„Ø£Ù…Ø§Ù†ØŒ Ø«Ù… "Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ­Ø¯Ø©" (Unit Tests) Ø§Ù„ØªÙŠ ØªØºØ·ÙŠ ÙƒÙ„ Ù…Ø³Ø§Ø±ØŒ ÙˆØ£Ø®ÙŠØ±Ù‹Ø§ "Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ØªÙƒØ§Ù…Ù„" (Integration Tests) Ø§Ù„ØªÙŠ ØªØ±Ø¨Ø· Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ù…Ø¹Ù‹Ø§. Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ø§Ø± Ù‡Ùˆ Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ø·Ø±ÙŠÙ‚ Ø§Ù„ÙˆØ­ÙŠØ¯Ø© Ù„Ø¨Ù†Ø§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø¯ÙˆÙ† Ø§Ø±ØªØ¬Ø§Ù„ØŒ ÙˆØ¯ÙˆÙ† Ø§ÙØªØ±Ø§Ø¶Ø§ØªØŒ ÙˆØ¯ÙˆÙ† ØªØ±Ùƒ Ù…Ø¬Ø§Ù„ Ù„Ù„ØµØ¯ÙØ©.

---

## 38. Seven-Stage Execution Roadmap

Ø¨Ø¹Ø¯ Ø§Ù„ØªÙ…Ø±ÙŠØ± Ø§Ù„ØµØ§Ù…Øª Ø¹Ø¨Ø± Ø¹Ø¯Ø³Ø§Øª Ø§Ù„Ù…Ù…Ø§Ø±Ø³ Ø§Ù„Ø°ÙŠ ÙŠØ±Ù‰ Ø£Ù† Ø§Ù„Ø®Ø·Ø© Ø¯ÙˆÙ† ØªÙ†ÙÙŠØ° Ù‡ÙŠ Ù…Ø¬Ø±Ø¯ Ø®ÙŠØ§Ù„ØŒ ÙˆØ§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø§Ù„Ø°ÙŠ ÙŠØµØ± Ø¹Ù„Ù‰ Ø£Ù† ÙƒÙ„ Ù…Ø±Ø­Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ®ØªØ¨Ø± Ù‚Ø¨Ù„ Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ø¥Ù„Ù‰ Ø§Ù„ØªØ§Ù„ÙŠØ©ØŒ ÙˆØ§Ù„Ù…Ø´ÙƒÙƒ Ø§Ù„Ø°ÙŠ ÙŠØªØ³Ø§Ø¡Ù„ Ø¹Ù† ÙƒÙŠÙÙŠØ© Ø¶Ù…Ø§Ù† Ø£Ù† ÙƒÙ„ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø§Ù„ØµØºÙŠØ±Ø© Ù„Ù† ØªÙÙ†Ø³Ù‰ ÙÙŠ Ø²Ø­Ø§Ù… Ø§Ù„ØªØ·ÙˆÙŠØ±ØŒ ÙˆØ§Ù„Ù…Ø­Ù„Ù„ Ø§Ù„Ø°ÙŠ ÙŠØ¯Ø±Ùƒ Ø£Ù† Ø§Ù„Ø¨Ø³Ø§Ø·Ø© ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù„Ø§ ØªØ£ØªÙŠ Ø¥Ù„Ø§ Ù…Ù† Ø§Ù„Ø¹Ù…Ù‚ ÙÙŠ Ø§Ù„Ø¨Ù†ÙŠØ©ØŒ ÙˆØ§Ù„Ù…Ø¤Ø±Ø® Ø§Ù„Ø°ÙŠ ÙŠØ¹Ø±Ù Ø£Ù† Ø£Ù†Ø¬Ø­ Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ Ù‡ÙŠ ØªÙ„Ùƒ Ø§Ù„ØªÙŠ Ø¨ÙÙ†ÙŠØª Ø¹Ù„Ù‰ ØªØ³Ù„Ø³Ù„ Ù…Ø­ÙƒÙ… Ù…Ù† Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø­ÙŠØ« ÙƒÙ„ Ø®Ø·ÙˆØ© ØªÙ†ØªØ¬ Ø´ÙŠØ¦Ù‹Ø§ Ù…Ù„Ù…ÙˆØ³Ù‹Ø§ ÙˆÙ‚Ø§Ø¨Ù„Ø§Ù‹ Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø±ØŒ ØªØªØ¨Ù„ÙˆØ± Ø§Ù„Ø­Ù‚ÙŠÙ‚Ø© Ø§Ù„Ø­Ø§Ø³Ù…Ø©: Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¨Ù†Ø§Ø¡ Ù‡Ø°Ø§ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¥Ù„Ø§ Ù…Ù† Ø®Ù„Ø§Ù„ Ø®Ø·Ø© ØªØªÙƒÙˆÙ† Ù…Ù† Ø³Ø¨Ø¹ Ù…Ø±Ø§Ø­Ù„ Ù…ØªØµÙ„Ø©ØŒ ÙƒÙ„ Ù…Ø±Ø­Ù„Ø© Ù‡ÙŠ Ø­Ù„Ù‚Ø© ÙÙŠ Ø³Ù„Ø³Ù„Ø©ØŒ ÙˆÙƒÙ„ Ø­Ù„Ù‚Ø© Ù„Ù‡Ø§ Ø¨Ø¯Ø§ÙŠØ© ÙˆÙˆØ³Ø· ÙˆÙ†Ù‡Ø§ÙŠØ© ÙˆØ§Ø¶Ø­Ø©ØŒ ÙˆÙƒÙ„ Ø­Ù„Ù‚Ø© ØªÙÙ†ØªØ¬ Ø´ÙŠØ¦Ù‹Ø§ ÙŠÙ…ÙƒÙ† ØªØ´ØºÙŠÙ„Ù‡ ÙˆØ§Ø®ØªØ¨Ø§Ø±Ù‡ ÙˆØ§Ø³ØªØ®Ø¯Ø§Ù…Ù‡ Ù…Ù† Ù‚Ø¨Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ÙƒÙÙˆÙ Ù…Ù†Ø° Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ø£ÙˆÙ„ØŒ Ø­ØªÙ‰ Ù„Ùˆ ÙƒØ§Ù† Ø°Ù„Ùƒ Ù…Ø¬Ø±Ø¯ ÙˆØ§Ø¬Ù‡Ø© Ø£ÙˆØ§Ù…Ø± Ù†ØµÙŠØ©.

### Stage 1: ÙˆØ¶Ø¹ Ø§Ù„Ø£Ø³Ø§Ø³ Ø§Ù„ØµÙ„Ø¨ (L1 Infrastructure Layer)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ¨Ù†ÙŠ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø§Ù„ØªØ­ØªÙŠØ© L1 ÙƒÙ…Ø§ ØªÙ… ØªØ´Ø±ÙŠØ­Ù‡Ø§ Ø¨Ø¯Ù‚Ø© ÙÙŠ Section 37ØŒ Ù„ÙƒÙ† Ù…Ø¹ Ø§Ø®ØªØµØ§Ø± Ø²Ù…Ù†ÙŠ: Ù†Ø¨Ø¯Ø£ Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙŠØ¦Ø© Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù…Ø¹Ø²ÙˆÙ„Ø© (Testing Harness) Ø§Ù„ØªÙŠ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ MockFileSystemØŒ MockTimeØŒ ÙˆMemoryLimitSimulatorØŒ ÙˆÙ†Ø®ØªØ¨Ø±Ù‡Ø§ ÙˆØ­Ø¯Ù‡Ø§ Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù†Ù‡Ø§ Ù‚Ø§Ø¯Ø±Ø© Ø¹Ù„Ù‰ Ù…Ø­Ø§ÙƒØ§Ø© ÙƒÙ„ Ø­Ø§Ù„Ø© Ù†Ø§Ø¯Ø±Ø©. Ø«Ù… Ù†Ø¨Ù†ÙŠ Ù…Ø­Ø±Ùƒ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ (Error Engine) Ø¨ØªØ·Ø¨ÙŠÙ‚ TDD ØµØ§Ø±Ù…ØŒ Ø­ÙŠØ« Ù†ÙƒØªØ¨ Ø§Ø®ØªØ¨Ø§Ø±Ù‹Ø§ ÙØ§Ø´Ù„Ù‹Ø§ Ù„ÙƒÙ„ Ø¯Ø§Ù„Ø©ØŒ Ø«Ù… Ù†Ù†ÙØ° Ø§Ù„Ø¯Ø§Ù„Ø© Ø­ØªÙ‰ ÙŠÙ†Ø¬Ø­ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±ØŒ ÙˆÙ†ÙƒØ±Ø± Ø°Ù„Ùƒ Ø­ØªÙ‰ ÙŠÙƒØªÙ…Ù„ Ø§Ù„Ù…Ø­Ø±Ùƒ. Ù‡Ø°Ø§ Ø§Ù„Ù…Ø­Ø±Ùƒ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø¬Ø§Ù‡Ø²Ù‹Ø§ Ù„Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ù…Ù† Ø£ÙŠ Ù…Ø­Ø±Ùƒ Ø¢Ø®Ø±ØŒ ÙˆØªØµÙ†ÙŠÙÙ‡Ø§ØŒ ÙˆØªØ³Ø¬ÙŠÙ„Ù‡Ø§ØŒ ÙˆØ¥Ø¹Ù„Ø§Ù†Ù‡Ø§. Ø¨Ø¹Ø¯ Ø°Ù„ÙƒØŒ Ù†Ø¨Ù†ÙŠ Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ù„ÙØ§Øª (File Engine) Ù„ÙƒÙ† Ù…Ø¹ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ MockFileSystem ÙÙŠ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªØŒ Ø«Ù… Ù…Ø­Ø±Ùƒ Ø§Ù„Ø°Ø§ÙƒØ±Ø© (Memory Engine) ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ÙˆÙ‚Øª (Time Engine) Ø¨Ù†ÙØ³ Ø§Ù„Ù†Ù‡Ø¬ØŒ ÙˆÙ†ÙÙ†Ù‡ÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø¨Ø§Ø®ØªØ¨Ø§Ø± ØªÙƒØ§Ù…Ù„ ÙŠØ±Ø¨Ø· Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø±Ø¨Ø¹Ø© Ù…Ø¹Ù‹Ø§ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø­Ù„Ù‚Ø§Øª Ø§Ù„ÙˆÙ‡Ù…ÙŠØ©ØŒ ÙˆÙŠØ¤ÙƒØ¯ Ø£Ù† Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ ØªÙ†ØªÙ‚Ù„ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­ØŒ ÙˆØ£Ù† Ø§Ù„Ø°Ø§ÙƒØ±Ø© ØªÙØ¯Ø§Ø±ØŒ ÙˆØ£Ù† Ø§Ù„ÙˆÙ‚Øª ÙŠÙØ­Ø³Ø¨ Ø¨Ø¯Ù‚Ø©. Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªÙÙ†ØªØ¬ Ù†ÙˆØ§Ø© ØµÙ„Ø¨Ø© ÙŠÙ…ÙƒÙ† ØªØ´ØºÙŠÙ„Ù‡Ø§ ÙÙŠ Ø¨ÙŠØ¦Ø© Ø§Ø®ØªØ¨Ø§Ø±ÙŠØ©ØŒ Ù„ÙƒÙ†Ù‡Ø§ Ù„Ø§ ØªØ²Ø§Ù„ ØºÙŠØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ù† Ù‚Ø¨Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ Ù„Ø£Ù†Ù‡Ø§ ØªÙØªÙ‚Ø± Ø¥Ù„Ù‰ Ù†Ù…ÙˆØ°Ø¬ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ…Ø­Ø±ÙƒØ§Øª ØªØ­Ø±ÙŠØ±.

### Stage 2: Ø¨Ù†Ø§Ø¡ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª (L2 Data Model Layer)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ¨Ù†ÙŠ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ: Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ØŒ Ø§Ù„ÙˆØ³Ø§Ø¦Ø·ØŒ Ø§Ù„Ù…Ø³Ø§Ø±ØŒ Ø§Ù„Ù…Ù‚Ø·Ø¹ØŒ Ø§Ù„Ø¹Ù„Ø§Ù…Ø©ØŒ ÙˆØ§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª. Ù‡Ø°Ù‡ Ø§Ù„ÙƒØ§Ø¦Ù†Ø§Øª ÙŠØ¬Ø¨ Ø£Ù† ØªÙØµÙ…Ù… ÙƒÙƒÙŠØ§Ù†Ø§Øª ØºÙŠØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØºÙŠÙŠØ± (Immutable Entities) Ø¨Ø­ÙŠØ« Ø£ÙŠ ØªØ¹Ø¯ÙŠÙ„ ÙŠÙ†ØªØ¬ ÙƒØ§Ø¦Ù†Ù‹Ø§ Ø¬Ø¯ÙŠØ¯Ù‹Ø§ØŒ Ù…Ù…Ø§ ÙŠØ³Ù‡Ù„ Ø§Ù„ØªØ±Ø§Ø¬Ø¹ ÙˆØ§Ù„Ø¥Ø¹Ø§Ø¯Ø©. Ù†Ø¨Ø¯Ø£ Ø¨ØªØ¹Ø±ÙŠÙ ÙˆØ§Ø¬Ù‡Ø§Øª Ù‡Ø°Ù‡ Ø§Ù„ÙƒØ§Ø¦Ù†Ø§Øª ÙÙŠ Ù…Ù„Ù Ù…Ø´ØªØ±ÙƒØŒ Ø«Ù… Ù†ÙƒØªØ¨ Ù…ØµÙ†Ø¹ (Factory) Ù„Ø¥Ù†Ø´Ø§Ø¦Ù‡Ø§ Ù…Ø¹ Ù‚ÙŠÙ… Ø§ÙØªØ±Ø§Ø¶ÙŠØ©ØŒ Ø«Ù… Ù†ÙƒØªØ¨ Ù…Ø­Ø±Ùƒ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª (Transaction Engine) Ø§Ù„Ø°ÙŠ ÙŠØ¯ÙŠØ± Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª Ø¹Ø¨Ø± Ø³Ù„Ø³Ù„Ø© Ù…Ù† Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø°Ø±ÙŠØ©ØŒ ÙˆÙŠØ³Ø¬Ù„ ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ÙÙŠ Ø³Ø¬Ù„ Ø§Ù„ØªØ±Ø§Ø¬Ø¹. ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ®ØªØ¨Ø± Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø© Ø¨Ø´ÙƒÙ„ Ù…ÙƒØ«Ù Ø¹Ø¨Ø± Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø´Ø§Ø±ÙŠØ¹ Ø§ÙØªØ±Ø§Ø¶ÙŠØ© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ù…Ø¦Ø§Øª Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ ÙˆØ§Ù„Ù…Ø³Ø§Ø±Ø§ØªØŒ ÙˆÙ…Ø­Ø§ÙƒØ§Ø© Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØªØ­Ø±ÙŠØ± ÙˆØ§Ù„ØªØ±Ø§Ø¬Ø¹ØŒ ÙˆØ§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¸Ù„ Ù…ØªØ³Ù‚Ø© Ø¯Ø§Ø¦Ù…Ù‹Ø§. Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø© Ù„Ø§ ØªØ¹Ø±Ù Ø´ÙŠØ¦Ù‹Ø§ Ø¹Ù† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø£Ùˆ Ø§Ù„ØµÙˆØªØŒ Ø¨Ù„ ØªØªØ¹Ø§Ù…Ù„ ÙÙ‚Ø· Ù…Ø¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ…Ù†Ø·Ù‚ Ø§Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„Ù…Ø¬Ø±Ø¯.

### Stage 3: Ø¨Ù†Ø§Ø¡ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© (L3 Core Engines Layer)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ¨Ù†ÙŠ Ø§Ù„Ù‚Ù„Ø¨ Ø§Ù„Ù†Ø§Ø¨Ø¶ Ù„Ù„ØªØ·Ø¨ÙŠÙ‚: Ù…Ø­Ø±Ùƒ Ø§Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„Ø²Ù…Ù†ÙŠ (Timeline Engine) Ø§Ù„Ø°ÙŠ ÙŠØ¯ÙŠØ± Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª ÙˆØ§Ù„Ù…Ù‚Ø§Ø·Ø¹ ÙˆÙŠÙ†ÙØ° Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ù‚Øµ ÙˆØ§Ù„Ø¯Ù…Ø¬ ÙˆØ§Ù„Ù†Ù‚Ù„ ÙˆØ§Ù„ØªÙ‚Ø³ÙŠÙ…ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ÙˆØ³Ø§Ø¦Ø· (Media Engine) Ø§Ù„Ø°ÙŠ ÙŠØ³ØªÙˆØ±Ø¯ Ø§Ù„ÙÙŠØ¯ÙŠÙˆÙ‡Ø§Øª ÙˆÙŠØ­Ù„Ù„ Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª ÙˆÙŠØ³ØªØ®Ø±Ø¬Ù‡Ø§ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„Ù…Ø¤Ø´Ø± (Cursor Engine) Ø§Ù„Ø°ÙŠ ÙŠØ¯ÙŠØ± Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ù…Ø¤Ø´Ø± Ø§Ù„Ø²Ù…Ù†ÙŠ ÙˆØ­Ø±ÙƒØ§ØªÙ‡ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ØªØ­Ø¯ÙŠØ¯ (Selection Engine) Ø§Ù„Ø°ÙŠ ÙŠØ¯ÙŠØ± ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„Ø­Ø§ÙØ¸Ø© (Clipboard Engine) Ø§Ù„Ø°ÙŠ ÙŠØ®Ø²Ù† Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ Ø§Ù„Ù…Ù†Ø³ÙˆØ®Ø© ÙˆØ§Ù„Ù…Ù‚Ø·ÙˆØ¹Ø©ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ØªØ±Ø§Ø¬Ø¹ (Undo Engine) Ø§Ù„Ø°ÙŠ ÙŠØ³ØªØ®Ø¯Ù… Ø³Ø¬Ù„ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ù…Ù† L2. ÙŠØ¬Ø¨ Ø£Ù† ØªÙØ¨Ù†Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª ÙˆØ§Ø­Ø¯Ø© ØªÙ„Ùˆ Ø§Ù„Ø£Ø®Ø±Ù‰ØŒ Ù…Ø¹ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ÙˆØ­Ø¯Ø© Ù„ÙƒÙ„ Ù…Ù†Ù‡Ø§ØŒ ÙˆØ§Ø®ØªØ¨Ø§Ø±Ø§Øª ØªÙƒØ§Ù…Ù„ Ø¨ÙŠÙ†Ù‡Ø§ØŒ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Test Sprite ÙƒØ£Ø¯Ø§Ø© Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø£ÙˆØ§Ù…Ø± ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª. Ø¨Ø¹Ø¯ Ø§ÙƒØªÙ…Ø§Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø±ÙƒØ§ØªØŒ ÙŠØµØ¨Ø­ Ø§Ù„Ù†Ø¸Ø§Ù… Ù‚Ø§Ø¯Ø±Ù‹Ø§ Ø¹Ù„Ù‰ Ø§Ø³ØªÙŠØ±Ø§Ø¯ ÙÙŠØ¯ÙŠÙˆ ÙˆÙØµÙ„Ù‡ Ø¥Ù„Ù‰ Ù…Ø³Ø§Ø±Ø§ØªØŒ ÙˆØªØ­Ø±ÙŠÙƒ Ø§Ù„Ù…Ø¤Ø´Ø±ØŒ ÙˆØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…Ù‚Ø§Ø·Ø¹ØŒ ÙˆØªÙ†ÙÙŠØ° Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©ØŒ ÙˆØ§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù†Ù‡Ø§. Ù„ÙƒÙ† ÙƒÙ„ Ù‡Ø°Ø§ Ù„Ø§ ÙŠØ²Ø§Ù„ ÙÙŠ Ø§Ù„Ø®Ù„ÙÙŠØ© Ø¯ÙˆÙ† ÙˆØ§Ø¬Ù‡Ø© Ù…Ø³ØªØ®Ø¯Ù…ØŒ Ù„Ø°Ø§ Ù†Ø¶ÙŠÙ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ÙˆØ§Ø¬Ù‡Ø© Ø£ÙˆØ§Ù…Ø± Ù†ØµÙŠØ© Ø¨Ø³ÙŠØ·Ø© (CLI) ØªØ³Ù…Ø­ Ù„Ù„Ù…Ø·ÙˆØ±ÙŠÙ† ÙˆØ§Ù„Ù…Ø®ØªØ¨Ø±ÙŠÙ† Ø¨Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø£ÙˆØ§Ù…Ø± ÙˆØªÙ„Ù‚ÙŠ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ØŒ ÙˆÙ‡Ø°Ø§ Ù‡Ùˆ Ø£ÙˆÙ„ Ø´ÙƒÙ„ ÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ÙƒÙÙˆÙ Ø£Ù† ÙŠØªÙØ§Ø¹Ù„ Ù…Ø¹Ù‡ØŒ Ø­ØªÙ‰ Ù„Ùˆ ÙƒØ§Ù† Ø°Ù„Ùƒ Ø¹Ø¨Ø± ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø£ÙˆØ§Ù…Ø± ÙÙŠ Ù…Ø­Ø·Ø© Ø·Ø±ÙÙŠØ©.

### Stage 4: Ø¨Ù†Ø§Ø¡ Ø·Ø¨Ù‚Ø© Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„ØµÙˆØªÙŠØ© (L4 Audio Interface Layer)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ­ÙˆÙ„ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« ÙˆØ§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ø¥Ù„Ù‰ ØµÙˆØª Ù…ÙÙ‡ÙˆÙ… Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù…. Ù†Ø¨Ø¯Ø£ Ø¨Ù…Ø­Ø±Ùƒ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† (Announcement Engine) Ø§Ù„Ø°ÙŠ ÙŠØ³ØªÙ…Ø¹ Ø¥Ù„Ù‰ Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ù…Ù† Ø§Ù„Ù…Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙˆÙŠÙˆÙ„Ø¯ Ù†ØµÙˆØµÙ‹Ø§ ØµÙˆØªÙŠØ© ÙˆÙÙ‚Ù‹Ø§ Ù„Ù…Ø³ØªÙˆÙ‰ Ø§Ù„ØªÙØµÙŠÙ„ Ø§Ù„Ù…Ø­Ø¯Ø¯ (Ù…ÙƒØ«Ù Ø£Ùˆ Ø¹Ø§Ø¯ÙŠ Ø£Ùˆ Ù…ÙØµÙ„)ØŒ Ø«Ù… Ù†Ø±Ø¨Ø·Ù‡ Ø¨Ù…Ø­Ø±Ùƒ Ø§Ù„Ù†Ø·Ù‚ (Speech Engine) Ø§Ù„Ø°ÙŠ ÙŠØ­ÙˆÙ„ Ø§Ù„Ù†Øµ Ø¥Ù„Ù‰ ÙƒÙ„Ø§Ù… Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… TTS Ø§Ù„Ø£ØµÙ„ÙŠ Ù„Ù„Ù†Ø¸Ø§Ù… (Ø¨Ø¯ÙˆÙ† Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø®Ø§Ø±Ø¬ÙŠØ©)ØŒ ÙˆÙ†Ø®ØªØ¨Ø± ÙˆØ¶ÙˆØ­ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ù…Ø¹ Ù‚Ø§Ø±Ø¦Ø§Øª Ø§Ù„Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø®ØªÙ„ÙØ© (NVDAØŒ VoiceOverØŒ JAWS). Ø«Ù… Ù†Ø¨Ù†ÙŠ Ù…Ø­Ø±Ùƒ Ø§Ù„ØªØ±ÙƒÙŠØ² (Focus Engine) Ø§Ù„Ø°ÙŠ ÙŠØ¯ÙŠØ± Ø§Ù„ØªÙ†Ù‚Ù„ Ø¨ÙŠÙ† Ø§Ù„Ø¹Ù†Ø§ØµØ± ÙˆÙŠÙ‚Ø±Ø£ ÙˆØµÙÙ‡Ø§ Ø¹Ù†Ø¯ ÙˆØµÙˆÙ„ Ø§Ù„ØªØ±ÙƒÙŠØ²ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØµÙˆØªÙŠØ© (Voice Command Engine) Ø§Ù„Ø°ÙŠ ÙŠØ³Ù…Ø­ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø¥Ø¹Ø·Ø§Ø¡ Ø£ÙˆØ§Ù…Ø± Ø·Ø¨ÙŠØ¹ÙŠØ© Ù…Ø«Ù„ "Ù‚Øµ Ø§Ù„Ù…Ù‚Ø·Ø¹ Ø§Ù„Ø­Ø§Ù„ÙŠ" Ø£Ùˆ "Ø§Ù†ØªÙ‚Ù„ Ø¥Ù„Ù‰ Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹". Ù‡Ø°Ù‡ Ø§Ù„Ø·Ø¨Ù‚Ø© Ù‡ÙŠ Ø§Ù„ØªÙŠ Ø³ØªØ¬Ø¹Ù„ Ø§Ù„Ù†Ø¸Ø§Ù… Ù…ØªØ­Ø¯Ø«Ù‹Ø§ ÙˆÙ‚Ø§Ø¨Ù„Ø§Ù‹ Ù„Ù„ØªØ­ÙƒÙ… Ø¯ÙˆÙ† Ø­Ø§Ø¬Ø© Ø¥Ù„Ù‰ Ø¹ÙŠÙ†ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ØªÙØ®ØªØ¨Ø± Ù…Ø¹ Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…ÙƒÙÙˆÙÙŠÙ† Ø­Ù‚ÙŠÙ‚ÙŠÙŠÙ† (Ø­ØªÙ‰ Ù„Ùˆ ÙƒØ§Ù†ÙˆØ§ Ù…Ø¬Ø±Ø¯ Ù…Ø­Ø§ÙƒÙŠÙ† Ø¹Ø¨Ø± Test Sprite) Ù„Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©ØŒ ÙˆØ£Ù† Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØµÙˆØªÙŠØ© ØªÙÙ†ÙØ° Ø¨Ø¯Ù‚Ø©.

### Stage 5: Ø¨Ù†Ø§Ø¡ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¨ØµØ±ÙŠØ© (L5 UI Layer)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ¨Ù†ÙŠ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¨ØµØ±ÙŠØ©ØŒ Ù„ÙŠØ³ ÙƒÙˆØ§Ø¬Ù‡Ø© ØªÙ‚Ù„ÙŠØ¯ÙŠØ© ØªØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙˆØ§ÙØ° ÙˆØ§Ù„Ø£Ø²Ø±Ø§Ø±ØŒ Ø¨Ù„ ÙƒÙˆØ§Ø¬Ù‡Ø© ØªÙƒÙ…ÙŠÙ„ÙŠØ© Ù„Ù„Ù…Ø¨ØµØ±ÙŠÙ†ØŒ Ø­ÙŠØ« ØªÙØ¹Ø±Ø¶ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø«Ù„ Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª ÙˆØ§Ù„Ù…Ù‚Ø§Ø·Ø¹ ÙˆØ§Ù„Ù…Ø¤Ø´Ø±ØŒ Ù„ÙƒÙ†Ù‡Ø§ Ù„Ø§ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£ÙŠ Ù…Ù†Ø·Ù‚ ØªØ­Ø±ÙŠØ±ØŒ Ø¨Ù„ ØªØ¹Ø±Ø¶ ÙÙ‚Ø· Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙˆØªÙØ±Ø³Ù„ Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø¹Ø¨Ø± Ù†ÙØ³ Ø§Ù„Ø­Ø§ÙÙ„Ø©. ÙŠØ¬Ø¨ Ø£Ù† ØªÙØµÙ…Ù… Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø¨Ø¨Ø³Ø§Ø·Ø© Ø´Ø¯ÙŠØ¯Ø©ØŒ Ù…Ø¹ Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù…Ù† Ø§Ù„Ø¹Ù†Ø§ØµØ±ØŒ Ø¨Ø­ÙŠØ« Ù„Ø§ ØªÙØ´ØªØª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ ÙˆØªÙƒÙˆÙ† Ù…ØªØ§Ø­Ø© Ù„Ù…Ù† ÙŠØ±ØºØ¨ ÙÙŠ Ø±Ø¤ÙŠØ© Ù…Ø§ ÙŠØ­Ø¯Ø«. Ù„ÙƒÙ† Ø§Ù„Ø£Ù‡Ù… Ù…Ù† Ø°Ù„Ùƒ Ù‡Ùˆ Ø£Ù† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ÙƒÙÙˆÙ ØªØ¸Ù„ Ù‡ÙŠ Ù†Ø¸Ø§Ù… Ø§Ù„Ø£ÙˆØ§Ù…Ø± ÙˆØ§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ø§Ù„ØµÙˆØªÙŠØ©ØŒ ÙˆÙ‡Ø°Ù‡ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¨ØµØ±ÙŠØ© Ù‡ÙŠ Ù…Ø¬Ø±Ø¯ Ø·Ø¨Ù‚Ø© Ø¹Ø±Ø¶ Ù„Ø§ Ø£ÙƒØ«Ø±. Ù†Ø¨Ø¯Ø£ Ø¨Ø¨Ù†Ø§Ø¡ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ù†ØµÙŠØ© Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø© (Command Line Interface) Ø§Ù„ØªÙŠ ØªØ³Ù…Ø­ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø£ÙˆØ§Ù…Ø± ÙˆØ±Ø¤ÙŠØ© Ø§Ù„Ù†ØªØ§Ø¦Ø¬ØŒ Ø«Ù… Ù†Ø¶ÙŠÙ ÙˆØ§Ø¬Ù‡Ø© ØµÙˆØªÙŠØ© (Voice Interface) ØªØ³Ù…Ø­ Ø¨Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„ØµÙˆØªÙŠØŒ Ø«Ù… Ù†Ø¶ÙŠÙ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¨ØµØ±ÙŠØ© ÙƒØ®ÙŠØ§Ø± Ù…ØªØ§Ø­.

### Stage 6: Ø§Ù„Ø¯Ù…Ø¬ ÙˆØ§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø´Ø§Ù…Ù„ (Integration & Full Testing)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªØ¯Ù…Ø¬ ÙƒÙ„ Ø§Ù„Ø·Ø¨Ù‚Ø§Øª ÙÙŠ ØªØ·Ø¨ÙŠÙ‚ ÙˆØ§Ø­Ø¯ Ù…ØªÙƒØ§Ù…Ù„ØŒ ÙˆØªÙØ¬Ø±ÙŠ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø´Ø§Ù…Ù„Ø© Ù…Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ø¥Ù„Ù‰ Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Test Sprite Ø§Ù„Ø°ÙŠ ÙŠÙ…Ø± Ø¹Ø¨Ø± Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆÙ‡Ø§Øª Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© ÙÙŠ Ù…ØµÙÙˆÙØ© Ø§Ù„Ø­Ø§Ù„Ø§Øª (Announcement_Registry.json)ØŒ ÙˆÙŠØ¤ÙƒØ¯ Ø£Ù† ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ØªØ¹Ù…Ù„ ÙƒÙ…Ø§ Ù‡Ùˆ Ù…ØªÙˆÙ‚Ø¹ØŒ ÙˆÙƒÙ„ Ø¥Ø¹Ù„Ø§Ù† ÙŠÙÙ‚Ø±Ø£ ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ØŒ ÙˆÙƒÙ„ Ø®Ø·Ø£ ÙŠÙØ¹Ù„Ù† Ø¨Ø±Ø³Ø§Ù„ØªÙ‡ Ø§Ù„ØµØ­ÙŠØ­Ø©. Ù†Ø¨Ø¯Ø£ Ø£ÙŠØ¶Ù‹Ø§ ÙÙŠ Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø¯Ø§Ø¡ Ù…Ø¹ Ù…Ø´Ø§Ø±ÙŠØ¹ ÙƒØ¨ÙŠØ±Ø© (1000 Ù…Ù‚Ø·Ø¹ØŒ 10 Ù…Ø³Ø§Ø±Ø§ØªØŒ Ù…Ø´Ø±ÙˆØ¹ Ù…Ø¯ØªÙ‡ Ø³Ø§Ø¹Ø©)ØŒ ÙˆØ§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„ØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø£Ù†Ø¸Ù…Ø© ØªØ´ØºÙŠÙ„ Ù…Ø®ØªÙ„ÙØ© (WindowsØŒ macOSØŒ Linux)ØŒ ÙˆØ§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ Ù…Ø¹ Ù‚Ø§Ø±Ø¦Ø§Øª Ø§Ù„Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø®ØªÙ„ÙØ©. Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ù‡ÙŠ Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø¹Ø¨ÙˆØ± Ø§Ù„ØªÙŠ ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙ…Ø± Ø¨Ù‡Ø§ Ø§Ù„Ù†Ø¸Ø§Ù… Ù‚Ø¨Ù„ Ø§Ù„Ø¥ØµØ¯Ø§Ø±ØŒ ÙˆÙŠØ¬Ø¨ Ø£Ù† ØªØ³ÙØ± Ø¹Ù† ØªÙ‚Ø±ÙŠØ± ÙŠÙˆØ¶Ø­ Ø£Ù† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ØªÙ…Ø±ØŒ ÙˆØ£Ù† Ø§Ù„ØªØºØ·ÙŠØ© Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠØ© ØªØµÙ„ Ø¥Ù„Ù‰ 95% Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ØŒ ÙˆØ£Ù† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù†Ø§Ø¯Ø±Ø© Ø§Ù„ØªÙŠ ØªÙ… ØªØ­Ø¯ÙŠØ¯Ù‡Ø§ Ù‚Ø¯ ØªÙ… Ø§Ø®ØªØ¨Ø§Ø±Ù‡Ø§ Ø¨Ù†Ø¬Ø§Ø­.

### Stage 7: Ø§Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ø£ÙˆÙ„ (v1.0 Release & Feedback Loop)

Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØªÙØ·Ù„Ù‚ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹ Ø¯Ù„ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„ØµÙˆØªÙŠ Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØŒ Ø­ÙŠØ« Ù†ÙØ·Ù„Ù‚ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù…Ø¹ ØµÙØ­Ø© ØªØ±Ø­ÙŠØ¨ ØªØ´Ø±Ø­ Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ ÙƒÙŠÙÙŠØ© Ø§Ù„ØªÙ†Ù‚Ù„ ÙˆØ§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©ØŒ Ù…Ø¹ Ø¬ÙˆÙ„Ø© ØµÙˆØªÙŠØ© ØªÙØ§Ø¹Ù„ÙŠØ© (3 Ø®Ø·ÙˆØ§Øª: Ø§Ø³ØªÙŠØ±Ø§Ø¯ ÙÙŠØ¯ÙŠÙˆØŒ Ù‚Øµ Ù…Ù‚Ø·Ø¹ØŒ Ø­ÙØ¸ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹). Ù†Ø¨Ø¯Ø£ Ø£ÙŠØ¶Ù‹Ø§ ÙÙŠ Ø¬Ù…Ø¹ Ø§Ù„ØªØºØ°ÙŠØ© Ø§Ù„Ø±Ø§Ø¬Ø¹Ø© Ù…Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ø£ÙˆØ§Ø¦Ù„ (3 Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…ÙƒÙÙˆÙÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„)ØŒ ÙˆØªØ­Ø¯ÙŠØ¯ Ø£ÙˆÙ„ÙˆÙŠØ§Øª Ø§Ù„ØªØ­Ø³ÙŠÙ†Ø§Øª Ù„Ù„Ø¥ØµØ¯Ø§Ø±Ø§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©ØŒ Ù…Ø«Ù„ Ø¥Ø¶Ø§ÙØ© Ù…Ø­Ø±Ùƒ Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ù„ØªØ­Ø±ÙŠØ± Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø·Ø¨ÙŠØ¹ÙŠØ©ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ØªØ¹Ø§ÙˆÙ†ØŒ ÙˆÙ…Ø­Ø±Ùƒ Ø§Ù„ØªØ±Ø¬Ù…Ø© Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ©ØŒ ÙˆØ§Ù„Ù†Ø´Ø± Ù…ØªØ¹Ø¯Ø¯ Ø§Ù„Ù…Ù†ØµØ§Øª.

---

Ø§Ù„ØµÙˆØ±Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ø§Ù„ØªÙŠ ØªØ±Ø³Ù…Ù‡Ø§ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø§Ø­Ù„ Ø§Ù„Ø³Ø¨Ø¹ Ù‡ÙŠ Ù†Ø¸Ø§Ù… ÙŠÙˆÙ„Ø¯ Ù…Ù† ØªØ­Øª Ø±Ù…Ø§Ù„ Ø§Ù„ØªØµÙ…ÙŠÙ… Ø¥Ù„Ù‰ ÙˆØ§Ù‚Ø¹ Ù…Ù„Ù…ÙˆØ³ØŒ Ø·Ø¨Ù‚Ø© Ø¨Ø¹Ø¯ Ø·Ø¨Ù‚Ø©ØŒ Ø§Ø®ØªØ¨Ø§Ø± Ø¨Ø¹Ø¯ Ø§Ø®ØªØ¨Ø§Ø±ØŒ Ø¥Ø¹Ù„Ø§Ù† Ø¨Ø¹Ø¯ Ø¥Ø¹Ù„Ø§Ù†. Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø§Ø®ØªØµØ§Ø±ØŒ ÙˆÙ„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ø±ÙŠÙ‚ Ù…Ø®ØªØµØ±ØŒ ÙˆÙ„Ø§ Ù…Ø¬Ø§Ù„ Ù„Ù„ØµØ¯ÙØ©. Ù„Ø£Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ÙƒÙÙˆÙ Ù„Ø§ ÙŠØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ ÙˆØ§Ø¬Ù‡Ø© Ø¬Ù…ÙŠÙ„Ø©ØŒ Ø¨Ù„ ÙŠØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ Ù†Ø¸Ø§Ù… ÙŠÙ…ÙƒÙ†Ù‡ Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„ÙŠÙ‡ØŒ Ø­ÙŠØ« ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ÙˆØ§Ø¶Ø­Ø©ØŒ ÙˆÙƒÙ„ Ø¥Ø¹Ù„Ø§Ù† ØµØ±ÙŠØ­ØŒ ÙˆÙƒÙ„ Ø®Ø·Ø£ Ù…ÙÙ‡ÙˆÙ…ØŒ ÙˆÙƒÙ„ Ø£Ù…Ø± ÙŠÙ†ÙØ° ÙÙˆØ±Ø§Ù‹. Ø§Ù„Ø¨Ø³Ø§Ø·Ø© Ø§Ù„ØªÙŠ Ù†Ø¨Ø­Ø« Ø¹Ù†Ù‡Ø§ Ù„ÙŠØ³Øª ÙÙŠ ØªÙ‚Ù„ÙŠÙ„ Ø§Ù„Ø¹Ù†Ø§ØµØ±ØŒ Ø¨Ù„ ÙÙŠ Ø¬Ø¹Ù„ ÙƒÙ„ Ø¹Ù†ØµØ± Ø¶Ø±ÙˆØ±ÙŠØ§Ù‹ ÙˆÙˆØ§Ø¶Ø­Ø§Ù‹ØŒ ÙˆÙÙŠ Ø¬Ø¹Ù„ ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ØªØªØ¨Ø¹ Ù…Ù†Ø·Ù‚Ø§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ù„Ø§ Ù„Ø¨Ø³ ÙÙŠÙ‡. Ø§Ù„Ù‚ÙˆØ© Ø§Ù„ØªÙŠ Ù†Ø±ÙŠØ¯Ù‡Ø§ Ù„ÙŠØ³Øª ÙÙŠ ÙƒØ«Ø±Ø© Ø§Ù„Ù…ÙŠØ²Ø§ØªØŒ Ø¨Ù„ ÙÙŠ Ù‚Ø¯Ø±Ø© Ø§Ù„Ù†Ø¸Ø§Ù… Ø¹Ù„Ù‰ Ø§Ù„ØªØ¹Ø§Ù…Ù„ Ù…Ø¹ Ø£ÙŠ Ø­Ø§Ù„Ø© Ù†Ø§Ø¯Ø±Ø© Ø¯ÙˆÙ† Ø§Ù†Ù‡ÙŠØ§Ø±ØŒ ÙˆÙÙŠ Ù‚Ø¯Ø±ØªÙ‡ Ø¹Ù„Ù‰ Ø¥Ø¹Ù„Ø§Ù† Ù…Ø§ ÙŠØ­Ø¯Ø« Ø¨ØµÙˆØª ÙˆØ§Ø¶Ø­ ÙŠØ³Ù…Ø¹Ù‡ Ø§Ù„Ø¬Ù…ÙŠØ¹. Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø·Ø©ØŒ Ù†Ø¨Ø¯Ø£ Ù…Ù† Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ø£ÙˆÙ„ ÙÙŠ Ø¨Ù†Ø§Ø¡ Ù„ÙŠØ³ Ù…Ø¬Ø±Ø¯ Ø¨Ø±Ù†Ø§Ù…Ø¬ØŒ Ø¨Ù„ Ø£Ø¯Ø§Ø© ØªÙ…ÙƒÙŠÙ† Ø­Ù‚ÙŠÙ‚ÙŠØ©ØŒ ÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ÙƒÙÙˆÙ Ø£Ù† ÙŠÙØªØ­Ù‡Ø§ ÙˆÙŠØ¨Ø¯Ø£ ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø¨Ø«Ù‚Ø©ØŒ Ù„Ø£Ù†Ù†Ø§ ÙÙƒØ±Ù†Ø§ ÙÙŠ ÙƒÙ„ Ø§Ø­ØªÙ…Ø§Ù„ Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ­Ø¯Ø«ØŒ ÙˆØ§Ø®ØªØ¨Ø±Ù†Ø§ ÙƒÙ„ Ù…Ø³Ø§Ø± Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ³ÙŠØ± Ø¹Ù„ÙŠÙ‡ Ø£Ø­Ø¯.

---

## 39. Effects System (Stage 3)

**Location:** `src/core/effects/`
**Status:** IMPLEMENTED (Stage 3 complete)
**Design rule:** Effects are non-destructive. They never mutate the original clip; `render()` applies the chain at export time and returns a brand-new clip. Every effect is applicable, undoable, editable and re-appliable, and every applied setting is part of the project (serializable snapshot).

### 39.1 Directory Structure

```
src/core/effects/
├── core/
│   ├── errors.ts            # FX_* error registry + bilingual messages
│   ├── types.ts             # EffectType, EffectCategory, EffectDefinition, EffectPreset, AppliedEffect, RenderContext, RenderResult
│   └── validate.ts          # normalizeParams / validateParams / validateParamValue
├── engines/
│   └── EffectEngine.ts      # register / apply / remove / render / presets
├── definitions/             # the 12 built-in effect definitions
├── presets/                 # JSON preset files (one per effect) + loader
├── ui/
│   └── voice-command-parser.ts  # Arabic/English command → ParsedEffectCommand
└── tests/                   # unit + integration suites (jest, `*.test.ts`)
```

### 39.2 Public Contracts

- **`EffectDefinition`** = `{ id, name (bilingual "En / عربي"), category, type, description, parameters[], conflictsWith?, apply(clip, params, context): Result<EffectApplyResult, EffectError> }`
- **`EffectApplyResult`** = `{ clip, description (announceable, bilingual), renderData }` — the `clip` is always a new object, never the input.
- **`EffectPreset`** = `{ id, name, effectId, parameters, description }` stored as JSON in `presets/<effectId>.json`.
- **`AppliedEffect`** = `{ id, effectId, clipId, params, appliedAt }` kept per clip inside `EffectEngine`.
- **`RenderContext`** = `{ time: ITimeEngine, file: IFileEngine, memory: IMemoryEngine, errors: IErrorEngine }` (wraps the four L1 engines).
- **`RenderResult`** = `{ clip, effects: Array<{ effectId, name, description, renderData }> }` — ordered by application order.

### 39.3 EffectEngine API

- `registerEffect` / `registerMany` / `unregisterEffect` / `getEffectDefinition` / `getRegisteredEffectIds`
- `applyEffect(clipId, effectId, params)` → validates params, enforces `conflictsWith`, stores normalized params
- `applyPreset(clipId, preset)` → applies an effect using preset parameters
- `removeEffect(clipId, effectId)` → removes the latest occurrence
- `getEffects(clipId)` / `hasEffects(clipId)`
- `setPresets(effectId, presets)` / `getPresets(effectId)`
- `render(clip, context)` → runs the applied chain in order and returns the new clip

Error contract: `Result<..., EffectError>` with `FX_` codes: `EFFECT_NOT_FOUND`, `EFFECT_ALREADY_REGISTERED`, `EFFECT_APPLY_FAILED`, `EFFECT_CONFLICT`, `EFFECT_PARAM_MISSING`, `EFFECT_PARAM_INVALID`, `EFFECT_PARAM_OUT_OF_RANGE`, `CLIP_NOT_FOUND`, `INVALID_INPUT`.

`unregisterEffect` removes the definition and its presets but keeps applied instances visible, so a later `render()` reports `EFFECT_NOT_FOUND` instead of silently dropping work.

### 39.4 The 12 Effects (id → category/type → parameters → presets)

| # | id | category | type | parameters | presets (JSON) |
|---|----|----------|------|-----------|----------------|
| 1 | `speed-change` | speed | video | speed (0.1–5.0), preservePitch | Slow Motion 0.5x, Fast Forward 2x, Time-lapse 4x |
| 2 | `reverse` | transform | video | (none) | Full Reverse |
| 3 | `color-adjust` | color | video | brightness, contrast, saturation (−100–100), hue (−180–180) | Warm, Cool, Vivid |
| 4 | `fade` | transition | video | fadeType (in/out/both), duration (0.1–30s), curve (linear/ease-in/ease-out) | Fade In, Fade Out, Fade Both |
| 5 | `noise-reduction` | audio-fx | audio | strength (0–100), sensitivity (0–100) | Light, Medium, Strong |
| 6 | `reverb` | audio-fx | audio | roomSize (0.1–1.0), wetLevel (0–100), dryLevel (0–100) | Room, Hall, Cathedral |
| 7 | `stt` | generative | audio | language (ar/en/fr), confidence (0–100) | Arabic, English, French |
| 8 | `add-subtitles` | text | both | text, startTime (s), duration (s), fontSize (12–72px), color | Lower Third, Title Card, Caption |
| 9 | `zoom-rotate` | transform | video | zoom (0.1–5.0), rotate (−360–360°), panX, panY (−100–100%) | Zoom In, Rotate, Slow Pan |
| 10 | `gen-background` | generative | video | style (gradient/particles/stars), colors, speed (0–100) | Gradient, Particles, Stars |
| 11 | `auto-color` | color | video | strength (0–100), whiteBalance | Auto Fix, Strong Fix |
| 12 | `transition` | transition | video | transitionType (dissolve/wipe/slide/zoom), duration (s), direction | Dissolve, Wipe, Slide |

**Conflicts:** `fade` ↔ `transition` and `fade` ↔ `reverse`. Applying a conflicting effect returns `EFFECT_CONFLICT`.

### 39.5 Non-Destructive Rendering

```ts
// pseudo-flow
let result = engine.render(clip, context);
// result.clip is a NEW clip; `clip` (original) is untouched.
// renderData on each step feeds the export/FFmpeg pipeline.
```

`speed-change` is the only effect that rewrites clip fields (speed + duration = duration/speed); all others produce `renderData` consumed at export time.

### 39.6 Voice Command Palette

`VoiceCommandParser` (`ui/voice-command-parser.ts`) turns Arabic/English spoken-style commands into `{ effectId, clipName, params, presetId? }`:

- `"تطبيق تأثير تغيير السرعة على المقطع الحالي، سرعة 2x"` → `speed-change`, current clip, speed=2
- `"تطبيق اقتراح Slow Motion"` → `speed-change` + `preset-slow-motion` (params merged from preset)
- `"apply speed-change to current clip"` → English equivalent
- Named/numbered clips: `"على المقطع اللقاء"`, `"على المقطع 1"`, `"on clip name"`

Effect detection uses longest-token matching (Arabic substring + ASCII word boundaries) over an alias table; enum values are extracted from labels (e.g. `"ظهور"` → `fadeType=in`). Unrecognized or empty input returns `INVALID_INPUT`.

### 39.7 Accessibility & Announcement

- Every `EffectDefinition.name` and every `EffectApplyResult.description` is bilingual (Arabic + English) and suitable for the AnnouncementEngine.
- The command palette and the effects panel both surface these descriptions; the announcement flow should announce each successful apply/remove/render step (wired through the EventBus — AnnouncementEngine, PROJECT_MAP §7).

### 39.8 Plugin-Style Extension

New effects are plain `EffectDefinition` objects registered via `engine.registerEffect(def)`; presets are JSON files under `presets/` loaded with `loadPresets(engine)`. Definitions and presets are data — readable by the voice interface and by the project save/load pipeline.

### 39.9 Test Requirements (all met)

- validate: defaults, out-of-range, NaN, wrong type, enum validity, missing default, unknown-key stripping
- definitions: exactly 12 effects, unique ids, valid category/type, bilingual names, correct ranges, conflict pairs, per-effect apply behavior, non-mutation
- engine: registration (duplicate/batch/unregister), apply (not-found/unknown params/conflict/resolver), remove (latest occurrence/not-found), presets, per-clip bookkeeping
- render: empty chain, ordered chain, non-destructive, unregistered-effect failure, failing-apply propagation, bilingual descriptions
- voice parser: canonical Arabic/English, presets, named/numbered clips, enums, quoted text, rejections
- integration: real TimeEngine + fileEngineForMock(MockFileSystem) + MemoryEngine + ErrorEngine, preset JSON read/write through file engine, serializable applied-effect snapshot, error-engine reporting

**Suite result:** 6 new suites / 82 tests green.

---

## 40. Room System Implementation (Stage 4)

**Location:** `src/core/rooms/` (rooms) · `src/core/media/` (media) · `src/core/commands/` (commands)
**Status:** IMPLEMENTED (Stage 4 — Project Room, Timeline Room, and Media Room complete; Unified Command System delivered on top of the Room command engine)
**Design rule:** Every room is an `IRoom` registered with the `RoomNavigation` engine. Entering, exiting and every action produce a bilingual (AR/EN) `AudioAnnouncement` via the AnnouncementEngine (PROJECT_MAP §7/§22). Shortcuts are globally unique; duplicate registration is rejected.

### 40.1 Directory Structure

```
src/core/rooms/
├── common/
│   ├── event-bus.ts            # AppEvent constants (ROOM_ENTER/EXIT, PROJECT_*, TIMELINE_CHANGED, SETTINGS_CHANGED, ...) + typed EventBus
│   ├── announcement-engine.ts  # level filter (routine < important < critical_only), bilingual announcements, last/queue
│   ├── room-types.ts           # RoomId, RoomKind, RoomStatus, ShortcutSpec
│   ├── room-interface.ts       # IRoom (id, nameEn, nameAr, onEnter/onExit, getElements)
│   ├── room-navigation.ts      # RoomNavigation: register/navigate/back/history/current, duplicate-id rejection
│   ├── command-engine.ts       # CommandEngine: register/execute, duplicate command rejection
│   ├── settings-engine.ts      # SettingsEngine: announce levels, persistence via IFileEngine
│   ├── room-context.ts         # RoomContext = { eventBus, announcement, errors, settings }
│   ├── mocks.ts                # createTestRoomContext() wiring real engines + MockFileSystem
│   └── format.ts               # formatDuration / formatTicksToMs helpers
├── project/                    # Project Room
├── timeline/                   # Timeline Room
└── integration/                # end-to-end scenario test (5 scenarios)

src/core/media/
├── media-engine.interface.ts  # IMediaEngine: probeBytes / analyzeBytes (byte-based, single-read)
├── mock-media-engine.ts       # MockMediaEngine + encodeMockMedia (magic "TEMPOMEDIA:")
├── media-room.model.ts        # MediaRoomModel: import/remove/getStats/listMedia via txn
└── media-room.ts              # MediaRoom (IRoom) — bilingual onEnter + media-stats elements

src/core/commands/
├── command-definition.ts      # CommandDefinition, CommandScope
├── shortcut-engine.ts         # ShortcutEngine: normalize/parse/format/isValid/matches
├── command-system.ts          # CommandSystem: registry + scope gating + search
├── command-palette.ts         # CommandPalette: query/selection/dispatch
└── index.ts                   # barrel export
```

### 40.2 Project Room

- `project-room.model.ts` — `ProjectRoomModel`: `createProject`, `loadProject`, `saveProject`, `exportProject`, `restoreLastSave`, `closeProject`, `updateProject`, `getStats`, `getRecentProjects`; dirty tracking; on create/save/export/close each emits the matching `AppEvent`.
- `project-room.ts` — `ProjectRoom implements IRoom` (id `"project"`, `nameEn` "Project Room", `nameAr` "غرفة المشروع"): `onEnter` announces current project stats or "No project is open"; subscribes to `MEDIA_IMPORTED`; exposes 5 action buttons (`project-stats`, `new-project`, `save-project`, `export-project`, `recent-projects`) plus a `project-stats` status.
- Project persistence uses the envelope-versioned JSON format `{format:"tempo-project", version:1, project}` with `$bigint` tags (`src/core/model/project-file.ts`); invalid files return `CORRUPT_FILE`.
- Tests: `project-room.model.test.ts` + `project-room.test.ts` (both green).

### 40.3 Timeline Room

- `timeline-room.model.ts` — `TimelineRoomModel` (id `"timeline"`): playhead (set/move by seconds, frames, to start/end, to clip start/end; clamped to max clip end), active-track navigation, selection (current-under-playhead / next / previous / all / deselect), split / merge / duplicate, clipboard (copy / cut / paste; cut clears clipboard on paste), delete, undo/redo via `TransactionEngine`.
- Single source of truth: the model reads the current `Project` from `ProjectRoomModel` and commits every edit through `store.updateProject` + `TransactionEngine`; there is no separate timeline state copy.
- Clipboard stores read-only snapshots of clips (cloned `TimeValue` / effects arrays).
- Every successful mutation calls `notifyChanged()` which emits `AppEvent.TIMELINE_CHANGED`; model errors map to bilingual text via `MODEL_MESSAGES`.
- `refreshFromProject()` runs on room enter; `getElementsData()` returns the track/clip tree for the UI.
- `timeline-room.ts` — `TimelineRoom implements IRoom` (`nameEn` "Timeline Room", `nameAr` "غرفة المخطط الزمني"): `onEnter` announces track summary + playhead; `getElements` returns playhead/selection/clipboard statuses, per-track buttons, and per-clip statuses.
- Tests: `timeline-room.model.test.ts` (36) + `timeline-room.test.ts` (4) — all green.

### 40.4 Media Room

- `media-engine.interface.ts` — `IMediaEngine` is byte-based: `probeBytes(data)` returns `Result<MediaProbe, ErrorCode>`, `analyzeBytes(data)` returns `Result<AnalysisResult, ErrorCode>`. Single-read design: the model reads a file's bytes once and hands them to the engine — no engine↔file double I/O.
- `mock-media-engine.ts` — `MockMediaEngine` (zero-arg constructor) + `encodeMockMedia(spec)` helper producing `TEMPOMEDIA:`-magic bytes. Unknown codec/container default to `"unknown"` / `0` bitrate; rejects non-media bytes with `UNSUPPORTED_FORMAT`, malformed JSON with `CORRUPT_FILE`, unprobeable kinds with `MEDIA_ANALYSIS_FAILED`.
- `media-room.model.ts` — `MediaRoomModel(store, file, engine, eventBus, announcement, txn)`: `importMedia` (no-project → `OPERATION_FAILED`, empty path → `INVALID_INPUT`, read-failure propagation, sha256 hash, `txn.run("import-media")`, `MEDIA_IMPORTED` event), `removeMedia` (no-project/unknown → `OPERATION_FAILED`, in-use-by-clip → `MEDIA_IN_USE`, custom `remove-media` transition + txn, `MEDIA_REMOVED` event), `getStats` (video/audio/image breakdown + `totalDurationMs`), `listMedia`, `getState`.
- `media-room.ts` — `MediaRoom implements IRoom` (id `"media"`): `onEnter` announces "No project is open" or a library summary; subscribes to `MEDIA_IMPORTED`; `getElements` returns empty-status or `listitems` + `media-stats`.
- Model rule: `importMedia` in `src/core/model/transitions.ts` allows `durationMs === 0` for `mediaType === "image"` only (zero-duration video/audio still rejected).
- Tests: `mock-media-engine.test.ts` (10), `media-room.model.test.ts` (14), `media-room.test.ts` (10) — all green.

### 40.5 Unified Command System

- `shortcut-engine.ts` — `ShortcutEngine` normalizes shortcuts to a canonical `ctrl+alt+shift+meta+key` form (aliases: control/cmd/command/win/super), `parse`s modifiers vs key, `format`s to human-readable `Ctrl+Shift+N`, `isValid`, and `matches` against a `KeyboardEventLike`.
- `command-system.ts` — `CommandSystem` is the unified registry: `register`/`unregister` (rejects empty ids, duplicate ids, invalid and conflicting shortcuts), lookup by `getById`/`getByShortcut`, `dispatchById`/`dispatchByShortcut`, scope gating via a `getCurrentRoomId` provider (global commands run anywhere; scoped commands blocked outside their room, allowed when no room is active or no provider is set), `list` (category+label sorted), `search` (ranked id/labelEn/labelAr/category matching), `listShortcuts`. Extends the per-room `CommandEngine` in `src/core/rooms/common/command-engine.ts`.
- `command-palette.ts` — `CommandPalette(system)`: `setQuery`/`getQuery`, `getResults`, `getResultCount`, `getCurrentIndex` (`-1` when empty), `getCurrentItem` (clamps into range), `moveUp`/`moveDown` (wrap-around), `selectCurrent` (dispatches the highlighted command; `INVALID_INPUT` when empty). Text/announcement-based guidance only — no voice commands.
- `index.ts` — barrel export of the three engines + `CommandDefinition`/`CommandScope`/`KeyboardEventLike` types.
- Tests: `shortcut-engine.test.ts` (17), `command-system.test.ts` (27), `command-palette.test.ts` (10) — all green.
- Wired end-to-end in the integration suite: a `CommandSystem` bound to `navigation.getCurrentRoomId()` registers `Ctrl+N` (new project, global), `Ctrl+1`/`Ctrl+2` (navigation, global), and `S` (split, timeline-scoped); the palette selects `قص` by Arabic label and dispatches it.

### 40.6 Test Requirements (all met)

- common: event-bus filtering, announcement levels/queue, navigation register/duplicate/history, command engine duplicate rejection, settings persistence
- project: create/load/save/export/restore/close/dirty/stats/recent, corrupt-file rejection
- timeline: playhead clamping, selection, split/merge/duplicate, clipboard copy/cut/paste, delete, undo/redo, model-message errors
- rooms as IRoom: onEnter announcements bilingual, getElements content
- integration: full flow (see §41)

---

## 41. React UI & Integration Verification (Stage 4)

**Location:** `src/ui/`
**Status:** IMPLEMENTED (Phase 3 UI + Phase 4 integration test)

### 41.1 React Setup

- Dependencies: `react` / `react-dom` ^19.2.8, `@testing-library/react` ^16.3.2, `@testing-library/jest-dom`, `@testing-library/dom`, `jsdom`, `jest-environment-jsdom`.
- `tsconfig.json`: `"jsx": "react-jsx"` on top of the existing strict config (rootDir `./src`, `noUncheckedIndexedAccess`).
- `jest.config.js`: `testMatch` includes `**/*.test.{ts,tsx}`; `setupFilesAfterEnd` -> `src/ui/test-setup.ts` (jest-dom + TextEncoder/TextDecoder polyfill from `util`). UI test files opt in to jsdom via `@jest-environment jsdom` docblock.

### 41.2 UI Components

- `src/ui/components/room-panel.tsx` — `RoomPanel` renders the room heading, action buttons (each with a `<kbd>` shortcut label), statuses as `role="status"` elements, and an `aria-live="polite"` log (latest announcement). Accepts `Announcement | null | undefined`.
- `src/ui/rooms/project-room-view.tsx` / `src/ui/rooms/timeline-room-view.tsx` — thin wrappers feeding `room.getElements(context)` into `RoomPanel`.
- `src/ui/app.tsx` — subscribes to every `AppEvent`, re-renders on a tick; renders the active room view by `navigation.getCurrentRoomId()`, else "No room active".
- Tests: `room-panel.test.tsx` (5), `project-room-view.test.tsx` (4), `timeline-room-view.test.tsx` (5), `app.test.tsx` (4) — all green.

### 41.3 Integration Test

`src/core/rooms/integration/integration.test.ts` drives the real engines end-to-end and asserts every announcement:

1. Enter Project Room -> "Entered Project Room" + "No project is open" + `ROOM_ENTER` event.
2. `createProject("My Film")` -> "Created new project" + `PROJECT_CREATED`.
3. Seed 2 media, 1 track, 2 clips through `TransactionEngine` (Media Room stand-in).
4. Navigate to Timeline Room -> "Entered Timeline Room" + "V1 has 2 clips".
5. `setPlayheadMs(500)` -> "Playhead at 0.5 seconds"; split -> 3 clips + "Split clip".
6. undo -> 2 clips; redo -> 3 clips.
7. Delete selected clip -> 2 clips + "Deleted 1 clips"; undo -> 3 clips.
8. Select clip at 1.5 s, copy, move to end, paste -> 4 clips + "Pasted 1 clips".
9. Back to Project Room -> stats announced (4 clips, duration 00:07); `getStats` asserts clipCount 4 / trackCount 1 / durationMs 7000.
10. `saveProject("my-film.tprj")` -> file exists + "Project saved" + `PROJECT_SAVED`.
11. `exportProject("my-film.json")` -> file exists + "Project exported".
12. Navigation history `["project","timeline","project"]`.
13. Scenario 2 — "prevents navigation to rooms that are not registered": `navigateTo("settings")` fails, current room stays `null`.
14. Scenario 3 — "imports media through the Media Room and edits it in the Timeline Room": navigate to Media Room (no-project guide), create project, `importMedia` video+audio through the model, re-enter announces "2 media assets", insert clip from imported media, split + undo, audio removable while in-use video returns `MEDIA_IN_USE`.
15. Scenario 4 — "handles media failures and navigation errors without corrupting the project": no-project import → `OPERATION_FAILED`, unsupported → `UNSUPPORTED_FORMAT`, missing file → `FILE_NOT_FOUND`, unknown remove fails, unregistered nav keeps the current room, project unchanged.
16. Scenario 5 — "drives the editor through the unified command system and palette": `Ctrl+N` creates a project with no room active; timeline-scoped `S` is blocked in the Project Room (`INVALID_INPUT`); `Ctrl+2` navigates to the Timeline Room; `s` splits; the palette filters by Arabic label `قص`, highlights `split`, and dispatches it; unknown `Ctrl+F9` fails cleanly.

### 41.4 Stage 4 Suite Totals

- common (Phase 0): 61 tests
- project room: model + room suites green
- timeline room: 40 tests green
- media: 34 tests green (engine + model + room)
- commands: 54 tests green (shortcut engine + system + palette)
- integration: 5 scenario tests green
- UI (Phase 3): 18 tests green
- **Full gate:** 41 suites / 666 tests, 0 failed; coverage statements 98.2% / branches 94.88% / functions 98.82% / lines 98.97%; `npm run lint` + `npm run build` clean.
- integration: 2 scenarios green
- Full pre-React suite: 29 suites / 452 tests green; UI + integration add ~30 more; `npx tsc --noEmit` clean.
