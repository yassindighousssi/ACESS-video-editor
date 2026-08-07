import { Result } from "../../infrastructure/common/types";
import { EffectError } from "./errors";
import { EffectDefinition, EffectParameter, ParameterKind, ParameterValue, ParameterValues } from "./types";

const EXPECTED_KIND: Readonly<Record<ParameterKind, "number" | "boolean" | "string">> = {
  number: "number",
  boolean: "boolean",
  string: "string",
  enum: "string",
  color: "string",
  file: "string",
};

function kindMatches(param: EffectParameter, value: ParameterValue): boolean {
  return typeof value === EXPECTED_KIND[param.type];
}

export function normalizeParams(def: EffectDefinition, params: Partial<ParameterValues>): ParameterValues {
  const merged: ParameterValues = {};
  for (const param of def.parameters) {
    merged[param.id] = param.defaultValue;
  }
  for (const [key, value] of Object.entries(params)) {
    if (def.parameters.some(param => param.id === key)) {
      merged[key] = value as ParameterValue;
    }
  }
  return merged;
}

export function validateParamValue(param: EffectParameter, value: ParameterValue): Result<ParameterValue, EffectError> {
  if (!kindMatches(param, value)) {
    return { success: false, error: EffectError.EFFECT_PARAM_INVALID };
  }
  if (param.type === "number") {
    const num = value as number;
    if (Number.isNaN(num)) {
      return { success: false, error: EffectError.EFFECT_PARAM_INVALID };
    }
    if (param.min !== undefined && num < param.min) {
      return { success: false, error: EffectError.EFFECT_PARAM_OUT_OF_RANGE };
    }
    if (param.max !== undefined && num > param.max) {
      return { success: false, error: EffectError.EFFECT_PARAM_OUT_OF_RANGE };
    }
  }
  if (param.type === "enum") {
    const choices = param.enumValues ?? [];
    if (choices.length > 0 && !choices.some(choice => choice.value === value)) {
      return { success: false, error: EffectError.EFFECT_PARAM_INVALID };
    }
  }
  return { success: true, value };
}

export function validateParams(def: EffectDefinition, params: Partial<ParameterValues>): Result<ParameterValues, EffectError> {
  const merged = normalizeParams(def, params);
  for (const param of def.parameters) {
    const value = merged[param.id];
    if (value === undefined) {
      return { success: false, error: EffectError.EFFECT_PARAM_MISSING };
    }
    const validated = validateParamValue(param, value);
    if (!validated.success) {
      return validated;
    }
    merged[param.id] = validated.value;
  }
  return { success: true, value: merged };
}
