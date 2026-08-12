import { ErrorCode, ErrorSeverity, ErrorCategory, ErrorMessages, classifyError } from "../common/types";

// ─── Mock File System ────────────────────────────────────────────────────

interface MockFileEntry {
  content: Uint8Array;
  createdAt: number;
  modifiedAt: number;
  permissions: "read" | "write" | "readwrite";
}

export class MockFileSystem {
  private files: Map<string, MockFileEntry> = new Map();
  private diskLimit: number = Infinity;
  private diskUsage: number = 0;
  private operationLog: string[] = [];
  private corruptPaths: Set<string> = new Set();
  private readErrorPaths: Set<string> = new Set();
  private writeErrorPaths: Set<string> = new Set();

  setDiskLimit(bytes: number): void {
    this.diskLimit = bytes;
  }

  simulateFullDisk(): void {
    this.diskLimit = 0;
  }

  simulateCorruptFile(path: string): void {
    this.corruptPaths.add(path);
  }

  simulateReadError(path: string): void {
    this.readErrorPaths.add(path);
  }

  simulateWriteError(path: string): void {
    this.writeErrorPaths.add(path);
  }

  normalizePath(path: string): string {
    return path.replace(/[/\\]+/g, "/").replace(/^\.\/|^\//, "");
  }

  createFile(path: string, content: Uint8Array): { success: true } | { success: false; error: typeof ErrorCode.DISK_FULL } {
    const normalized = this.normalizePath(path);
    const size = content.length;
    if (this.diskUsage + size > this.diskLimit) {
      this.operationLog.push(`CREATE_FAIL:DISK_FULL:${normalized}`);
      return { success: false, error: ErrorCode.DISK_FULL };
    }
    this.files.set(normalized, {
      content,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      permissions: "readwrite",
    });
    this.diskUsage += size;
    this.operationLog.push(`CREATE:${normalized}:${size}B`);
    return { success: true };
  }

  readFile(path: string): { success: true; data: Uint8Array } | { success: false; error: typeof ErrorCode.FILE_NOT_FOUND | typeof ErrorCode.FILE_READ_ERROR | typeof ErrorCode.CORRUPT_FILE } {
    const normalized = this.normalizePath(path);
    if (!this.files.has(normalized)) {
      this.operationLog.push(`READ_FAIL:NOT_FOUND:${normalized}`);
      return { success: false, error: ErrorCode.FILE_NOT_FOUND };
    }
    if (this.readErrorPaths.has(normalized)) {
      this.operationLog.push(`READ_FAIL:READ_ERROR:${normalized}`);
      return { success: false, error: ErrorCode.FILE_READ_ERROR };
    }
    if (this.corruptPaths.has(normalized)) {
      this.operationLog.push(`READ_FAIL:CORRUPT:${normalized}`);
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
    const entry = this.files.get(normalized)!;
    this.operationLog.push(`READ:${normalized}:${entry.content.length}B`);
    return { success: true, data: entry.content };
  }

  writeFile(path: string, content: Uint8Array): { success: true } | { success: false; error: typeof ErrorCode.DISK_FULL | typeof ErrorCode.FILE_WRITE_ERROR | typeof ErrorCode.INVALID_PATH } {
    const normalized = this.normalizePath(path);
    if (path.length > 260) {
      return { success: false, error: ErrorCode.INVALID_PATH };
    }
    if (this.writeErrorPaths.has(normalized)) {
      this.operationLog.push(`WRITE_FAIL:WRITE_ERROR:${normalized}`);
      return { success: false, error: ErrorCode.FILE_WRITE_ERROR };
    }
    const oldSize = this.files.has(normalized) ? this.files.get(normalized)!.content.length : 0;
    const newSize = content.length;
    const delta = newSize - oldSize;
    if (this.diskUsage + delta > this.diskLimit) {
      this.operationLog.push(`WRITE_FAIL:DISK_FULL:${normalized}`);
      return { success: false, error: ErrorCode.DISK_FULL };
    }
    this.files.set(normalized, {
      content,
      createdAt: this.files.has(normalized) ? this.files.get(normalized)!.createdAt : Date.now(),
      modifiedAt: Date.now(),
      permissions: "readwrite",
    });
    this.diskUsage += delta;
    this.operationLog.push(`WRITE:${normalized}:${newSize}B`);
    return { success: true };
  }

  deleteFile(path: string): { success: true } | { success: false; error: typeof ErrorCode.FILE_NOT_FOUND } {
    const normalized = this.normalizePath(path);
    if (!this.files.has(normalized)) {
      this.operationLog.push(`DELETE_FAIL:NOT_FOUND:${normalized}`);
      return { success: false, error: ErrorCode.FILE_NOT_FOUND };
    }
    const size = this.files.get(normalized)!.content.length;
    this.files.delete(normalized);
    this.diskUsage -= size;
    this.operationLog.push(`DELETE:${normalized}:${size}B`);
    return { success: true };
  }

  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path));
  }

  listDirectory(dir: string): string[] {
    const normalized = this.normalizePath(dir);
    const prefix = normalized ? normalized + "/" : "";
    return Array.from(this.files.keys())
      .filter(k => k.startsWith(prefix) && k !== normalized)
      .map(k => k.replace(prefix, ""));
  }

  getDiskUsage(): number {
    return this.diskUsage;
  }

  getDiskLimit(): number {
    return this.diskLimit;
  }

  clear(): void {
    this.files.clear();
    this.diskUsage = 0;
    this.diskLimit = Infinity;
    this.operationLog = [];
    this.corruptPaths.clear();
    this.readErrorPaths.clear();
    this.writeErrorPaths.clear();
  }

  getOperationLog(): string[] {
    return [...this.operationLog];
  }

  clearOperationLog(): void {
    this.operationLog = [];
  }
}

// ─── Mock Time ──────────────────────────────────────────────────────────

export class MockTime {
  private currentTime: number = 0;
  private speed: number = 1;
  private paused: boolean = false;
  private operationLog: string[] = [];

  setTime(ms: number): void {
    this.currentTime = ms;
    this.operationLog.push(`SET_TIME:${ms}`);
  }

  advance(ms: number): number {
    if (this.paused) return this.currentTime;
    const delta = ms * this.speed;
    this.currentTime += delta;
    this.operationLog.push(`ADVANCE:${ms}ms*${this.speed}x=${delta}ms`);
    return this.currentTime;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  setSpeed(factor: number): void {
    this.speed = factor;
    this.operationLog.push(`SET_SPEED:${factor}`);
  }

  getSpeed(): number {
    return this.speed;
  }

  pause(): void {
    this.paused = true;
    this.operationLog.push("PAUSE");
  }

  resume(): void {
    this.paused = false;
    this.operationLog.push("RESUME");
  }

  isPaused(): boolean {
    return this.paused;
  }

  reset(): void {
    this.currentTime = 0;
    this.speed = 1;
    this.paused = false;
    this.operationLog = [];
  }

  getOperationLog(): string[] {
    return [...this.operationLog];
  }
}

// ─── Memory Limit Simulator ─────────────────────────────────────────────

export interface AllocationRecord {
  id: string;
  size: number;
  createdAt: number;
  type: "temporary" | "persistent";
  tag: string;
  freed: boolean;
}

export class MemoryLimitSimulator {
  private allocations: Map<string, AllocationRecord> = new Map();
  private maxMemory: number;
  private allocatedMemory: number = 0;
  private outOfMemoryMode: boolean = false;
  private leakCounter: number = 0;
  private operationLog: string[] = [];

  constructor(maxMemory: number = 1024 * 1024 * 100) {
    this.maxMemory = maxMemory;
  }

  setMaxMemory(bytes: number): void {
    this.maxMemory = bytes;
    this.operationLog.push(`SET_MAX_MEMORY:${bytes}`);
  }

  getMaxMemory(): number {
    return this.maxMemory;
  }

  getAllocatedMemory(): number {
    return this.allocatedMemory;
  }

  simulateOutOfMemory(): void {
    this.outOfMemoryMode = true;
    this.operationLog.push("SIMULATE_OOM");
  }

  clearOutOfMemory(): void {
    this.outOfMemoryMode = false;
    this.operationLog.push("CLEAR_OOM");
  }

  allocate(id: string, size: number, type: "temporary" | "persistent" = "temporary", tag: string = ""): { success: true; record: AllocationRecord } | { success: false; error: typeof ErrorCode.MEMORY_EXHAUSTED | typeof ErrorCode.ALREADY_ALLOCATED } {
    if (this.allocations.has(id)) {
      this.operationLog.push(`ALLOC_FAIL:ALREADY_EXISTS:${id}`);
      return { success: false, error: ErrorCode.ALREADY_ALLOCATED };
    }
    if (this.outOfMemoryMode || this.allocatedMemory + size > this.maxMemory) {
      this.operationLog.push(`ALLOC_FAIL:OOM:${id}:${size}B`);
      return { success: false, error: ErrorCode.MEMORY_EXHAUSTED };
    }
    const record: AllocationRecord = {
      id, size, type, tag,
      createdAt: Date.now(),
      freed: false,
    };
    this.allocations.set(id, record);
    this.allocatedMemory += size;
    this.operationLog.push(`ALLOC:${id}:${size}B:${type}`);
    return { success: true, record };
  }

  deallocate(id: string): { success: true } | { success: false; error: typeof ErrorCode.ALLOCATION_NOT_FOUND | typeof ErrorCode.DEALLOCATION_FAILED } {
    if (!this.allocations.has(id)) {
      this.operationLog.push(`DEALLOC_FAIL:NOT_FOUND:${id}`);
      return { success: false, error: ErrorCode.ALLOCATION_NOT_FOUND };
    }
    const record = this.allocations.get(id)!;
    if (record.freed) {
      this.operationLog.push(`DEALLOC_FAIL:ALREADY_FREED:${id}`);
      return { success: false, error: ErrorCode.DEALLOCATION_FAILED };
    }
    record.freed = true;
    this.allocatedMemory -= record.size;
    this.operationLog.push(`DEALLOC:${id}:${record.size}B`);
    return { success: true };
  }

  getRecord(id: string): AllocationRecord | undefined {
    return this.allocations.get(id);
  }

  listAllocations(filter?: { type?: "temporary" | "persistent"; freed?: boolean }): AllocationRecord[] {
    let result = Array.from(this.allocations.values());
    if (filter?.type) result = result.filter(r => r.type === filter.type);
    if (filter?.freed !== undefined) result = result.filter(r => r.freed === filter.freed);
    return result;
  }

  collectGarbage(): string[] {
    const collected: string[] = [];
    for (const [id, record] of this.allocations) {
      if (!record.freed && record.type === "temporary") {
        record.freed = true;
        this.allocatedMemory -= record.size;
        collected.push(id);
        this.operationLog.push(`GC:${id}:${record.size}B`);
      }
    }
    return collected;
  }

  simulateLeak(id: string, size: number): void {
    this.allocations.set(id, {
      id, size,
      createdAt: Date.now(),
      type: "temporary",
      tag: "leak",
      freed: false,
    });
    this.allocatedMemory += size;
    this.leakCounter++;
    this.operationLog.push(`LEAK:${id}:${size}B`);
  }

  getLeakCount(): number {
    return this.leakCounter;
  }

  reset(): void {
    this.allocations.clear();
    this.allocatedMemory = 0;
    this.maxMemory = 1024 * 1024 * 100;
    this.outOfMemoryMode = false;
    this.leakCounter = 0;
    this.operationLog = [];
  }

  getOperationLog(): string[] {
    return [...this.operationLog];
  }
}
