import { Result, ErrorCode } from "../../infrastructure/common/types";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";
import { EventBus, AppEvent } from "../common/event-bus";
import { AnnouncementEngine } from "../common/announcement-engine";
import { SettingsEngine } from "../common/settings-engine";
import { Project } from "../../model/entities";
import { createProject } from "../../model/factory";
import { projectId, ProjectId, timeValueToMs, timeValueAdd } from "../../model/types";
import { serializeProjectToBytes, deserializeProjectFromBytes } from "../../model/project-file";

export interface RecentProject {
  readonly path: string;
  readonly name: string;
  readonly openedAt: number;
}

export interface ProjectStats {
  readonly name: string;
  readonly mediaCount: number;
  readonly trackCount: number;
  readonly clipCount: number;
  readonly effectCount: number;
  readonly markersCount: number;
  readonly durationMs: number;
  readonly savedPath: string | null;
}

export interface ProjectRoomState {
  readonly currentProject: Project | null;
  readonly currentProjectPath: string | null;
  readonly isDirty: boolean;
  readonly recentProjects: readonly RecentProject[];
  readonly lastOperation: string | null;
}

export class ProjectRoomModel {
  private current: Project | null = null;
  private currentPath: string | null = null;
  private dirty: boolean = false;
  private recent: RecentProject[] = [];
  private lastOperation: string | null = null;

  constructor(
    private readonly file: IFileEngine,
    private readonly eventBus: EventBus,
    private readonly announcement: AnnouncementEngine,
    private readonly settings: SettingsEngine,
    private readonly recentLimit: number = 5,
  ) {}

  getState(): ProjectRoomState {
    return {
      currentProject: this.current,
      currentProjectPath: this.currentPath,
      isDirty: this.dirty,
      recentProjects: [...this.recent],
      lastOperation: this.lastOperation,
    };
  }

  getCurrentProject(): Project | null {
    return this.current;
  }

  getCurrentProjectPath(): string | null {
    return this.currentPath;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  updateProject(project: Project, path?: string | null): Result<void, ErrorCode> {
    if (this.current === null || this.current.id !== project.id) {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    this.current = project;
    if (path !== undefined) this.currentPath = path;
    this.dirty = true;
    this.lastOperation = "update";
    return { success: true, value: undefined };
  }

  createProject(name: string): Result<Project, ErrorCode> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const project = createProject(trimmed, projectId());
    this.current = project;
    this.currentPath = null;
    this.dirty = true;
    this.lastOperation = "create";
    this.announcement.speak(
      `تم إنشاء مشروع جديد باسم ${trimmed}`,
      `Created new project "${trimmed}"`,
      "important",
      "project",
    );
    this.eventBus.emit(AppEvent.PROJECT_CREATED, { projectId: project.id, name: trimmed });
    return { success: true, value: project };
  }

  async loadProject(path: string): Promise<Result<Project, ErrorCode>> {
    const read = await this.file.read(path);
    if (!read.success) return read;
    const parsed = deserializeProjectFromBytes(read.value);
    if (!parsed.success) return parsed;
    this.current = parsed.value;
    this.currentPath = path;
    this.dirty = false;
    this.lastOperation = "open";
    this.pushRecent(path, parsed.value.metadata.name);
    this.announcement.speak(
      `تم فتح المشروع ${parsed.value.metadata.name}`,
      `Opened project "${parsed.value.metadata.name}"`,
      "important",
      "project",
    );
    this.eventBus.emit(AppEvent.PROJECT_OPENED, {
      projectId: parsed.value.id,
      path,
      name: parsed.value.metadata.name,
    });
    return parsed;
  }

  async saveProject(path?: string): Promise<Result<string, ErrorCode>> {
    if (this.current === null) {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const target = path ?? this.currentPath;
    if (target === null) {
      return { success: false, error: ErrorCode.INVALID_PATH };
    }
    const bytes = serializeProjectToBytes(this.current);
    if (!bytes.success) return bytes;
    const write = await this.file.write(target, bytes.value);
    if (!write.success) return write;
    this.currentPath = target;
    this.dirty = false;
    this.lastOperation = "save";
    this.pushRecent(target, this.current.metadata.name);
    this.announcement.speak("تم حفظ المشروع", "Project saved", "important", "project");
    this.eventBus.emit(AppEvent.PROJECT_SAVED, { projectId: this.current.id, path: target });
    return { success: true, value: target };
  }

  async exportProject(path: string): Promise<Result<string, ErrorCode>> {
    if (this.current === null) {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const stats = this.getStats(this.current);
    if (stats.trackCount === 0 || stats.clipCount === 0) {
      this.announcement.speak(
        "لا يمكن التصدير: لا توجد مسارات فيديو في المشروع",
        "Cannot export: the project has no video tracks",
        "critical_only",
        "project",
      );
      return { success: false, error: ErrorCode.NO_VIDEO_TRACKS };
    }
    const manifest = {
      format: "tempo-export",
      version: 1,
      projectId: this.current.id,
      name: stats.name,
      stats,
      exportedAt: new Date().toISOString(),
    };
    const encoded = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
    const write = await this.file.write(path, encoded);
    if (!write.success) return write;
    this.lastOperation = "export";
    this.announcement.speak(
      `تم تصدير المشروع إلى ${path}`,
      `Project exported to ${path}`,
      "important",
      "project",
    );
    this.eventBus.emit(AppEvent.PROJECT_EXPORTED, { projectId: this.current.id, path });
    return { success: true, value: path };
  }

  async restoreBackup(path: string): Promise<Result<Project, ErrorCode>> {
    const read = await this.file.read(path);
    if (!read.success) return read;
    const parsed = deserializeProjectFromBytes(read.value);
    if (!parsed.success) return parsed;
    this.current = parsed.value;
    this.currentPath = path;
    this.dirty = true;
    this.lastOperation = "restore";
    this.announcement.speak(
      `تم استعادة النسخة الاحتياطية ${parsed.value.metadata.name}`,
      `Restored backup "${parsed.value.metadata.name}"`,
      "important",
      "project",
    );
    return parsed;
  }

  closeProject(): void {
    this.current = null;
    this.currentPath = null;
    this.dirty = false;
    this.lastOperation = "close";
    this.announcement.speak("تم إغلاق المشروع", "Project closed", "important", "project");
    this.eventBus.emit(AppEvent.PROJECT_CLOSED, {});
  }

  getRecentProjects(): readonly RecentProject[] {
    return [...this.recent];
  }

  getStats(project: Project): ProjectStats {
    let longestEndMs = 0;
    for (const track of project.tracks) {
      for (const clipId of track.clips) {
        const clip = project.clips.find(c => c.id === clipId);
        if (clip === undefined) continue;
        const endMs = timeValueToMs(timeValueAdd(clip.timelineIn, clip.duration));
        if (endMs > longestEndMs) longestEndMs = endMs;
      }
    }
    return {
      name: project.metadata.name,
      mediaCount: project.media.length,
      trackCount: project.tracks.length,
      clipCount: project.clips.length,
      effectCount: project.clips.reduce((total, clip) => total + clip.effects.length, 0),
      markersCount: project.markers.length,
      durationMs: longestEndMs,
      savedPath: this.currentPath,
    };
  }

  private pushRecent(path: string, name: string): void {
    this.recent = [
      { path, name, openedAt: Date.now() },
      ...this.recent.filter(r => r.path !== path),
    ].slice(0, this.recentLimit);
  }
}

export type { ProjectId };
