import { Result, ErrorCode } from "../infrastructure/common/types";
import { AnalysisResult, MediaType } from "../model/entities";
import { FrameRate } from "../model/types";

export interface MediaProbe {
  readonly mediaType: MediaType;
  readonly durationMs: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly frameRate: FrameRate | null;
  readonly sampleRate: number | null;
  readonly channels: number | null;
  readonly bitrate: number;
  readonly container: string;
  readonly codec: string;
}

export interface IMediaEngine {
  probeBytes(data: Uint8Array): Result<MediaProbe, ErrorCode>;
  analyzeBytes(data: Uint8Array): Result<AnalysisResult, ErrorCode>;
}
