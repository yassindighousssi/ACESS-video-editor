import { ErrorEngine } from "../error-engine";
import { IErrorEngine } from "../error-engine.interface";
import { ErrorCode, ErrorSeverity, ErrorCategory, ErrorHandler, ErrorAction, formatTimestamp } from "../../../common/types";

describe("ErrorEngine", () => {
  let engine: IErrorEngine;

  beforeEach(() => {
    engine = new ErrorEngine();
  });

  describe("report", () => {
    it("should report an error and return entry", () => {
      const result = engine.report(ErrorCode.FILE_NOT_FOUND, {
        source: "FileEngine",
        operation: "read",
        message: "File not found: test.txt",
        messageAr: "الملف غير موجود: test.txt",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.context.code).toBe(ErrorCode.FILE_NOT_FOUND);
        expect(result.value.context.source).toBe("FileEngine");
        expect(result.value.context.severity).toBe(ErrorSeverity.Critical);
        expect(result.value.context.recoverable).toBe(false);
        expect(result.value.id).toContain("ERR_");
      }
    });

    it("should return INVALID_INPUT for UNKNOWN error without context", () => {
      const result = engine.report(ErrorCode.UNKNOWN, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      }
    });

    it("should assign severity based on code", () => {
      const fatal = engine.report(ErrorCode.DISK_FULL, { source: "FileEngine", operation: "write", message: "Disk full" });
      if (fatal.success) expect(fatal.value.context.severity).toBe(ErrorSeverity.Fatal);

      const warn = engine.report(ErrorCode.INVALID_INPUT, { source: "UI", operation: "validate", message: "invalid" });
      if (warn.success) expect(warn.value.context.severity).toBe(ErrorSeverity.Warning);
    });

    it("should use defaults for optional fields", () => {
      const result = engine.report(ErrorCode.FILE_NOT_FOUND, { message: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.context.source).toBe("unknown");
        expect(result.value.context.operation).toBe("unknown");
        expect(result.value.context.announced).toBe(false);
      }
    });
  });

  describe("handle", () => {
    it("should return default retry action for recoverable error without handler", async () => {
      const entry = engine.report(ErrorCode.INVALID_INPUT, { source: "test", operation: "validate", message: "test", recoverable: true });
      if (!entry.success) return;
      const action = await engine.handle(entry.value);
      expect(action.success).toBe(true);
      if (action.success) {
        expect(action.value.type).toBe("retry");
      }
    });

    it("should return escalate for non-recoverable error without handler", async () => {
      const entry = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "test" });
      if (!entry.success) return;
      const action = await engine.handle(entry.value);
      expect(action.success).toBe(true);
      if (action.success) {
        expect(action.value.type).toBe("escalate");
      }
    });

    it("should invoke registered handler", async () => {
      const handler: ErrorHandler = {
        canHandle: (code: ErrorCode) => code === ErrorCode.FILE_NOT_FOUND,
        handle: (): ErrorAction => ({ type: "retry", delay: 500, reason: "Custom retry" }),
      };
      engine.setHandler(ErrorCode.FILE_NOT_FOUND, handler);
      const entry = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "test" });
      if (!entry.success) return;
      const action = await engine.handle(entry.value);
      expect(action.success).toBe(true);
      if (action.success) {
        expect(action.value.type).toBe("retry");
        expect(action.value.delay).toBe(500);
      }
    });

    it("should return ERROR_HANDLER_FAILED when handler throws", async () => {
      const badHandler: ErrorHandler = {
        canHandle: () => true,
        handle: () => { throw new Error("bad"); },
      };
      engine.setHandler(ErrorCode.FILE_NOT_FOUND, badHandler);
      const entry = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "test" });
      if (!entry.success) return;
      const action = await engine.handle(entry.value);
      expect(action.success).toBe(false);
      if (!action.success) {
        expect(action.error).toBe(ErrorCode.ERROR_HANDLER_FAILED);
      }
    });
  });

  describe("retry", () => {
    it("should succeed on first attempt", async () => {
      let calls = 0;
      const fn = (): import("../../../common/types").Result<string, ErrorCode> => {
        calls++;
        return { success: true, value: "ok" };
      };
      const result = await engine.retry(fn, { maxAttempts: 3 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe("ok");
      expect(calls).toBe(1);
    });

    it("should retry until success", async () => {
      let calls = 0;
      const fn = (): import("../../../common/types").Result<string, ErrorCode> => {
        calls++;
        if (calls < 3) return { success: false, error: ErrorCode.FILE_READ_ERROR };
        return { success: true, value: "ok" };
      };
      const result = await engine.retry(fn, { maxAttempts: 5, baseDelayMs: 10 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe("ok");
      expect(calls).toBe(3);
    });

    it("should return RETRY_EXCEEDED after max attempts", async () => {
      let calls = 0;
      const fn = (): import("../../../common/types").Result<string, ErrorCode> => {
        calls++;
        return { success: false, error: ErrorCode.FILE_READ_ERROR };
      };
      const result = await engine.retry(fn, { maxAttempts: 3, baseDelayMs: 10 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe(ErrorCode.RETRY_EXCEEDED);
      expect(calls).toBe(3);
    });
  });

  describe("filter", () => {
    it("should filter errors by source", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "FileEngine", operation: "read", message: "err1" });
      engine.report(ErrorCode.MEMORY_EXHAUSTED, { source: "MemoryEngine", operation: "alloc", message: "err2" });
      engine.report(ErrorCode.DISK_FULL, { source: "FileEngine", operation: "write", message: "err3" });
      const fileErrors = engine.filter(e => e.context.source === "FileEngine");
      expect(fileErrors.length).toBe(2);
    });

    it("should filter by severity", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "A", operation: "op", message: "critical" });
      engine.report(ErrorCode.INVALID_INPUT, { source: "A", operation: "op", message: "warning" });
      const criticals = engine.filter(e => e.context.severity === ErrorSeverity.Critical);
      expect(criticals.length).toBe(1);
    });
  });

  describe("acknowledge", () => {
    it("should mark error as resolved", () => {
      const result = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      if (!result.success) return;
      const ack = engine.acknowledge(result.value.id);
      expect(ack.success).toBe(true);
      const entry = engine.getEntry(result.value.id);
      expect(entry?.resolved).toBe(true);
      expect(entry?.resolvedAt).toBeTruthy();
    });

    it("should return error for unknown id", () => {
      const ack = engine.acknowledge("NONEXISTENT");
      expect(ack.success).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return accurate stats", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "FileEngine", operation: "read", message: "err1" });
      engine.report(ErrorCode.MEMORY_EXHAUSTED, { source: "MemoryEngine", operation: "alloc", message: "err2" });
      engine.report(ErrorCode.DISK_FULL, { source: "FileEngine", operation: "write", message: "err3" });
      const stats = engine.getStats();
      expect(stats.total).toBe(3);
      expect(stats.bySource.FileEngine).toBe(2);
      expect(stats.bySource.MemoryEngine).toBe(1);
      expect(stats.unrecovered).toBe(3);
      expect(stats.lastError?.context.code).toBe(ErrorCode.DISK_FULL);
    });

    it("should return zero stats for empty engine", () => {
      const stats = engine.getStats();
      expect(stats.total).toBe(0);
      expect(stats.unrecovered).toBe(0);
      expect(stats.resolved).toBe(0);
    });

    it("should count acknowledged entries as resolved", () => {
      const reported = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      if (!reported.success) return;
      engine.acknowledge(reported.value.id);
      const stats = engine.getStats();
      expect(stats.resolved).toBe(1);
      expect(stats.unrecovered).toBe(0);
    });
  });

  describe("export/import", () => {
    it("should export log as JSON", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      const exported = engine.exportLog();
      expect(exported.success).toBe(true);
      if (exported.success) {
        const parsed = JSON.parse(exported.value);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(1);
      }
    });

    it("should import log from JSON", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      const exported = engine.exportLog();
      if (!exported.success) return;
      const newEngine = new ErrorEngine();
      const imported = newEngine.importLog(exported.value);
      expect(imported.success).toBe(true);
      expect(newEngine.getStats().total).toBe(1);
    });

    it("should fail import for invalid JSON", () => {
      const result = engine.importLog("not json");
      expect(result.success).toBe(false);
    });

    it("should fail import for non-array JSON", () => {
      const result = engine.importLog(JSON.stringify({ foo: "bar" }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.INVALID_INPUT);
      }
    });
  });

  describe("clear", () => {
    it("should clear all errors and handlers", () => {
      engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      engine.setHandler(ErrorCode.FILE_NOT_FOUND, { canHandle: () => true, handle: () => ({ type: "ignore" }) });
      engine.clear();
      expect(engine.getStats().total).toBe(0);
      const result = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "test", operation: "read", message: "err" });
      if (!result.success) return;
    });
  });

  describe("edge cases", () => {
    it("should handle duplicate errors without crash", () => {
      for (let i = 0; i < 10; i++) {
        const result = engine.report(ErrorCode.FILE_NOT_FOUND, { source: "Flood", operation: "read", message: `err ${i}` });
        expect(result.success).toBe(true);
      }
      expect(engine.getStats().total).toBe(10);
    });

    it("should handle rapid report of 100 errors", () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        engine.report(ErrorCode.FILE_NOT_FOUND, { source: "Stress", operation: "op", message: `err ${i}` });
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(engine.getStats().total).toBe(100);
    });
  });
});
