import type { RoomContext } from "../../core/rooms/common/room-context";
import type { ProjectRoom } from "../../core/rooms/project/project-room";
import { RoomPanel } from "../components/room-panel";

export interface ProjectRoomViewProps {
  readonly room: ProjectRoom;
  readonly context: RoomContext;
}

export function ProjectRoomView(props: ProjectRoomViewProps) {
  return (
    <RoomPanel
      titleAr={props.room.nameAr}
      titleEn={props.room.nameEn}
      elements={props.room.getElements()}
      announcement={props.context.announcement.getLast()}
    />
  );
}
