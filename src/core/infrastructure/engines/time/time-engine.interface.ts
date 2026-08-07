import { Result, ErrorCode } from "../../common/types";

export interface TimeSnapshot {
  frameNumber: number;
  seconds: number;
  timestamp: number;
  rate: number;
}

export type FrameRate = 24 | 25 | 30 | 48 | 50 | 60 | 120;

export interface ITimeEngine {
  now(): number;
  reset(timestamp?: number): void;
  advanceFrame(): Result<TimeSnapshot, ErrorCode>;
  advanceMs(ms: number): Result<TimeSnapshot, ErrorCode>;
  setRate(fps: FrameRate): void;
  getRate(): FrameRate;
  getSnapshot(): TimeSnapshot;
  setSpeed(factor: number): void;
  getSpeed(): number;
}
