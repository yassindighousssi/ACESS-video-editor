import { Result, ErrorCode } from "../../infrastructure/common/types";
import { AnnouncementEngine } from "../common/announcement-engine";
import { AppEvent, EventBus } from "../common/event-bus";
import { formatSeconds } from "../common/format";
import { ProjectRoomModel } from "../project/project-room.model";
import { Clip, Project, Track } from "../../model/entities";
import { EntityId, ModelError, timeValueToMs, timeValueFromMs } from "../../model/types";
import { TransactionEngine, TransactionOutcome } from "../../model/transaction";
import {
  findClip,
  findTrack,
  clipEnd,
  splitClip,
  mergeClips,
  deleteClip,
  insertClip,
  getOrderedClips,
} from "../../model/transitions";

export interface TimelineRoomState {
  readonly hasProject: boolean;
  readonly playheadMs: number;
  readonly selection: readonly EntityId[];
  readonly clipboardCount: number;
  readonly clipboardMode: "copy" | "cut" | null;
  readonly activeTrackId: EntityId | null;
  readonly undoCount: number;
  readonly redoCount: number;
  readonly lastCommand: string | null;
}

const MODEL_MESSAGES: Record<ModelError, { en: string; ar: string }> = {
  [ModelError.ENTITY_NOT_FOUND]: { en: "Entity not found.", ar: "الكيان غير موجود." },
  [ModelError.MEDIA_ASSET_NOT_FOUND]: { en: "Media asset not found.", ar: "أصل الوسائط غير موجود." },
  [ModelError.TRACK_NOT_FOUND]: { en: "Track not found.", ar: "المسار غير موجود." },
  [ModelError.CLIP_NOT_FOUND]: { en: "Clip not found.", ar: "المقطع غير موجود." },
  [ModelError.TRACK_LOCKED]: { en: "Track is locked.", ar: "المسار مقفل." },
  [ModelError.CLIP_LOCKED]: { en: "Clip is locked.", ar: "المقطع مقفل." },
  [ModelError.CLIP_OVERLAP]: { en: "Clips cannot overlap.", ar: "لا يمكن تداخل المقاطع." },
  [ModelError.INCOMPATIBLE_MEDIA]: { en: "Clips come from different media.", ar: "المقطعان من مصدر مختلف." },
  [ModelError.INVALID_TIME]: { en: "Invalid time.", ar: "وقت غير صالح." },
  [ModelError.NEGATIVE_DURATION]: { en: "Negative duration.", ar: "مدة سالبة." },
  [ModelError.SPLIT_POINT_OUT_OF_BOUNDS]: { en: "Split point is outside the clip.", ar: "نقطة القص خارج حدود المقطع." },
  [ModelError.NOT_ADJACENT]: { en: "Clips are not adjacent.", ar: "المقطعان غير متجاورين." },
  [ModelError.INVALID_INPUT]: { en: "Invalid input.", ar: "مدخلات غير صالحة." },
  [ModelError.TRACK_NOT_EMPTY]: { en: "Track is not empty.", ar: "المسار غير فارغ." },
  [ModelError.TRANSITION_REQUIRED]: { en: "A transition is required.", ar: "يلزم وجود انتقال." },
  [ModelError.OPERATION_FAILED]: { en: "Operation failed.", ar: "فشلت العملية." },
};

export class TimelineRoomModel {
  private playheadMs: number = 0;
  private selection: EntityId[] = [];
  private clipboard: Clip[] = [];
  private clipboardMode: "copy" | "cut" | null = null;
  private activeTrackId: EntityId | null = null;
  private lastCommand: string | null = null;

  constructor(
    private readonly store: ProjectRoomModel,
    private readonly eventBus: EventBus,
    private readonly announcement: AnnouncementEngine,
    private readonly txn: TransactionEngine,
  ) {}

  getState(): TimelineRoomState {
    const project = this.store.getCurrentProject();
    return {
      hasProject: project !== null,
      playheadMs: this.playheadMs,
      selection: [...this.selection],
      clipboardCount: this.clipboard.length,
      clipboardMode: this.clipboardMode,
      activeTrackId: this.activeTrackId,
      undoCount: project === null ? 0 : this.txn.getUndoCount(project),
      redoCount: project === null ? 0 : this.txn.getRedoCount(project),
      lastCommand: this.lastCommand,
    };
  }

  getPlayheadMs(): number {
    return this.playheadMs;
  }

  getSelection(): readonly EntityId[] {
    return [...this.selection];
  }

  getClipboard(): readonly Clip[] {
    return this.clipboard.map(c => this.snapshotClip(c));
  }

  getActiveTrackId(): EntityId | null {
    return this.activeTrackId;
  }

  setPlayheadMs(ms: number): void {
    this.setPlayhead(ms);
  }

  movePlayheadBySeconds(delta: number): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    this.setPlayhead(this.playheadMs + delta * 1000);
    return { success: true, value: undefined };
  }

  movePlayheadByFrames(delta: number): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const fps = project.value.metadata.settings.frameRate;
    this.setPlayhead(this.playheadMs + (delta * 1000) / fps);
    return { success: true, value: undefined };
  }

  movePlayheadToStart(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    this.setPlayhead(0);
    return { success: true, value: undefined };
  }

  movePlayheadToEnd(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    this.setPlayhead(this.maxDurationMs(project.value));
    return { success: true, value: undefined };
  }

  movePlayheadToClipStart(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const focus = this.focusClip(project.value);
    if (focus === null) {
      this.announcement.speak(
        "لا يوجد مقطع محدد",
        "No clip is focused",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    this.setPlayhead(timeValueToMs(focus.timelineIn));
    return { success: true, value: undefined };
  }

  movePlayheadToClipEnd(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const focus = this.focusClip(project.value);
    if (focus === null) {
      this.announcement.speak(
        "لا يوجد مقطع محدد",
        "No clip is focused",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    this.setPlayhead(timeValueToMs(clipEnd(focus)));
    return { success: true, value: undefined };
  }

  moveActiveTrack(delta: number): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (project.value.tracks.length === 0) {
      this.announcement.speak(
        "لا توجد مسارات في المشروع",
        "The project has no tracks",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.TRACK_NOT_FOUND };
    }
    const tracks = project.value.tracks;
    const currentIndex = this.activeTrackId === null
      ? -1
      : tracks.findIndex(t => t.id === this.activeTrackId);
    const nextIndex = Math.max(0, Math.min(tracks.length - 1, (currentIndex < 0 ? 0 : currentIndex) + delta));
    const track = tracks[nextIndex]!;
    this.activeTrackId = track.id;
    this.lastCommand = "activeTrack";
    this.announcement.speak(
      `المسار النشط: ${track.name}`,
      `Active track: ${track.name}`,
      "all",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  selectCurrentClip(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const hit = this.clipUnderPlayhead(project.value);
    if (hit === null) {
      this.announcement.speak(
        "لا يوجد مقطع تحت المؤشر",
        "No clip under the playhead",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    this.selection = [hit.clip.id];
    this.activeTrackId = hit.track.id;
    this.lastCommand = "select";
    this.announcement.speak(
      `تم تحديد المقطع ${hit.clip.name}`,
      `Selected clip ${hit.clip.name}`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  selectNextClip(): Result<void, ErrorCode> {
    return this.selectAdjacentClip(1);
  }

  selectPreviousClip(): Result<void, ErrorCode> {
    return this.selectAdjacentClip(-1);
  }

  selectAll(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (project.value.clips.length === 0) {
      this.announcement.speak(
        "لا توجد مقاطع للتحديد",
        "There are no clips to select",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    this.selection = project.value.clips.map(c => c.id);
    this.lastCommand = "selectAll";
    this.announcement.speak(
      `تم تحديد ${this.selection.length} مقاطع`,
      `Selected ${this.selection.length} clips`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  deselectAll(): Result<void, ErrorCode> {
    this.selection = [];
    this.lastCommand = "deselect";
    this.announcement.speak(
      "تم إلغاء تحديد جميع المقاطع",
      "Deselected all clips",
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  splitClipAtPlayhead(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const hit = this.clipUnderPlayhead(project.value);
    if (hit === null) {
      this.announcement.speak(
        "لا يوجد مقطع تحت المؤشر للقص",
        "No clip under the playhead to split",
        "critical_only",
        "timeline",
      );
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    const splitPoint = { ticks: timeValueFromMs(this.playheadMs).ticks };
    const result = this.txn.run(project.value, "split", "timeline", s => splitClip(s, hit.clip.id, splitPoint));
    const committed = this.commit(result);
    if (!committed.success) return committed;
    this.selection = [];
    this.lastCommand = "split";
    this.announcement.speak(
      `تم قص المقطع ${hit.clip.name} عند ${formatSeconds(this.playheadMs)} ثانية`,
      `Split clip ${hit.clip.name} at ${formatSeconds(this.playheadMs)} seconds`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  mergeSelected(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.selection.length < 2) {
      this.announcement.speak(
        "حدد مقطعين متجاورين للدمج",
        "Select two adjacent clips to merge",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const clipIdA = this.selection[0]!;
    const clipIdB = this.selection[1]!;
    const result = this.txn.run(project.value, "merge", "timeline", s => mergeClips(s, clipIdA, clipIdB));
    const committed = this.commit(result);
    if (!committed.success) return committed;
    this.selection = [clipIdA];
    this.lastCommand = "merge";
    this.announcement.speak(
      "تم دمج المقطعين",
      "Merged the two clips",
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  duplicateSelected(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.selection.length === 0) {
      this.announcement.speak(
        "لا يوجد تحديد للتكرار",
        "Nothing selected to duplicate",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    let state = project.value;
    let duplicated = 0;
    for (const clipId of [...this.selection]) {
      const clip = findClip(state, clipId);
      if (clip === undefined) continue;
      const track = state.tracks.find(t => t.clips.includes(clipId));
      if (track === undefined) continue;
      const atEnd = { ticks: clipEnd(clip).ticks };
      const result = this.txn.run(state, "duplicate", "timeline", s =>
        insertClip(s, clip.sourceMediaId, track.id, atEnd, clip.inPoint, clip.outPoint));
      if (!result.success) {
        this.announceModelError(result.error);
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
      state = result.value.newState;
      duplicated++;
    }
    if (duplicated === 0) {
      this.announcement.speak(
        "تعذر تكرار المقاطع المحددة",
        "Could not duplicate the selected clips",
        "critical_only",
        "timeline",
      );
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const updated = this.store.updateProject(state);
    if (!updated.success) return updated;
    this.notifyChanged();
    this.lastCommand = "duplicate";
    this.announcement.speak(
      `تم تكرار ${duplicated} مقاطع`,
      `Duplicated ${duplicated} clips`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  cutSelection(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.selection.length === 0) {
      this.announcement.speak(
        "لا يوجد تحديد للقص",
        "Nothing selected to cut",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const snapshots = this.selection
      .map(id => findClip(project.value, id))
      .filter((c): c is Clip => c !== undefined)
      .map(c => this.snapshotClip(c));
    if (snapshots.length === 0) {
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    let state = project.value;
    for (const clipId of [...this.selection]) {
      const result = this.txn.run(state, "cut", "timeline", s => deleteClip(s, clipId));
      if (!result.success) {
        this.announceModelError(result.error);
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
      state = result.value.newState;
    }
    const updated = this.store.updateProject(state);
    if (!updated.success) return updated;
    this.notifyChanged();
    this.clipboard = snapshots;
    this.clipboardMode = "cut";
    this.selection = [];
    this.lastCommand = "cut";
    this.announcement.speak(
      `تم قص ${this.clipboard.length} مقاطع. الحافظة تحتوي على ${this.clipboard.length} مقطع`,
      `Cut ${this.clipboard.length} clips. Clipboard contains ${this.clipboard.length} clips.`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  copySelection(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.selection.length === 0) {
      this.announcement.speak(
        "لا يوجد تحديد للنسخ",
        "Nothing selected to copy",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const snapshots = this.selection
      .map(id => findClip(project.value, id))
      .filter((c): c is Clip => c !== undefined)
      .map(c => this.snapshotClip(c));
    if (snapshots.length === 0) {
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    this.clipboard = snapshots;
    this.clipboardMode = "copy";
    this.lastCommand = "copy";
    this.announcement.speak(
      `تم نسخ ${this.clipboard.length} مقاطع. الحافظة تحتوي على ${this.clipboard.length} مقطع`,
      `Copied ${this.clipboard.length} clips. Clipboard contains ${this.clipboard.length} clips.`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  pasteClipboard(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.clipboard.length === 0 || this.clipboardMode === null) {
      this.announcement.speak(
        "الحافظة فارغة",
        "The clipboard is empty",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const track = this.targetTrack(project.value);
    if (track === null) {
      this.announcement.speak(
        "لا يوجد مسار للصق",
        "There is no track to paste into",
        "critical_only",
        "timeline",
      );
      return { success: false, error: ErrorCode.TRACK_NOT_FOUND };
    }
    let state = project.value;
    let pasted = 0;
    for (const clip of this.clipboard) {
      const tlIn = { ticks: timeValueFromMs(this.playheadMs).ticks };
      const result = this.txn.run(state, "paste", "timeline", s =>
        insertClip(s, clip.sourceMediaId, track.id, tlIn, clip.inPoint, clip.outPoint));
      if (!result.success) {
        this.announceModelError(result.error);
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
      state = result.value.newState;
      pasted++;
    }
    if (pasted === 0) {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const updated = this.store.updateProject(state);
    if (!updated.success) return updated;
    this.notifyChanged();
    if (this.clipboardMode === "cut") {
      this.clipboard = [];
      this.clipboardMode = null;
    }
    this.lastCommand = "paste";
    this.announcement.speak(
      `تم لصق ${pasted} مقاطع`,
      `Pasted ${pasted} clips`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  deleteSelection(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    if (this.selection.length === 0) {
      this.announcement.speak(
        "لا يوجد تحديد للحذف",
        "Nothing selected to delete",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    let state = project.value;
    let deleted = 0;
    for (const clipId of [...this.selection]) {
      const result = this.txn.run(state, "delete", "timeline", s => deleteClip(s, clipId));
      if (!result.success) {
        this.announceModelError(result.error);
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
      state = result.value.newState;
      deleted++;
    }
    if (deleted === 0) {
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    const updated = this.store.updateProject(state);
    if (!updated.success) return updated;
    this.notifyChanged();
    this.selection = [];
    this.lastCommand = "delete";
    this.announcement.speak(
      `تم حذف ${deleted} مقاطع`,
      `Deleted ${deleted} clips`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  undo(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const result = this.txn.undo(project.value);
    if (!result.success) {
      this.announcement.speak(
        "لا يوجد شيء للتراجع عنه",
        "Nothing to undo",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.NOTHING_TO_UNDO };
    }
    const updated = this.store.updateProject(result.value.newState);
    if (!updated.success) return updated;
    this.notifyChanged();
    this.lastCommand = "undo";
    this.announcement.speak(
      "تم التراجع عن آخر عملية",
      "Undid the last operation",
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  redo(): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const result = this.txn.redo(project.value);
    if (!result.success) {
      this.announcement.speak(
        "لا يوجد شيء لإعادته",
        "Nothing to redo",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.NOTHING_TO_REDO };
    }
    const updated = this.store.updateProject(result.value.newState);
    if (!updated.success) return updated;
    this.notifyChanged();
    this.lastCommand = "redo";
    this.announcement.speak(
      "تمت إعادة آخر عملية",
      "Redid the last operation",
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  refreshFromProject(): void {
    const project = this.store.getCurrentProject();
    if (project === null) {
      this.activeTrackId = null;
      this.selection = [];
      this.clipboard = [];
      this.clipboardMode = null;
      this.playheadMs = 0;
      return;
    }
    const max = this.maxDurationMs(project);
    this.playheadMs = Math.min(this.playheadMs, max);
    if (this.activeTrackId !== null && !project.tracks.some(t => t.id === this.activeTrackId)) {
      this.activeTrackId = project.tracks[0]?.id ?? null;
    }
    this.selection = this.selection.filter(id => findClip(project, id) !== undefined);
  }

  getElementsData(): readonly TimelineTreeElement[] {
    const project = this.store.getCurrentProject();
    if (project === null) return [];
    return project.tracks.map(track => {
      const clips = getOrderedClips(project, track.id);
      return {
        trackId: track.id,
        trackName: track.name,
        trackType: track.trackType,
        isActive: this.activeTrackId === track.id,
        clipCount: clips.length,
        clips: clips.map(clip => ({
          clipId: clip.id,
          name: clip.name,
          startMs: timeValueToMs(clip.timelineIn),
          endMs: timeValueToMs(clipEnd(clip)),
          isSelected: this.selection.includes(clip.id),
          isUnderPlayhead: this.playheadMs >= timeValueToMs(clip.timelineIn)
            && this.playheadMs < timeValueToMs(clipEnd(clip)),
        })),
      };
    });
  }

  private projectOrFail(): Result<Project, ErrorCode> {
    const project = this.store.getCurrentProject();
    if (project === null) {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    return { success: true, value: project };
  }

  private commit(outcome: Result<TransactionOutcome, ModelError>): Result<void, ErrorCode> {
    if (!outcome.success) {
      this.announceModelError(outcome.error);
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const updated = this.store.updateProject(outcome.value.newState);
    if (!updated.success) return updated;
    this.notifyChanged();
    return { success: true, value: undefined };
  }

  private announceModelError(error: ModelError): void {
    const message = MODEL_MESSAGES[error] ?? MODEL_MESSAGES[ModelError.OPERATION_FAILED];
    this.announcement.speak(message.ar, message.en, "critical_only", "timeline");
  }

  private notifyChanged(): void {
    this.eventBus.emit(AppEvent.TIMELINE_CHANGED, { roomId: "timeline" });
  }

  private setPlayhead(ms: number): void {
    const project = this.store.getCurrentProject();
    const max = project === null ? 0 : this.maxDurationMs(project);
    this.playheadMs = Math.max(0, Math.min(ms, max));
    this.lastCommand = "playhead";
    this.announcement.speak(
      `المؤشر عند ${formatSeconds(this.playheadMs)} ثانية`,
      `Playhead at ${formatSeconds(this.playheadMs)} seconds`,
      "all",
      "timeline",
    );
  }

  private maxDurationMs(project: Project): number {
    let max = 0;
    for (const clip of project.clips) {
      const endMs = timeValueToMs(clipEnd(clip));
      if (endMs > max) max = endMs;
    }
    return max;
  }

  private targetTrack(project: Project): Track | null {
    if (this.activeTrackId !== null) {
      const active = findTrack(project, this.activeTrackId);
      if (active !== undefined) return active;
    }
    return project.tracks[0] ?? null;
  }

  private focusClip(project: Project): Clip | null {
    if (this.selection.length > 0) {
      const selected = findClip(project, this.selection[0]!);
      if (selected !== undefined) return selected;
    }
    return this.clipUnderPlayhead(project)?.clip ?? null;
  }

  private clipUnderPlayhead(project: Project): { clip: Clip; track: Track } | null {
    const tracks = this.activeTrackId !== null
      ? project.tracks.filter(t => t.id === this.activeTrackId)
      : project.tracks;
    for (const track of tracks) {
      for (const clip of getOrderedClips(project, track.id)) {
        const startMs = timeValueToMs(clip.timelineIn);
        const endMs = timeValueToMs(clipEnd(clip));
        if (this.playheadMs >= startMs && this.playheadMs < endMs) {
          return { clip, track };
        }
      }
    }
    return null;
  }

  private selectAdjacentClip(delta: number): Result<void, ErrorCode> {
    const project = this.projectOrFail();
    if (!project.success) return project;
    const track = this.targetTrack(project.value);
    if (track === null) {
      this.announcement.speak(
        "لا توجد مسارات في المشروع",
        "The project has no tracks",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.TRACK_NOT_FOUND };
    }
    const clips = getOrderedClips(project.value, track.id);
    if (clips.length === 0) {
      this.announcement.speak(
        "لا توجد مقاطع على المسار",
        "The track has no clips",
        "important",
        "timeline",
      );
      return { success: false, error: ErrorCode.CLIP_NOT_FOUND };
    }
    const selectedId = this.selection.length > 0 ? this.selection[0] : null;
    const currentIndex = selectedId === null
      ? -1
      : clips.findIndex(c => c.id === selectedId);
    let nextIndex: number;
    if (currentIndex < 0) {
      nextIndex = delta >= 0 ? 0 : clips.length - 1;
    } else {
      nextIndex = Math.max(0, Math.min(clips.length - 1, currentIndex + delta));
    }
    const clip = clips[nextIndex]!;
    this.selection = [clip.id];
    this.activeTrackId = track.id;
    this.playheadMs = timeValueToMs(clip.timelineIn);
    this.lastCommand = delta >= 0 ? "nextClip" : "previousClip";
    this.announcement.speak(
      `المقطع ${clip.name}، يبدأ عند ${formatSeconds(timeValueToMs(clip.timelineIn))} ثانية`,
      `Clip ${clip.name}, starts at ${formatSeconds(timeValueToMs(clip.timelineIn))} seconds`,
      "important",
      "timeline",
    );
    return { success: true, value: undefined };
  }

  private snapshotClip(clip: Clip): Clip {
    return {
      ...clip,
      inPoint: { ticks: clip.inPoint.ticks },
      outPoint: { ticks: clip.outPoint.ticks },
      timelineIn: { ticks: clip.timelineIn.ticks },
      duration: { ticks: clip.duration.ticks },
      effects: [...clip.effects],
    };
  }
}

export interface TimelineTreeElement {
  readonly trackId: EntityId;
  readonly trackName: string;
  readonly trackType: Track["trackType"];
  readonly isActive: boolean;
  readonly clipCount: number;
  readonly clips: readonly {
    readonly clipId: EntityId;
    readonly name: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly isSelected: boolean;
    readonly isUnderPlayhead: boolean;
  }[];
}
