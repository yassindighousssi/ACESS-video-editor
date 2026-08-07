import { AnnouncementEngine } from "../../rooms/common/announcement-engine";
import { AnnouncementTranslator } from "../../i18n/announcement-adapter";
import { UpdateInfo, UpdateStatus } from "../common/types";

export type UserDecision = "install" | "later" | "skip";

export class UpdateUI {
  private decision: UserDecision | null = null;
  private status: UpdateStatus = "idle";

  constructor(
    private readonly announcement: AnnouncementEngine,
    private readonly source: string = "updates",
    private readonly translator?: AnnouncementTranslator,
  ) {}

  setStatus(status: UpdateStatus): void {
    this.status = status;
  }

  getStatus(): UpdateStatus {
    return this.status;
  }

  choose(decision: UserDecision): void {
    this.decision = decision;
  }

  getUserDecision(): UserDecision | null {
    return this.decision;
  }

  async showUpdateAvailable(info: UpdateInfo): Promise<void> {
    this.status = "available";
    if (this.translator !== undefined) {
      const text = await this.translator.announce("announcements.update_available", {
        version: info.version.toString(),
      });
      this.announcement.speak(text.textAr, text.textEn, "important", this.source);
      return;
    }
    this.announcement.speak(
      `تحديث جديد متاح: الإصدار ${info.version.toString()}. هل تريد تثبيته الآن؟`,
      `Update available: version ${info.version.toString()}. Do you want to install it now?`,
      "important",
      this.source,
    );
  }

  async showDownloadProgress(percent: number): Promise<void> {
    if (this.translator !== undefined) {
      const text = await this.translator.announce("announcements.update_downloading", { percent });
      this.announcement.speak(text.textAr, text.textEn, "all", this.source);
      return;
    }
    this.announcement.speak(
      `تنزيل التحديث: ${percent}%`,
      `Downloading update: ${percent}%`,
      "all",
      this.source,
    );
  }

  async showInstallComplete(): Promise<void> {
    this.status = "installed";
    if (this.translator !== undefined) {
      const text = await this.translator.announce("announcements.update_installed");
      this.announcement.speak(text.textAr, text.textEn, "important", this.source);
      return;
    }
    this.announcement.speak(
      "تم تثبيت التحديث بنجاح. سيتم إعادة تشغيل التطبيق.",
      "Update installed successfully. The app will restart.",
      "important",
      this.source,
    );
  }

  async showError(message: string): Promise<void> {
    this.status = "failed";
    if (this.translator !== undefined) {
      const text = await this.translator.announce("announcements.update_error", { message });
      this.announcement.speak(text.textAr, text.textEn, "critical_only", this.source);
      return;
    }
    this.announcement.speak(
      `حدث خطأ أثناء التحديث: ${message}`,
      `Update error: ${message}`,
      "critical_only",
      this.source,
    );
  }
}
