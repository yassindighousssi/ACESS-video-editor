import { Result, ErrorCode } from "../../common/types";

export interface MemoryAllocation {
  id: string;
  size: number;
  type: "temporary" | "persistent";
  tag: string;
  createdAt: number;
}

export interface MemoryStats {
  totalAllocated: number;
  peakUsage: number;
  allocationCount: number;
  pressureLevel: "normal" | "warning" | "critical" | "emergency";
  utilizationPercent: number;
}

export interface IMemoryEngine {
  allocate(id: string, size: number, type?: "temporary" | "persistent", tag?: string): Result<MemoryAllocation, ErrorCode>;
  deallocate(id: string): Result<void, ErrorCode>;
  get(id: string): Result<MemoryAllocation, ErrorCode>;
  getStats(): MemoryStats;
  collectGarbage(): MemoryAllocation[];
  setLimit(maxBytes: number): void;
  getLimit(): number;
  clear(): void;
}
