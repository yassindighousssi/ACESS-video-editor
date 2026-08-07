import { EffectError } from "../core/errors";
import { EffectDefinition } from "../core/types";
import { Clip } from "../../model/entities";
import { normalizeParams, validateParamValue, validateParams } from "../core/validate";
import { speedChangeEffect } from "../definitions/speed";

describe("normalizeParams", () => {
  it("fills every parameter with its default when nothing is provided", () => {
    const merged = normalizeParams(speedChangeEffect, {});
    expect(merged["speed"]).toBe(1.0);
    expect(merged["preservePitch"]).toBe(true);
  });

  it("overrides defaults with provided values", () => {
    const merged = normalizeParams(speedChangeEffect, { speed: 2 });
    expect(merged["speed"]).toBe(2);
    expect(merged["preservePitch"]).toBe(true);
  });

  it("drops unknown keys that are not declared parameters", () => {
    const merged = normalizeParams(speedChangeEffect, { unknownParam: 99 });
    expect(merged["unknownParam"]).toBeUndefined();
  });
});

describe("validateParamValue", () => {
  it("accepts a number within range", () => {
    const param = speedChangeEffect.parameters[0]!;
    const result = validateParamValue(param, 1.5);
    expect(result.success).toBe(true);
  });

  it("rejects a number below the minimum", () => {
    const param = speedChangeEffect.parameters[0]!;
    const result = validateParamValue(param, 0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_OUT_OF_RANGE);
  });

  it("rejects a number above the maximum", () => {
    const param = speedChangeEffect.parameters[0]!;
    const result = validateParamValue(param, 6);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_OUT_OF_RANGE);
  });

  it("rejects NaN", () => {
    const param = speedChangeEffect.parameters[0]!;
    const result = validateParamValue(param, NaN);
    expect(result.success).toBe(false);
  });

  it("rejects a string where a number is expected", () => {
    const param = speedChangeEffect.parameters[0]!;
    const result = validateParamValue(param, "fast");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_INVALID);
  });
});

describe("validateParams", () => {
  it("accepts an empty object using only defaults", () => {
    const result = validateParams(speedChangeEffect, {});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value["speed"]).toBe(1.0);
    }
  });

  it("rejects out-of-range values with the out-of-range code", () => {
    const result = validateParams(speedChangeEffect, { speed: 12 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_OUT_OF_RANGE);
  });

  it("rejects invalid enum values", () => {
    const def: EffectDefinition = {
      id: "enum-test",
      name: "Enum Test",
      category: "color",
      type: "video",
      description: "test",
      parameters: [
        {
          id: "mode",
          name: "Mode",
          description: "mode",
          type: "enum",
          defaultValue: "a",
          enumValues: [
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ],
        },
      ],
      apply: clip => ({ success: true, value: { clip, description: "ok", renderData: {} } }),
    };
    const result = validateParams(def, { mode: "z" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_INVALID);
  });

  it("accepts valid enum values", () => {
    const def: EffectDefinition = {
      id: "enum-test-2",
      name: "Enum Test",
      category: "color",
      type: "video",
      description: "test",
      parameters: [
        {
          id: "mode",
          name: "Mode",
          description: "mode",
          type: "enum",
          defaultValue: "a",
          enumValues: [
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ],
        },
      ],
      apply: clip => ({ success: true, value: { clip, description: "ok", renderData: {} } }),
    };
    const result = validateParams(def, { mode: "b" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.value["mode"]).toBe("b");
  });

  it("accepts an enum value when the parameter has no declared choices", () => {
    const def: EffectDefinition = {
      id: "enum-no-choices",
      name: "Enum Test",
      category: "color",
      type: "video",
      description: "test",
      parameters: [
        {
          id: "mode",
          name: "Mode",
          description: "mode",
          type: "enum",
          defaultValue: "a",
        },
      ],
      apply: clip => ({ success: true, value: { clip, description: "ok", renderData: {} } }),
    };
    const result = validateParams(def, { mode: "a" });
    expect(result.success).toBe(true);
  });

  it("reports a missing parameter when the default is undefined", () => {
    const def = {
      id: "missing-test",
      name: "Missing Test",
      category: "color",
      type: "video",
      description: "test",
      parameters: [
        {
          id: "amount",
          name: "Amount",
          description: "amount",
          type: "number",
          defaultValue: undefined,
        },
      ],
      apply: (clip: Clip) => ({ success: true, value: { clip, description: "ok", renderData: {} } }),
    } as unknown as EffectDefinition;
    const result = validateParams(def, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(EffectError.EFFECT_PARAM_MISSING);
  });
});
