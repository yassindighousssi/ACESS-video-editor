import { RoomId } from "../common/room-types";
import { ROOM_NAMES_AR, ROOM_NAMES_EN } from "../common/room-types";
import { IRoom, RoomElement } from "../common/room-interface";
import type { RoomContext } from "../common/room-context";
import { AppEvent } from "../common/event-bus";
import { formatDuration } from "../common/format";
import { ProjectRoomModel } from "./project-room.model";

type Unsubscribe = () => void;

export class ProjectRoom implements IRoom {
  readonly id: RoomId = "project";
  readonly nameAr: string = ROOM_NAMES_AR.project;
  readonly nameEn: string = ROOM_NAMES_EN.project;

  private mediaUnsubscribe: Unsubscribe | null = null;

  constructor(private readonly model: ProjectRoomModel) {}

  onEnter(context: RoomContext): void {
    const project = this.model.getCurrentProject();
    if (project === null) {
      context.announcement.speak(
        "دخول إلى غرفة المشروع. لا يوجد مشروع مفتوح. اضغط كنترول شفت ن لإنشاء مشروع جديد.",
        "Entered Project Room. No project is open. Press Ctrl+Shift+N to create a new project.",
        "important",
        "project",
      );
    } else {
      const stats = this.model.getStats(project);
      context.announcement.speak(
        `دخول إلى غرفة المشروع. المشروع الحالي: ${project.metadata.name}. ${stats.trackCount} مسار و ${stats.clipCount} مقطع. المدة ${formatDuration(stats.durationMs)}.`,
        `Entered Project Room. Current project: ${project.metadata.name}. ${stats.trackCount} tracks and ${stats.clipCount} clips. Duration ${formatDuration(stats.durationMs)}.`,
        "important",
        "project",
      );
    }
    this.mediaUnsubscribe = context.eventBus.on(AppEvent.MEDIA_IMPORTED, () => {
      const current = this.model.getCurrentProject();
      if (current === null) return;
      context.announcement.speak(
        `تم تحديث المشروع. يحتوي الآن على ${current.clips.length} مقطع.`,
        `Project updated. It now contains ${current.clips.length} clips.`,
        "important",
        "project",
      );
    });
  }

  onExit(_context: RoomContext): void {
    this.mediaUnsubscribe?.();
    this.mediaUnsubscribe = null;
  }

  getElements(): readonly RoomElement[] {
    const project = this.model.getCurrentProject();
    const stats = project === null ? null : this.model.getStats(project);
    const elements: RoomElement[] = [
      {
        id: "project-new",
        type: "button",
        labelAr: "مشروع جديد",
        labelEn: "New project",
        focusable: true,
        action: "Ctrl+Shift+N",
      },
      {
        id: "project-open",
        type: "button",
        labelAr: "فتح مشروع",
        labelEn: "Open project",
        focusable: true,
        action: "Ctrl+O",
      },
      {
        id: "project-save",
        type: "button",
        labelAr: "حفظ",
        labelEn: "Save",
        focusable: true,
        action: "Ctrl+S",
      },
      {
        id: "project-save-as",
        type: "button",
        labelAr: "حفظ باسم",
        labelEn: "Save as",
        focusable: true,
        action: "Ctrl+Shift+S",
      },
      {
        id: "project-export",
        type: "button",
        labelAr: "تصدير",
        labelEn: "Export",
        focusable: true,
        action: "Ctrl+E",
      },
    ];
    if (stats !== null) {
      elements.push({
        id: "project-stats",
        type: "status",
        labelAr: `مقاطع: ${stats.clipCount}، مسارات: ${stats.trackCount}، وسائط: ${stats.mediaCount}، المدة: ${formatDuration(stats.durationMs)}`,
        labelEn: `Clips: ${stats.clipCount}, tracks: ${stats.trackCount}, media: ${stats.mediaCount}, duration: ${formatDuration(stats.durationMs)}`,
        focusable: false,
      });
    }
    return elements;
  }
}
