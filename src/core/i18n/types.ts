export type LanguageCode = "ar" | "en" | "fr";

export const DEFAULT_LANGUAGE: LanguageCode = "ar";

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ["ar", "en", "fr"];

export interface LocaleName {
  readonly code: LanguageCode;
  readonly nativeName: string;
}

export const LANGUAGE_NAMES: readonly LocaleName[] = [
  { code: "ar", nativeName: "العربية" },
  { code: "en", nativeName: "English" },
  { code: "fr", nativeName: "Français" },
];

export type LocaleDictionary = Record<string, unknown>;
