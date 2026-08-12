import { RoomId } from "../common/room-types";
import { ROOM_NAMES_AR, ROOM_NAMES_EN } from "../common/room-types";
import { IRoom, RoomElement } from "../common/room-interface";
import type { RoomContext } from "../common/room-context";
import { formatSeconds } from "../common/format";
import { TimelineRoomModel } from "./timeline-room.model";

export class TimelineRoom implements IRoom {
  readonly id: RoomId = "timeline";
  readonly nameAr: string = ROOM_NAMES_AR.timeline;
  readonly nameEn: string = ROOM_NAMES_EN.timeline;

  constructor(private readonly model: TimelineRoomModel) {}

  onEnter(context: RoomContext): void {
    this.model.refreshFromProject();
    const state = this.model.getState();
    if (!state.hasProject) {
      context.announcement.speak(
        "دخول إلى غرفة المخطط الزمني. لا يوجد مشروع مفتوح.",
        "Entered Timeline Room. No project is open.",
        "important",
        "timeline",
      );
      return;
    }
    const tree = this.model.getElementsData();
    const firstTrack = tree[0];
    const trackSummaryAr = firstTrack === undefined
      ? "لا توجد مسارات"
      : `المسار ${firstTrack.trackName} يحتوي على ${firstTrack.clipCount} مقاطع`;
    const trackSummaryEn = firstTrack === undefined
      ? "No tracks"
      : `Track ${firstTrack.trackName} has ${firstTrack.clipCount} clips`;
    context.announcement.speak(
      `دخول إلى غرفة المخطط الزمني. ${trackSummaryAr}. المؤشر عند ${formatSeconds(state.playheadMs)} ثانية.`,
      `Entered Timeline Room. ${trackSummaryEn}. Playhead at ${formatSeconds(state.playheadMs)} seconds.`,
      "important",
      "timeline",
    );
  }

  onExit(_context: RoomContext): void {
    // Timeline state is kept in the model across room switches.
  }

  getElements(): readonly RoomElement[] {
    const state = this.model.getState();
    const elements: RoomElement[] = [
      {
        id: "timeline-playhead",
        type: "status",
        labelAr: `المؤشر عند ${formatSeconds(state.playheadMs)} ثانية`,
        labelEn: `Playhead at ${formatSeconds(state.playheadMs)} seconds`,
        focusable: false,
      },
      {
        id: "timeline-selection",
        type: "status",
        labelAr: `التحديد: ${state.selection.length} مقطع`,
        labelEn: `Selection: ${state.selection.length} clips`,
        focusable: false,
      },
      {
        id: "timeline-clipboard",
        type: "status",
        labelAr: `الحافظة: ${state.clipboardCount} مقطع`,
        labelEn: `Clipboard: ${state.clipboardCount} clips`,
        focusable: false,
      },
    ];
    for (const track of this.model.getElementsData()) {
      elements.push({
        id: `track-${track.trackId}`,
        type: "button",
        labelAr: `المسار ${track.trackName}${track.isActive ? " (نشط)" : ""}، ${track.clipCount} مقاطع`,
        labelEn: `Track ${track.trackName}${track.isActive ? " (active)" : ""}, ${track.clipCount} clips`,
        focusable: true,
        action: "Up/Down arrows",
      });
      for (const clip of track.clips) {
        elements.push({
          id: `clip-${clip.clipId}`,
          type: "status",
          labelAr: `${clip.name}، من ${formatSeconds(clip.startMs)} إلى ${formatSeconds(clip.endMs)} ثانية${clip.isSelected ? "، محدد" : ""}`,
          labelEn: `${clip.name}, from ${formatSeconds(clip.startMs)} to ${formatSeconds(clip.endMs)} seconds${clip.isSelected ? ", selected" : ""}`,
          focusable: true,
        });
      }
    }
    return elements;
  }
}
