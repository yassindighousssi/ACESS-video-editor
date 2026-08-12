import { useEffect, useState } from "react";
import type { RoomContext } from "../core/rooms/common/room-context";
import { AppEvent } from "../core/rooms/common/event-bus";
import type { RoomNavigation } from "../core/rooms/common/room-navigation";
import type { ProjectRoom } from "../core/rooms/project/project-room";
import type { TimelineRoom } from "../core/rooms/timeline/timeline-room";
import { ProjectRoomView } from "./rooms/project-room-view";
import { TimelineRoomView } from "./rooms/timeline-room-view";

export interface AppProps {
  readonly navigation: RoomNavigation;
  readonly context: RoomContext;
  readonly projectRoom: ProjectRoom;
  readonly timelineRoom: TimelineRoom;
}

export function App(props: AppProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubs = Object.values(AppEvent).map(event =>
      props.context.eventBus.on(event, () => setTick(t => t + 1)),
    );
    return () => unsubs.forEach(unsub => unsub());
  }, [props.context]);

  const currentId = props.navigation.getCurrentRoomId();
  const currentRoom =
    currentId === "timeline" ? props.timelineRoom
    : currentId === "project" ? props.projectRoom
    : null;

  return (
    <div className="app">
      <header>
        <h1>Tempo</h1>
      </header>
      {currentRoom === null ? (
        <p role="status">No room active</p>
      ) : currentRoom.id === "timeline" ? (
        <TimelineRoomView room={props.timelineRoom} context={props.context} />
      ) : (
        <ProjectRoomView room={props.projectRoom} context={props.context} />
      )}
    </div>
  );
}
