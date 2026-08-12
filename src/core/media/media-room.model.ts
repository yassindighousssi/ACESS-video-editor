import { createHash } from "crypto";
import { Result, ErrorCode } from "../infrastructure/common/types";
import { IFileEngine } from "../infrastructure/engines/file/file-engine.interface";
import { EventBus, AppEvent } from "../rooms/common/event-bus";
import { AnnouncementEngine } from "../rooms/common/announcement-engine";
import { ProjectRoomModel } from "../rooms/project/project-room.model";
import { MediaAsset, Project } from "../model/entities";
import { EntityId, entityId, timeValueToMs } from "../model/types";
import { TransactionEngine } from "../model/transaction";
import { importMedia as importMediaTransition, TransitionResult } from "../model/transitions";
import { IMediaEngine } from "./media-engine.interface";

export interface MediaStats {
  readonly count: number;
  readonly videoCount: number;
  readonly audioCount: number;
  readonly imageCount: number;
  readonly totalDurationMs: number;
}

export interface MediaRoomState {
  readonly hasProject: boolean;
  readonly mediaCount: number;
  readonly media: readonly MediaAsset[];
  readonly lastOperation: string | null;
}

function hashBytes(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export class MediaRoomModel {
  private lastOperation: string | null = null;

  constructor(
    private readonly store: ProjectRoomModel,
    private readonly file: IFileEngine,
    private readonly mediaEngine: IMediaEngine,
    private readonly eventBus: EventBus,
    private readonly announcement: AnnouncementEngine,
    private readonly txn: TransactionEngine,
  ) {}

  getState(): MediaRoomState {
    const project = this.store.getCurrentProject();
    return {
      hasProject: project !== null,
      mediaCount: project?.media.length ?? 0,
      media: project?.media ?? [],
      lastOperation: this.lastOperation,
    };
  }

  getProject(): Project | null {
    return this.store.getCurrentProject();
  }

  listMedia(): readonly MediaAsset[] {
    return this.store.getCurrentProject()?.media ?? [];
  }

  getMedia(mediaId: EntityId): MediaAsset | undefined {
    return this.store.getCurrentProject()?.media.find(m => m.id === mediaId);
  }

  getStats(): MediaStats {
    const media = this.listMedia();
    let totalDurationMs = 0;
    let videoCount = 0;
    let audioCount = 0;
    let imageCount = 0;
    for (const asset of media) {
      totalDurationMs += timeValueToMs(asset.duration);
      if (asset.mediaType === "video") videoCount++;
      else if (asset.mediaType === "audio") audioCount++;
      else imageCount++;
    }
    return { count: media.length, videoCount, audioCount, imageCount, totalDurationMs };
  }

  async importMedia(path: string): Promise<Result<MediaAsset, ErrorCode>> {
    const project = this.store.getCurrentProject();
    if (project === null) {
      this.announcement.speak(
        "لا يوجد مشروع مفتوح لاستيراد الوسائط",
        "No project is open to import media.",
        "critical_only",
        "media",
      );
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    if (path.trim().length === 0) {
      this.announcement.speak("مسار الملف غير صالح", "Invalid file path.", "critical_only", "media");
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const read = await this.file.read(path);
    if (!read.success) {
      this.announcement.speak("فشل قراءة الملف", "Failed to read the file.", "critical_only", "media");
      return read;
    }
    const probe = this.mediaEngine.probeBytes(read.value);
    if (!probe.success) {
      this.announcement.speak("فشل استيراد الوسائط", "Media import failed.", "critical_only", "media");
      return probe;
    }
    const sourceHash = hashBytes(read.value);
    const mediaId = entityId();
    const outcome = this.txn.run(project, "import-media", "media", state =>
      importMediaTransition(state, path, probe.value.mediaType, probe.value.durationMs, sourceHash, mediaId),
    );
    if (!outcome.success) {
      this.announcement.speak("فشل استيراد الوسائط", "Media import failed.", "critical_only", "media");
      return { success: false, error: ErrorCode.MEDIA_IMPORT_FAILED };
    }
    const updated = this.store.updateProject(outcome.value.newState);
    if (!updated.success) return updated;
    const asset = this.getMedia(mediaId);
    if (asset === undefined) return { success: false, error: ErrorCode.OPERATION_FAILED };
    this.lastOperation = "import";
    this.announcement.speak(
      `تم استيراد ${probe.value.mediaType} من ${path}`,
      `Imported ${probe.value.mediaType} from ${path}`,
      "important",
      "media",
    );
    this.eventBus.emit(AppEvent.MEDIA_IMPORTED, {
      mediaId,
      path,
      mediaType: probe.value.mediaType,
      durationMs: probe.value.durationMs,
    });
    return { success: true, value: asset };
  }

  async removeMedia(mediaId: EntityId): Promise<Result<void, ErrorCode>> {
    const project = this.store.getCurrentProject();
    if (project === null) {
      this.announcement.speak(
        "لا يوجد مشروع مفتوح لإزالة الوسائط",
        "No project is open to remove media.",
        "critical_only",
        "media",
      );
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const asset = project.media.find(m => m.id === mediaId);
    if (asset === undefined) {
      this.announcement.speak("أصل الوسائط غير موجود", "Media asset not found.", "critical_only", "media");
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    if (project.clips.some(c => c.sourceMediaId === mediaId)) {
      this.announcement.speak(
        "لا يمكن إزالة الوسائط لأنها قيد الاستخدام بمقاطع",
        "Cannot remove media because it is in use by clips.",
        "critical_only",
        "media",
      );
      return { success: false, error: ErrorCode.MEDIA_IN_USE };
    }
    const removeTransition: TransitionResult = {
      success: true,
      value: {
        newState: { ...project, media: project.media.filter(m => m.id !== mediaId) },
        inverse: {
          type: "importMedia",
          payload: {
            filePath: asset.sourcePath,
            mediaType: asset.mediaType,
            durationMs: timeValueToMs(asset.duration),
            sourceHash: asset.sourceHash,
            mediaAssetId: asset.id,
          },
        },
        forward: { type: "removeMedia", payload: { mediaAssetId: mediaId } },
      },
    };
    const outcome = this.txn.run(project, "remove-media", "media", () => removeTransition);
    if (!outcome.success) {
      this.announcement.speak("فشلت إزالة الوسائط", "Failed to remove media.", "critical_only", "media");
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const updated = this.store.updateProject(outcome.value.newState);
    if (!updated.success) return updated;
    this.lastOperation = "remove";
    this.announcement.speak("تمت إزالة الوسائط", "Media removed.", "important", "media");
    this.eventBus.emit(AppEvent.MEDIA_REMOVED, { mediaId });
    return { success: true, value: undefined };
  }
}
