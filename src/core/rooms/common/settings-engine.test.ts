import { SettingsEngine, DEFAULT_SETTINGS } from "./settings-engine";
import { createTestRoomContext } from "./mocks";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { ErrorCode } from "../../infrastructure/common/types";
import { AppEvent } from "./event-bus";

describe("SettingsEngine", () => {
  let fs: MockFileSystem;
  let harness: ReturnType<typeof createTestRoomContext>;

  beforeEach(() => {
    fs = new MockFileSystem();
    harness = createTestRoomContext(fs);
  });

  describe("load", () => {
    it("should create a default settings file when missing", async () => {
      const result = await harness.settings.load();
      expect(result.success).toBe(true);
      expect(harness.settings.isLoaded()).toBe(true);
      expect(harness.settings.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(fs.exists("settings.json")).toBe(true);
    });

    it("should load persisted settings", async () => {
      fs.createFile("settings.json", new TextEncoder().encode(JSON.stringify({ language: "en", maxRecentProjects: 3 })));
      const result = await harness.settings.load();
      expect(result.success).toBe(true);
      expect(harness.settings.get("language")).toBe("en");
      expect(harness.settings.get("maxRecentProjects")).toBe(3);
      expect(harness.settings.get("autoSave")).toBe(true);
    });

    it("should return CORRUPT_FILE for invalid JSON", async () => {
      fs.createFile("settings.json", new TextEncoder().encode("{ not json"));
      const result = await harness.settings.load();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
      expect(harness.settings.isLoaded()).toBe(false);
    });

    it("should propagate read errors", async () => {
      fs.createFile("settings.json", new TextEncoder().encode("{}"));
      fs.simulateReadError("settings.json");
      const result = await harness.settings.load();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_READ_ERROR);
    });

    it("should propagate the write error when creating defaults", async () => {
      fs.simulateWriteError("settings.json");
      const result = await harness.settings.load();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
    });

    it("should use the default settings path when none is provided", async () => {
      const engine = new SettingsEngine(harness.file, harness.eventBus, harness.announcement);
      const result = await engine.load();
      expect(result.success).toBe(true);
      expect(fs.exists("settings.json")).toBe(true);
    });
  });

  describe("update", () => {
    it("should persist and apply changes", async () => {
      await harness.settings.load();
      const result = await harness.settings.update({ language: "en", autoSave: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.language).toBe("en");
        expect(result.value.autoSave).toBe(false);
      }
      expect(harness.settings.get("language")).toBe("en");
      const stored = JSON.parse(new TextDecoder().decode(fs.readFile("settings.json").success ? (fs.readFile("settings.json") as { data: Uint8Array }).data : new Uint8Array()));
      expect(stored.autoSave).toBe(false);
    });

    it("should emit SETTINGS_CHANGED and announce", async () => {
      await harness.settings.load();
      const events: string[] = [];
      harness.eventBus.on(AppEvent.SETTINGS_CHANGED, (p: { settings: { language: string } }) => events.push(p.settings.language));
      await harness.settings.update({ language: "ar" });
      expect(events).toEqual(["ar"]);
      expect(harness.announcement.getLast()?.textEn).toBe("Settings updated");
    });

    it("should not change settings when the write fails", async () => {
      await harness.settings.load();
      fs.simulateWriteError("settings.json");
      const result = await harness.settings.update({ language: "en" });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
      expect(harness.settings.get("language")).toBe("ar");
    });
  });

  describe("getters", () => {
    it("should return a copy of settings", async () => {
      await harness.settings.load();
      const copy = harness.settings.getSettings();
      expect(copy).toEqual(DEFAULT_SETTINGS);
      expect(copy).not.toBe(harness.settings.getSettings());
    });

    it("should report loaded state", () => {
      expect(harness.settings.isLoaded()).toBe(false);
    });
  });
});
