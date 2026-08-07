import { Result, ErrorCode } from "../../infrastructure/common/types";
import { Version, UpdateChannel, UpdateInfo, FetchLike, releaseUrl } from "../common/types";

export interface VersionCheckerOptions {
  readonly currentVersion: Version;
  readonly channel: UpdateChannel;
  readonly fetch: FetchLike;
  readonly url?: string;
}

interface ReleaseAsset {
  readonly browser_download_url?: unknown;
  readonly size?: unknown;
}

export class VersionChecker {
  private cache: UpdateInfo | null = null;
  private notified = false;
  private channel: UpdateChannel;

  constructor(private readonly options: VersionCheckerOptions) {
    this.channel = options.channel;
  }

  getCurrentVersion(): Version {
    return this.options.currentVersion;
  }

  setChannel(channel: UpdateChannel): void {
    this.channel = channel;
  }

  getChannel(): UpdateChannel {
    return this.channel;
  }

  getLastResult(): UpdateInfo | null {
    return this.cache;
  }

  clearCache(): void {
    this.cache = null;
    this.notified = false;
  }

  shouldNotify(): boolean {
    return this.cache !== null && !this.notified;
  }

  markNotified(): void {
    this.notified = true;
  }

  async checkForUpdates(): Promise<Result<UpdateInfo | null, ErrorCode>> {
    const url = this.options.url ?? releaseUrl("yassindighousssi", "ACESS-video-editor");
    let response;
    try {
      response = await this.options.fetch(url);
    } catch {
      return { success: false, error: ErrorCode.CONNECTION_TIMEOUT };
    }
    if (!response.ok) {
      return { success: false, error: ErrorCode.NETWORK_ERROR };
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    const info = this.parseRelease(payload);
    if (info === null) {
      return { success: false, error: ErrorCode.UNKNOWN };
    }
    const current = this.options.currentVersion;
    const eligible =
      Version.isNewer(info.version, current) ||
      (Version.sameCore(info.version, current) &&
        info.version.channel !== current.channel &&
        info.version.channel === this.channel);
    if (eligible) {
      this.cache = info;
      return { success: true, value: info };
    }
    this.cache = null;
    return { success: true, value: null };
  }

  private parseRelease(payload: unknown): UpdateInfo | null {
    if (typeof payload !== "object" || payload === null) return null;
    const record = payload as Record<string, unknown>;
    if (typeof record.tag_name !== "string") return null;
    const version = Version.parse(record.tag_name);
    if (version === null) return null;
    if (typeof record.browser_download_url !== "string" && !Array.isArray(record.assets)) {
      return null;
    }
    let downloadUrl = "";
    if (typeof record.browser_download_url === "string") {
      downloadUrl = record.browser_download_url;
    } else {
      const assets = record.assets as unknown[];
      const first = this.firstAsset(assets);
      if (first === null || typeof first.browser_download_url !== "string") return null;
      downloadUrl = first.browser_download_url;
    }
    const size = this.extractSize(record);
    const requiredVersionRaw =
      typeof record.required_version === "string" ? Version.parse(record.required_version) : undefined;
    return {
      version,
      releaseDate: typeof record.published_at === "string" ? record.published_at : "",
      releaseNotes: typeof record.body === "string" ? record.body : "",
      downloadUrl,
      size,
      checksum: typeof record.checksum === "string" ? record.checksum : "",
      requiredVersion: requiredVersionRaw === null ? undefined : requiredVersionRaw,
      breakingChanges: record.breaking_changes === true,
    };
  }

  private firstAsset(assets: unknown[]): ReleaseAsset | null {
    if (assets.length === 0) return null;
    const first = assets[0];
    if (typeof first !== "object" || first === null) return null;
    return first as ReleaseAsset;
  }

  private extractSize(record: Record<string, unknown>): number {
    if (typeof record.size === "number") return record.size;
    if (Array.isArray(record.assets) && record.assets.length > 0) {
      const first = record.assets[0];
      if (typeof first === "object" && first !== null) {
        const size = (first as Record<string, unknown>).size;
        if (typeof size === "number") return size;
      }
    }
    return 0;
  }
}
