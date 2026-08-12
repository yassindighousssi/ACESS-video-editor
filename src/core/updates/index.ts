export { Version, CHANNEL_RANK, UPDATE_CHANNELS, releaseUrl } from "./common/types";
export type {
  UpdateChannel,
  UpdateStatus,
  UpdateInfo,
  UpdateSettings,
  FetchLike,
  FetchResponseLike,
  TimerLike,
  ProcessLike,
} from "./common/types";
export { readCurrentVersion } from "./common/current-version";
export { nodeFetch } from "./common/runtime";
export { VersionChecker } from "./checker/version-checker";
export type { VersionCheckerOptions } from "./checker/version-checker";
export { UpdateDownloader, sha256Hex } from "./downloader/downloader";
export { UpdateInstaller } from "./installer/installer";
export type { InstallerOptions } from "./installer/installer";
export { UpdateUI } from "./ui/update-ui";
export type { UserDecision } from "./ui/update-ui";
export { UpdateManager } from "./update-manager";
export type { UpdateManagerDeps } from "./update-manager";
