import { Result, ErrorCode } from "../core/infrastructure/common/types";
import { IFileEngine, FileStat } from "../core/infrastructure/engines/file/file-engine.interface";
import type { AceApi } from "./preload-api";

function remapError(error: string | undefined): ErrorCode {
  switch (error) {
    case ErrorCode.FILE_NOT_FOUND:
    case ErrorCode.PERMISSION_DENIED:
    case ErrorCode.DISK_FULL:
    case ErrorCode.FILE_READ_ERROR:
    case ErrorCode.FILE_WRITE_ERROR:
    case ErrorCode.FILE_EXISTS:
    case ErrorCode.INVALID_PATH:
      return error as ErrorCode;
    default:
      return ErrorCode.UNKNOWN;
  }
}

export function createElectronFileEngine(api: AceApi): IFileEngine {
  return {
    async read(path: string): Promise<Result<Uint8Array, ErrorCode>> {
      const response = await api.file.read(path);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: response.value };
    },
    async write(path: string, data: Uint8Array): Promise<Result<void, ErrorCode>> {
      const response = await api.file.write(path, data);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: undefined };
    },
    async exists(path: string): Promise<Result<boolean, ErrorCode>> {
      const response = await api.file.exists(path);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: response.value };
    },
    async stat(path: string): Promise<Result<FileStat, ErrorCode>> {
      const response = await api.file.stat(path);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: response.value };
    },
    async delete(path: string): Promise<Result<void, ErrorCode>> {
      const response = await api.file.delete(path);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: undefined };
    },
    async list(dir: string): Promise<Result<string[], ErrorCode>> {
      const response = await api.file.list(dir);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: response.value };
    },
    async move(src: string, dest: string): Promise<Result<void, ErrorCode>> {
      const response = await api.file.move(src, dest);
      if (!response.success) return { success: false, error: remapError(response.error) };
      return { success: true, value: undefined };
    },
  };
}

export function fileEngineOrEmpty(): IFileEngine {
  return {
    read: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    write: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    exists: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    stat: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    delete: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    list: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
    move: async () => ({ success: false, error: ErrorCode.ENGINE_NOT_INITIALIZED }),
  };
}
