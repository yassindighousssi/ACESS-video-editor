import { STATIC_LOCALES } from "./locales";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_NAMES } from "./types";

type Dictionary = Record<string, unknown>;

function flatten(record: Dictionary, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flatten(value as Dictionary, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("locale parity", () => {
  it("should expose the three supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["ar", "en", "fr"]);
    expect(DEFAULT_LANGUAGE).toBe("ar");
    expect(LANGUAGE_NAMES.map(name => name.code)).toEqual(["ar", "en", "fr"]);
  });

  it("should provide a static locale for every supported language", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(STATIC_LOCALES[language]).toBeDefined();
    }
  });

  it("should have identical key sets across all locales", () => {
    const ar = flatten(STATIC_LOCALES.ar as Dictionary).sort();
    const en = flatten(STATIC_LOCALES.en as Dictionary).sort();
    const fr = flatten(STATIC_LOCALES.fr as Dictionary).sort();
    expect(ar).toEqual(en);
    expect(fr).toEqual(en);
  });

  it("should contain the required translation keys", () => {
    const en = flatten(STATIC_LOCALES.en as Dictionary);
    const required = [
      "app.name",
      "app.version",
      "common.ok",
      "rooms.project.name",
      "rooms.timeline.description",
      "elements.buttons.import_media",
      "elements.fields.project_name",
      "elements.tabs.export",
      "shortcuts.cut",
      "errors.file_not_found",
      "errors.unknown",
      "announcements.welcome",
      "announcements.update_available",
      "announcements.language_changed",
      "effects.color.name",
      "settings.title",
      "help.commands",
      "export.formats.mp4",
      "export.quality.high",
      "welcome.title",
    ];
    for (const key of required) {
      expect(en).toContain(key);
    }
  });

  it("should provide a string value for every leaf key", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const walk = (record: Dictionary, prefix: string): void => {
        for (const [key, value] of Object.entries(record)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (value !== null && typeof value === "object") {
            walk(value as Dictionary, path);
          } else {
            expect(typeof value).toBe("string");
          }
        }
      };
      walk(STATIC_LOCALES[language] as Dictionary, "");
    }
  });
});
