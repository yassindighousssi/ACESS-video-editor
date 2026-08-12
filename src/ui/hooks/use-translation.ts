import { useCallback, useSyncExternalStore } from "react";
import { Translator } from "../../core/i18n/translator";

export interface UseTranslationResult {
  readonly t: (key: string, params?: Readonly<Record<string, unknown>>) => string;
  readonly language: string;
}

export function useTranslation(translator: Translator): UseTranslationResult {
  const language = useSyncExternalStore(
    callback => translator.onChange(() => callback()),
    () => translator.getCurrentLanguage(),
    () => translator.getCurrentLanguage(),
  );
  const t = useCallback(
    (key: string, params?: Readonly<Record<string, unknown>>) => translator.t(key, params),
    [translator],
  );
  return { t, language };
}
