import { Result, ErrorCode } from "../../infrastructure/common/types";
import { IFileEngine } from "../../infrastructure/engines/file/file-engine.interface";
import { UpdateInfo, Version, ProcessLike } from "../common/types";

export interface InstallerOptions {
  readonly file: IFileEngine;
  readonly appDir: string;
  readonly currentVersion: Version;
  readonly process?: ProcessLike;
  readonly confirmBreakingChange?: (releaseNotes: string) => boolean;
}

const MANIFEST = "current-version.json";
const BACKUP = "backup/current-version.json";
const ARTIFACT = "tempo-update.bin";

function pathIn(appDir: string, name: string): string {
  return `${appDir.replace(/[/\\]+$/, "")}/${name}`;
}

export class UpdateInstaller {
  private backupPath: string | null = null;
  private installed = false;

  constructor(private readonly options: InstallerOptions) {}

  getBackupPath(): string | null {
    return this.backupPath;
  }

  hasInstalled(): boolean {
    return this.installed;
  }

  async createBackup(): Promise<Result<string, ErrorCode>> {
    const manifestPath = pathIn(this.options.appDir, MANIFEST);
    const backupPath = pathIn(this.options.appDir, BACKUP);
    const existing = await this.options.file.read(manifestPath);
    let payload: Uint8Array;
    if (existing.success) {
      payload = existing.value;
    } else {
      payload = new TextEncoder().encode(
        JSON.stringify({
          major: this.options.currentVersion.major,
          minor: this.options.currentVersion.minor,
          patch: this.options.currentVersion.patch,
          channel: this.options.currentVersion.channel,
          build: this.options.currentVersion.build,
        }),
      );
    }
    const write = await this.options.file.write(backupPath, payload);
    if (!write.success) return write;
    this.backupPath = backupPath;
    return { success: true, value: backupPath };
  }

  async install(updateInfo: UpdateInfo, downloadedFile: string): Promise<Result<void, ErrorCode>> {
    if (updateInfo.breakingChanges && this.options.confirmBreakingChange !== undefined) {
      const confirmed = this.options.confirmBreakingChange(updateInfo.releaseNotes);
      if (!confirmed) {
        return { success: false, error: ErrorCode.OPERATION_FAILED };
      }
    }
    const backup = await this.createBackup();
    if (!backup.success) return backup;
    const read = await this.options.file.read(downloadedFile);
    if (!read.success) return read;
    const artifactPath = pathIn(this.options.appDir, ARTIFACT);
    const copy = await this.options.file.write(artifactPath, read.value);
    if (!copy.success) return copy;
    const manifest = new TextEncoder().encode(
      JSON.stringify({
        major: updateInfo.version.major,
        minor: updateInfo.version.minor,
        patch: updateInfo.version.patch,
        channel: updateInfo.version.channel,
        build: updateInfo.version.build,
      }),
    );
    const manifestWrite = await this.options.file.write(pathIn(this.options.appDir, MANIFEST), manifest);
    if (!manifestWrite.success) return manifestWrite;
    this.installed = true;
    return { success: true, value: undefined };
  }

  async rollback(): Promise<Result<void, ErrorCode>> {
    const backupPath = pathIn(this.options.appDir, BACKUP);
    const backup = await this.options.file.read(backupPath);
    if (!backup.success) return { success: false, error: ErrorCode.OPERATION_FAILED };
    const restore = await this.options.file.write(pathIn(this.options.appDir, MANIFEST), backup.value);
    if (!restore.success) return restore;
    const artifactPath = pathIn(this.options.appDir, ARTIFACT);
    if (await this.options.file.exists(artifactPath)) {
      const deleted = await this.options.file.delete(artifactPath);
      if (!deleted.success) return deleted;
    }
    this.installed = false;
    return { success: true, value: undefined };
  }

  restartApp(): void {
    if (this.options.process !== undefined) {
      this.options.process.restart();
    }
  }
}
