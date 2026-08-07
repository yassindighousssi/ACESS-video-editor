import { ErrorCode, ErrorSeverity, ErrorCategory, classifyError, createDefaultRetryConfig, formatTimestamp, ErrorMessages } from "../types";

describe("ErrorCode", () => {
  it("should have unique values", () => {
    const values = Object.values(ErrorCode);
    const unique = new Set(values);
    expect(values.length).toBe(unique.size);
  });

  it("should include essential codes", () => {
    expect(ErrorCode.FILE_NOT_FOUND).toBe("ERR_FILE_NOT_FOUND");
    expect(ErrorCode.DISK_FULL).toBe("ERR_DISK_FULL");
    expect(ErrorCode.MEMORY_EXHAUSTED).toBe("ERR_MEMORY_EXHAUSTED");
    expect(ErrorCode.UNKNOWN).toBe("ERR_UNKNOWN");
  });

  it("should have messages for every code", () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ErrorMessages[code]).toBeDefined();
      expect(ErrorMessages[code].en).toBeTruthy();
      expect(ErrorMessages[code].ar).toBeTruthy();
    }
  });
});

describe("classifyError", () => {
  it("should classify FILE_NOT_FOUND as Critical, Operation, not recoverable", () => {
    const result = classifyError(ErrorCode.FILE_NOT_FOUND);
    expect(result.severity).toBe(ErrorSeverity.Critical);
    expect(result.category).toBe(ErrorCategory.Operation);
    expect(result.recoverable).toBe(false);
  });

  it("should classify DISK_FULL as Fatal, Internal, not recoverable", () => {
    const result = classifyError(ErrorCode.DISK_FULL);
    expect(result.severity).toBe(ErrorSeverity.Fatal);
    expect(result.category).toBe(ErrorCategory.Internal);
    expect(result.recoverable).toBe(false);
  });

  it("should classify INVALID_INPUT as Warning, Operation, recoverable", () => {
    const result = classifyError(ErrorCode.INVALID_INPUT);
    expect(result.severity).toBe(ErrorSeverity.Warning);
    expect(result.category).toBe(ErrorCategory.Operation);
    expect(result.recoverable).toBe(true);
  });

  it("should classify UNKNOWN as Warning, Unknown, not recoverable", () => {
    const result = classifyError(ErrorCode.UNKNOWN);
    expect(result.severity).toBe(ErrorSeverity.Warning);
    expect(result.category).toBe(ErrorCategory.Unknown);
    expect(result.recoverable).toBe(false);
  });

  it("should classify the remaining Warning codes as recoverable", () => {
    const codes = [
      ErrorCode.FILE_EXISTS,
      ErrorCode.BUFFER_OVERFLOW,
      ErrorCode.ALLOCATION_NOT_FOUND,
      ErrorCode.ALREADY_ALLOCATED,
      ErrorCode.DEALLOCATION_FAILED,
      ErrorCode.TIME_OUT_OF_RANGE,
      ErrorCode.INVALID_TIMECODE,
      ErrorCode.NEGATIVE_TIME,
    ];
    for (const code of codes) {
      const result = classifyError(code);
      expect(result.severity).toBe(ErrorSeverity.Warning);
      expect(result.category).toBe(ErrorCategory.Operation);
      expect(result.recoverable).toBe(true);
    }
  });
});

describe("createDefaultRetryConfig", () => {
  it("should return default config", () => {
    const config = createDefaultRetryConfig();
    expect(config.maxAttempts).toBe(3);
    expect(config.baseDelayMs).toBe(100);
    expect(config.backoffFactor).toBe(2);
  });
});

describe("formatTimestamp", () => {
  it("should return ISO 8601 format", () => {
    const ts = formatTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should format given date", () => {
    const date = new Date("2026-07-28T12:00:00Z");
    expect(formatTimestamp(date)).toBe("2026-07-28T12:00:00.000Z");
  });
});

describe("Result type", () => {
  it("should type-check success result", () => {
    const r: import("../types").Result<number, string> = { success: true, value: 42 };
    if (r.success) {
      expect(r.value).toBe(42);
    }
  });

  it("should type-check error result", () => {
    const r: import("../types").Result<number, string> = { success: false, error: "fail" };
    if (!r.success) {
      expect(r.error).toBe("fail");
    }
  });
});
