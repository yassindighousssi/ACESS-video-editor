import { Result, ErrorCode } from "../infrastructure/common/types";
import { IFileEngine } from "../infrastructure/engines/file/file-engine.interface";
import { DEFAULT_LANGUAGE, LocaleDictionary } from "./types";

export interface LocaleLoaderOptions {
  readonly file: IFileEngine;
  readonly basePath?: string;
  readonly staticLocales?: Readonly<Record<string, LocaleDictionary>>;
  readonly requiredKeys?: readonly string[];
}

export class LocaleLoader {
  private readonly staticLocales: Readonly<Record<string, LocaleDictionary>>;
  private readonly requiredKeys: readonly string[];

  constructor(private readonly options: LocaleLoaderOptions) {
    this.staticLocales = options.staticLocales ?? {};
    this.requiredKeys = options.requiredKeys ?? [];
  }

  private baseDir(): string {
    return (this.options.basePath ?? "locales").replace(/[/\\]+$/, "");
  }

  getDefaultLanguage(): string {
    return DEFAULT_LANGUAGE;
  }

  getStatic(language: string): LocaleDictionary | undefined {
    return this.staticLocales[language];
  }

  async load(language: string): Promise<Result<LocaleDictionary, ErrorCode>> {
    const staticLocale = this.staticLocales[language];
    if (staticLocale !== undefined) {
      if (this.validate(staticLocale)) {
        return { success: true, value: staticLocale };
      }
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    const path = `${this.baseDir()}/${language}.json`;
    const read = await this.options.file.read(path);
    if (!read.success) return read;
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(read.value));
    } catch {
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    if (!this.validate(parsed)) {
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    return { success: true, value: parsed as LocaleDictionary };
  }

  async getAvailableLanguages(): Promise<Result<string[], ErrorCode>> {
    const languages = new Set<string>();
    for (const code of Object.keys(this.staticLocales)) {
      languages.add(code);
    }
    const listed = await this.options.file.list(this.baseDir());
    if (!listed.success) {
      if (languages.size === 0) return listed;
      return { success: true, value: Array.from(languages).sort() };
    }
    for (const entry of listed.value) {
      if (entry.endsWith(".json")) {
        languages.add(entry.replace(/\.json$/, ""));
      }
    }
    return { success: true, value: Array.from(languages).sort() };
  }

  private validate(payload: unknown): boolean {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
    const record = payload as Record<string, unknown>;
    for (const key of this.requiredKeys) {
      if (lookupPath(record, key) === undefined) return false;
    }
    return true;
  }
}

export function lookupPath(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = record;
  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

export function interpolate(template: string, params?: Readonly<Record<string, unknown>>): string {
  if (params === undefined) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}
