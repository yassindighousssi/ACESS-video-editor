import { Result, ErrorCode } from "../../common/types";
import { ITimeEngine, TimeSnapshot, FrameRate } from "./time-engine.interface";

export class TimeEngine implements ITimeEngine {
  private startTime: number;
  private currentTime: number;
  private frameRate: FrameRate = 30;
  private speed: number = 1;

  constructor(initialTime: number = Date.now()) {
    this.startTime = initialTime;
    this.currentTime = initialTime;
  }

  now(): number {
    return this.currentTime;
  }

  reset(timestamp?: number): void {
    this.currentTime = timestamp ?? Date.now();
    this.startTime = this.currentTime;
  }

  advanceFrame(): Result<TimeSnapshot, ErrorCode> {
    const frameDuration = (1000 / this.frameRate) * this.speed;
    this.currentTime += frameDuration;
    return { success: true, value: this.buildSnapshot() };
  }

  advanceMs(ms: number): Result<TimeSnapshot, ErrorCode> {
    if (ms < 0) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    this.currentTime += ms * this.speed;
    return { success: true, value: this.buildSnapshot() };
  }

  setRate(fps: FrameRate): void {
    this.frameRate = fps;
  }

  getRate(): FrameRate {
    return this.frameRate;
  }

  getSnapshot(): TimeSnapshot {
    return this.buildSnapshot();
  }

  setSpeed(factor: number): void {
    this.speed = Math.max(0.1, Math.min(10, factor));
  }

  getSpeed(): number {
    return this.speed;
  }

  private buildSnapshot(): TimeSnapshot {
    const elapsed = this.currentTime - this.startTime;
    const frameCount = Math.floor((elapsed * this.frameRate) / 1000);
    return {
      frameNumber: frameCount,
      seconds: this.currentTime / 1000,
      timestamp: this.currentTime,
      rate: this.frameRate,
    };
  }
}
