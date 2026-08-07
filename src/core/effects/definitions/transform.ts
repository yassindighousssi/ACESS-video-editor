import { EffectDefinition } from "../core/types";
import { numberParam } from "./param-utils";

export const reverseEffect: EffectDefinition = {
  id: "reverse",
  name: "Reverse / عكس المقطع",
  category: "transform",
  type: "video",
  description: "يعكس المقطع زمنياً: يبدأ من النهاية وينتهي بالبداية.",
  parameters: [],
  apply: (clip) => {
    return {
      success: true,
      value: {
        clip,
        description: "تم عكس المقطع زمنياً. ستظهر اللقطات من النهاية إلى البداية.",
        renderData: { reversed: true },
      },
    };
  },
};

export const zoomRotateEffect: EffectDefinition = {
  id: "zoom-rotate",
  name: "Zoom & Rotate / تكبير وتدوير",
  category: "transform",
  type: "video",
  description: "يُكبّر المقطع ويدوّره ويحرّكه في الإطار دون تغيير الملف الأصلي.",
  parameters: [
    {
      id: "zoom",
      name: "Zoom / التكبير",
      description: "عامل التكبير: 1.0 هو الحجم الأصلي.",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.05,
      unit: "x",
    },
    {
      id: "rotate",
      name: "Rotation / الدوران",
      description: "زاوية الدوران بالدرجات.",
      type: "number",
      defaultValue: 0,
      min: -360,
      max: 360,
      step: 1,
      unit: "deg",
    },
    {
      id: "panX",
      name: "Pan X / التحريك الأفقي",
      description: "الإزاحة الأفقية كنسبة مئوية من عرض الإطار.",
      type: "number",
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      unit: "%",
    },
    {
      id: "panY",
      name: "Pan Y / التحريك العمودي",
      description: "الإزاحة العمودية كنسبة مئوية من ارتفاع الإطار.",
      type: "number",
      defaultValue: 0,
      min: -100,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  apply: (clip, params) => {
    const zoom = numberParam(params, "zoom", 1.0);
    const rotate = numberParam(params, "rotate", 0);
    const panX = numberParam(params, "panX", 0);
    const panY = numberParam(params, "panY", 0);
    return {
      success: true,
      value: {
        clip,
        description:
          `تم تكبير المقطع بمعامل ${zoom}x وتدويره ${rotate} درجة وتحريكه أفقيًا ${panX}% وعموديًا ${panY}%.`,
        renderData: { zoom, rotate, panX, panY },
      },
    };
  },
};
