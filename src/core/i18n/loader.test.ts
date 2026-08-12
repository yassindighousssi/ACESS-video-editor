import { LocaleLoader, lookupPath, interpolate } from "./loader";
import { ErrorCode } from "../infrastructure/common/types";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../infrastructure/engines/file/file-engine.interface";
import { STATIC_LOCALES } from "./locales";
import { IFileEngine } from "../infrastructure/engines/file/file-engine.interface";

const AR = {
  app: { name: "محرر الفيديو", version: "الإصدار {version}" },
  common: { ok: "موافق" },
};

const EN = {
  app: { name: "Video Editor", version: "Version {version}" },
  common: { ok: "OK" },
};

function fileHarness() {
  const fs = new MockFileSystem();
  fs.createFile("locales/ar.json", new TextEncoder().encode(JSON.stringify(AR)));
  fs.createFile("locales/en.json", new TextEncoder().encode(JSON.stringify(EN)));
  return new LocaleLoader({ file: fileEngineForMock(fs), basePath: "locales" });
}

describe("LocaleLoader", () => {
  it("should load a locale file from the file engine", async () => {
    const loader = fileHarness();
    const result = await loader.load("ar");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(lookupPath(result.value, "app.name")).toBe("محرر الفيديو");
    }
  });

  it("should report FILE_NOT_FOUND for a missing locale file", async () => {
    const loader = fileHarness();
    const result = await loader.load("de");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
  });

  it("should report UNKNOWN for invalid JSON content", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/ar.json", new TextEncoder().encode("not json"));
    const loader = new LocaleLoader({ file: fileEngineForMock(fs) });
    const result = await loader.load("ar");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should report UNKNOWN for a non-object payload", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/ar.json", new TextEncoder().encode("[1,2,3]"));
    const loader = new LocaleLoader({ file: fileEngineForMock(fs) });
    const result = await loader.load("ar");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should report a file read error from the engine", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/ar.json", new TextEncoder().encode("{}"));
    fs.simulateReadError("locales/ar.json");
    const loader = new LocaleLoader({ file: fileEngineForMock(fs) });
    const result = await loader.load("ar");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_READ_ERROR);
  });

  it("should fall back to static locales", async () => {
    const fs = new MockFileSystem();
    const loader = new LocaleLoader({
      file: fileEngineForMock(fs),
      staticLocales: { ar: STATIC_LOCALES.ar, en: STATIC_LOCALES.en },
    });
    const result = await loader.load("ar");
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(STATIC_LOCALES.ar);
  });

  it("should return static locales synchronously", () => {
    const loader = new LocaleLoader({
      file: fileEngineForMock(new MockFileSystem()),
      staticLocales: { ar: STATIC_LOCALES.ar },
    });
    expect(loader.getStatic("ar")).toBe(STATIC_LOCALES.ar);
    expect(loader.getStatic("de")).toBeUndefined();
  });

  it("should validate required keys for static locales", async () => {
    const loader = new LocaleLoader({
      file: fileEngineForMock(new MockFileSystem()),
      staticLocales: { ar: STATIC_LOCALES.ar },
      requiredKeys: ["app.name", "announcements.update_available"],
    });
    expect((await loader.load("ar")).success).toBe(true);

    const missing = new LocaleLoader({
      file: fileEngineForMock(new MockFileSystem()),
      staticLocales: { ar: STATIC_LOCALES.ar },
      requiredKeys: ["app.does_not_exist"],
    });
    const result = await missing.load("ar");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should validate required keys for file locales", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/ar.json", new TextEncoder().encode(JSON.stringify({ app: { name: "x" } })));
    const loader = new LocaleLoader({
      file: fileEngineForMock(fs),
      requiredKeys: ["app.name", "app.missing"],
    });
    const result = await loader.load("ar");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should list available languages from files", async () => {
    const loader = fileHarness();
    const result = await loader.getAvailableLanguages();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual(["ar", "en"]);
  });

  it("should merge static and file languages", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/fr.json", new TextEncoder().encode("{}"));
    const loader = new LocaleLoader({
      file: fileEngineForMock(fs),
      staticLocales: { ar: STATIC_LOCALES.ar },
    });
    const result = await loader.getAvailableLanguages();
    if (result.success) expect(result.value).toEqual(["ar", "fr"]);
  });

  it("should keep static languages when listing fails", async () => {
    const failingFile: IFileEngine = {
      read: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      write: async () => ({ success: true, value: undefined }),
      exists: async () => ({ success: true, value: false }),
      stat: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      delete: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
      list: async () => ({ success: false, error: ErrorCode.FILE_READ_ERROR }),
      move: async () => ({ success: false, error: ErrorCode.FILE_NOT_FOUND }),
    };
    const loader = new LocaleLoader({
      file: failingFile,
      staticLocales: { ar: STATIC_LOCALES.ar },
    });
    const result = await loader.getAvailableLanguages();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual(["ar"]);
  });

  it("should propagate a listing failure when no static locales exist", async () => {
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
    const result = await loader.getAvailableLanguages();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_READ_ERROR);
  });

  it("should return the default language", () => {
    expect(fileHarness().getDefaultLanguage()).toBe("ar");
  });

  it("should look up nested paths", () => {
    const record = { a: { b: { c: "value" } }, empty: null };
    expect(lookupPath(record, "a.b.c")).toBe("value");
    expect(lookupPath(record, "a.b.missing")).toBeUndefined();
    expect(lookupPath(record, "missing")).toBeUndefined();
    expect(lookupPath(record, "empty.x")).toBeUndefined();
  });

  it("should interpolate parameters", () => {
    expect(interpolate("Version {version}", { version: "1.2.3" })).toBe("Version 1.2.3");
    expect(interpolate("Hello {name}!", { name: "Ali" })).toBe("Hello Ali!");
    expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
    expect(interpolate("Plain text", undefined)).toBe("Plain text");
    expect(interpolate("{a}{b}", { a: "1", b: "2" })).toBe("12");
  });
});
