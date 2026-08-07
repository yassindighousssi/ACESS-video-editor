export type Result<T, E> = { success: true; value: T } | { success: false; error: E };

export const ErrorCode = {
  // File System errors
  FILE_NOT_FOUND: "ERR_FILE_NOT_FOUND",
  PERMISSION_DENIED: "ERR_PERMISSION_DENIED",
  DISK_FULL: "ERR_DISK_FULL",
  CORRUPT_FILE: "ERR_CORRUPT_FILE",
  INVALID_PATH: "ERR_INVALID_PATH",
  FILE_READ_ERROR: "ERR_FILE_READ_ERROR",
  FILE_WRITE_ERROR: "ERR_FILE_WRITE_ERROR",
  FILE_EXISTS: "ERR_FILE_EXISTS",
  DIRECTORY_NOT_FOUND: "ERR_DIRECTORY_NOT_FOUND",
  BUFFER_OVERFLOW: "ERR_BUFFER_OVERFLOW",
  // Memory errors
  MEMORY_EXHAUSTED: "ERR_MEMORY_EXHAUSTED",
  ALLOCATION_NOT_FOUND: "ERR_ALLOCATION_NOT_FOUND",
  ALREADY_ALLOCATED: "ERR_ALREADY_ALLOCATED",
  DEALLOCATION_FAILED: "ERR_DEALLOCATION_FAILED",
  LEAK_DETECTED: "ERR_LEAK_DETECTED",
  // Time errors
  TIME_OUT_OF_RANGE: "ERR_TIME_OUT_OF_RANGE",
  INVALID_TIMECODE: "ERR_INVALID_TIMECODE",
  NEGATIVE_TIME: "ERR_NEGATIVE_TIME",
  // Error engine errors
  ERROR_HANDLER_FAILED: "ERR_ERROR_HANDLER_FAILED",
  RETRY_EXCEEDED: "ERR_RETRY_EXCEEDED",
  // General errors
  UNKNOWN: "ERR_UNKNOWN",
  ENGINE_NOT_INITIALIZED: "ERR_ENGINE_NOT_INITIALIZED",
  INVALID_INPUT: "ERR_INVALID_INPUT",
  NOT_IMPLEMENTED: "ERR_NOT_IMPLEMENTED",
  // Media errors
  MEDIA_IMPORT_FAILED: "ERR_MEDIA_IMPORT_FAILED",
  MEDIA_ANALYSIS_FAILED: "ERR_MEDIA_ANALYSIS_FAILED",
  UNSUPPORTED_FORMAT: "ERR_UNSUPPORTED_FORMAT",
  TRACK_NOT_FOUND: "ERR_TRACK_NOT_FOUND",
  MEDIA_IN_USE: "ERR_MEDIA_IN_USE",
  NO_VIDEO_TRACKS: "ERR_NO_VIDEO_TRACKS",
  // Operation errors
  OPERATION_FAILED: "ERR_OPERATION_FAILED",
  NOTHING_TO_UNDO: "ERR_NOTHING_TO_UNDO",
  NOTHING_TO_REDO: "ERR_NOTHING_TO_REDO",
  CLIP_NOT_FOUND: "ERR_CLIP_NOT_FOUND",
  CLIP_OVERLAP: "ERR_CLIP_OVERLAP",
  // Network errors (future use)
  NETWORK_ERROR: "ERR_NETWORK_ERROR",
  CONNECTION_TIMEOUT: "ERR_CONNECTION_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export enum ErrorSeverity {
  Fatal = "fatal",
  Critical = "critical",
  Warning = "warning",
  Info = "info",
}

export enum ErrorCategory {
  FileSystem = "filesystem",
  Memory = "memory",
  Time = "time",
  Network = "network",
  Internal = "internal",
  Unknown = "unknown",
  Media = "media",
  Operation = "operation",
}

export interface ErrorContext {
  code: ErrorCode;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  messageAr: string;
  timestamp: string; // ISO 8601 with timezone
  source: string;
  operation: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  recoverable: boolean;
  announced: boolean;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoffFactor: number;
}

export interface ErrorEntry {
  id: string;
  context: ErrorContext;
  attempt: number;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ErrorHandler {
  canHandle(code: ErrorCode): boolean;
  handle(entry: ErrorEntry): ErrorAction;
}

export type ErrorActionType = "retry" | "ignore" | "escalate" | "halt";

export interface ErrorAction {
  type: ErrorActionType;
  delay?: number;
  reason?: string;
}

export const ErrorMessages: Record<ErrorCode, { en: string; ar: string }> = {
  [ErrorCode.FILE_NOT_FOUND]: { en: "File not found.", ar: "الملف غير موجود." },
  [ErrorCode.PERMISSION_DENIED]: { en: "Permission denied.", ar: "صلاحية الوصول مرفوضة." },
  [ErrorCode.DISK_FULL]: { en: "Disk is full.", ar: "القرص ممتلئ." },
  [ErrorCode.CORRUPT_FILE]: { en: "File is corrupted.", ar: "الملف تالف." },
  [ErrorCode.INVALID_PATH]: { en: "Invalid file path.", ar: "مسار الملف غير صالح." },
  [ErrorCode.FILE_READ_ERROR]: { en: "Error reading file.", ar: "خطأ في قراءة الملف." },
  [ErrorCode.FILE_WRITE_ERROR]: { en: "Error writing file.", ar: "خطأ في كتابة الملف." },
  [ErrorCode.FILE_EXISTS]: { en: "File already exists.", ar: "الملف موجود مسبقًا." },
  [ErrorCode.DIRECTORY_NOT_FOUND]: { en: "Directory not found.", ar: "المجلد غير موجود." },
  [ErrorCode.BUFFER_OVERFLOW]: { en: "Buffer overflow.", ar: "تجاوز سعة المخزن المؤقت." },
  [ErrorCode.MEMORY_EXHAUSTED]: { en: "Memory exhausted.", ar: "نفاد الذاكرة." },
  [ErrorCode.ALLOCATION_NOT_FOUND]: { en: "Allocation not found.", ar: "التخصيص غير موجود." },
  [ErrorCode.ALREADY_ALLOCATED]: { en: "Already allocated.", ar: "مُخصص مسبقًا." },
  [ErrorCode.DEALLOCATION_FAILED]: { en: "Deallocation failed.", ar: "فشل تحرير الذاكرة." },
  [ErrorCode.LEAK_DETECTED]: { en: "Memory leak detected.", ar: "تم اكتشاف تسرب ذاكرة." },
  [ErrorCode.TIME_OUT_OF_RANGE]: { en: "Time value out of range.", ar: "قيمة الوقت خارج النطاق." },
  [ErrorCode.INVALID_TIMECODE]: { en: "Invalid timecode format.", ar: "صيغة التوقيت غير صالحة." },
  [ErrorCode.NEGATIVE_TIME]: { en: "Negative time is not allowed.", ar: "الوقت السالب غير مسموح به." },
  [ErrorCode.ERROR_HANDLER_FAILED]: { en: "Error handler failed.", ar: "فشل معالج الأخطاء." },
  [ErrorCode.RETRY_EXCEEDED]: { en: "Maximum retry attempts exceeded.", ar: "تجاوز الحد الأقصى لمحاولات إعادة المحاولة." },
  [ErrorCode.UNKNOWN]: { en: "An unknown error occurred.", ar: "حدث خطأ غير معروف." },
  [ErrorCode.ENGINE_NOT_INITIALIZED]: { en: "Engine not initialized.", ar: "المحرك لم يُهيأ." },
  [ErrorCode.INVALID_INPUT]: { en: "Invalid input provided.", ar: "مدخلات غير صالحة." },
  [ErrorCode.NOT_IMPLEMENTED]: { en: "Feature not implemented yet.", ar: "الميزة لم تُنفذ بعد." },
  [ErrorCode.MEDIA_IMPORT_FAILED]: { en: "Media import failed.", ar: "فشل استيراد الوسائط." },
  [ErrorCode.MEDIA_ANALYSIS_FAILED]: { en: "Media analysis failed.", ar: "فشل تحليل الوسائط." },
  [ErrorCode.UNSUPPORTED_FORMAT]: { en: "Unsupported media format.", ar: "صيغة وسائط غير مدعومة." },
  [ErrorCode.TRACK_NOT_FOUND]: { en: "Track not found.", ar: "المسار غير موجود." },
  [ErrorCode.MEDIA_IN_USE]: { en: "Media asset is in use by clips.", ar: "أصل الوسائط قيد الاستخدام بواسطة مقاطع." },
  [ErrorCode.NO_VIDEO_TRACKS]: { en: "The project has no video tracks.", ar: "لا توجد مسارات فيديو في المشروع." },
  [ErrorCode.OPERATION_FAILED]: { en: "Operation failed.", ar: "فشلت العملية." },
  [ErrorCode.NOTHING_TO_UNDO]: { en: "Nothing to undo.", ar: "لا يوجد شيء للتراجع عنه." },
  [ErrorCode.NOTHING_TO_REDO]: { en: "Nothing to redo.", ar: "لا يوجد شيء لإعادته." },
  [ErrorCode.CLIP_NOT_FOUND]: { en: "Clip not found.", ar: "المقطع غير موجود." },
  [ErrorCode.CLIP_OVERLAP]: { en: "Clips cannot overlap.", ar: "لا يمكن تداخل المقاطع." },
  [ErrorCode.NETWORK_ERROR]: { en: "Network error.", ar: "خطأ في الشبكة." },
  [ErrorCode.CONNECTION_TIMEOUT]: { en: "Connection timed out.", ar: "انتهت مهلة الاتصال." },
};

export function createDefaultRetryConfig(): RetryConfig {
  return { maxAttempts: 3, baseDelayMs: 100, backoffFactor: 2 };
}

export function classifyError(code: ErrorCode): { severity: ErrorSeverity; category: ErrorCategory; recoverable: boolean } {
  switch (code) {
    case ErrorCode.DISK_FULL:
    case ErrorCode.MEMORY_EXHAUSTED:
    case ErrorCode.LEAK_DETECTED:
    case ErrorCode.CONNECTION_TIMEOUT:
      return { severity: ErrorSeverity.Fatal, category: ErrorCategory.Internal, recoverable: false };
    case ErrorCode.FILE_NOT_FOUND:
    case ErrorCode.PERMISSION_DENIED:
    case ErrorCode.CORRUPT_FILE:
    case ErrorCode.INVALID_PATH:
    case ErrorCode.FILE_READ_ERROR:
    case ErrorCode.FILE_WRITE_ERROR:
    case ErrorCode.MEDIA_IMPORT_FAILED:
    case ErrorCode.MEDIA_ANALYSIS_FAILED:
    case ErrorCode.UNSUPPORTED_FORMAT:
    case ErrorCode.MEDIA_IN_USE:
    case ErrorCode.NOTHING_TO_UNDO:
    case ErrorCode.NOTHING_TO_REDO:
    case ErrorCode.CLIP_NOT_FOUND:
    case ErrorCode.OPERATION_FAILED:
    case ErrorCode.ERROR_HANDLER_FAILED:
    case ErrorCode.RETRY_EXCEEDED:
      return { severity: ErrorSeverity.Critical, category: ErrorCategory.Operation, recoverable: false };
    case ErrorCode.FILE_EXISTS:
    case ErrorCode.BUFFER_OVERFLOW:
    case ErrorCode.ALLOCATION_NOT_FOUND:
    case ErrorCode.ALREADY_ALLOCATED:
    case ErrorCode.DEALLOCATION_FAILED:
    case ErrorCode.TIME_OUT_OF_RANGE:
    case ErrorCode.INVALID_TIMECODE:
    case ErrorCode.NEGATIVE_TIME:
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.TRACK_NOT_FOUND:
    case ErrorCode.CLIP_OVERLAP:
    case ErrorCode.DIRECTORY_NOT_FOUND:
    case ErrorCode.NO_VIDEO_TRACKS:
      return { severity: ErrorSeverity.Warning, category: ErrorCategory.Operation, recoverable: true };
    case ErrorCode.UNKNOWN:
    case ErrorCode.ENGINE_NOT_INITIALIZED:
    case ErrorCode.NOT_IMPLEMENTED:
    default:
      return { severity: ErrorSeverity.Warning, category: ErrorCategory.Unknown, recoverable: false };
  }
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
