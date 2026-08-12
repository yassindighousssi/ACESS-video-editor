import { EFFECT_DEFINITIONS, registerAllEffects } from "../definitions";
import { loadPresets } from "../presets";
import { EffectEngine } from "../engines/EffectEngine";
import { EffectError } from "../core/errors";
import { VoiceCommandParser } from "../ui/voice-command-parser";

function buildParser(): VoiceCommandParser {
  const engine = new EffectEngine();
  registerAllEffects(engine);
  loadPresets(engine);
  const definitions = new Map(EFFECT_DEFINITIONS.map(def => [def.id, def]));
  return new VoiceCommandParser({
    definitions,
    presets: effectId => engine.getPresets(effectId),
  });
}

describe("VoiceCommandParser", () => {
  const parser = buildParser();

  it("parses the canonical Arabic speed command", () => {
    const result = parser.parse("تطبيق تأثير تغيير السرعة على المقطع الحالي، سرعة 2x");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("speed-change");
      expect(result.value.clipName).toBeNull();
      expect(result.value.params["speed"]).toBe(2);
    }
  });

  it("parses the English equivalent", () => {
    const result = parser.parse("apply speed-change to current clip");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("speed-change");
      expect(result.value.clipName).toBeNull();
    }
  });

  it("parses an Arabic reverse command", () => {
    const result = parser.parse("تطبيق تأثير عكس المقطع");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("reverse");
    }
  });

  it("resolves a suggested preset and merges its parameters", () => {
    const result = parser.parse("تطبيق اقتراح Slow Motion");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("speed-change");
      expect(result.value.presetId).toBe("preset-slow-motion");
      expect(result.value.params["speed"]).toBe(0.5);
    }
  });

  it("parses an Arabic preset suggestion", () => {
    const result = parser.parse("تطبيق اقتراح حركة بطيئة");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.presetId).toBe("preset-slow-motion");
    }
  });

  it("captures a named clip target", () => {
    const result = parser.parse("تطبيق تأثير تلاشي على المقطع اللقاء");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("fade");
      expect(result.value.clipName).toBe("اللقاء");
    }
  });

  it("captures a numbered clip target", () => {
    const result = parser.parse("تطبيق تأثير تلاشي على المقطع 1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.clipName).toBe("1");
    }
  });

  it("extracts an enum choice for fade type", () => {
    const result = parser.parse("تطبيق تلاشي ظهور");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("fade");
      expect(result.value.params["fadeType"]).toBe("in");
    }
  });

  it("extracts an enum choice for transition type", () => {
    const result = parser.parse("تطبيق انتقال ذوبان");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("transition");
      expect(result.value.params["transitionType"]).toBe("dissolve");
    }
  });

  it("extracts zoom and rotation numbers", () => {
    const result = parser.parse("تطبيق تكبير وتدوير على المقطع الحالي، تكبير 1.5 وتدوير 45");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("zoom-rotate");
      expect(result.value.params["zoom"]).toBe(1.5);
      expect(result.value.params["rotate"]).toBe(45);
    }
  });

  it("extracts quoted subtitle text", () => {
    const result = parser.parse('تطبيق ترجمة على المقطع الحالي "مرحبًا بالعالم"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("add-subtitles");
      expect(result.value.params["text"]).toBe("مرحبًا بالعالم");
    }
  });

  it("extracts the stt language from a label", () => {
    const result = parser.parse("تطبيق تحويل الكلام إلى نص باللغة الإنجليزية");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("stt");
      expect(result.value.params["language"]).toBe("en");
    }
  });

  it("rejects an empty command", () => {
    const result = parser.parse("   ");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.INVALID_INPUT);
  });

  it("rejects a command with no recognized effect", () => {
    const result = parser.parse("تطبيق تأثير وامض متحرك");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.INVALID_INPUT);
  });
});
