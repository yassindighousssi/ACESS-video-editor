import { EffectEngine } from "../engines/EffectEngine";
import { registerAllEffects } from "../definitions";
import { loadPresets, PRESET_GROUPS } from "../presets";
import { EffectError } from "../core/errors";
import { EntityId } from "../../model/types";
import { Clip } from "../../model/entities";
import { EffectDefinition, EffectPreset } from "../core/types";
import { makeClip, makeEntityId } from "./helpers";

function buildEngine(clipResolver?: (id: EntityId) => Clip | undefined): EffectEngine {
  const engine = new EffectEngine(clipResolver);
  registerAllEffects(engine);
  loadPresets(engine);
  return engine;
}

describe("EffectEngine registration", () => {
  it("registers all 12 built-in effects", () => {
    const engine = buildEngine();
    expect(engine.getRegisteredEffectIds().length).toBe(12);
  });

  it("rejects duplicate registration", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    const result = engine.registerEffect(engine.getEffectDefinition("fade")!);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_ALREADY_REGISTERED);
  });

  it("counts successful batch registrations", () => {
    const engine = new EffectEngine();
    const customDefinition = createCustomDefinition("batch-fade");
    const result = engine.registerMany([customDefinition]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(1);
    expect(engine.getRegisteredEffectIds()).toEqual(["batch-fade"]);
  });

  it("fails a batch registration on the first duplicate definition", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    const result = engine.registerMany([createCustomDefinition("fade")]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_ALREADY_REGISTERED);
  });

  it("returns zero when registerAllEffects hits a duplicate", () => {
    const seeded = new EffectEngine();
    registerAllEffects(seeded);
    const fadeDefinition = seeded.getEffectDefinition("fade")!;
    const engine = new EffectEngine();
    engine.registerEffect(fadeDefinition);
    const count = registerAllEffects(engine);
    expect(count).toBe(0);
  });

  it("unregisters an effect and returns not-found for unknown ids", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    const missing = engine.unregisterEffect("does-not-exist");
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error).toBe(EffectError.EFFECT_NOT_FOUND);

    const removed = engine.unregisterEffect("fade");
    expect(removed.success).toBe(true);
    expect(engine.getEffectDefinition("fade")).toBeUndefined();
  });

  it("unregistering an effect removes its definition and presets but keeps applied instances visible", () => {
    const clip = makeClip();
    const engine = new EffectEngine(clipResolverWith([clip]));
    registerAllEffects(engine);
    loadPresets(engine);
    engine.applyEffect(clip.id, "fade", { fadeType: "out" });
    expect(engine.hasEffects(clip.id)).toBe(true);

    engine.unregisterEffect("fade");
    expect(engine.getEffectDefinition("fade")).toBeUndefined();
    expect(engine.getPresets("fade").length).toBe(0);
    expect(engine.getEffects(clip.id).length).toBe(1);
  });

  it("looks up definitions and exposes all registered ids", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    expect(engine.getEffectDefinition("reverse")).toBeDefined();
    expect(engine.getRegisteredEffectIds()).toContain("stt");
  });
});

describe("EffectEngine application", () => {
  it("applies an effect with normalized parameters", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const result = engine.applyEffect(clip.id, "speed-change", { speed: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("speed-change");
      expect(result.value.clipId).toBe(clip.id);
      expect(result.value.params["speed"]).toBe(2);
      expect(result.value.params["preservePitch"]).toBe(true);
      expect(result.value.appliedAt.length).toBeGreaterThan(0);
    }
  });

  it("returns not-found for an unregistered effect", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const result = engine.applyEffect(clip.id, "blur", {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_NOT_FOUND);
  });

  it("returns clip-not-found when the resolver cannot find the clip", () => {
    const engine = new EffectEngine(() => undefined);
    registerAllEffects(engine);
    const result = engine.applyEffect(makeEntityId(), "fade", {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.CLIP_NOT_FOUND);
  });

  it("rejects out-of-range parameters at apply time", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const result = engine.applyEffect(clip.id, "speed-change", { speed: 99 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_OUT_OF_RANGE);
  });

  it("rejects an effect that conflicts with an already-applied one", () => {
    const clip = makeClip();
    const engine = buildEngine();
    engine.applyEffect(clip.id, "reverse", {});
    const result = engine.applyEffect(clip.id, "fade", { fadeType: "out" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_CONFLICT);
  });

  it("allows the same effect multiple times and removes the latest occurrence", () => {
    const clip = makeClip();
    const engine = buildEngine();
    engine.applyEffect(clip.id, "fade", { fadeType: "in", duration: 1 });
    engine.applyEffect(clip.id, "fade", { fadeType: "out", duration: 2 });
    expect(engine.getEffects(clip.id).length).toBe(2);

    const removed = engine.removeEffect(clip.id, "fade");
    expect(removed.success).toBe(true);
    const remaining = engine.getEffects(clip.id);
    expect(remaining.length).toBe(1);
    if (remaining[0] !== undefined) expect(remaining[0].params["duration"]).toBe(1);
  });

  it("reports not-found when removing an effect that was never applied", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const result = engine.removeEffect(clip.id, "reverb");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_NOT_FOUND);
  });

  it("applies a preset through its parameters", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const preset: EffectPreset = {
      id: "custom-preset",
      name: "Custom / مخصص",
      effectId: "speed-change",
      parameters: { speed: 3 },
      description: "custom",
    };
    const result = engine.applyPreset(clip.id, preset);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effectId).toBe("speed-change");
      expect(result.value.params["speed"]).toBe(3);
    }
  });

  it("rejects a preset whose effect is not registered", () => {
    const clip = makeClip();
    const engine = buildEngine();
    const preset: EffectPreset = {
      id: "ghost",
      name: "Ghost",
      effectId: "not-registered",
      parameters: {},
      description: "ghost",
    };
    const result = engine.applyPreset(clip.id, preset);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_NOT_FOUND);
  });
});

describe("EffectEngine presets", () => {
  it("stores and returns presets per effect id", () => {
    const engine = buildEngine();
    expect(engine.getPresets("speed-change").length).toBe(3);
    expect(engine.getPresets("reverse").length).toBe(1);
  });

  it("returns an empty list for effects without presets", () => {
    const engine = buildEngine();
    expect(engine.getPresets("not-an-effect")).toEqual([]);
  });

  it("loads presets for every built-in effect group", () => {
    expect(PRESET_GROUPS.length).toBe(12);
    const total = PRESET_GROUPS.reduce((sum, group) => sum + group.presets.length, 0);
    expect(total).toBeGreaterThanOrEqual(12);
  });
});

describe("EffectEngine applied bookkeeping", () => {
  it("tracks applied effects per clip and clears them on removal", () => {
    const clip = makeClip();
    const engine = buildEngine();
    expect(engine.hasEffects(clip.id)).toBe(false);
    engine.applyEffect(clip.id, "color-adjust", { brightness: 10 });
    expect(engine.hasEffects(clip.id)).toBe(true);
    engine.removeEffect(clip.id, "color-adjust");
    expect(engine.hasEffects(clip.id)).toBe(false);
  });

  it("does not share applied state between clips", () => {
    const clipA = makeClip("A");
    const clipB = makeClip("B");
    const engine = buildEngine();
    engine.applyEffect(clipA.id, "reverb", {});
    expect(engine.getEffects(clipA.id).length).toBe(1);
    expect(engine.getEffects(clipB.id).length).toBe(0);
  });
});

function clipResolverWith(clips: readonly Clip[]) {
  return (id: EntityId) => clips.find(clip => clip.id === id);
}

function createCustomDefinition(id: string): EffectDefinition {
  return {
    id,
    name: `${id} / مخصص`,
    category: "color",
    type: "video",
    description: "custom test definition",
    parameters: [],
    apply: (clip: Clip) => ({ success: true, value: { clip, description: "ok", renderData: {} } }),
  };
}
