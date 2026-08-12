import { EventBus } from "./event-bus";
import { AnnouncementEngine } from "./announcement-engine";
import { SettingsEngine } from "./settings-engine";
import { IErrorEngine } from "../../infrastructure/engines/error/error-engine.interface";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";

export interface RoomContext {
  readonly eventBus: EventBus;
  readonly announcement: AnnouncementEngine;
  readonly errorEngine: IErrorEngine;
  readonly settings: SettingsEngine;
  readonly file: IFileEngine;
}
