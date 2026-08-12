import { randomUUID } from "crypto";
import { Clip } from "../../model/entities";
import { EntityId } from "../../model/types";
import { Result } from "../../infrastructure/common/types";
import { EffectError } from "../core/errors";
import { validateParams } from "../core/validate";
import {
  AppliedEffect, ClipResolver, EffectDefinition, EffectPreset, ParameterValues, RenderContext, RenderEffectResult, RenderResult,
} from "../core/types";

export class EffectEngine {
  private readonly definitions = new Map<string, EffectDefinition>();
  private readonly applied = new Map<EntityId, AppliedEffect[]>();
  private readonly presets = new Map<string, EffectPreset[]>();

  constructor(private readonly clipResolver?: ClipResolver) {}

  registerEffect(def: EffectDefinition): Result<void, EffectError> {
    if (this.definitions.has(def.id)) {
      return { success: false, error: EffectError.EFFECT_ALREADY_REGISTERED };
    }
    this.definitions.set(def.id, def);
    return { success: true, value: undefined };
  }

  registerMany(defs: readonly EffectDefinition[]): Result<number, EffectError> {
    let count = 0;
    for (const def of defs) {
      const result = this.registerEffect(def);
      if (!result.success) {
        return result;
      }
      count += 1;
    }
    return { success: true, value: count };
  }

  unregisterEffect(effectId: string): Result<void, EffectError> {
    if (!this.definitions.has(effectId)) {
      return { success: false, error: EffectError.EFFECT_NOT_FOUND };
    }
    this.definitions.delete(effectId);
    this.presets.delete(effectId);
    return { success: true, value: undefined };
  }

  getEffectDefinition(effectId: string): EffectDefinition | undefined {
    return this.definitions.get(effectId);
  }

  getRegisteredEffectIds(): string[] {
    return [...this.definitions.keys()];
  }

  applyEffect(clipId: EntityId, effectId: string, params: ParameterValues): Result<AppliedEffect, EffectError> {
    const definition = this.definitions.get(effectId);
    if (definition === undefined) {
      return { success: false, error: EffectError.EFFECT_NOT_FOUND };
    }
    if (this.clipResolver !== undefined && this.clipResolver(clipId) === undefined) {
      return { success: false, error: EffectError.CLIP_NOT_FOUND };
    }
    const validated = validateParams(definition, params);
    if (!validated.success) {
      return validated;
    }
    const existing = this.applied.get(clipId) ?? [];
    if (definition.conflictsWith !== undefined) {
      for (const conflict of definition.conflictsWith) {
        if (existing.some(applied => applied.effectId === conflict)) {
          return { success: false, error: EffectError.EFFECT_CONFLICT };
        }
      }
    }
    const applied: AppliedEffect = {
      id: randomUUID(),
      effectId,
      clipId,
      params: validated.value,
      appliedAt: new Date().toISOString(),
    };
    this.applied.set(clipId, [...existing, applied]);
    return { success: true, value: applied };
  }

  applyPreset(clipId: EntityId, preset: EffectPreset): Result<AppliedEffect, EffectError> {
    return this.applyEffect(clipId, preset.effectId, preset.parameters);
  }

  removeEffect(clipId: EntityId, effectId: string): Result<void, EffectError> {
    const existing = this.applied.get(clipId) ?? [];
    const index = findLastIndex(existing, applied => applied.effectId === effectId);
    if (index === -1) {
      return { success: false, error: EffectError.EFFECT_NOT_FOUND };
    }
    const remaining = existing.filter((_, i) => i !== index);
    if (remaining.length === 0) {
      this.applied.delete(clipId);
    } else {
      this.applied.set(clipId, remaining);
    }
    return { success: true, value: undefined };
  }

  getEffects(clipId: EntityId): AppliedEffect[] {
    return [...(this.applied.get(clipId) ?? [])];
  }

  hasEffects(clipId: EntityId): boolean {
    return (this.applied.get(clipId)?.length ?? 0) > 0;
  }

  setPresets(effectId: string, presets: readonly EffectPreset[]): void {
    this.presets.set(effectId, [...presets]);
  }

  getPresets(effectId: string): EffectPreset[] {
    return [...(this.presets.get(effectId) ?? [])];
  }

  render(clip: Clip, context: RenderContext): Result<RenderResult, EffectError> {
    const list = this.applied.get(clip.id) ?? [];
    if (list.length === 0) {
      return { success: true, value: { clip, effects: [] } };
    }
    let current = clip;
    const rendered: RenderEffectResult[] = [];
    for (const applied of list) {
      const definition = this.definitions.get(applied.effectId);
      if (definition === undefined) {
        return { success: false, error: EffectError.EFFECT_NOT_FOUND };
      }
      const outcome = definition.apply(current, applied.params, context);
      if (!outcome.success) {
        return outcome;
      }
      rendered.push({
        effectId: definition.id,
        name: definition.name,
        description: outcome.value.description,
        renderData: outcome.value.renderData,
      });
      current = outcome.value.clip;
    }
    return { success: true, value: { clip: current, effects: rendered } };
  }
}

function findLastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i] as T)) {
      return i;
    }
  }
  return -1;
}
