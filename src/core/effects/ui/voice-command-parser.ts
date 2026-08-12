import { Result } from "../../infrastructure/common/types";
import { EffectError } from "../core/errors";
import { EffectDefinition, EffectParameter, EffectPreset, ParameterValue, ParameterValues } from "../core/types";

export interface ParsedEffectCommand {
  readonly effectId: string;
  readonly clipName: string | null;
  readonly params: ParameterValues;
  readonly presetId?: string;
}

interface EffectAlias {
  readonly effectId: string;
  readonly tokens: readonly string[];
}

interface ParamHint {
  readonly paramId: string;
  readonly keywords: readonly string[];
}

interface EffectHintGroup {
  readonly effectId: string;
  readonly hints: readonly ParamHint[];
}

interface VoiceCommandParserOptions {
  readonly definitions: ReadonlyMap<string, EffectDefinition>;
  readonly presets: (effectId: string) => readonly EffectPreset[];
  readonly aliases?: readonly EffectAlias[];
}

const DEFAULT_ALIASES: readonly EffectAlias[] = [
  { effectId: "speed-change", tokens: ["تغيير السرعة", "السرعة", "سرعة", "تسريع", "حركة بطيئة", "تصوير متسارع", "speed", "slow motion", "fast forward"] },
  { effectId: "reverse", tokens: ["عكس المقطع", "عكس", "reverse"] },
  { effectId: "color-adjust", tokens: ["ضبط الألوان", "الألوان", "ألوان", "لون", "color"] },
  { effectId: "fade", tokens: ["تلاشي", "ظهور", "اختفاء", "fade"] },
  { effectId: "noise-reduction", tokens: ["تقليل الضوضاء", "ضوضاء", "noise"] },
  { effectId: "reverb", tokens: ["صدى", "الصدى", "reverb"] },
  { effectId: "stt", tokens: ["تحويل الكلام", "تعرف آلي", "نص الكلام", "stt", "speech"] },
  { effectId: "add-subtitles", tokens: ["الترجمة", "ترجمة", "subtitle"] },
  { effectId: "zoom-rotate", tokens: ["تكبير وتدوير", "تكبير", "تدوير", "zoom", "rotate"] },
  { effectId: "gen-background", tokens: ["خلفية", "الخلفية", "background"] },
  { effectId: "auto-color", tokens: ["تصحيح الألوان", "تصحيح", "تلقائي", "auto"] },
  { effectId: "transition", tokens: ["انتقال", "الانتقال", "transition"] },
];

const PARAM_HINTS: readonly EffectHintGroup[] = [
  { effectId: "speed-change", hints: [{ paramId: "speed", keywords: ["سرعة", "سرعة التشغيل", "speed"] }] },
  { effectId: "color-adjust", hints: [
    { paramId: "brightness", keywords: ["سطوع", "brightness"] },
    { paramId: "contrast", keywords: ["تباين", "contrast"] },
    { paramId: "saturation", keywords: ["تشبّع", "تشبع", "saturation"] },
    { paramId: "hue", keywords: ["درجة اللون", "hue"] },
  ] },
  { effectId: "zoom-rotate", hints: [
    { paramId: "zoom", keywords: ["تكبير", "zoom"] },
    { paramId: "rotate", keywords: ["تدوير", "درجة", "rotate"] },
    { paramId: "panX", keywords: ["أفقي", "panx"] },
    { paramId: "panY", keywords: ["عمودي", "pany"] },
  ] },
  { effectId: "fade", hints: [{ paramId: "duration", keywords: ["مدة", "duration", "ثانية"] }] },
  { effectId: "transition", hints: [{ paramId: "duration", keywords: ["مدة", "duration", "ثانية"] }] },
  { effectId: "noise-reduction", hints: [{ paramId: "strength", keywords: ["قوة", "strength"] }] },
  { effectId: "reverb", hints: [
    { paramId: "roomSize", keywords: ["غرفة", "roomsize"] },
    { paramId: "wetLevel", keywords: ["مستوى الصدى", "wet"] },
  ] },
  { effectId: "auto-color", hints: [{ paramId: "strength", keywords: ["قوة", "strength"] }] },
  { effectId: "gen-background", hints: [{ paramId: "speed", keywords: ["سرعة", "speed"] }] },
  { effectId: "add-subtitles", hints: [{ paramId: "duration", keywords: ["مدة", "duration"] }] },
];

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAscii(input: string): boolean {
  return /^[\x00-\x7F]+$/.test(input);
}

function containsToken(input: string, token: string): boolean {
  if (token.length === 0) {
    return false;
  }
  if (isAscii(token)) {
    const pattern = `\\b${escapeRegExp(token)}\\b`;
    return new RegExp(pattern, "i").test(input);
  }
  return input.includes(token);
}

function extractNumber(input: string, keyword: string): number | null {
  const escaped = escapeRegExp(keyword);
  const after = new RegExp(`${escaped}\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)`);
  const before = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escaped}`);
  for (const pattern of [after, before]) {
    const match = input.match(pattern);
    if (match !== null && match[1] !== undefined) {
      return Number(match[1]);
    }
  }
  return null;
}

function extractEnum(input: string, param: EffectParameter): ParameterValue | null {
  const choices = param.enumValues ?? [];
  for (const choice of choices) {
    if (containsToken(input, String(choice.value))) {
      return choice.value;
    }
  }
  for (const choice of choices) {
    for (const part of choice.label.split("/")) {
      const trimmed = part.trim();
      if (trimmed.length > 0 && containsToken(input, trimmed)) {
        return choice.value;
      }
    }
  }
  return null;
}

function extractQuotedText(input: string): string | null {
  const match = input.match(/["'“”]([^"'“”]+)["'“”]/);
  return match !== null && match[1] !== undefined ? match[1].trim() : null;
}

function detectEffect(input: string, aliases: readonly EffectAlias[]): EffectAlias | null {
  let best: EffectAlias | null = null;
  let bestLength = -1;
  for (const alias of aliases) {
    for (const token of alias.tokens) {
      if (token.length > bestLength && containsToken(input, token)) {
        best = alias;
        bestLength = token.length;
      }
    }
  }
  return best;
}

function detectClipTarget(input: string): string | null {
  if (containsToken(input, "المقطع الحالي") || containsToken(input, "current clip")) {
    return null;
  }
  const arabic = input.match(/على المقطع\s+([^\s،,]+)/);
  if (arabic !== null && arabic[1] !== undefined) {
    return arabic[1];
  }
  const english = input.match(/\bon clip\s+([\w-]+)/i);
  if (english !== null && english[1] !== undefined) {
    return english[1];
  }
  const numbered = input.match(/(?:المقطع|clip)\s*(?:رقم|number)?\s*(\d+)/i);
  if (numbered !== null && numbered[1] !== undefined) {
    return numbered[1];
  }
  return null;
}

function detectPreset(input: string, presets: readonly EffectPreset[]): EffectPreset | null {
  let best: EffectPreset | null = null;
  let bestLength = -1;
  for (const preset of presets) {
    for (const part of preset.name.split("/")) {
      const trimmed = part.trim();
      if (trimmed.length > bestLength && containsToken(input, trimmed)) {
        best = preset;
        bestLength = trimmed.length;
      }
    }
    if (containsToken(input, preset.id) && preset.id.length > bestLength) {
      best = preset;
      bestLength = preset.id.length;
    }
  }
  return best;
}

export class VoiceCommandParser {
  private readonly aliases: readonly EffectAlias[];
  private readonly hintsByEffect: ReadonlyMap<string, readonly ParamHint[]>;

  constructor(private readonly options: VoiceCommandParserOptions) {
    this.aliases = options.aliases ?? DEFAULT_ALIASES;
    const hints = new Map<string, readonly ParamHint[]>();
    for (const group of PARAM_HINTS) {
      hints.set(group.effectId, group.hints);
    }
    this.hintsByEffect = hints;
  }

  parse(input: string): Result<ParsedEffectCommand, EffectError> {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { success: false, error: EffectError.INVALID_INPUT };
    }
    const alias = detectEffect(trimmed, this.aliases);
    if (alias === null) {
      return { success: false, error: EffectError.INVALID_INPUT };
    }
    const definition = this.options.definitions.get(alias.effectId);
    if (definition === undefined) {
      return { success: false, error: EffectError.EFFECT_NOT_FOUND };
    }
    const params = this.extractParams(trimmed, definition);
    const preset = this.maybePreset(trimmed, definition.id);
    if (preset !== null) {
      return {
        success: true,
        value: {
          effectId: definition.id,
          clipName: detectClipTarget(trimmed),
          params: { ...params, ...preset.parameters },
          presetId: preset.id,
        },
      };
    }
    return {
      success: true,
      value: {
        effectId: definition.id,
        clipName: detectClipTarget(trimmed),
        params,
      },
    };
  }

  private maybePreset(input: string, effectId: string): EffectPreset | null {
    const mentionsPreset =
      containsToken(input, "اقتراح") ||
      containsToken(input, "قاعدة") ||
      containsToken(input, "preset") ||
      containsToken(input, "recommend");
    if (!mentionsPreset) {
      return null;
    }
    return detectPreset(input, this.options.presets(effectId));
  }

  private extractParams(input: string, definition: EffectDefinition): ParameterValues {
    const extracted: ParameterValues = {};
    const hints = this.hintsByEffect.get(definition.id) ?? [];
    for (const hint of hints) {
      for (const keyword of hint.keywords) {
        const number = extractNumber(input, keyword);
        if (number !== null) {
          extracted[hint.paramId] = number;
          break;
        }
      }
    }
    for (const param of definition.parameters) {
      if (param.type === "enum") {
        const value = extractEnum(input, param);
        if (value !== null) {
          extracted[param.id] = value;
        }
      } else if (param.type === "string") {
        const text = extractQuotedText(input);
        if (text !== null) {
          extracted[param.id] = text;
        }
      }
    }
    return extracted;
  }
}
