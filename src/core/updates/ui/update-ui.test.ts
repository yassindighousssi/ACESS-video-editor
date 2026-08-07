import { AnnouncementEngine } from "../../rooms/common/announcement-engine";
import { UpdateUI } from "./update-ui";
import { Version, UpdateInfo } from "../common/types";
import { AnnouncementTranslator } from "../../i18n/announcement-adapter";
import { Translator } from "../../i18n/translator";
import { LocaleLoader } from "../../i18n/loader";
import { STATIC_LOCALES } from "../../i18n/locales";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";

function makeInfo(overrides: Partial<UpdateInfo> = {}): UpdateInfo {
  return {
    version: new Version(1, 2, 3),
    releaseDate: "2026-07-01T00:00:00Z",
    releaseNotes: "",
    downloadUrl: "https://example.com/app.bin",
    size: 0,
    checksum: "",
    breakingChanges: false,
    ...overrides,
  };
}

function makeTranslatedUI(announcement: AnnouncementEngine): UpdateUI {
  const loader = new LocaleLoader({
    file: fileEngineForMock(new MockFileSystem()),
    staticLocales: STATIC_LOCALES,
  });
  const translator = new AnnouncementTranslator(new Translator({ loader, initialLanguage: "en" }));
  return new UpdateUI(announcement, "updates", translator);
}

describe("UpdateUI", () => {
  it("should announce an available update bilingually", async () => {
    const announcement = new AnnouncementEngine();
    const ui = new UpdateUI(announcement, "updates");
    await ui.showUpdateAvailable(makeInfo());
    expect(ui.getStatus()).toBe("available");
    const last = announcement.getLast();
    expect(last).toBeDefined();
    expect(last?.textAr).toContain("تحديث جديد متاح");
    expect(last?.textAr).toContain("1.2.3-stable");
    expect(last?.textEn).toContain("Update available");
    expect(last?.level).toBe("important");
    expect(last?.source).toBe("updates");
  });

  it("should translate announcements through the i18n adapter", async () => {
    const announcement = new AnnouncementEngine();
    const ui = makeTranslatedUI(announcement);
    await ui.showUpdateAvailable(makeInfo());
    const last = announcement.getLast();
    expect(last?.textEn).toBe(
      "Update available: version 1.2.3-stable. Do you want to install it now?",
    );
    expect(last?.textAr).toContain("تحديث جديد متاح");
  });

  it("should announce download progress", async () => {
    const announcement = new AnnouncementEngine();
    const ui = new UpdateUI(announcement);
    await ui.showDownloadProgress(42);
    const last = announcement.getLast();
    expect(last?.textEn).toContain("42%");
    expect(last?.textAr).toContain("42%");
    expect(last?.level).toBe("all");
  });

  it("should announce install completion", async () => {
    const announcement = new AnnouncementEngine();
    const ui = new UpdateUI(announcement);
    await ui.showInstallComplete();
    expect(ui.getStatus()).toBe("installed");
    const last = announcement.getLast();
    expect(last?.textEn).toContain("installed successfully");
    expect(last?.level).toBe("important");
  });

  it("should announce errors at critical level", async () => {
    const announcement = new AnnouncementEngine();
    const ui = new UpdateUI(announcement);
    await ui.showError("checksum mismatch");
    expect(ui.getStatus()).toBe("failed");
    const last = announcement.getLast();
    expect(last?.textEn).toContain("checksum mismatch");
    expect(last?.level).toBe("critical_only");
  });

  it("should respect the announcement level gate", async () => {
    const announcement = new AnnouncementEngine();
    const received: string[] = [];
    announcement.onAnnounce(a => received.push(a.textEn));
    announcement.setLevel("critical_only");
    const ui = new UpdateUI(announcement);
    await ui.showDownloadProgress(10);
    expect(received).toEqual([]);
    await ui.showError("boom");
    expect(received).toEqual(["Update error: boom"]);
  });

  it("should track status and user decisions", () => {
    const announcement = new AnnouncementEngine();
    const ui = new UpdateUI(announcement);
    expect(ui.getStatus()).toBe("idle");
    expect(ui.getUserDecision()).toBeNull();
    ui.setStatus("downloading");
    expect(ui.getStatus()).toBe("downloading");
    ui.choose("install");
    expect(ui.getUserDecision()).toBe("install");
  });
});
