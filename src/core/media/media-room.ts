import { basename } from "path";
import { RoomId, ROOM_NAMES_AR, ROOM_NAMES_EN } from "../rooms/common/room-types";
import { IRoom, RoomElement } from "../rooms/common/room-interface";
import type { RoomContext } from "../rooms/common/room-context";
import { AppEvent } from "../rooms/common/event-bus";
import { formatDuration, formatSeconds } from "../rooms/common/format";
import { timeValueToMs } from "../model/types";
import { MediaRoomModel } from "./media-room.model";

type Unsubscribe = () => void;

export class MediaRoom implements IRoom {
  readonly id: RoomId = "media";
  readonly nameAr: string = ROOM_NAMES_AR.media;
  readonly nameEn: string = ROOM_NAMES_EN.media;

  private mediaUnsubscribe: Unsubscribe | null = null;

  constructor(private readonly model: MediaRoomModel) {}

  onEnter(context: RoomContext): void {
    const project = this.model.getProject();
    if (project === null) {
      context.announcement.speak(
        "دخول إلى غرفة الوسائط. لا يوجد مشروع مفتوح.",
        "Entered Media Room. No project is open.",
        "important",
        "media",
      );
    } else {
      const stats = this.model.getStats();
      context.announcement.speak(
        `دخول إلى غرفة الوسائط. يحتوي المشروع على ${stats.count} من أصول الوسائط، منها ${stats.videoCount} فيديو و ${stats.audioCount} صوت. المدة الإجمالية ${formatDuration(stats.totalDurationMs)}.`,
        `Entered Media Room. The project has ${stats.count} media assets, including ${stats.videoCount} videos and ${stats.audioCount} audio. Total duration ${formatDuration(stats.totalDurationMs)}.`,
        "important",
        "media",
      );
    }
    this.mediaUnsubscribe = context.eventBus.on(AppEvent.MEDIA_IMPORTED, () => {
      const stats = this.model.getStats();
      context.announcement.speak(
        `تم استيراد وسائط جديدة. أصبح العدد ${stats.count}.`,
        `New media imported. The library now has ${stats.count} assets.`,
        "important",
        "media",
      );
    });
  }

  onExit(_context: RoomContext): void {
    this.mediaUnsubscribe?.();
    this.mediaUnsubscribe = null;
  }

  getElements(): readonly RoomElement[] {
    const media = this.model.listMedia();
    if (media.length === 0) {
      return [
        {
          id: "media-empty",
          type: "status",
          labelAr: "لا توجد وسائط مستوردة. استخدم Ctrl+I لاستيراد ملف.",
          labelEn: "No media imported yet. Press Ctrl+I to import a file.",
          focusable: false,
        },
      ];
    }
    const elements: RoomElement[] = media.map((asset, index) => ({
      id: `media-item-${asset.id}`,
      type: "listitem",
      labelAr: `${index + 1}. ${basename(asset.sourcePath)}، ${asset.mediaType === "video" ? "فيديو" : asset.mediaType === "audio" ? "صوت" : "صورة"}، المدة ${formatSeconds(timeValueToMs(asset.duration))} ثانية`,
      labelEn: `${index + 1}. ${basename(asset.sourcePath)}, ${asset.mediaType}, ${formatSeconds(timeValueToMs(asset.duration))} seconds`,
      focusable: true,
    }));
    elements.push({
      id: "media-stats",
      type: "status",
      labelAr: `إجمالي الوسائط: ${media.length}`,
      labelEn: `Total media: ${media.length}`,
      focusable: false,
    });
    return elements;
  }
}
