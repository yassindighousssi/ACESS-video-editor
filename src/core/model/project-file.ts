import { Result, ErrorCode } from "../infrastructure/common/types";
import { Project } from "./entities";

const PROJECT_FORMAT = "tempo-project" as const;
const PROJECT_VERSION = 1 as const;

function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return { $bigint: value.toString() };
  }
  return value;
}

function bigintReviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$bigint === "string" && Object.keys(obj).length === 1) {
      return BigInt(obj.$bigint);
    }
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  const p = value;
  return (
    typeof p.id === "string" &&
    p.version === PROJECT_VERSION &&
    isRecord(p.metadata) &&
    Array.isArray(p.media) &&
    Array.isArray(p.tracks) &&
    Array.isArray(p.clips) &&
    Array.isArray(p.markers) &&
    Array.isArray(p.relationships) &&
    isRecord(p.journal) &&
    isRecord(p.modified)
  );
}

function isEnvelope(value: unknown): value is { format: string; version: number; project: Project } {
  if (!isRecord(value)) return false;
  return value.format === PROJECT_FORMAT && value.version === PROJECT_VERSION && isProject(value.project);
}

export function serializeProject(project: Project): Result<string, ErrorCode> {
  try {
    const projectJson = JSON.stringify(project, bigintReplacer);
    const envelope = JSON.stringify({ format: PROJECT_FORMAT, version: PROJECT_VERSION, project: JSON.parse(projectJson) }, null, 2);
    return { success: true, value: envelope };
  } catch {
    return { success: false, error: ErrorCode.OPERATION_FAILED };
  }
}

export function deserializeProject(json: string): Result<Project, ErrorCode> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json, bigintReviver);
  } catch {
    return { success: false, error: ErrorCode.CORRUPT_FILE };
  }
  if (!isEnvelope(parsed)) {
    return { success: false, error: ErrorCode.CORRUPT_FILE };
  }
  return { success: true, value: parsed.project };
}

export function serializeProjectToBytes(project: Project): Result<Uint8Array, ErrorCode> {
  const text = serializeProject(project);
  if (!text.success) return text;
  return { success: true, value: new TextEncoder().encode(text.value) };
}

export function deserializeProjectFromBytes(bytes: Uint8Array): Result<Project, ErrorCode> {
  return deserializeProject(new TextDecoder().decode(bytes));
}

export function projectRoundTrip(project: Project): Result<Project, ErrorCode> {
  const serialized = serializeProject(project);
  if (!serialized.success) return serialized;
  return deserializeProject(serialized.value);
}
