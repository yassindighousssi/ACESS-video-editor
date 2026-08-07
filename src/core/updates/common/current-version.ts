import { Version, UpdateChannel } from "./types";
import currentVersionJson from "./current-version.json";

export function readCurrentVersion(): Version {
  const channel: UpdateChannel =
    currentVersionJson.channel === "beta" || currentVersionJson.channel === "nightly"
      ? currentVersionJson.channel
      : "stable";
  return new Version(
    currentVersionJson.major,
    currentVersionJson.minor,
    currentVersionJson.patch,
    channel,
    currentVersionJson.build,
  );
}
