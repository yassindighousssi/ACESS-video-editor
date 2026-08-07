import ar from "./ar.json";
import en from "./en.json";
import fr from "./fr.json";
import { LanguageCode, LocaleDictionary } from "../types";

export const STATIC_LOCALES: Readonly<Record<LanguageCode, LocaleDictionary>> = {
  ar,
  en,
  fr,
};
