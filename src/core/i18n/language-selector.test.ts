import { LanguageSelector } from "./language-selector";
import { Translator } from "./translator";
import { LocaleLoader } from "./loader";
import { ErrorCode } from "../infrastructure/common/types";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../infrastructure/engines/file/file-engine.interface";
import { STATIC_LOCALES } from "./locales";
import { IFileEngine } from "../infrastructure/engines/file/file-engine.interface";

function makeSelector() {
  const loader = new LocaleLoader({
    file: fileEngineForMock(new MockFileSystem()),
    staticLocales: STATIC_LOCALES,
  });
  const translator = new Translator({ loader, initialLanguage: "en" });
  const announcements: Array<{ textAr: string; textEn: string }> = [];
  const selector = new LanguageSelector({
    translator,
    announce: (textAr, textEn) => announcements.push({ textAr, textEn }),
  });
  return { selector, translator, announcements };
}

describe("LanguageSelector", () => {
  it("should report the current language", () => {
    const { selector, translator } = makeSelector();
    expect(selector.getCurrentLanguage()).toBe("en");
    expect(translator.getCurrentLanguage()).toBe("en");
  });

  it("should select a language and announce the change bilingually", async () => {
    const { selector, announcements } = makeSelector();
    const result = await selector.selectLanguage("ar");
    expect(result.success).toBe(true);
    expect(selector.getCurrentLanguage()).toBe("ar");
    expect(announcements).toHaveLength(1);
    expect(announcements[0]?.textAr).toContain("تم تغيير اللغة إلى العربية");
    expect(announcements[0]?.textEn).toContain("Language changed to العربية");
  });

  it("should propagate a failed language selection", async () => {
    const { selector, announcements } = makeSelector();
    const result = await selector.selectLanguage("de");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(announcements).toHaveLength(0);
    expect(selector.getCurrentLanguage()).toBe("en");
  });

  it("should announce available languages from showSelector", async () => {
    const { selector, announcements } = makeSelector();
    const languages = await selector.showSelector();
    expect(languages).toEqual(["ar", "en", "fr"]);
    expect(announcements).toHaveLength(1);
    expect(announcements[0]?.textEn).toContain("Available languages");
    expect(announcements[0]?.textEn).toContain("العربية");
    expect(announcements[0]?.textEn).toContain("Français");
  });

  it("should announce a failure when languages cannot be listed", async () => {
    const failingFile: IFileEngine = {
      read: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      write: async () => ({ success: true, value: undefined }),
      exists: async () => ({ success: true, value: false }),
      stat: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      delete: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      list: async () => ({ success: false, error: ErrorCode.FILE_READ_ERROR }),
      move: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
    };
    const loader = new LocaleLoader({ file: failingFile });
    const translator = new Translator({ loader, initialLanguage: "ar" });
    const announcements: string[] = [];
    const selector = new LanguageSelector({
      translator,
      announce: (textAr, textEn) => announcements.push(`${textAr} | ${textEn}`),
    });
    const languages = await selector.showSelector();
    expect(languages).toEqual([]);
    expect(announcements).toHaveLength(1);
    expect(announcements[0]).toContain("Unable to load the language list");
  });

  it("should fall back to the raw code for unknown language names", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/custom.json", new TextEncoder().encode(JSON.stringify({ app: { name: "Custom" } })));
    const loader = new LocaleLoader({ file: fileEngineForMock(fs), basePath: "locales" });
    const translator = new Translator({ loader, initialLanguage: "en" });
    const announcements: string[] = [];
    const selector = new LanguageSelector({
      translator,
      announce: (textAr, textEn) => announcements.push(textEn),
    });
    const result = await selector.selectLanguage("custom");
    expect(result.success).toBe(true);
    expect(selector.getCurrentLanguage()).toBe("custom");
    expect(announcements[0]).toContain("Language changed to custom");
  });
});
