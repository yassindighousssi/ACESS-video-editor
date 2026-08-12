import { Result, ErrorCode } from "../infrastructure/common/types";
import { Translator } from "./translator";
import { LANGUAGE_NAMES } from "./types";

export interface LanguageSelectorOptions {
  readonly translator: Translator;
  readonly announce?: (textAr: string, textEn: string) => void;
}

export class LanguageSelector {
  constructor(private readonly options: LanguageSelectorOptions) {}

  getCurrentLanguage(): string {
    return this.options.translator.getCurrentLanguage();
  }

  async selectLanguage(language: string): Promise<Result<void, ErrorCode>> {
    const result = await this.options.translator.setLanguage(language);
    if (!result.success) return result;
    const nativeName = LANGUAGE_NAMES.find(name => name.code === language)?.nativeName ?? language;
    this.options.announce?.(
      `تم تغيير اللغة إلى ${nativeName}.`,
      `Language changed to ${nativeName}.`,
    );
    return result;
  }

  async showSelector(): Promise<string[]> {
    const list = await this.options.translator.getAvailableLanguages();
    if (!list.success) {
      this.options.announce?.(
        "تعذر تحميل قائمة اللغات.",
        "Unable to load the language list.",
      );
      return [];
    }
    const labels = list.value.map(
      language => LANGUAGE_NAMES.find(name => name.code === language)?.nativeName ?? language,
    );
    this.options.announce?.(
      `اللغات المتاحة: ${labels.join("، ")}.`,
      `Available languages: ${labels.join(", ")}.`,
    );
    return list.value;
  }
}
