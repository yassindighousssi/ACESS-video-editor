import { Result, ErrorCode, ErrorContext, ErrorEntry, ErrorHandler, ErrorAction, ErrorSeverity, ErrorCategory, classifyError, formatTimestamp, createDefaultRetryConfig } from "../../common/types";
import { IErrorEngine, ErrorStats, createErrorEntry } from "./error-engine.interface";

export class ErrorEngine implements IErrorEngine {
  private log: ErrorEntry[] = [];
  private handlers: Map<string, ErrorHandler> = new Map();

  report(code: ErrorCode, partial: Partial<ErrorContext>): Result<ErrorEntry, ErrorCode> {
    if (code === ErrorCode.UNKNOWN && !partial.message && !partial.source) {
      return { success: false, error: ErrorCode.INVALID_INPUT };
    }
    const entry = createErrorEntry(code, partial);
    this.log.push(entry);
    return { success: true, value: entry };
  }

  async handle(entry: ErrorEntry): Promise<Result<ErrorAction, ErrorCode>> {
    const handler = this.handlers.get(entry.context.code);
    if (!handler) {
      const defaultAction: ErrorAction = entry.context.recoverable
        ? { type: "retry", delay: 100, reason: "Default retry for recoverable error" }
        : { type: "escalate", reason: "No specific handler registered" };
      return { success: true, value: defaultAction };
    }
    try {
      const action = handler.handle(entry);
      return { success: true, value: action };
    } catch {
      return { success: false, error: ErrorCode.ERROR_HANDLER_FAILED };
    }
  }

  setHandler(code: ErrorCode, handler: ErrorHandler): void {
    this.handlers.set(code, handler);
  }

  removeHandler(code: ErrorCode): void {
    this.handlers.delete(code);
  }

  async retry<T>(
    fn: () => Result<T, ErrorCode>,
    config?: Partial<ErrorContext["retryConfig"]>
  ): Promise<Result<T, ErrorCode>> {
    const retryConfig = { ...createDefaultRetryConfig(), ...config };
    let lastError: ErrorCode = ErrorCode.UNKNOWN;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const result = fn();
      if (result.success) {
        return result;
      }
      lastError = result.error;
      const errorEntry = createErrorEntry(lastError, {
        source: "ErrorEngine.retry",
        operation: "retry",
        retryConfig,
      });
      errorEntry.attempt = attempt;
      this.log.push(errorEntry);

      if (attempt < retryConfig.maxAttempts) {
        const delay = retryConfig.baseDelayMs * Math.pow(retryConfig.backoffFactor, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: ErrorCode.RETRY_EXCEEDED };
  }

  filter(predicate: (entry: ErrorEntry) => boolean): ErrorEntry[] {
    return this.log.filter(predicate);
  }

  getEntry(id: string): ErrorEntry | undefined {
    return this.log.find(e => e.id === id);
  }

  acknowledge(id: string): Result<void, ErrorCode> {
    const entry = this.log.find(e => e.id === id);
    if (!entry) {
      return { success: false, error: ErrorCode.ALLOCATION_NOT_FOUND };
    }
    entry.resolved = true;
    entry.resolvedAt = formatTimestamp();
    return { success: true, value: undefined };
  }

  getStats(): ErrorStats {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.Fatal]: 0,
      [ErrorSeverity.Critical]: 0,
      [ErrorSeverity.Warning]: 0,
      [ErrorSeverity.Info]: 0,
    };
    const byCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.FileSystem]: 0,
      [ErrorCategory.Memory]: 0,
      [ErrorCategory.Time]: 0,
      [ErrorCategory.Network]: 0,
      [ErrorCategory.Internal]: 0,
      [ErrorCategory.Unknown]: 0,
      [ErrorCategory.Media]: 0,
      [ErrorCategory.Operation]: 0,
    };
    const bySource: Record<string, number> = {};
    let unrecovered = 0;
    let resolved = 0;

    for (const entry of this.log) {
      bySeverity[entry.context.severity]++;
      byCategory[entry.context.category]++;
      bySource[entry.context.source] = (bySource[entry.context.source] ?? 0) + 1;
      if (entry.resolved) resolved++;
      else unrecovered++;
    }

    return {
      total: this.log.length,
      bySeverity,
      byCategory,
      bySource,
      unrecovered,
      resolved,
      lastError: this.log[this.log.length - 1],
    };
  }

  clear(): void {
    this.log = [];
    this.handlers.clear();
  }

  exportLog(): Result<string, ErrorCode> {
    try {
      return { success: true, value: JSON.stringify(this.log, null, 2) };
    } catch {
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
  }

  importLog(json: string): Result<void, ErrorCode> {
    try {
      const entries = JSON.parse(json) as ErrorEntry[];
      if (!Array.isArray(entries)) {
        return { success: false, error: ErrorCode.INVALID_INPUT };
      }
      this.log.push(...entries);
      return { success: true, value: undefined };
    } catch {
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
  }
}
