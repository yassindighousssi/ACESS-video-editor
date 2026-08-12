import { EffectDefinition } from "../core/types";
import { EffectEngine } from "../engines/EffectEngine";
import { speedChangeEffect } from "./speed";
import { reverseEffect, zoomRotateEffect } from "./transform";
import { colorAdjustEffect, autoColorEffect } from "./color";
import { fadeEffect, transitionEffect } from "./fade";
import { noiseReductionEffect, reverbEffect } from "./audio";
import { addSubtitlesEffect } from "./text";
import { sttEffect, genBackgroundEffect } from "./generative";

export const EFFECT_DEFINITIONS: readonly EffectDefinition[] = [
  speedChangeEffect,
  reverseEffect,
  colorAdjustEffect,
  fadeEffect,
  noiseReductionEffect,
  reverbEffect,
  sttEffect,
  addSubtitlesEffect,
  zoomRotateEffect,
  genBackgroundEffect,
  autoColorEffect,
  transitionEffect,
];

export function registerAllEffects(engine: EffectEngine): number {
  const result = engine.registerMany(EFFECT_DEFINITIONS);
  return result.success ? result.value : 0;
}

export * from "./speed";
export * from "./transform";
export * from "./color";
export * from "./fade";
export * from "./audio";
export * from "./text";
export * from "./generative";
