import { Result, ErrorCode } from "../../infrastructure/common/types";
import { AnnouncementLevel } from "../../model/types";
import { EventBus, AppEvent } from "./event-bus";
import { AnnouncementEngine } from "./announcement-engine";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";

export interface AppSettings {
  readonly announcementLevel: AnnouncementLevel;
  readonly language: "ar" | "en";
  readonly maxRecentProjects: number;
  readonly pronunciationMode: boolean;
  readonly autoSave: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  announcementLevel: "all",
  language: "ar",
  maxRecentProjects: 5,
  pronunciationMode: true,
  autoSave: true,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class SettingsEngine {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private loaded: boolean = false;

  constructor(
    private readonly file: IFileEngine,
    private readonly eventBus: EventBus,
    private readonly announcement: AnnouncementEngine,
    private readonly settingsPath: string = "settings.json",
  ) {}

  async load(): Promise<Result<void, ErrorCode>> {
    const read = await this.file.read(this.settingsPath);
    if (!read.success) {
      if (read.error === ErrorCode.FILE_NOT_FOUND) {
        const write = await this.file.write(this.settingsPath, encoder.encode(JSON.stringify(DEFAULT_SETTINGS, null, 2)));
        if (!write.success) return write;
        this.settings = { ...DEFAULT_SETTINGS };
        this.loaded = true;
        return { success: true, value: undefined };
      }
      return read;
    }
    try {
      const parsed = JSON.parse(decoder.decode(read.value)) as Partial<AppSettings>;
      this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      this.loaded = true;
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  get<T extends keyof AppSettings>(key: T): AppSettings[T] {
    return this.settings[key];
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async update(patch: Partial<AppSettings>): Promise<Result<AppSettings, ErrorCode>> {
    const next: AppSettings = { ...this.settings, ...patch };
    const write = await this.file.write(this.settingsPath, encoder.encode(JSON.stringify(next, null, 2)));
    if (!write.success) return write;
    this.settings = next;
    this.eventBus.emit(AppEvent.SETTINGS_CHANGED, { settings: { ...next } });
    this.announcement.speak("تم تحديث الإعدادات", "Settings updated", "important", "settings");
    return { success: true, value: { ...next } };
  }
}
