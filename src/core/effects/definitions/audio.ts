import { EffectDefinition } from "../core/types";
import { numberParam } from "./param-utils";

export const noiseReductionEffect: EffectDefinition = {
  id: "noise-reduction",
  name: "Noise Reduction / تقليل الضوضاء",
  category: "audio-fx",
  type: "audio",
  description: "يقلل ضوضاء الخلفية في صوت المقطع.",
  parameters: [
    {
      id: "strength",
      name: "Strength / القوة",
      description: "قوة تقليل الضوضاء.",
      type: "number",
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "sensitivity",
      name: "Sensitivity / الحساسية",
      description: "حساسية كشف الضوضاء.",
      type: "number",
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  apply: (clip, params) => {
    const strength = numberParam(params, "strength", 50);
    const sensitivity = numberParam(params, "sensitivity", 50);
    return {
      success: true,
      value: {
        clip,
        description: `تم تقليل ضوضاء المقطع بقوة ${strength}% وحساسية ${sensitivity}%.`,
        renderData: { strength, sensitivity },
      },
    };
  },
};

export const reverbEffect: EffectDefinition = {
  id: "reverb",
  name: "Reverb / الصدى",
  category: "audio-fx",
  type: "audio",
  description: "يضيف صدى صوتيًا للمقطع ليمنحه مساحة صوتية أوسع.",
  parameters: [
    {
      id: "roomSize",
      name: "Room Size / حجم الغرفة",
      description: "حجم المساحة الصوتية الوهمية.",
      type: "number",
      defaultValue: 0.5,
      min: 0.1,
      max: 1.0,
      step: 0.01,
      unit: "x",
    },
    {
      id: "wetLevel",
      name: "Wet Level / مستوى الصدى",
      description: "مستوى الصوت بعد المعالجة (الصدى).",
      type: "number",
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "dryLevel",
      name: "Dry Level / مستوى الصوت الأصلي",
      description: "مستوى الصوت الأصلي غير المعالج.",
      type: "number",
      defaultValue: 100,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  apply: (clip, params) => {
    const roomSize = numberParam(params, "roomSize", 0.5);
    const wetLevel = numberParam(params, "wetLevel", 50);
    const dryLevel = numberParam(params, "dryLevel", 100);
    return {
      success: true,
      value: {
        clip,
        description: `تمت إضافة صدى بحجم غرفة ${roomSize}x ومستوى ${wetLevel}% مع بقاء الصوت الأصلي ${dryLevel}%.`,
        renderData: { roomSize, wetLevel, dryLevel },
      },
    };
  },
};
