import { Clip } from "../../model/entities";
import { EntityId } from "../../model/types";
import { Result } from "../../infrastructure/common/types";
import { ITimeEngine } from "../../infrastructure/engines/time/time-engine.interface";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";
import { IMemoryEngine } from "../../infrastructure/engines/memory/memory-engine.interface";
import { IErrorEngine } from "../../infrastructure/engines/error/error-engine.interface";
import { EffectError } from "./errors";

export type EffectType = "video" | "audio" | "both";
export type EffectCategory = "color" | "speed" | "transform" | "audio-fx" | "transition" | "text" | "generative";

export type ParameterValue = number | boolean | string;
export type ParameterValues = Record<string, ParameterValue>;

export type ParameterKind = "number" | "boolean" | "string" | "enum" | "color" | "file";

export interface EffectParameter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: ParameterKind;
  readonly defaultValue: ParameterValue;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly enumValues?: readonly { readonly label: string; readonly value: ParameterValue }[];
  readonly unit?: string;
}

export interface EffectApplyResult {
  readonly clip: Clip;
  readonly description: string;
  readonly renderData: Record<string, unknown>;
}

export type EffectApplyFn = (
  clip: Clip,
  params: ParameterValues,
  context: RenderContext,
) => Result<EffectApplyResult, EffectError>;

export interface EffectDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: EffectCategory;
  readonly type: EffectType;
  readonly description: string;
  readonly parameters: readonly EffectParameter[];
  readonly conflictsWith?: readonly string[];
  readonly apply: EffectApplyFn;
}

export interface EffectPreset {
  readonly id: string;
  readonly name: string;
  readonly effectId: string;
  readonly parameters: ParameterValues;
  readonly description: string;
}

export interface AppliedEffect {
  readonly id: string;
  readonly effectId: string;
  readonly clipId: EntityId;
  readonly params: ParameterValues;
  readonly appliedAt: string;
}

export interface RenderContext {
  readonly time: ITimeEngine;
  readonly file: IFileEngine;
  readonly memory: IMemoryEngine;
  readonly errors: IErrorEngine;
}

export interface RenderEffectResult {
  readonly effectId: string;
  readonly name: string;
  readonly description: string;
  readonly renderData: Record<string, unknown>;
}

export interface RenderResult {
  readonly clip: Clip;
  readonly effects: readonly RenderEffectResult[];
}

export interface ClipResolver {
  (clipId: EntityId): Clip | undefined;
}
