/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useTranslation } from "./use-translation";
import { Translator } from "../../core/i18n/translator";
import { LocaleLoader } from "../../core/i18n/loader";
import { MockFileSystem } from "../../core/infrastructure/testing/test-harness";
import { fileEngineForMock } from "../../core/infrastructure/engines/file/file-engine.interface";
import { STATIC_LOCALES } from "../../core/i18n/locales";

function makeTranslator(): Translator {
  const loader = new LocaleLoader({
    file: fileEngineForMock(new MockFileSystem()),
    staticLocales: STATIC_LOCALES,
  });
  return new Translator({ loader, initialLanguage: "en" });
}

describe("useTranslation", () => {
  it("should expose the translator language and t function", () => {
    const translator = makeTranslator();
    const { result } = renderHook(() => useTranslation(translator));
    expect(result.current.language).toBe("en");
    expect(result.current.t("app.name")).toBe("ACESS Video Editor");
  });

  it("should re-render with a new language after setLanguage", async () => {
    const translator = makeTranslator();
    const { result } = renderHook(() => useTranslation(translator));
    await act(async () => {
      await translator.setLanguage("fr");
    });
    expect(result.current.language).toBe("fr");
    expect(result.current.t("app.name")).toBe("Éditeur vidéo ACESS");
  });

  it("should pass parameters through to the translator", () => {
    const translator = makeTranslator();
    const { result } = renderHook(() => useTranslation(translator));
    expect(result.current.t("announcements.update_available", { version: "2.0.0" })).toBe(
      "Update available: version 2.0.0. Do you want to install it now?",
    );
  });
});
