import { EffectDefinition } from "../core/types";
import { stringParam, numberParam } from "./param-utils";

export const fadeEffect: EffectDefinition = {
  id: "fade",
  name: "Fade / تلاشي",
  category: "transition",
  type: "video",
  description: "يضيف تلاشي ظهور أو اختفاء للمقطع (Fade In / Fade Out).",
  conflictsWith: ["transition", "reverse"],
  parameters: [
    {
      id: "fadeType",
      name: "Fade Type / نوع التلاشي",
      description: "تلاشي ظهور، اختفاء، أو الاثنان معًا.",
      type: "enum",
      defaultValue: "both",
      enumValues: [
        { label: "In / ظهور", value: "in" },
        { label: "Out / اختفاء", value: "out" },
        { label: "Both / الاثنان", value: "both" },
      ],
    },
    {
      id: "duration",
      name: "Duration / المدة",
      description: "مدة التلاشي بالثواني.",
      type: "number",
      defaultValue: 1,
      min: 0.1,
      max: 30,
      step: 0.1,
      unit: "s",
    },
    {
      id: "curve",
      name: "Curve / المنحنى",
      description: "شكل منحنى التلاشي.",
      type: "enum",
      defaultValue: "linear",
      enumValues: [
        { label: "Linear / خطي", value: "linear" },
        { label: "Ease In / تسارع", value: "ease-in" },
        { label: "Ease Out / تباطؤ", value: "ease-out" },
      ],
    },
  ],
  apply: (clip, params) => {
    const fadeType = stringParam(params, "fadeType", "both");
    const duration = numberParam(params, "duration", 1);
    const curve = stringParam(params, "curve", "linear");
    const typeLabel = fadeType === "in" ? "ظهور" : fadeType === "out" ? "اختفاء" : "ظهور واختفاء";
    return {
      success: true,
      value: {
        clip,
        description: `تمت إضافة تلاشي ${typeLabel} على المقطع لمدة ${duration} ثانية.`,
        renderData: { fadeType, duration, curve },
      },
    };
  },
};

export const transitionEffect: EffectDefinition = {
  id: "transition",
  name: "Transition / انتقال",
  category: "transition",
  type: "video",
  description: "يضيف انتقالًا بصريًا بين المقطع والمقطع الذي يليه.",
  conflictsWith: ["fade"],
  parameters: [
    {
      id: "transitionType",
      name: "Transition Type / نوع الانتقال",
      description: "نمط الانتقال البصري.",
      type: "enum",
      defaultValue: "dissolve",
      enumValues: [
        { label: "Dissolve / ذوبان", value: "dissolve" },
        { label: "Wipe / مسح", value: "wipe" },
        { label: "Slide / انزلاق", value: "slide" },
        { label: "Zoom / تكبير", value: "zoom" },
      ],
    },
    {
      id: "duration",
      name: "Duration / المدة",
      description: "مدة الانتقال بالثواني.",
      type: "number",
      defaultValue: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      unit: "s",
    },
    {
      id: "direction",
      name: "Direction / الاتجاه",
      description: "اتجاه تطبيق الانتقال.",
      type: "enum",
      defaultValue: "forward",
      enumValues: [
        { label: "Forward / للأمام", value: "forward" },
        { label: "Reverse / للخلف", value: "reverse" },
      ],
    },
  ],
  apply: (clip, params) => {
    const transitionType = stringParam(params, "transitionType", "dissolve");
    const duration = numberParam(params, "duration", 1);
    const direction = stringParam(params, "direction", "forward");
    return {
      success: true,
      value: {
        clip,
        description: `تمت إضافة انتقال ${transitionType} بين المقطع والذي يليه لمدة ${duration} ثانية.`,
        renderData: { transitionType, duration, direction },
      },
    };
  },
};
