import { Result, ErrorCode, ErrorContext, ErrorEntry, ErrorHandler, ErrorAction, ErrorSeverity, ErrorCategory, classifyError, formatTimestamp, createDefaultRetryConfig } from "../../common/types";

export interface IErrorEngine {
  report(code: ErrorCode, context: Partial<ErrorContext>): Result<ErrorEntry, ErrorCode>;
  handle(entry: ErrorEntry): Promise<Result<ErrorAction, ErrorCode>>;
  setHandler(code: ErrorCode, handler: ErrorHandler): void;
  removeHandler(code: ErrorCode): void;
  retry<T>(fn: () => Result<T, ErrorCode>, config?: Partial<ErrorContext["retryConfig"]>): Promise<Result<T, ErrorCode>>;
  filter(predicate: (entry: ErrorEntry) => boolean): ErrorEntry[];
  getEntry(id: string): ErrorEntry | undefined;
  acknowledge(id: string): Result<void, ErrorCode>;
  getStats(): ErrorStats;
  clear(): void;
  exportLog(): Result<string, ErrorCode>;
  importLog(json: string): Result<void, ErrorCode>;
}

export interface ErrorStats {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  byCategory: Record<ErrorCategory, number>;
  bySource: Record<string, number>;
  unrecovered: number;
  resolved: number;
  lastError?: ErrorEntry;
}

export function createErrorEntry(code: ErrorCode, partial: Partial<ErrorContext>): ErrorEntry {
  const classification = classifyError(code);
  const timestamp = partial.timestamp ?? formatTimestamp();
  const now = Date.now();
  return {
    id: `ERR_${now}_${Math.random().toString(36).slice(2, 8)}`,
    context: {
      code,
      severity: partial.severity ?? classification.severity,
      category: partial.category ?? classification.category,
      message: partial.message ?? code,
      messageAr: partial.messageAr ?? code,
      timestamp,
      source: partial.source ?? "unknown",
      operation: partial.operation ?? "unknown",
      stack: partial.stack,
      metadata: partial.metadata,
      recoverable: partial.recoverable ?? classification.recoverable,
      announced: partial.announced ?? false,
      retryConfig: partial.retryConfig ?? createDefaultRetryConfig(),
    },
    attempt: 0,
    resolved: false,
  };
}
