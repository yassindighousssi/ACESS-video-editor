import { EffectDefinition } from "../core/types";
import { timeValueFromMs, timeValueToMs } from "../../model/types";
import { numberParam, booleanParam } from "./param-utils";

export const speedChangeEffect: EffectDefinition = {
  id: "speed-change",
  name: "Speed Change / تغيير السرعة",
  category: "speed",
  type: "video",
  description: "يغير سرعة تشغيل المقطع. القيمة 1.0 تعني السرعة الأصلية، وأقل من 1 إبطاء وأكثر من 1 تسريع.",
  parameters: [
    {
      id: "speed",
      name: "Speed / السرعة",
      description: "عامل السرعة: أقل من 1 بطيء، وأكثر من 1 سريع.",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 5.0,
      step: 0.05,
      unit: "x",
    },
    {
      id: "preservePitch",
      name: "Preserve Pitch / الحفاظ على الطبقة الصوتية",
      description: "الحفاظ على طبقة الصوت الأصلية عند تغيير السرعة.",
      type: "boolean",
      defaultValue: true,
    },
  ],
  apply: (clip, params) => {
    const speed = numberParam(params, "speed", 1.0);
    const preservePitch = booleanParam(params, "preservePitch", true);
    const originalMs = timeValueToMs(clip.duration);
    const newDuration = timeValueFromMs(originalMs / speed);
    return {
      success: true,
      value: {
        clip: { ...clip, speed, duration: newDuration },
        description:
          `تم تغيير سرعة المقطع إلى ${speed}x، فأصبحت مدته ${(originalMs / speed / 1000).toFixed(2)} ثانية.`,
        renderData: { speed, preservePitch },
      },
    };
  },
};
