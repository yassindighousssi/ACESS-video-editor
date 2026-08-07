import { Orchestrator } from "../orchestrator";
import { ErrorEngine } from "../../engines/error/error-engine";
import { fileEngineForMock } from "../../engines/file/file-engine.interface";
import { MemoryEngine } from "../../engines/memory/memory-engine";
import { TimeEngine } from "../../engines/time/time-engine";
import { MockFileSystem } from "../../testing/test-harness";
import { ErrorCode } from "../../common/types";

describe("Orchestrator (Integration)", () => {
  let orch: Orchestrator;
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
    orch = new Orchestrator(
      new ErrorEngine(),
      fileEngineForMock(fs),
      new MemoryEngine(),
      new TimeEngine(0),
    );
  });

  describe("initialize", () => {
    it("should set initial state", async () => {
      const result = await orch.initialize();
      expect(result.success).toBe(true);
      const state = orch.getState();
      expect(state.initialized).toBe(true);
      expect(state.engineCount).toBe(4);
      expect(state.errorsReported).toBe(0);
    });
  });

  describe("loadFile", () => {
    it("should return FILE_NOT_FOUND for missing file", async () => {
      const result = await orch.loadFile("missing.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });

    it("should load existing file", async () => {
      await orch.initialize();
      fs.createFile("test.dat", new Uint8Array([1, 2, 3]));
      const result = await orch.loadFile("test.dat");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.from(result.value)).toEqual([1, 2, 3]);
      }
    });
  });

  describe("saveFile", () => {
    it("should save file and track memory", async () => {
      await orch.initialize();
      const data = new Uint8Array(1024);
      const result = await orch.saveFile("out.bin", data);
      expect(result.success).toBe(true);
      expect(fs.exists("out.bin")).toBe(true);
    });

    it("should fail when memory is exhausted", async () => {
      await orch.initialize();
      orch.memory.setLimit(100);
      const data = new Uint8Array(200);
      const result = await orch.saveFile("big.bin", data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.MEMORY_EXHAUSTED);
      }
    });

    it("should deallocate memory on write failure", async () => {
      await orch.initialize();
      orch.memory.setLimit(10000);
      fs.simulateWriteError("write.txt");
      const data = new Uint8Array(500);
      const result = await orch.saveFile("write.txt", data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
      }
      expect(orch.memory.getStats().totalAllocated).toBe(0);
    });
  });

  describe("advancePlayback", () => {
    it("should advance time and update state", async () => {
      await orch.initialize();
      const snap = await orch.advancePlayback(1000);
      expect(snap.success).toBe(true);
      const state = orch.getState();
      expect(state.timeElapsed).toBe(1);
    });

    it("should report error on negative advance", async () => {
      await orch.initialize();
      const snap = await orch.advancePlayback(-100);
      expect(snap.success).toBe(false);
      const state = orch.getState();
      expect(state.errorsReported).toBe(1);
    });
  });

  describe("getState", () => {
    it("should reflect all engine state", async () => {
      await orch.initialize();
      fs.createFile("a.bin", new Uint8Array(500));
      await orch.loadFile("a.bin");
      await orch.advancePlayback(2000);
      const state = orch.getState();
      expect(state.timeElapsed).toBe(2);
    });
  });

  describe("shutdown", () => {
    it("should clean up resources", async () => {
      await orch.initialize();
      orch.memory.setLimit(10000);
      orch.memory.allocate("keep", 1024, "persistent");
      orch.memory.allocate("temp", 2048, "temporary");
      orch.shutdown();
      const state = orch.getState();
      expect(state.memoryUsed).toBe(0);
    });
  });
});
