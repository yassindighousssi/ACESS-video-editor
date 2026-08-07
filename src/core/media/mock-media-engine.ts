import { Result, ErrorCode } from "../infrastructure/common/types";
import { AnalysisResult, MediaType } from "../model/entities";
import { createTimestamp, FrameRate } from "../model/types";
import { IMediaEngine, MediaProbe } from "./media-engine.interface";

const MAGIC = "TEMPOMEDIA:";

export interface MockMediaSpec {
  readonly kind: MediaType;
  readonly durationMs: number;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly frameRate?: FrameRate | null;
  readonly sampleRate?: number | null;
  readonly channels?: number | null;
  readonly bitrate?: number;
  readonly container?: string;
  readonly codec?: string;
}

export function encodeMockMedia(spec: MockMediaSpec): Uint8Array {
  const payload = {
    kind: spec.kind,
    durationMs: spec.durationMs,
    width: spec.width ?? null,
    height: spec.height ?? null,
    frameRate: spec.frameRate ?? null,
    sampleRate: spec.sampleRate ?? null,
    channels: spec.channels ?? null,
    bitrate: spec.bitrate ?? 0,
    container: spec.container ?? "unknown",
    codec: spec.codec ?? "unknown",
  };
  return new TextEncoder().encode(MAGIC + JSON.stringify(payload));
}

function isMediaType(value: unknown): value is MediaType {
  return value === "video" || value === "audio" || value === "image";
}

export class MockMediaEngine implements IMediaEngine {
  probeBytes(data: Uint8Array): Result<MediaProbe, ErrorCode> {
    const decoded = new TextDecoder().decode(data);
    if (!decoded.startsWith(MAGIC)) {
      return { success: false, error: ErrorCode.UNSUPPORTED_FORMAT };
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(decoded.slice(MAGIC.length)) as Record<string, unknown>;
    } catch {
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
    if (!isMediaType(parsed["kind"])) {
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
    return {
      success: true,
      value: {
        mediaType: parsed["kind"],
        durationMs: Number(parsed["durationMs"] ?? 0),
        width: parsed["width"] as number | null,
        height: parsed["height"] as number | null,
        frameRate: parsed["frameRate"] as FrameRate | null,
        sampleRate: parsed["sampleRate"] as number | null,
        channels: parsed["channels"] as number | null,
        bitrate: Number(parsed["bitrate"] ?? 0),
        container: String(parsed["container"] ?? "unknown"),
        codec: String(parsed["codec"] ?? "unknown"),
      },
    };
  }

  analyzeBytes(data: Uint8Array): Result<AnalysisResult, ErrorCode> {
    const probe = this.probeBytes(data);
    if (!probe.success) {
      return { success: false, error: ErrorCode.MEDIA_ANALYSIS_FAILED };
    }
    const info = probe.value;
    const parts = [`${info.mediaType}`, `${info.durationMs}ms`];
    if (info.width !== null && info.height !== null) {
      parts.push(`${info.width}x${info.height}`);
    }
    if (info.codec !== "unknown") {
      parts.push(info.codec);
    }
    return {
      success: true,
      value: {
        summary: parts.join(", "),
        data: { ...info },
        analyzedAt: createTimestamp(),
      },
    };
  }
}
