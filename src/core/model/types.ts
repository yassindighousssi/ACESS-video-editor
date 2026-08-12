import { randomUUID } from "crypto";

export type ProjectId = string & { __brand: "ProjectId" };
export type EntityId = string & { __brand: "EntityId" };
export type RelationshipId = string & { __brand: "RelationshipId" };
export type TransactionId = string & { __brand: "TransactionId" };

export const ModelError = {
  ENTITY_NOT_FOUND: "MODEL_ENTITY_NOT_FOUND",
  MEDIA_ASSET_NOT_FOUND: "MODEL_MEDIA_ASSET_NOT_FOUND",
  TRACK_NOT_FOUND: "MODEL_TRACK_NOT_FOUND",
  CLIP_NOT_FOUND: "MODEL_CLIP_NOT_FOUND",
  TRACK_LOCKED: "MODEL_TRACK_LOCKED",
  CLIP_LOCKED: "MODEL_CLIP_LOCKED",
  CLIP_OVERLAP: "MODEL_CLIP_OVERLAP",
  INCOMPATIBLE_MEDIA: "MODEL_INCOMPATIBLE_MEDIA",
  INVALID_TIME: "MODEL_INVALID_TIME",
  NEGATIVE_DURATION: "MODEL_NEGATIVE_DURATION",
  SPLIT_POINT_OUT_OF_BOUNDS: "MODEL_SPLIT_POINT_OUT_OF_BOUNDS",
  NOT_ADJACENT: "MODEL_NOT_ADJACENT",
  INVALID_INPUT: "MODEL_INVALID_INPUT",
  TRACK_NOT_EMPTY: "MODEL_TRACK_NOT_EMPTY",
  TRANSITION_REQUIRED: "MODEL_TRANSITION_REQUIRED",
  OPERATION_FAILED: "MODEL_OPERATION_FAILED",
} as const;

export type ModelError = (typeof ModelError)[keyof typeof ModelError];

export interface TimeValue {
  readonly ticks: bigint;
}

export function timeValueFromMs(ms: number): TimeValue {
  return { ticks: BigInt(Math.round(ms * 1_000_000)) };
}

export function timeValueFromSeconds(s: number): TimeValue {
  return { ticks: BigInt(Math.round(s * 1_000_000_000)) };
}

export function timeValueToMs(tv: TimeValue): number {
  return Number(tv.ticks) / 1_000_000;
}

export function timeValueAdd(a: TimeValue, b: TimeValue): TimeValue {
  return { ticks: a.ticks + b.ticks };
}

export function timeValueSub(a: TimeValue, b: TimeValue): TimeValue {
  return { ticks: a.ticks - b.ticks };
}

export function timeValueCmp(a: TimeValue, b: TimeValue): number {
  if (a.ticks > b.ticks) return 1;
  if (a.ticks < b.ticks) return -1;
  return 0;
}

export function timeValueMin(...args: TimeValue[]): TimeValue {
  return args.reduce((a, b) => timeValueCmp(a, b) <= 0 ? a : b);
}

export function isZeroOrPositive(tv: TimeValue): boolean {
  return tv.ticks >= BigInt(0);
}

export interface Frame {
  readonly index: number;
  readonly frameRate: FrameRate;
}

export type FrameRate = 24 | 25 | 30 | 60;

export interface Resolution {
  readonly width: number;
  readonly height: number;
}

export type AnnouncementLevel = "all" | "important" | "critical_only";

export interface Timestamp {
  readonly iso: string;
  readonly unix: bigint;
}

export function createTimestamp(): Timestamp {
  const now = Date.now();
  return {
    iso: new Date(now).toISOString(),
    unix: BigInt(now) * BigInt(1_000_000),
  };
}

export function frameToTimeValue(frame: Frame): TimeValue {
  const ns = (BigInt(frame.index) * BigInt(1_000_000_000)) / BigInt(frame.frameRate);
  return { ticks: ns };
}

export function timeValueToFrame(tv: TimeValue, fps: FrameRate): Frame {
  const nsPerFrame = 1_000_000_000 / fps;
  return { index: Math.round(Number(tv.ticks) / nsPerFrame), frameRate: fps };
}

export function projectId(): ProjectId {
  return randomUUID() as ProjectId;
}

export function entityId(): EntityId {
  return randomUUID() as EntityId;
}

export function relationshipId(): RelationshipId {
  return randomUUID() as RelationshipId;
}

export function transactionId(): TransactionId {
  return randomUUID() as TransactionId;
}
