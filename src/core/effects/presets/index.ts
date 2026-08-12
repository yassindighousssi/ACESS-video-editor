import { EffectPreset } from "../core/types";
import { EffectEngine } from "../engines/EffectEngine";
import speedChangePresets from "./speed-change.json";
import reversePresets from "./reverse.json";
import colorAdjustPresets from "./color-adjust.json";
import fadePresets from "./fade.json";
import noiseReductionPresets from "./noise-reduction.json";
import reverbPresets from "./reverb.json";
import sttPresets from "./stt.json";
import addSubtitlesPresets from "./add-subtitles.json";
import zoomRotatePresets from "./zoom-rotate.json";
import genBackgroundPresets from "./gen-background.json";
import autoColorPresets from "./auto-color.json";
import transitionPresets from "./transition.json";

interface PresetGroup {
  readonly effectId: string;
  readonly presets: readonly EffectPreset[];
}

export const PRESET_GROUPS: readonly PresetGroup[] = [
  { effectId: "speed-change", presets: speedChangePresets },
  { effectId: "reverse", presets: reversePresets },
  { effectId: "color-adjust", presets: colorAdjustPresets },
  { effectId: "fade", presets: fadePresets },
  { effectId: "noise-reduction", presets: noiseReductionPresets },
  { effectId: "reverb", presets: reverbPresets },
  { effectId: "stt", presets: sttPresets },
  { effectId: "add-subtitles", presets: addSubtitlesPresets },
  { effectId: "zoom-rotate", presets: zoomRotatePresets },
  { effectId: "gen-background", presets: genBackgroundPresets },
  { effectId: "auto-color", presets: autoColorPresets },
  { effectId: "transition", presets: transitionPresets },
];

export function loadPresets(engine: EffectEngine): number {
  let count = 0;
  for (const group of PRESET_GROUPS) {
    engine.setPresets(group.effectId, group.presets);
    count += group.presets.length;
  }
  return count;
}
