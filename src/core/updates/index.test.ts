import * as updates from "./index";
import { VersionChecker } from "./checker/version-checker";
import { UpdateDownloader } from "./downloader/downloader";
import { UpdateInstaller } from "./installer/installer";
import { UpdateUI } from "./ui/update-ui";
import { UpdateManager } from "./update-manager";
import { Version, releaseUrl, nodeFetch, readCurrentVersion } from "./index";

describe("updates barrel", () => {
  it("should export the public surface", () => {
    expect(updates.VersionChecker).toBe(VersionChecker);
    expect(updates.UpdateDownloader).toBe(UpdateDownloader);
    expect(updates.UpdateInstaller).toBe(UpdateInstaller);
    expect(updates.UpdateUI).toBe(UpdateUI);
    expect(updates.UpdateManager).toBe(UpdateManager);
  });

  it("should expose value helpers", () => {
    expect(Version.parse("1.0.0")?.toString()).toBe("1.0.0-stable");
    expect(releaseUrl("o", "r")).toContain("o/r/releases/latest");
    expect(typeof nodeFetch).toBe("function");
    expect(readCurrentVersion().toString()).toBe("1.0.0-stable");
  });
});
