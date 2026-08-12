import { EffectDefinition } from "../core/types";
import { numberParam, booleanParam } from "./param-utils";

export const colorAdjustEffect: EffectDefinition = {
  id: "color-adjust",
  name: "Color Adjust / ضبط الألوان",
  category: "color",
  type: "video",
  description: "يضبط سطوع المقطع وتباينه وتشبعه ودرجة لونه.",
  parameters: [
    {
      id: "brightness",
      name: "Brightness / السطوع",
      description: "تغيير السطوع: صفر بدون تغيير.",
      type: "number",
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "contrast",
      name: "Contrast / التباين",
      description: "تغيير التباين: صفر بدون تغيير.",
      type: "number",
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "saturation",
      name: "Saturation / التشبّع",
      description: "تغيير تشبّع الألوان: صفر بدون تغيير.",
      type: "number",
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "hue",
      name: "Hue / درجة اللون",
      description: "إزاحة درجة اللون بالدرجات.",
      type: "number",
      defaultValue: 0,
      min: -180,
      max: 180,
      step: 1,
      unit: "deg",
    },
  ],
  apply: (clip, params) => {
    const brightness = numberParam(params, "brightness", 0);
    const contrast = numberParam(params, "contrast", 0);
    const saturation = numberParam(params, "saturation", 0);
    const hue = numberParam(params, "hue", 0);
    return {
      success: true,
      value: {
        clip,
        description:
          `تم ضبط الألوان: سطوع ${brightness}% وتباين ${contrast}% وتشبّع ${saturation}% وإزاحة لون ${hue}°.`,
        renderData: { brightness, contrast, saturation, hue },
      },
    };
  },
};

export const autoColorEffect: EffectDefinition = {
  id: "auto-color",
  name: "Auto Color / تصحيح الألوان تلقائيًا",
  category: "color",
  type: "video",
  description: "يصحّح ألوان المقطع تلقائيًا لتحسين الوضوح وتوازن اللون الأبيض.",
  parameters: [
    {
      id: "strength",
      name: "Strength / القوة",
      description: "قوة التصحيح التلقائي.",
      type: "number",
      defaultValue: 80,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "whiteBalance",
      name: "White Balance / توازن الأبيض",
      description: "تفعيل تصحيح توازن اللون الأبيض.",
      type: "boolean",
      defaultValue: true,
    },
  ],
  apply: (clip, params) => {
    const strength = numberParam(params, "strength", 80);
    const whiteBalance = booleanParam(params, "whiteBalance", true);
    return {
      success: true,
      value: {
        clip,
        description:
          `تم تصحيح ألوان المقطع تلقائيًا بقوة ${strength}%${whiteBalance ? " مع" : " دون"} تصحيح توازن الأبيض.`,
        renderData: { strength, whiteBalance },
      },
    };
  },
};
