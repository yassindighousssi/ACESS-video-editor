import { Result, ErrorCode } from "../../common/types";
import { MockFileSystem } from "../../testing/test-harness";

export interface FileStat {
  size: number;
  createdAt: number;
  modifiedAt: number;
}

export interface IFileEngine {
  read(path: string): Promise<Result<Uint8Array, ErrorCode>>;
  write(path: string, data: Uint8Array): Promise<Result<void, ErrorCode>>;
  exists(path: string): Promise<Result<boolean, ErrorCode>>;
  stat(path: string): Promise<Result<FileStat, ErrorCode>>;
  delete(path: string): Promise<Result<void, ErrorCode>>;
  list(dir: string): Promise<Result<string[], ErrorCode>>;
  move(src: string, dest: string): Promise<Result<void, ErrorCode>>;
}

export function fileEngineForMock(fs: MockFileSystem): IFileEngine {
  return {
    async read(path: string): Promise<Result<Uint8Array, ErrorCode>> {
      if (!fs.exists(path)) {
        return { success: false, error: ErrorCode.FILE_NOT_FOUND };
      }
      const result = fs.readFile(path);
      if (!result.success) return result;
      return { success: true, value: result.data };
    },
    async write(path: string, data: Uint8Array): Promise<Result<void, ErrorCode>> {
      const result = fs.writeFile(path, data);
      if (!result.success) return result;
      return { success: true, value: undefined };
    },
    async exists(path: string): Promise<Result<boolean, ErrorCode>> {
      return { success: true, value: fs.exists(path) };
    },
    async stat(path: string): Promise<Result<FileStat, ErrorCode>> {
      if (!fs.exists(path)) {
        return { success: false, error: ErrorCode.FILE_NOT_FOUND };
      }
      const read = fs.readFile(path);
      if (!read.success) return read;
      return {
        success: true,
        value: {
          size: read.data.length,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        },
      };
    },
    async delete(path: string): Promise<Result<void, ErrorCode>> {
      const result = fs.deleteFile(path);
      if (!result.success) return result;
      return { success: true, value: undefined };
    },
    async list(dir: string): Promise<Result<string[], ErrorCode>> {
      const entries = fs.listDirectory(dir);
      return { success: true, value: entries };
    },
    async move(src: string, dest: string): Promise<Result<void, ErrorCode>> {
      const read = fs.readFile(src);
      if (!read.success) return read;
      const write = fs.writeFile(dest, read.data);
      if (!write.success) return write;
      const del = fs.deleteFile(src);
      if (!del.success) return del;
      return { success: true, value: undefined };
    },
  };
}
