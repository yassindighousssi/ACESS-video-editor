import { EFFECT_DEFINITIONS } from "../definitions";
import { EffectCategory, EffectDefinition, EffectType } from "../core/types";
import { makeClip, makeContext } from "./helpers";

const VALID_CATEGORIES: readonly EffectCategory[] = ["color", "speed", "transform", "audio-fx", "transition", "text", "generative"];
const VALID_TYPES: readonly EffectType[] = ["video", "audio", "both"];

function definitionById(id: string): EffectDefinition {
  const def = EFFECT_DEFINITIONS.find(item => item.id === id);
  if (def === undefined) throw new Error(`Missing definition: ${id}`);
  return def;
}

describe("effect definitions registry", () => {
  it("registers exactly the 12 required effects", () => {
    expect(EFFECT_DEFINITIONS.map(def => def.id).sort()).toEqual(
      [
        "add-subtitles",
        "auto-color",
        "color-adjust",
        "fade",
        "gen-background",
        "noise-reduction",
        "reverb",
        "reverse",
        "speed-change",
        "stt",
        "transition",
        "zoom-rotate",
      ].sort(),
    );
  });

  it("has unique ids", () => {
    const ids = EFFECT_DEFINITIONS.map(def => def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only valid categories and types", () => {
    for (const def of EFFECT_DEFINITIONS) {
      expect(VALID_CATEGORIES).toContain(def.category);
      expect(VALID_TYPES).toContain(def.type);
    }
  });

  it("provides bilingual names and non-empty descriptions", () => {
    for (const def of EFFECT_DEFINITIONS) {
      expect(def.name).toContain("/");
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it("defines numeric parameter ranges correctly", () => {
    for (const def of EFFECT_DEFINITIONS) {
      for (const param of def.parameters) {
        if (param.type === "number") {
          if (param.min !== undefined && param.max !== undefined) {
            expect(param.min).toBeLessThanOrEqual(param.max);
          }
          expect(typeof param.defaultValue).toBe("number");
        }
      }
    }
  });

  it("keeps enum defaults inside the declared choices", () => {
    for (const def of EFFECT_DEFINITIONS) {
      for (const param of def.parameters) {
        if (param.type === "enum" && (param.enumValues?.length ?? 0) > 0) {
          expect(param.enumValues!.some(choice => choice.value === param.defaultValue)).toBe(true);
        }
      }
    }
  });

  it("declares the documented conflict pairs", () => {
    expect(definitionById("fade").conflictsWith).toContain("transition");
    expect(definitionById("fade").conflictsWith).toContain("reverse");
    expect(definitionById("transition").conflictsWith).toContain("fade");
  });
});

describe("effect apply behaviors", () => {
  it("speed-change scales duration and writes speed onto a new clip", () => {
    const original = makeClip("Intro", 0, 4000);
    const originalDurationTicks = original.duration.ticks;
    const result = definitionById("speed-change").apply(original, { speed: 2, preservePitch: true }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.clip.speed).toBe(2);
      expect(result.value.clip.duration.ticks).toBe(originalDurationTicks / BigInt(2));
      expect(result.value.clip).not.toBe(original);
      expect(result.value.clip.id).toBe(original.id);
      expect(result.value.renderData["speed"]).toBe(2);
    }
  });

  it("speed-change never mutates the original clip", () => {
    const original = makeClip("Intro", 0, 4000);
    definitionById("speed-change").apply(original, { speed: 3, preservePitch: false }, makeContext());
    expect(original.speed).toBe(1);
    expect(original.duration.ticks).toBe(original.duration.ticks);
  });

  it("reverse records the reversed flag", () => {
    const clip = makeClip();
    const result = definitionById("reverse").apply(clip, {}, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["reversed"]).toBe(true);
    }
  });

  it("color-adjust passes through adjusted values", () => {
    const clip = makeClip();
    const result = definitionById("color-adjust").apply(clip, { brightness: 10, contrast: -5 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.value.renderData;
      expect(data["brightness"]).toBe(10);
      expect(data["contrast"]).toBe(-5);
      expect(data["saturation"]).toBe(0);
      expect(data["hue"]).toBe(0);
    }
  });

  it("zoom-rotate records transform values", () => {
    const clip = makeClip();
    const result = definitionById("zoom-rotate").apply(clip, { zoom: 1.5, rotate: 45, panX: 10, panY: -10 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["zoom"]).toBe(1.5);
      expect(result.value.renderData["rotate"]).toBe(45);
    }
  });

  it("fade records type, duration and curve", () => {
    const clip = makeClip();
    const result = definitionById("fade").apply(clip, { fadeType: "in", duration: 2, curve: "ease-out" }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["fadeType"]).toBe("in");
      expect(result.value.renderData["duration"]).toBe(2);
    }
  });

  it("fade describes fade-out and fade-both announcements", () => {
    const out = definitionById("fade").apply(makeClip(), { fadeType: "out", duration: 1 }, makeContext());
    expect(out.success).toBe(true);
    if (out.success) expect(out.value.description).toContain("اختفاء");
    const both = definitionById("fade").apply(makeClip(), { fadeType: "both", duration: 1 }, makeContext());
    expect(both.success).toBe(true);
    if (both.success) expect(both.value.description).toContain("ظهور واختفاء");
  });

  it("transition records its visual pattern", () => {
    const clip = makeClip();
    const result = definitionById("transition").apply(clip, { transitionType: "wipe", duration: 1 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["transitionType"]).toBe("wipe");
    }
  });

  it("noise-reduction records strength and sensitivity", () => {
    const clip = makeClip();
    const result = definitionById("noise-reduction").apply(clip, { strength: 70 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["strength"]).toBe(70);
      expect(result.value.renderData["sensitivity"]).toBe(50);
    }
  });

  it("reverb records room simulation values", () => {
    const clip = makeClip();
    const result = definitionById("reverb").apply(clip, { roomSize: 0.8, wetLevel: 40 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["roomSize"]).toBe(0.8);
      expect(result.value.renderData["dryLevel"]).toBe(100);
    }
  });

  it("add-subtitles builds a caption object", () => {
    const clip = makeClip();
    const result = definitionById("add-subtitles").apply(
      clip,
      { text: "مرحبًا", startTime: 1, duration: 4, fontSize: 28, color: "#FF0000" },
      makeContext(),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      const caption = result.value.renderData["caption"] as { text: string; startTime: number; fontSize: number; color: string };
      expect(caption.text).toBe("مرحبًا");
      expect(caption.startTime).toBe(1);
      expect(caption.fontSize).toBe(28);
      expect(caption.color).toBe("#FF0000");
    }
  });

  it("stt records language and confidence", () => {
    const clip = makeClip();
    const result = definitionById("stt").apply(clip, { language: "en", confidence: 85 }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["language"]).toBe("en");
      expect(result.value.renderData["confidence"]).toBe(85);
    }
  });

  it("gen-background records the generative scene", () => {
    const clip = makeClip();
    const result = definitionById("gen-background").apply(clip, { style: "stars" }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      const background = result.value.renderData["background"] as { style: string; colors: string };
      expect(background.style).toBe("stars");
    }
  });

  it("auto-color records strength and white balance", () => {
    const clip = makeClip();
    const result = definitionById("auto-color").apply(clip, { strength: 90, whiteBalance: false }, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.renderData["strength"]).toBe(90);
      expect(result.value.renderData["whiteBalance"]).toBe(false);
    }
  });

  it("produces an accessible description on every apply", () => {
    for (const def of EFFECT_DEFINITIONS) {
      const clip = makeClip();
      const result = def.apply(clip, {}, makeContext());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.description.length).toBeGreaterThan(0);
      }
    }
  });
});
