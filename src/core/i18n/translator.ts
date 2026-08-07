import { Result, ErrorCode } from "../infrastructure/common/types";
import { LocaleLoader, lookupPath, interpolate } from "./loader";
import { LocaleDictionary } from "./types";

export type LanguageChangeListener = (language: string) => void;

export interface TranslatorOptions {
  readonly loader: LocaleLoader;
  readonly initialLanguage?: string;
  readonly cacheLocales?: boolean;
  readonly warn?: (message: string) => void;
}

export class Translator {
  private currentLanguage: string;
  private currentLocale: LocaleDictionary | null;
  private readonly cache = new Map<string, LocaleDictionary>();
  private readonly listeners = new Set<LanguageChangeListener>();
  private readonly warn: (message: string) => void;

  constructor(private readonly options: TranslatorOptions) {
    this.currentLanguage = options.initialLanguage ?? options.loader.getDefaultLanguage();
    this.warn = options.warn ?? ((message: string) => console.warn(message));
    this.currentLocale = options.loader.getStatic(this.currentLanguage) ?? null;
    if (this.currentLocale !== null) {
      this.cache.set(this.currentLanguage, this.currentLocale);
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getAvailableLanguages(): Promise<Result<string[], ErrorCode>> {
    return this.options.loader.getAvailableLanguages();
  }

  onChange(listener: LanguageChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setLanguage(language: string): Promise<Result<void, ErrorCode>> {
    const loaded = await this.load(language);
    if (!loaded.success) return loaded;
    this.currentLanguage = language;
    this.currentLocale = loaded.value;
    for (const listener of [...this.listeners]) {
      listener(language);
    }
    return { success: true, value: undefined };
  }

  t(key: string, params?: Readonly<Record<string, unknown>>): string {
    if (this.currentLocale === null) {
      this.warn(`[i18n] locale "${this.currentLanguage}" is not loaded; returning key "${key}"`);
      return key;
    }
    return translate(this.currentLocale, this.currentLanguage, key, params, this.warn);
  }

  async tIn(language: string, key: string, params?: Readonly<Record<string, unknown>>): Promise<string> {
    const loaded = await this.load(language);
    if (!loaded.success) {
      this.warn(`[i18n] cannot load locale "${language}"; returning key "${key}"`);
      return key;
    }
    return translate(loaded.value, language, key, params, this.warn);
  }

  private async load(language: string): Promise<Result<LocaleDictionary, ErrorCode>> {
    const cached = this.cache.get(language);
    if (cached !== undefined) {
      return { success: true, value: cached };
    }
    const loaded = await this.options.loader.load(language);
    if (!loaded.success) return loaded;
    if (this.options.cacheLocales !== false) {
      this.cache.set(language, loaded.value);
    }
    return loaded;
  }
}

function translate(
  locale: LocaleDictionary,
  language: string,
  key: string,
  params: Readonly<Record<string, unknown>> | undefined,
  warn: (message: string) => void,
): string {
  const value = lookupPath(locale, key);
  if (typeof value !== "string") {
    warn(`[i18n] missing key "${key}" in locale "${language}"`);
    return key;
  }
  return interpolate(value, params);
}
