import { Result, ErrorCode, ErrorSeverity } from "../common/types";
import { IErrorEngine } from "../engines/error/error-engine.interface";
import { IFileEngine } from "../engines/file/file-engine.interface";
import { IMemoryEngine } from "../engines/memory/memory-engine.interface";
import { ITimeEngine } from "../engines/time/time-engine.interface";
import { TimeSnapshot } from "../engines/time/time-engine.interface";

export interface InfrastructureState {
  initialized: boolean;
  engineCount: number;
  errorsReported: number;
  memoryUsed: number;
  timeElapsed: number;
}

export class Orchestrator {
  constructor(
    public readonly error: IErrorEngine,
    public readonly file: IFileEngine,
    public readonly memory: IMemoryEngine,
    public readonly time: ITimeEngine,
  ) {}

  async initialize(): Promise<Result<void, ErrorCode>> {
    this.error.clear();
    this.memory.clear();
    this.time.reset(0);
    return { success: true, value: undefined };
  }

  getState(): InfrastructureState {
    const memStats = this.memory.getStats();
    const timeSnap = this.time.getSnapshot();
    return {
      initialized: true,
      engineCount: 4,
      errorsReported: this.error.getStats().total,
      memoryUsed: memStats.totalAllocated,
      timeElapsed: timeSnap.seconds,
    };
  }

  async loadFile(path: string): Promise<Result<Uint8Array, ErrorCode>> {
    const exists = await this.file.exists(path);
    if (!exists.success) return exists;
    if (!exists.value) {
      return { success: false, error: ErrorCode.FILE_NOT_FOUND };
    }
    const read = await this.file.read(path);
    return read;
  }

  async saveFile(path: string, data: Uint8Array): Promise<Result<void, ErrorCode>> {
    const blockSize = data.length;
    const alloc = this.memory.allocate(`file:${path}`, blockSize, "temporary", "file-write");
    if (!alloc.success) return alloc;
    const write = await this.file.write(path, data);
    if (!write.success) {
      this.memory.deallocate(alloc.value.id);
      return write;
    }
    return { success: true, value: undefined };
  }

  async advancePlayback(ms: number): Promise<Result<TimeSnapshot, ErrorCode>> {
    const snap = this.time.advanceMs(ms);
    if (!snap.success) {
      this.error.report(ErrorCode.INVALID_INPUT, {
        message: `Failed to advance playback: ${snap.error}`,
        severity: ErrorSeverity.Warning,
        source: "Orchestrator",
      });
    }
    return snap;
  }

  shutdown(): void {
    this.memory.collectGarbage();
    this.memory.clear();
    this.error.clear();
  }
}
