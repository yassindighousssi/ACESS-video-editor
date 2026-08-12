import type { RoomContext } from "../../core/rooms/common/room-context";
import type { TimelineRoom } from "../../core/rooms/timeline/timeline-room";
import { RoomPanel } from "../components/room-panel";

export interface TimelineRoomViewProps {
  readonly room: TimelineRoom;
  readonly context: RoomContext;
}

export function TimelineRoomView(props: TimelineRoomViewProps) {
  return (
    <RoomPanel
      titleAr={props.room.nameAr}
      titleEn={props.room.nameEn}
      elements={props.room.getElements()}
      announcement={props.context.announcement.getLast()}
    />
  );
}
