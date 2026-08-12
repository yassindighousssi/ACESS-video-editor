import { MockFileSystem, MockTime, MemoryLimitSimulator, AllocationRecord } from "../test-harness";
import { ErrorCode } from "../../common/types";

// ─── MockFileSystem Tests ───────────────────────────────────────────────

describe("MockFileSystem", () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe("createFile", () => {
    it("should create a file and read it back", () => {
      const content = new Uint8Array([1, 2, 3]);
      const create = fs.createFile("test.bin", content);
      expect(create.success).toBe(true);
      const read = fs.readFile("test.bin");
      expect(read.success).toBe(true);
      if (read.success) {
        expect(Array.from(read.data)).toEqual([1, 2, 3]);
      }
    });

    it("should fail with DISK_FULL when disk limit exceeded", () => {
      fs.setDiskLimit(10);
      const content = new Uint8Array(100);
      const result = fs.createFile("big.bin", content);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.DISK_FULL);
      }
    });
  });

  describe("readFile", () => {
    it("should return FILE_NOT_FOUND for missing file", () => {
      const result = fs.readFile("nonexistent.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });

    it("should return CORRUPT_FILE for simulated corrupt file", () => {
      fs.createFile("corrupt.txt", new Uint8Array([1]));
      fs.simulateCorruptFile("corrupt.txt");
      const result = fs.readFile("corrupt.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
      }
    });

    it("should return FILE_READ_ERROR for simulated read error", () => {
      fs.createFile("error.txt", new Uint8Array([1]));
      fs.simulateReadError("error.txt");
      const result = fs.readFile("error.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_READ_ERROR);
      }
    });
  });

  describe("writeFile", () => {
    it("should overwrite existing file", () => {
      fs.createFile("test.txt", new Uint8Array([1, 2, 3]));
      fs.writeFile("test.txt", new Uint8Array([4, 5]));
      const read = fs.readFile("test.txt");
      if (read.success) {
        expect(Array.from(read.data)).toEqual([4, 5]);
      }
    });

    it("should fail with DISK_FULL when limit exceeded", () => {
      fs.setDiskLimit(0);
      const result = fs.writeFile("test.txt", new Uint8Array(1));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.DISK_FULL);
      }
    });

    it("should fail with WRITE_ERROR for simulated write error", () => {
      fs.createFile("test.txt", new Uint8Array([1]));
      fs.simulateWriteError("test.txt");
      const result = fs.writeFile("test.txt", new Uint8Array([2]));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
      }
    });

    it("should fail with INVALID_PATH for path longer than 260 chars", () => {
      const longPath = "a".repeat(261) + ".txt";
      const result = fs.writeFile(longPath, new Uint8Array(1));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.INVALID_PATH);
      }
    });
  });

  describe("deleteFile", () => {
    it("should delete existing file", () => {
      fs.createFile("test.txt", new Uint8Array([1]));
      expect(fs.exists("test.txt")).toBe(true);
      fs.deleteFile("test.txt");
      expect(fs.exists("test.txt")).toBe(false);
    });

    it("should return FILE_NOT_FOUND for missing file", () => {
      const result = fs.deleteFile("ghost.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });
  });

  describe("disk space tracking", () => {
    it("should track disk usage correctly", () => {
      fs.createFile("a.txt", new Uint8Array(10));
      expect(fs.getDiskUsage()).toBe(10);
      fs.createFile("b.txt", new Uint8Array(20));
      expect(fs.getDiskUsage()).toBe(30);
      fs.deleteFile("a.txt");
      expect(fs.getDiskUsage()).toBe(20);
    });
  });

  describe("operation log", () => {
    it("should record all operations", () => {
      fs.createFile("f.txt", new Uint8Array(5));
      fs.readFile("f.txt");
      const log = fs.getOperationLog();
      expect(log.length).toBe(2);
      expect(log[0]).toContain("CREATE:f.txt:5B");
      expect(log[1]).toContain("READ:f.txt:");
    });

    it("should clear operation log", () => {
      fs.createFile("f.txt", new Uint8Array(1));
      fs.clearOperationLog();
      expect(fs.getOperationLog().length).toBe(0);
    });
  });

  describe("utility methods", () => {
    it("should normalize paths", () => {
      expect(fs.normalizePath("foo\\bar")).toBe("foo/bar");
      expect(fs.normalizePath("./foo/bar")).toBe("foo/bar");
      expect(fs.normalizePath("/foo/bar")).toBe("foo/bar");
    });

    it("should list directory contents", () => {
      fs.createFile("dir/a.txt", new Uint8Array(1));
      fs.createFile("dir/b.txt", new Uint8Array(2));
      fs.createFile("other.txt", new Uint8Array(3));
      const list = fs.listDirectory("dir");
      expect(list).toContain("a.txt");
      expect(list).toContain("b.txt");
      expect(list).not.toContain("other.txt");
    });

    it("should list every file when given an empty directory", () => {
      fs.createFile("a.txt", new Uint8Array(1));
      fs.createFile("b.txt", new Uint8Array(2));
      const list = fs.listDirectory("");
      expect(list).toContain("a.txt");
      expect(list).toContain("b.txt");
    });

    it("should get disk limit", () => {
      fs.setDiskLimit(500);
      expect(fs.getDiskLimit()).toBe(500);
    });

    it("should simulate full disk", () => {
      fs.simulateFullDisk();
      expect(fs.getDiskLimit()).toBe(0);
    });

    it("should clear all state", () => {
      fs.createFile("a.txt", new Uint8Array(100));
      fs.simulateCorruptFile("a.txt");
      fs.simulateReadError("b.txt");
      fs.simulateWriteError("c.txt");
      fs.clear();
      expect(fs.exists("a.txt")).toBe(false);
      expect(fs.getDiskUsage()).toBe(0);
      expect(fs.getDiskLimit()).toBe(Infinity);
      expect(fs.getOperationLog().length).toBe(0);
    });
  });
});

// ─── MockTime Tests ─────────────────────────────────────────────────────

describe("MockTime", () => {
  let time: MockTime;

  beforeEach(() => {
    time = new MockTime();
  });

  it("should start at 0", () => {
    expect(time.getCurrentTime()).toBe(0);
  });

  it("should advance by normal speed", () => {
    time.advance(1000);
    expect(time.getCurrentTime()).toBe(1000);
  });

  it("should advance at 2x speed", () => {
    time.setSpeed(2);
    time.advance(1000);
    expect(time.getCurrentTime()).toBe(2000);
  });

  it("should advance at 0.5x speed", () => {
    time.setSpeed(0.5);
    time.advance(1000);
    expect(time.getCurrentTime()).toBe(500);
  });

  it("should not advance while paused", () => {
    time.pause();
    time.advance(1000);
    expect(time.getCurrentTime()).toBe(0);
    time.resume();
    time.advance(1000);
    expect(time.getCurrentTime()).toBe(1000);
  });

  it("should set time directly", () => {
    time.setTime(5000);
    expect(time.getCurrentTime()).toBe(5000);
  });

  it("should reset", () => {
    time.advance(1000);
    time.reset();
    expect(time.getCurrentTime()).toBe(0);
    expect(time.getSpeed()).toBe(1);
    expect(time.isPaused()).toBe(false);
  });

  it("should log operations", () => {
    time.advance(100);
    const log = time.getOperationLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]).toContain("ADVANCE");
  });

  it("should report speed and paused state", () => {
    expect(time.getSpeed()).toBe(1);
    time.setSpeed(2);
    expect(time.getSpeed()).toBe(2);
    expect(time.isPaused()).toBe(false);
    time.pause();
    expect(time.isPaused()).toBe(true);
    time.resume();
    expect(time.isPaused()).toBe(false);
  });

  it("should log setTime", () => {
    time.setTime(999);
    const log = time.getOperationLog();
    expect(log[0]).toContain("SET_TIME:999");
  });
});

// ─── MemoryLimitSimulator Tests ─────────────────────────────────────────

describe("MemoryLimitSimulator", () => {
  let mem: MemoryLimitSimulator;

  beforeEach(() => {
    mem = new MemoryLimitSimulator(1024 * 10);
  });

  it("should allocate memory successfully", () => {
    const result = mem.allocate("obj1", 1024);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.record.size).toBe(1024);
      expect(result.record.type).toBe("temporary");
      expect(result.record.freed).toBe(false);
    }
  });

  it("should return MEMORY_EXHAUSTED when limit exceeded", () => {
    mem.allocate("obj1", 1024 * 9);
    const result = mem.allocate("obj2", 1024 * 2);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.MEMORY_EXHAUSTED);
    }
  });

  it("should return MEMORY_EXHAUSTED when OOM simulated", () => {
    mem.simulateOutOfMemory();
    const result = mem.allocate("obj1", 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.MEMORY_EXHAUSTED);
    }
  });

  it("should return ALREADY_ALLOCATED for duplicate id", () => {
    mem.allocate("obj1", 1024);
    const result = mem.allocate("obj1", 2048);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.ALREADY_ALLOCATED);
    }
  });

  it("should deallocate memory", () => {
    mem.allocate("obj1", 1024);
    const result = mem.deallocate("obj1");
    expect(result.success).toBe(true);
    expect(mem.getAllocatedMemory()).toBe(0);
  });

  it("should return ALLOCATION_NOT_FOUND for unknown id", () => {
    const result = mem.deallocate("ghost");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.ALLOCATION_NOT_FOUND);
    }
  });

  it("should garbage collect temporary allocations", () => {
    mem.allocate("temp1", 512, "temporary");
    mem.allocate("temp2", 256, "temporary");
    mem.allocate("persist1", 1024, "persistent");
    const collected = mem.collectGarbage();
    expect(collected.length).toBe(2);
    expect(mem.getAllocatedMemory()).toBe(1024);
  });

  it("should detect leaks", () => {
    mem.simulateLeak("leak1", 4096);
    expect(mem.getLeakCount()).toBe(1);
    expect(mem.getAllocatedMemory()).toBe(4096);
  });

  it("should filter allocations by type", () => {
    mem.allocate("a", 100, "temporary");
    mem.allocate("b", 200, "persistent");
    const temps = mem.listAllocations({ type: "temporary" });
    const pers = mem.listAllocations({ type: "persistent" });
    expect(temps.length).toBe(1);
    expect(pers.length).toBe(1);
  });

  it("should clear out of memory mode", () => {
    mem.simulateOutOfMemory();
    mem.clearOutOfMemory();
    expect(mem.allocate("obj1", 1).success).toBe(true);
  });

  it("should return DEALLOCATION_FAILED for double free", () => {
    mem.allocate("obj1", 100);
    mem.deallocate("obj1");
    const result = mem.deallocate("obj1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ErrorCode.DEALLOCATION_FAILED);
    }
  });

  it("should get record by id", () => {
    mem.allocate("obj1", 512);
    const record = mem.getRecord("obj1");
    expect(record).toBeDefined();
    expect(record!.size).toBe(512);
    expect(mem.getRecord("ghost")).toBeUndefined();
  });

  it("should filter by freed status", () => {
    mem.allocate("a", 100);
    mem.allocate("b", 200);
    mem.deallocate("a");
    const freed = mem.listAllocations({ freed: true });
    const notFreed = mem.listAllocations({ freed: false });
    expect(freed.length).toBe(1);
    expect(notFreed.length).toBe(1);
  });

  it("should reset state", () => {
    mem.allocate("obj1", 500);
    mem.simulateLeak("leak1", 100);
    mem.reset();
    expect(mem.getAllocatedMemory()).toBe(0);
    expect(mem.getLeakCount()).toBe(0);
    expect(mem.getMaxMemory()).toBe(1024 * 1024 * 100);
  });

  it("should set and get max memory", () => {
    mem.setMaxMemory(2048);
    expect(mem.getMaxMemory()).toBe(2048);
  });

  it("should log operations", () => {
    mem.allocate("a", 100);
    const log = mem.getOperationLog();
    expect(log.length).toBe(1);
    expect(log[0]).toContain("ALLOC:a:100B");
  });

  it("should use a default memory limit when constructed without arguments", () => {
    const defaultMem = new MemoryLimitSimulator();
    expect(defaultMem.getMaxMemory()).toBe(1024 * 1024 * 100);
  });
});
