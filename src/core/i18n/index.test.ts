import * as i18n from "./index";
import { LocaleLoader } from "./loader";
import { Translator } from "./translator";
import { LanguageSelector } from "./language-selector";
import { AnnouncementTranslator } from "./announcement-adapter";
import { STATIC_LOCALES } from "./locales";
import { DEFAULT_LANGUAGE } from "./types";

describe("i18n barrel", () => {
  it("should export the public surface", () => {
    expect(i18n.LocaleLoader).toBe(LocaleLoader);
    expect(i18n.Translator).toBe(Translator);
    expect(i18n.LanguageSelector).toBe(LanguageSelector);
    expect(i18n.AnnouncementTranslator).toBe(AnnouncementTranslator);
    expect(i18n.STATIC_LOCALES).toBe(STATIC_LOCALES);
    expect(i18n.DEFAULT_LANGUAGE).toBe(DEFAULT_LANGUAGE);
  });

  it("should export the translation helpers", () => {
    expect(typeof i18n.lookupPath).toBe("function");
    expect(typeof i18n.interpolate).toBe("function");
    expect(i18n.interpolate("v{version}", { version: "1" })).toBe("v1");
  });
});
