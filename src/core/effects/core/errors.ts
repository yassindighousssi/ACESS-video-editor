export const EffectError = {
  EFFECT_NOT_FOUND: "FX_EFFECT_NOT_FOUND",
  EFFECT_ALREADY_REGISTERED: "FX_EFFECT_ALREADY_REGISTERED",
  EFFECT_APPLY_FAILED: "FX_EFFECT_APPLY_FAILED",
  EFFECT_CONFLICT: "FX_EFFECT_CONFLICT",
  EFFECT_PARAM_MISSING: "FX_EFFECT_PARAM_MISSING",
  EFFECT_PARAM_INVALID: "FX_EFFECT_PARAM_INVALID",
  EFFECT_PARAM_OUT_OF_RANGE: "FX_EFFECT_PARAM_OUT_OF_RANGE",
  CLIP_NOT_FOUND: "FX_CLIP_NOT_FOUND",
  INVALID_INPUT: "FX_INVALID_INPUT",
} as const;

export type EffectError = (typeof EffectError)[keyof typeof EffectError];

export const EffectErrorMessages: Record<EffectError, { en: string; ar: string }> = {
  [EffectError.EFFECT_NOT_FOUND]: { en: "Effect is not registered.", ar: "التأثير غير مسجل." },
  [EffectError.EFFECT_ALREADY_REGISTERED]: { en: "Effect is already registered.", ar: "التأثير مسجل مسبقًا." },
  [EffectError.EFFECT_APPLY_FAILED]: { en: "Failed to apply effect.", ar: "فشل تطبيق التأثير." },
  [EffectError.EFFECT_CONFLICT]: { en: "Effect conflicts with another applied effect.", ar: "التأثير يتعارض مع تأثير آخر مطبق." },
  [EffectError.EFFECT_PARAM_MISSING]: { en: "A required parameter is missing.", ar: "معلمة مطلوبة غير موجودة." },
  [EffectError.EFFECT_PARAM_INVALID]: { en: "A parameter value is invalid.", ar: "قيمة معلمة غير صالحة." },
  [EffectError.EFFECT_PARAM_OUT_OF_RANGE]: { en: "A parameter value is out of range.", ar: "قيمة المعلمة خارج النطاق المسموح." },
  [EffectError.CLIP_NOT_FOUND]: { en: "Clip not found.", ar: "المقطع غير موجود." },
  [EffectError.INVALID_INPUT]: { en: "Invalid input provided.", ar: "مدخلات غير صالحة." },
};
