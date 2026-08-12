import { EffectDefinition } from "../core/types";
import { stringParam, numberParam } from "./param-utils";

export const sttEffect: EffectDefinition = {
  id: "stt",
  name: "Speech to Text / تحويل الكلام إلى نص",
  category: "generative",
  type: "audio",
  description: "يحوّل الكلام في المقطع إلى نص مكتوب (تعرف آلي على الكلام).",
  parameters: [
    {
      id: "language",
      name: "Language / اللغة",
      description: "لغة الكلام في المقطع.",
      type: "enum",
      defaultValue: "ar",
      enumValues: [
        { label: "Arabic / العربية", value: "ar" },
        { label: "English / الإنجليزية", value: "en" },
        { label: "French / الفرنسية", value: "fr" },
      ],
    },
    {
      id: "confidence",
      name: "Confidence / نسبة الثقة",
      description: "الحد الأدنى لنسبة الثقة المطلوبة لقبول النص الناتج.",
      type: "number",
      defaultValue: 70,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  apply: (clip, params) => {
    const language = stringParam(params, "language", "ar");
    const confidence = numberParam(params, "confidence", 70);
    return {
      success: true,
      value: {
        clip,
        description:
          `تم تفعيل تحويل الكلام إلى نص باللغة ${language} مع نسبة ثقة ${confidence}%. سيظهر النص بعد المعالجة.`,
        renderData: { transcript: [], engine: "stt", language, confidence },
      },
    };
  },
};

export const genBackgroundEffect: EffectDefinition = {
  id: "gen-background",
  name: "Generative Background / خلفية مولّدة",
  category: "generative",
  type: "video",
  description: "يولّد خلفية متحركة (متحرك متدرج، جزيئات، أو نجوم) خلف المقطع.",
  parameters: [
    {
      id: "style",
      name: "Style / النمط",
      description: "نمط الخلفية المولّدة.",
      type: "enum",
      defaultValue: "gradient",
      enumValues: [
        { label: "Gradient / متدرج", value: "gradient" },
        { label: "Particles / جزيئات", value: "particles" },
        { label: "Stars / نجوم", value: "stars" },
      ],
    },
    {
      id: "colors",
      name: "Colors / الألوان",
      description: "قائمة ألوان مفصولة بفواصل، مثال: #000000,#FFFFFF.",
      type: "string",
      defaultValue: "#000000,#FFFFFF",
    },
    {
      id: "speed",
      name: "Speed / سرعة الحركة",
      description: "سرعة حركة عناصر الخلفية.",
      type: "number",
      defaultValue: 20,
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  apply: (clip, params) => {
    const style = stringParam(params, "style", "gradient");
    const colors = stringParam(params, "colors", "#000000,#FFFFFF");
    const speed = numberParam(params, "speed", 20);
    return {
      success: true,
      value: {
        clip,
        description: `تمت إضافة خلفية مولّدة بنمط ${style} وألوان ${colors} وسرعة ${speed}%.`,
        renderData: { background: { style, colors, speed } },
      },
    };
  },
};
