import { EffectDefinition } from "../core/types";
import { stringParam, numberParam } from "./param-utils";

export const addSubtitlesEffect: EffectDefinition = {
  id: "add-subtitles",
  name: "Add Subtitles / إضافة ترجمة",
  category: "text",
  type: "both",
  description: "يضيف ترجمة نصية تظهر فوق المقطع في وقت ومدة محددين.",
  parameters: [
    {
      id: "text",
      name: "Text / النص",
      description: "نص الترجمة.",
      type: "string",
      defaultValue: "",
    },
    {
      id: "startTime",
      name: "Start Time / وقت الظهور",
      description: "الوقت (بالثواني من بداية المقطع) الذي تظهر فيه الترجمة.",
      type: "number",
      defaultValue: 0,
      min: 0,
      step: 0.1,
      unit: "s",
    },
    {
      id: "duration",
      name: "Duration / المدة",
      description: "مدة بقاء الترجمة على الشاشة بالثواني.",
      type: "number",
      defaultValue: 3,
      min: 0.1,
      max: 60,
      step: 0.1,
      unit: "s",
    },
    {
      id: "fontSize",
      name: "Font Size / حجم الخط",
      description: "حجم خط الترجمة بالبكسل.",
      type: "number",
      defaultValue: 24,
      min: 12,
      max: 72,
      step: 1,
      unit: "px",
    },
    {
      id: "color",
      name: "Color / اللون",
      description: "لون نص الترجمة.",
      type: "color",
      defaultValue: "#FFFFFF",
    },
  ],
  apply: (clip, params) => {
    const text = stringParam(params, "text", "");
    const startTime = numberParam(params, "startTime", 0);
    const duration = numberParam(params, "duration", 3);
    const fontSize = numberParam(params, "fontSize", 24);
    const color = stringParam(params, "color", "#FFFFFF");
    return {
      success: true,
      value: {
        clip,
        description:
          `تمت إضافة الترجمة "${text}" من ثانية ${startTime} ولمدة ${duration} ثانية بحجم خط ${fontSize} وباللون ${color}.`,
        renderData: { caption: { text, startTime, duration, fontSize, color } },
      },
    };
  },
};
