import { Result, ErrorCode } from "../../infrastructure/common/types";

export type UpdateChannel = "stable" | "beta" | "nightly";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "installed"
  | "failed";

export const CHANNEL_RANK: Record<UpdateChannel, number> = {
  stable: 0,
  beta: 1,
  nightly: 2,
};

export const UPDATE_CHANNELS: readonly UpdateChannel[] = ["stable", "beta", "nightly"];

export class Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly channel: UpdateChannel;
  readonly build: number;

  constructor(
    major: number,
    minor: number,
    patch: number,
    channel: UpdateChannel = "stable",
    build: number = 0,
  ) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.channel = channel;
    this.build = build;
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}-${this.channel}`;
  }

  static parse(input: string): Version | null {
    const trimmed = input.trim();
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-(stable|beta|nightly))?$/.exec(trimmed);
    if (match === null) return null;
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);
    if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return null;
    const channel: UpdateChannel = match[4] === "beta" || match[4] === "nightly" ? match[4] : "stable";
    return new Version(major, minor, patch, channel);
  }

  static compare(a: Version, b: Version): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    return CHANNEL_RANK[a.channel] - CHANNEL_RANK[b.channel];
  }

  static sameCore(a: Version, b: Version): boolean {
    return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
  }

  static isNewer(candidate: Version, current: Version): boolean {
    if (candidate.major !== current.major) return candidate.major > current.major;
    if (candidate.minor !== current.minor) return candidate.minor > current.minor;
    return candidate.patch > current.patch;
  }

  satisfiesMinimum(minimum: Version): boolean {
    if (this.major !== minimum.major) return this.major > minimum.major;
    if (this.minor !== minimum.minor) return this.minor > minimum.minor;
    return this.patch >= minimum.patch;
  }
}

export interface UpdateInfo {
  readonly version: Version;
  readonly releaseDate: string;
  readonly releaseNotes: string;
  readonly downloadUrl: string;
  readonly size: number;
  readonly checksum: string;
  readonly requiredVersion?: Version;
  readonly breakingChanges: boolean;
}

export interface UpdateSettings {
  readonly channel: UpdateChannel;
  readonly autoCheck: boolean;
  readonly checkIntervalMs: number;
  readonly skippedVersion: string | null;
}

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly json: () => Promise<unknown>;
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
}

export type FetchLike = (url: string) => Promise<FetchResponseLike>;

export interface TimerLike {
  setInterval(callback: () => void, intervalMs: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface ProcessLike {
  restart(): void;
}

export function releaseUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
}
