import { MemoryEngine } from "../memory-engine";
import { IMemoryEngine } from "../memory-engine.interface";
import { ErrorCode } from "../../../common/types";

describe("MemoryEngine", () => {
  let engine: IMemoryEngine;

  beforeEach(() => {
    engine = new MemoryEngine();
    engine.setLimit(1024 * 10); // 10KB
  });

  describe("allocate", () => {
    it("should allocate memory successfully", () => {
      const result = engine.allocate("obj1", 1024);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBe("obj1");
        expect(result.value.size).toBe(1024);
        expect(result.value.type).toBe("temporary");
      }
    });

    it("should return ALREADY_ALLOCATED for duplicate id", () => {
      engine.allocate("obj1", 1024);
      const result = engine.allocate("obj1", 2048);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.ALREADY_ALLOCATED);
      }
    });

    it("should return MEMORY_EXHAUSTED when limit exceeded", () => {
      engine.allocate("a", 1024 * 9);
      const result = engine.allocate("b", 1024 * 2);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.MEMORY_EXHAUSTED);
      }
    });

    it("should return INVALID_INPUT for zero size", () => {
      const result = engine.allocate("bad", 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      }
    });
  });

  describe("deallocate", () => {
    it("should deallocate existing allocation", () => {
      engine.allocate("obj1", 1024);
      const result = engine.deallocate("obj1");
      expect(result.success).toBe(true);
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(0);
    });

    it("should return ALLOCATION_NOT_FOUND for unknown id", () => {
      const result = engine.deallocate("ghost");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.ALLOCATION_NOT_FOUND);
      }
    });
  });

  describe("get", () => {
    it("should return allocation by id", () => {
      engine.allocate("obj1", 512, "persistent", "project-data");
      const result = engine.get("obj1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.type).toBe("persistent");
        expect(result.value.tag).toBe("project-data");
      }
    });

    it("should return ALLOCATION_NOT_FOUND for unknown id", () => {
      const result = engine.get("ghost");
      expect(result.success).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should reflect current state", () => {
      engine.allocate("a", 1024);
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(1024);
      expect(stats.allocationCount).toBe(1);
      expect(stats.pressureLevel).toBe("normal");
    });

    it("should report warning at 80%", () => {
      engine.allocate("big", 1024 * 8);
      const stats = engine.getStats();
      expect(stats.pressureLevel).toBe("warning");
    });

    it("should report critical at 90%", () => {
      engine.setLimit(10000);
      engine.allocate("huge", 9000);
      const stats = engine.getStats();
      expect(stats.pressureLevel).toBe("critical");
    });

    it("should report emergency at 95%", () => {
      engine.setLimit(10000);
      engine.allocate("max", 9500);
      const stats = engine.getStats();
      expect(stats.pressureLevel).toBe("emergency");
    });

    it("should report zero utilization when the limit is zero", () => {
      engine.setLimit(0);
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(0);
      expect(stats.utilizationPercent).toBe(0);
      expect(stats.pressureLevel).toBe("normal");
    });
  });

  describe("collectGarbage", () => {
    it("should collect temporary allocations only", () => {
      engine.allocate("temp1", 256);
      engine.allocate("temp2", 512);
      engine.allocate("persist1", 1024, "persistent");
      const collected = engine.collectGarbage();
      expect(collected.length).toBe(2);
      const stats = engine.getStats();
      expect(stats.totalAllocated).toBe(1024);
    });
  });

  describe("setLimit", () => {
    it("should update memory limit", () => {
      engine.setLimit(2048);
      expect(engine.getLimit()).toBe(2048);
      engine.allocate("a", 1024);
      engine.allocate("b", 1024);
      const result = engine.allocate("c", 1);
      expect(result.success).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all allocations", () => {
      engine.allocate("a", 1024);
      engine.allocate("b", 2048);
      engine.clear();
      expect(engine.getStats().totalAllocated).toBe(0);
      expect(engine.getStats().allocationCount).toBe(0);
    });
  });
});
