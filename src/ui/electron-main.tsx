import { createRoot } from "react-dom/client";
import { EventBus } from "../core/rooms/common/event-bus";
import { AnnouncementEngine } from "../core/rooms/common/announcement-engine";
import { SettingsEngine } from "../core/rooms/common/settings-engine";
import { RoomNavigation } from "../core/rooms/common/room-navigation";
import { RoomContext } from "../core/rooms/common/room-context";
import { ErrorEngine } from "../core/infrastructure/engines/error/error-engine";
import { ProjectRoomModel } from "../core/rooms/project/project-room.model";
import { ProjectRoom } from "../core/rooms/project/project-room";
import { TimelineRoomModel } from "../core/rooms/timeline/timeline-room.model";
import { TimelineRoom } from "../core/rooms/timeline/timeline-room";
import { TransactionEngine } from "../core/model/transaction";
import { createElectronFileEngine, fileEngineOrEmpty } from "../electron/electron-file-engine";
import type { AceApi } from "../electron/preload-api";
import { App } from "./app";
import "./styles.css";

function bootstrap(): void {
  const api: AceApi | undefined = window.ace;
  const file = api === undefined ? fileEngineOrEmpty() : createElectronFileEngine(api);

  const eventBus = new EventBus();
  const announcement = new AnnouncementEngine();
  const errorEngine = new ErrorEngine();
  const settings = new SettingsEngine(file, eventBus, announcement);
  const context: RoomContext = { eventBus, announcement, errorEngine, settings, file };

  void settings.load();

  const navigation = new RoomNavigation(context);
  const store = new ProjectRoomModel(file, eventBus, announcement, settings);
  const projectRoom = new ProjectRoom(store);
  const timelineRoom = new TimelineRoom(new TimelineRoomModel(store, eventBus, announcement, new TransactionEngine()));
  const registerProject = navigation.registerRoom(projectRoom);
  const registerTimeline = navigation.registerRoom(timelineRoom);
  if (!registerProject.success || !registerTimeline.success) {
    throw new Error("Room registration failed");
  }
  void navigation.navigateTo("project");

  const root = document.getElementById("root");
  if (root === null) throw new Error("Missing #root element");
  createRoot(root).render(
    <App navigation={navigation} context={context} projectRoom={projectRoom} timelineRoom={timelineRoom} />,
  );
}

bootstrap();
