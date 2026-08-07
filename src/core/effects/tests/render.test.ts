import { EffectEngine } from "../engines/EffectEngine";
import { registerAllEffects } from "../definitions";
import { loadPresets } from "../presets";
import { EffectError } from "../core/errors";
import { EffectDefinition } from "../core/types";
import { makeClip, makeContext } from "./helpers";

function buildEngine(): EffectEngine {
  const engine = new EffectEngine();
  registerAllEffects(engine);
  loadPresets(engine);
  return engine;
}

describe("EffectEngine.render", () => {
  it("returns the clip untouched when no effects are applied", () => {
    const engine = buildEngine();
    const clip = makeClip();
    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.clip).toBe(clip);
      expect(result.value.effects).toEqual([]);
    }
  });

  it("applies a speed change during render and reports the description", () => {
    const engine = buildEngine();
    const clip = makeClip("Intro", 0, 4000);
    const originalTicks = clip.duration.ticks;
    engine.applyEffect(clip.id, "speed-change", { speed: 2 });

    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.clip.speed).toBe(2);
      expect(result.value.clip.duration.ticks.toString()).toBe((originalTicks / BigInt(2)).toString());
      expect(result.value.effects.length).toBe(1);
      expect(result.value.effects[0]!.effectId).toBe("speed-change");
      expect(result.value.effects[0]!.description.length).toBeGreaterThan(0);
    }
  });

  it("applies a chain of effects in application order", () => {
    const engine = buildEngine();
    const clip = makeClip("Intro", 0, 4000);
    engine.applyEffect(clip.id, "speed-change", { speed: 2 });
    engine.applyEffect(clip.id, "color-adjust", { brightness: 10 });
    engine.applyEffect(clip.id, "add-subtitles", { text: "مرحبًا", startTime: 0, duration: 2 });

    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      const ids = result.value.effects.map(item => item.effectId);
      expect(ids).toEqual(["speed-change", "color-adjust", "add-subtitles"]);
      expect(result.value.clip.speed).toBe(2);
    }
  });

  it("never mutates the original clip during render", () => {
    const engine = buildEngine();
    const clip = makeClip("Intro", 0, 4000);
    const originalSpeed = clip.speed;
    const originalDurationTicks = clip.duration.ticks;
    engine.applyEffect(clip.id, "speed-change", { speed: 4 });
    engine.applyEffect(clip.id, "reverse", {});

    engine.render(clip, makeContext());
    expect(clip.speed).toBe(originalSpeed);
    expect(clip.duration.ticks).toBe(originalDurationTicks);
    expect(clip.effects).toEqual([]);
  });

  it("fails with EFFECT_NOT_FOUND when an applied effect is no longer registered", () => {
    const engine = buildEngine();
    const clip = makeClip();
    engine.applyEffect(clip.id, "fade", { fadeType: "out" });
    engine.unregisterEffect("fade");

    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_NOT_FOUND);
  });

  it("propagates a failing apply function as the render error", () => {
    const engine = new EffectEngine();
    const failingEffect: EffectDefinition = {
      id: "failing",
      name: "Failing / فاشل",
      category: "color",
      type: "video",
      description: "always fails",
      parameters: [],
      apply: () => ({ success: false, error: EffectError.EFFECT_APPLY_FAILED }),
    };
    engine.registerEffect(failingEffect);
    const clip = makeClip();
    engine.applyEffect(clip.id, "failing", {});

    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_APPLY_FAILED);
  });

  it("returns every applied effect's accessible description in order", () => {
    const engine = buildEngine();
    const clip = makeClip();
    engine.applyEffect(clip.id, "auto-color", { strength: 90 });
    engine.applyEffect(clip.id, "zoom-rotate", { zoom: 2 });

    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      for (const item of result.value.effects) {
        expect(item.description.length).toBeGreaterThan(0);
        expect(item.name).toContain("/");
      }
    }
  });

  it("uses the engine's own registered names for each rendered effect", () => {
    const engine = buildEngine();
    const clip = makeClip();
    engine.applyEffect(clip.id, "reverb", { roomSize: 0.9 });
    const result = engine.render(clip, makeContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effects[0]!.name).toBe(engine.getEffectDefinition("reverb")!.name);
    }
  });
});
