import { Result, ErrorCode } from "../infrastructure/common/types";
import { VersionChecker } from "./checker/version-checker";
import { UpdateDownloader } from "./downloader/downloader";
import { UpdateInstaller } from "./installer/installer";
import { UpdateUI } from "./ui/update-ui";
import { UpdateStatus, UpdateSettings, UpdateInfo, TimerLike } from "./common/types";

export interface UpdateManagerDeps {
  readonly checker: VersionChecker;
  readonly downloader: UpdateDownloader;
  readonly installer: UpdateInstaller;
  readonly ui: UpdateUI;
  readonly settings: UpdateSettings;
  readonly timer?: TimerLike;
}

export class UpdateManager {
  private status: UpdateStatus = "idle";
  private timerHandle: unknown = null;
  private lastError: ErrorCode | null = null;
  private skippedVersion: string | null = null;

  constructor(private readonly deps: UpdateManagerDeps) {
    this.skippedVersion = deps.settings.skippedVersion;
  }

  getStatus(): UpdateStatus {
    return this.status;
  }

  getLastError(): ErrorCode | null {
    return this.lastError;
  }

  getSkippedVersion(): string | null {
    return this.skippedVersion;
  }

  init(): void {
    if (this.deps.settings.autoCheck) {
      this.scheduleAutoCheck(this.deps.settings.checkIntervalMs);
    }
  }

  async checkAndNotify(): Promise<Result<UpdateInfo | null, ErrorCode>> {
    this.status = "checking";
    this.deps.ui.setStatus("checking");
    const check = await this.deps.checker.checkForUpdates();
    if (!check.success) {
      this.status = "failed";
      this.lastError = check.error;
      await this.deps.ui.showError(check.error);
      return check;
    }
    if (check.value !== null) {
      this.status = "available";
      this.deps.checker.markNotified();
      await this.deps.ui.showUpdateAvailable(check.value);
      return { success: true, value: check.value };
    }
    this.status = "idle";
    return { success: true, value: null };
  }

  async installUpdate(): Promise<Result<void, ErrorCode>> {
    const info = this.deps.checker.getLastResult();
    if (info === null) {
      this.status = "failed";
      this.lastError = ErrorCode.OPERATION_FAILED;
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    const current = this.deps.checker.getCurrentVersion();
    if (info.requiredVersion !== undefined && !current.satisfiesMinimum(info.requiredVersion)) {
      this.status = "failed";
      this.lastError = ErrorCode.OPERATION_FAILED;
      await this.deps.ui.showError("your version is too old for this update");
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    if (this.deps.ui.getUserDecision() === "skip") {
      this.skippedVersion = info.version.toString();
      return { success: false, error: ErrorCode.OPERATION_FAILED };
    }
    this.status = "downloading";
    this.deps.ui.setStatus("downloading");
    const download = await this.deps.downloader.download(info, p => this.deps.ui.showDownloadProgress(p));
    if (!download.success) {
      this.status = "failed";
      this.lastError = download.error;
      await this.deps.ui.showError("download failed");
      return download;
    }
    const verify = await this.deps.downloader.verifyChecksum(download.value, info.checksum);
    if (!verify.success) {
      this.status = "failed";
      this.lastError = verify.error;
      await this.deps.ui.showError("checksum mismatch");
      return verify;
    }
    this.status = "installing";
    this.deps.ui.setStatus("installing");
    const install = await this.deps.installer.install(info, download.value);
    if (!install.success) {
      this.status = "failed";
      this.lastError = install.error;
      await this.deps.ui.showError("install failed");
      return install;
    }
    this.status = "installed";
    await this.deps.ui.showInstallComplete();
    this.deps.installer.restartApp();
    return { success: true, value: undefined };
  }

  skipUpdate(): void {
    this.deps.ui.choose("skip");
    const info = this.deps.checker.getLastResult();
    this.skippedVersion = info === null ? null : info.version.toString();
  }

  chooseInstall(): void {
    this.deps.ui.choose("install");
  }

  chooseLater(): void {
    this.deps.ui.choose("later");
  }

  scheduleAutoCheck(intervalMs: number): void {
    if (this.deps.timer === undefined) return;
    if (this.timerHandle !== null) {
      this.deps.timer.clearInterval(this.timerHandle);
    }
    this.timerHandle = this.deps.timer.setInterval(() => {
      void this.checkAndNotify();
    }, intervalMs);
  }

  stopAutoCheck(): void {
    if (this.deps.timer !== undefined && this.timerHandle !== null) {
      this.deps.timer.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
