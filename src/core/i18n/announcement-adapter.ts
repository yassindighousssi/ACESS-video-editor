import { Translator } from "./translator";

export interface BilingualText {
  readonly textAr: string;
  readonly textEn: string;
}

export class AnnouncementTranslator {
  constructor(private readonly translator: Translator) {}

  async announce(key: string, params?: Readonly<Record<string, unknown>>): Promise<BilingualText> {
    const [textAr, textEn] = await Promise.all([
      this.translator.tIn("ar", key, params),
      this.translator.tIn("en", key, params),
    ]);
    return { textAr, textEn };
  }
}
