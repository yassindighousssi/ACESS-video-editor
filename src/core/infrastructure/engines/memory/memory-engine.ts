import { Result, ErrorCode } from "../../common/types";
import { IMemoryEngine, MemoryAllocation, MemoryStats } from "./memory-engine.interface";

export class MemoryEngine implements IMemoryEngine {
  private allocations: Map<string, MemoryAllocation> = new Map();
  private maxBytes: number = 1024 * 1024 * 100; // 100MB default
  private peakUsage: number = 0;

  setLimit(maxBytes: number): void {
    this.maxBytes = maxBytes;
  }

  getLimit(): number {
    return this.maxBytes;
  }

  allocate(id: string, size: number, type: "temporary" | "persistent" = "temporary", tag: string = ""): Result<MemoryAllocation, ErrorCode> {
    if (size <= 0) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    if (this.allocations.has(id)) {
      return { success: false, error: ErrorCode.ALREADY_ALLOCATED };
    }
    const currentUsage = this.calculateUsage();
    if (currentUsage + size > this.maxBytes) {
      return { success: false, error: ErrorCode.MEMORY_EXHAUSTED };
    }
    const alloc: MemoryAllocation = {
      id, size, type, tag,
      createdAt: Date.now(),
    };
    this.allocations.set(id, alloc);
    const newUsage = this.calculateUsage();
    if (newUsage > this.peakUsage) this.peakUsage = newUsage;
    return { success: true, value: alloc };
  }

  deallocate(id: string): Result<void, ErrorCode> {
    const alloc = this.allocations.get(id);
    if (!alloc) {
      return { success: false, error: ErrorCode.ALLOCATION_NOT_FOUND };
    }
    this.allocations.delete(id);
    return { success: true, value: undefined };
  }

  get(id: string): Result<MemoryAllocation, ErrorCode> {
    const alloc = this.allocations.get(id);
    if (!alloc) {
      return { success: false, error: ErrorCode.ALLOCATION_NOT_FOUND };
    }
    return { success: true, value: alloc };
  }

  getStats(): MemoryStats {
    const totalAllocated = this.calculateUsage();
    const allocationCount = this.allocations.size;
    const utilization = this.maxBytes > 0 ? (totalAllocated / this.maxBytes) * 100 : 0;
    let pressureLevel: MemoryStats["pressureLevel"] = "normal";
    if (utilization >= 95) pressureLevel = "emergency";
    else if (utilization >= 90) pressureLevel = "critical";
    else if (utilization >= 80) pressureLevel = "warning";
    return {
      totalAllocated,
      peakUsage: this.peakUsage,
      allocationCount,
      pressureLevel,
      utilizationPercent: Math.round(utilization * 100) / 100,
    };
  }

  collectGarbage(): MemoryAllocation[] {
    const collected: MemoryAllocation[] = [];
    for (const [id, alloc] of this.allocations) {
      if (alloc.type === "temporary") {
        this.allocations.delete(id);
        collected.push(alloc);
      }
    }
    return collected;
  }

  clear(): void {
    this.allocations.clear();
    this.peakUsage = 0;
  }

  private calculateUsage(): number {
    let total = 0;
    for (const alloc of this.allocations.values()) {
      total += alloc.size;
    }
    return total;
  }
}
