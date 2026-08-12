import { createHash } from "crypto";
import { Result, ErrorCode } from "../../infrastructure/common/types";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";
import { UpdateInfo, FetchLike } from "../common/types";

const CHUNK_SIZE = 64 * 1024;

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export class UpdateDownloader {
  private downloadUrl: string | null = null;
  private downloadedFile: string | null = null;
  private progress = 0;
  private cancelled = false;

  constructor(
    private readonly file: IFileEngine,
    private readonly updatesDir: string,
    private readonly fetch: FetchLike,
  ) {}

  getProgress(): number {
    return this.progress;
  }

  getDownloadedFile(): string | null {
    return this.downloadedFile;
  }

  getDownloadUrl(): string | null {
    return this.downloadUrl;
  }

  cancelDownload(): void {
    this.cancelled = true;
  }

  async download(
    updateInfo: UpdateInfo,
    progressCallback?: (percent: number) => void,
  ): Promise<Result<string, ErrorCode>> {
    this.cancelled = false;
    this.progress = 0;
    this.downloadUrl = updateInfo.downloadUrl;
    this.downloadedFile = null;
    let response;
    try {
      response = await this.fetch(updateInfo.downloadUrl);
    } catch {
      return { success: false, error: ErrorCode.CONNECTION_TIMEOUT };
    }
    if (!response.ok) {
      return { success: false, error: ErrorCode.NETWORK_ERROR };
    }
    let data: Uint8Array;
    try {
      data = new Uint8Array(await response.arrayBuffer());
    } catch {
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    const totalChunks = Math.max(1, Math.ceil(data.length / CHUNK_SIZE));
    for (let i = 1; i <= totalChunks; i++) {
      if (this.cancelled) {
        this.progress = 0;
        this.downloadedFile = null;
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
      this.progress = Math.floor((i / totalChunks) * 100);
      if (progressCallback) progressCallback(this.progress);
    }
    const path = this.resolveDownloadPath(updateInfo);
    const write = await this.file.write(path, data);
    if (!write.success) {
      this.progress = 0;
      return write;
    }
    this.downloadedFile = path;
    this.progress = 100;
    if (progressCallback) progressCallback(100);
    return { success: true, value: path };
  }

  async verifyChecksum(filePath: string, expectedChecksum: string): Promise<Result<void, ErrorCode>> {
    const read = await this.file.read(filePath);
    if (!read.success) return read;
    if (expectedChecksum.length === 0) {
      return { success: true, value: undefined };
    }
    const actual = sha256Hex(read.value);
    if (actual !== expectedChecksum) {
      return { success: false, error: ErrorCode.CORRUPT_FILE };
    }
    return { success: true, value: undefined };
  }

  private resolveDownloadPath(updateInfo: UpdateInfo): string {
    const dir = this.updatesDir.replace(/[/\\]+$/, "");
    return `${dir}/${updateInfo.version.toString()}.bin`;
  }
}
