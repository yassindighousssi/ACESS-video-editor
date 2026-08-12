import { AnnouncementTranslator } from "./announcement-adapter";
import { Translator } from "./translator";
import { LocaleLoader } from "./loader";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../infrastructure/engines/file/file-engine.interface";
import { STATIC_LOCALES } from "./locales";

const AR = {
  announcements: { update_available: "تحديث جديد متاح: الإصدار {version}." },
  app: { name: "محرر الفيديو" },
};
const EN = {
  announcements: { update_available: "Update available: version {version}." },
  app: { name: "Video Editor" },
};

function makeAdapter(fileBased: boolean) {
  let loader: LocaleLoader;
  if (fileBased) {
    const fs = new MockFileSystem();
    fs.createFile("locales/ar.json", new TextEncoder().encode(JSON.stringify(AR)));
    fs.createFile("locales/en.json", new TextEncoder().encode(JSON.stringify(EN)));
    loader = new LocaleLoader({ file: fileEngineForMock(fs), basePath: "locales" });
  } else {
    loader = new LocaleLoader({
      file: fileEngineForMock(new MockFileSystem()),
      staticLocales: { ar: STATIC_LOCALES.ar, en: STATIC_LOCALES.en },
    });
  }
  const translator = new Translator({ loader, initialLanguage: "en" });
  return new AnnouncementTranslator(translator);
}

describe("AnnouncementTranslator", () => {
  it("should produce bilingual text from static locales", async () => {
    const adapter = makeAdapter(false);
    const text = await adapter.announce("announcements.update_available", { version: "1.2.3-stable" });
    expect(text.textAr).toContain("تحديث جديد متاح");
    expect(text.textAr).toContain("1.2.3-stable");
    expect(text.textEn).toContain("Update available: version 1.2.3-stable");
  });

  it("should produce bilingual text from file-based locales", async () => {
    const adapter = makeAdapter(true);
    const text = await adapter.announce("announcements.update_available", { version: "2.0" });
    expect(text.textAr).toContain("الإصدار 2.0");
    expect(text.textEn).toBe("Update available: version 2.0.");
  });

  it("should return the key for missing translations", async () => {
    const adapter = makeAdapter(true);
    const text = await adapter.announce("announcements.missing_key", { version: "1.0" });
    expect(text.textAr).toBe("announcements.missing_key");
    expect(text.textEn).toBe("announcements.missing_key");
  });
});
