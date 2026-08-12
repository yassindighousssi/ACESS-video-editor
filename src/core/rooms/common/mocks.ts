import { EventBus } from "./event-bus";
import { AnnouncementEngine } from "./announcement-engine";
import { SettingsEngine } from "./settings-engine";
import { RoomContext } from "./room-context";
import { ErrorEngine } from "../../infrastructure/engines/error/error-engine";
import { IErrorEngine } from "../../infrastructure/engines/error/error-engine.interface";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";

export interface TestHarness {
  context: RoomContext;
  file: IFileEngine;
  fs: MockFileSystem;
  eventBus: EventBus;
  announcement: AnnouncementEngine;
  settings: SettingsEngine;
  errorEngine: IErrorEngine;
}

export function createTestRoomContext(
  fs: MockFileSystem = new MockFileSystem(),
  settingsPath: string = "settings.json",
): TestHarness {
  const eventBus = new EventBus();
  const announcement = new AnnouncementEngine();
  const file = fileEngineForMock(fs);
  const errorEngine = new ErrorEngine();
  const settings = new SettingsEngine(file, eventBus, announcement, settingsPath);
  return {
    context: { eventBus, announcement, errorEngine, settings, file },
    file,
    fs,
    eventBus,
    announcement,
    settings,
    errorEngine,
  };
}
