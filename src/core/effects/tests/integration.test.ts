import { EffectEngine } from "../engines/EffectEngine";
import { registerAllEffects, EFFECT_DEFINITIONS } from "../definitions";
import { loadPresets } from "../presets";
import { EffectError } from "../core/errors";
import { EffectDefinition, EffectPreset } from "../core/types";
import { makeClip, makeContext } from "./helpers";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";
import { ErrorCode } from "../../infrastructure/common/types";

describe("effects integration with the four infrastructure engines", () => {
  it("renders through a context backed by real time, file, memory and error engines", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    loadPresets(engine);
    const clip = makeClip("Interview", 0, 6000);

    engine.applyEffect(clip.id, "speed-change", { speed: 1.5 });
    engine.applyEffect(clip.id, "noise-reduction", { strength: 60 });

    const context = makeContext();
    const before = context.time.getSnapshot().seconds;
    const allocation = context.memory.allocate("render-buffer", 64, "temporary", "effects-render");
    expect(allocation.success).toBe(true);

    const result = engine.render(clip, context);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.effects.length).toBe(2);
      expect(result.value.effects[0]!.effectId).toBe("speed-change");
      expect(result.value.clip.duration.ticks.toString()).toBe((clip.duration.ticks / BigInt(15) * BigInt(10)).toString());
    }
    expect(context.time.getSnapshot().seconds).toBe(before);
    expect(context.memory.getStats().totalAllocated).toBeGreaterThan(0);
  });

  it("registers all definitions and exposes a complete catalog for the voice interface", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    loadPresets(engine);

    const catalog = EFFECT_DEFINITIONS.map(def => ({
      id: def.id,
      name: def.name,
      presets: engine.getPresets(def.id).length,
      parameters: def.parameters.length,
    }));
    expect(catalog).toHaveLength(12);
    for (const entry of catalog) {
      expect(entry.name).toContain("/");
      expect(entry.presets).toBeGreaterThan(0);
    }
  });

  it("reports errors through the context error engine and propagates failures", () => {
    const engine = new EffectEngine();
    const failingEffect: EffectDefinition = {
      id: "integration-fail",
      name: "Integration Fail / فشل",
      category: "transform",
      type: "video",
      description: "reports an error then fails",
      parameters: [],
      apply: (_clip, _params, context) => {
        const report = context.errors.report(ErrorCode.OPERATION_FAILED, {
          message: "Integration failure",
          source: "integration-test",
          operation: "apply",
        });
        return report.success
          ? { success: false, error: EffectError.EFFECT_APPLY_FAILED }
          : { success: false, error: EffectError.INVALID_INPUT };
      },
    };
    engine.registerEffect(failingEffect);
    const clip = makeClip();
    engine.applyEffect(clip.id, "integration-fail", {});

    const context = makeContext();
    const result = engine.render(clip, context);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_APPLY_FAILED);
    expect(context.errors.getStats().total).toBe(1);
  });

  it("persists applied effect settings as a serializable snapshot", () => {
    const engine = new EffectEngine();
    registerAllEffects(engine);
    loadPresets(engine);
    const clip = makeClip();
    engine.applyEffect(clip.id, "color-adjust", { brightness: 15, saturation: 20 });
    engine.applyEffect(clip.id, "zoom-rotate", { zoom: 1.2 });

    const snapshot = engine.getEffects(clip.id).map(applied => ({
      effectId: applied.effectId,
      params: applied.params,
    }));
    expect(snapshot).toEqual([
      { effectId: "color-adjust", params: { brightness: 15, contrast: 0, saturation: 20, hue: 0 } },
      { effectId: "zoom-rotate", params: { zoom: 1.2, rotate: 0, panX: 0, panY: 0 } },
    ]);

    const restored = new EffectEngine();
    registerAllEffects(restored);
    for (const item of snapshot) {
      const result = restored.applyEffect(clip.id, item.effectId, item.params);
      expect(result.success).toBe(true);
    }
    expect(restored.getEffects(clip.id).length).toBe(2);
  });
});

describe("preset files are readable through the file engine", () => {
  it("writes, reads and applies a preset stored as JSON", async () => {
    const fs = new MockFileSystem();
    const fileEngine = fileEngineForMock(fs);
    const preset: EffectPreset = {
      id: "preset-archive",
      name: "Archive / أرشيف",
      effectId: "color-adjust",
      parameters: { brightness: -5, saturation: -20 },
      description: "ألوان أرشيفية هادئة",
    };
    const payload = new TextEncoder().encode(JSON.stringify([preset]));
    const writeResult = await fileEngine.write("presets/color-archive.json", payload);
    expect(writeResult.success).toBe(true);

    const readResult = await fileEngine.read("presets/color-archive.json");
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      const decoded = new TextDecoder().decode(readResult.value);
      const parsed = JSON.parse(decoded) as EffectPreset[];
      expect(parsed.length).toBe(1);
      expect(parsed[0]!.effectId).toBe("color-adjust");

      const engine = new EffectEngine();
      registerAllEffects(engine);
      const clip = makeClip();
      const applied = engine.applyPreset(clip.id, parsed[0]!);
      expect(applied.success).toBe(true);
      if (applied.success) {
        expect(applied.value.params["brightness"]).toBe(-5);
      }
    }
  });

  it("reports FILE_NOT_FOUND for a missing preset file", async () => {
    const fileEngine = fileEngineForMock(new MockFileSystem());
    const result = await fileEngine.read("presets/does-not-exist.json");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
  });
});
