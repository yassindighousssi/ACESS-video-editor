import { Translator } from "./translator";
import { LocaleLoader } from "./loader";
import { ErrorCode } from "../infrastructure/common/types";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../infrastructure/engines/file/file-engine.interface";
import { STATIC_LOCALES } from "./locales";

function makeTranslator(overrides: { cacheLocales?: boolean } = {}) {
  const warns: string[] = [];
  const loader = new LocaleLoader({
    file: fileEngineForMock(new MockFileSystem()),
    staticLocales: STATIC_LOCALES,
  });
  const translator = new Translator({
    loader,
    initialLanguage: "en",
    warn: message => warns.push(message),
    cacheLocales: overrides.cacheLocales,
  });
  return { translator, loader, warns };
}

describe("Translator", () => {
  it("should translate synchronously from the initial static locale", () => {
    const { translator } = makeTranslator();
    expect(translator.getCurrentLanguage()).toBe("en");
    expect(translator.t("app.name")).toBe("ACESS Video Editor");
    expect(translator.t("rooms.timeline.name")).toBe("Timeline Room");
  });

  it("should interpolate parameters", () => {
    const { translator } = makeTranslator();
    expect(translator.t("announcements.update_available", { version: "1.2.3-stable" })).toBe(
      "Update available: version 1.2.3-stable. Do you want to install it now?",
    );
    expect(translator.t("app.version", { version: "2.0" })).toBe("Version 2.0");
  });

  it("should return the key when a translation is missing", () => {
    const { translator, warns } = makeTranslator();
    expect(translator.t("missing.key")).toBe("missing.key");
    expect(warns.some(message => message.includes("missing.key"))).toBe(true);
  });

  it("should switch languages asynchronously", async () => {
    const { translator } = makeTranslator();
    const result = await translator.setLanguage("ar");
    expect(result.success).toBe(true);
    expect(translator.getCurrentLanguage()).toBe("ar");
    expect(translator.t("app.name")).toBe("محرر الفيديو ACESS");
  });

  it("should keep the previous language when a switch fails", async () => {
    const { translator } = makeTranslator();
    const result = await translator.setLanguage("de");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(translator.getCurrentLanguage()).toBe("en");
  });

  it("should notify language change listeners", async () => {
    const { translator } = makeTranslator();
    const seen: string[] = [];
    const unsubscribe = translator.onChange(language => seen.push(language));
    await translator.setLanguage("fr");
    await translator.setLanguage("en");
    expect(seen).toEqual(["fr", "en"]);
    unsubscribe();
    await translator.setLanguage("ar");
    expect(seen).toEqual(["fr", "en"]);
  });

  it("should translate across languages with tIn", async () => {
    const { translator } = makeTranslator();
    const ar = await translator.tIn("ar", "announcements.update_available", { version: "1.0.0" });
    const en = await translator.tIn("en", "announcements.update_available", { version: "1.0.0" });
    expect(ar).toContain("تحديث جديد متاح");
    expect(en).toContain("Update available");
  });

  it("should return the key when tIn cannot load a locale", async () => {
    const { translator, warns } = makeTranslator();
    const result = await translator.tIn("de", "app.name");
    expect(result).toBe("app.name");
    expect(warns.some(message => message.includes("de"))).toBe(true);
  });

  it("should list available languages", async () => {
    const { translator } = makeTranslator();
    const result = await translator.getAvailableLanguages();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual(["ar", "en", "fr"]);
  });

  it("should return the key when no locale is loaded", () => {
    const warns: string[] = [];
    const loader = new LocaleLoader({ file: fileEngineForMock(new MockFileSystem()) });
    const translator = new Translator({ loader, warn: message => warns.push(message) });
    expect(translator.t("app.name")).toBe("app.name");
    expect(warns.some(message => message.includes("not loaded"))).toBe(true);
  });

  it("should load file-based locales through the loader", async () => {
    const fs = new MockFileSystem();
    fs.createFile(
      "locales/fr.json",
      new TextEncoder().encode(JSON.stringify({ app: { name: "Éditeur vidéo ACESS" } })),
    );
    const loader = new LocaleLoader({ file: fileEngineForMock(fs), basePath: "locales" });
    const translator = new Translator({ loader, initialLanguage: "fr" });
    const result = await translator.setLanguage("fr");
    expect(result.success).toBe(true);
    expect(translator.t("app.name")).toBe("Éditeur vidéo ACESS");
  });

  it("should cache locales when enabled", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/fr.json", new TextEncoder().encode(JSON.stringify({ app: { name: "FR" } })));
    const engine = fileEngineForMock(fs);
    const loader = new LocaleLoader({ file: engine, basePath: "locales" });
    const translator = new Translator({ loader, initialLanguage: "fr", cacheLocales: true });
    await translator.setLanguage("fr");
    const readCount = fs.getOperationLog().filter(op => op.startsWith("READ:locales/fr.json")).length;
    await translator.setLanguage("fr");
    expect(fs.getOperationLog().filter(op => op.startsWith("READ:locales/fr.json")).length).toBe(readCount);
  });

  it("should not cache locales when disabled", async () => {
    const fs = new MockFileSystem();
    fs.createFile("locales/fr.json", new TextEncoder().encode(JSON.stringify({ app: { name: "FR" } })));
    const loader = new LocaleLoader({ file: fileEngineForMock(fs), basePath: "locales" });
    const translator = new Translator({ loader, initialLanguage: "fr", cacheLocales: false });
    await translator.setLanguage("fr");
    await translator.setLanguage("fr");
    const reads = fs.getOperationLog().filter(op => op.startsWith("READ:locales/fr.json")).length;
    expect(reads).toBeGreaterThanOrEqual(2);
  });
});
