import { AnnouncementEngine } from "../rooms/common/announcement-engine";
import { UpdateManager } from "./update-manager";
import { VersionChecker } from "./checker/version-checker";
import { UpdateDownloader, sha256Hex } from "./downloader/downloader";
import { UpdateInstaller } from "./installer/installer";
import { UpdateUI } from "./ui/update-ui";
import { Version } from "./common/types";
import { ErrorCode } from "../infrastructure/common/types";
import { MockFileSystem } from "../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../infrastructure/engines/file/file-engine.interface";
import { MockFetch, MockTimer, MockProcess, mockPayload, binaryResponse } from "./tests/helpers";

const APP_DIR = "app";
const UPDATES_DIR = "updates/temp";

interface ManagerHarness {
  manager: UpdateManager;
  fetch: MockFetch;
  timer: MockTimer;
  process: MockProcess;
  file: MockFileSystem;
  announcement: AnnouncementEngine;
  ui: UpdateUI;
  binary: Uint8Array;
}

function makeHarness(overrides: {
  autoCheck?: boolean;
  channel?: "stable" | "beta" | "nightly";
  skippedVersion?: string | null;
} = {}): ManagerHarness {
  const file = new MockFileSystem();
  const fetch = new MockFetch();
  const timer = new MockTimer();
  const process = new MockProcess();
  const announcement = new AnnouncementEngine();
  const binary = new TextEncoder().encode("mock-update-binary");
  const current = new Version(1, 0, 0);
  const checker = new VersionChecker({
    currentVersion: current,
    channel: overrides.channel ?? "stable",
    fetch: fetch.handler,
  });
  const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
  const installer = new UpdateInstaller({
    file: fileEngineForMock(file),
    appDir: APP_DIR,
    currentVersion: current,
    process,
  });
  const ui = new UpdateUI(announcement, "updates");
  const manager = new UpdateManager({
    checker,
    downloader,
    installer,
    ui,
    settings: {
      channel: overrides.channel ?? "stable",
      autoCheck: overrides.autoCheck ?? false,
      checkIntervalMs: 60_000,
      skippedVersion: overrides.skippedVersion ?? null,
    },
    timer,
  });
  return { manager, fetch, timer, process, file, announcement, ui, binary };
}

function releasePayload(checksum: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return mockPayload({
    tag_name: "v1.2.3",
    checksum,
    ...overrides,
  });
}

describe("UpdateManager", () => {
  it("should check and notify about an available update", async () => {
    const { manager, fetch, announcement } = makeHarness();
    fetch.enqueue(releasePayload(""));
    const result = await manager.checkAndNotify();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value?.version.toString()).toBe("1.2.3-stable");
    expect(manager.getStatus()).toBe("available");
    expect(announcement.getLast()?.textEn).toContain("Update available");
  });

  it("should go idle when no update is available", async () => {
    const { manager, fetch } = makeHarness();
    fetch.enqueue(releasePayload("", { tag_name: "v1.0.0" }));
    const result = await manager.checkAndNotify();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
    expect(manager.getStatus()).toBe("idle");
    expect(manager.getLastError()).toBeNull();
  });

  it("should surface check failures", async () => {
    const { manager, fetch, announcement } = makeHarness();
    fetch.enqueueError(new Error("down"));
    const result = await manager.checkAndNotify();
    expect(result.success).toBe(false);
    expect(manager.getStatus()).toBe("failed");
    expect(manager.getLastError()).toBe(ErrorCode.CONNECTION_TIMEOUT);
    expect(announcement.getLast()?.textEn).toContain("Update error");
  });

  it("should run the full check-download-verify-install-restart lifecycle", async () => {
    const { manager, fetch, process, file, announcement, binary } = makeHarness();
    const checksum = sha256Hex(binary);
    fetch.enqueue(releasePayload(checksum));
    fetch.enqueueResponse(binaryResponse(binary));

    const check = await manager.checkAndNotify();
    expect(check.success).toBe(true);

    manager.chooseInstall();
    const result = await manager.installUpdate();
    expect(result.success).toBe(true);
    expect(manager.getStatus()).toBe("installed");
    expect(process.restartCount).toBe(1);
    expect(announcement.getLast()?.textEn).toContain("installed successfully");
    expect(file.exists("updates/temp/1.2.3-stable.bin")).toBe(true);
    expect(file.exists("app/tempo-update.bin")).toBe(true);
    const manifest = file.readFile("app/current-version.json");
    expect(manifest.success && new TextDecoder().decode(manifest.data)).toContain('"patch":3');
  });

  it("should abort the install when the user skipped", async () => {
    const { manager, fetch } = makeHarness();
    fetch.enqueue(releasePayload(""));
    await manager.checkAndNotify();
    manager.skipUpdate();
    const result = await manager.installUpdate();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(manager.getSkippedVersion()).toBe("1.2.3-stable");
  });

  it("should fail when there is no cached update", async () => {
    const { manager } = makeHarness();
    const result = await manager.installUpdate();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(manager.getStatus()).toBe("failed");
  });

  it("should refuse an update above the required version", async () => {
    const { manager, fetch, announcement } = makeHarness();
    fetch.enqueue(releasePayload("", { required_version: "2.0.0" }));
    await manager.checkAndNotify();
    const result = await manager.installUpdate();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(announcement.getLast()?.textEn).toContain("too old");
  });

  it("should report a download failure", async () => {
    const { manager, fetch, announcement } = makeHarness();
    fetch.enqueue(releasePayload(""));
    await manager.checkAndNotify();
    fetch.enqueueError(new Error("offline"));
    manager.chooseInstall();
    const result = await manager.installUpdate();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CONNECTION_TIMEOUT);
    expect(manager.getStatus()).toBe("failed");
    expect(announcement.getLast()?.textEn).toContain("download failed");
  });

  it("should report a checksum mismatch", async () => {
    const { manager, fetch, announcement } = makeHarness();
    fetch.enqueue(releasePayload("deadbeef"));
    await manager.checkAndNotify();
    fetch.enqueueResponse(binaryResponse(new TextEncoder().encode("tampered-bytes")));
    manager.chooseInstall();
    const result = await manager.installUpdate();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
    expect(announcement.getLast()?.textEn).toContain("checksum mismatch");
  });

  it("should schedule auto-check on init", async () => {
    const { manager, fetch, timer } = makeHarness({ autoCheck: true });
    manager.init();
    expect(timer.getPendingCount()).toBe(1);
    fetch.enqueue(releasePayload(""));
    timer.fire();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(manager.getStatus()).toBe("available");
  });

  it("should not schedule auto-check when disabled", () => {
    const { manager, timer } = makeHarness({ autoCheck: false });
    manager.init();
    expect(timer.getPendingCount()).toBe(0);
  });

  it("should reschedule and stop the auto-check timer", () => {
    const { manager, timer } = makeHarness({ autoCheck: false });
    manager.scheduleAutoCheck(60_000);
    manager.scheduleAutoCheck(120_000);
    expect(timer.intervals).toEqual([60_000, 120_000]);
    expect(timer.getPendingCount()).toBe(1);
    manager.stopAutoCheck();
    expect(timer.getPendingCount()).toBe(0);
  });

  it("should honour the initial skipped version", () => {
    const { manager } = makeHarness({ skippedVersion: "1.0.5" });
    expect(manager.getSkippedVersion()).toBe("1.0.5");
  });

  it("should expose the user decision helpers", () => {
    const { manager, ui } = makeHarness();
    expect(ui.getUserDecision()).toBeNull();
    manager.chooseInstall();
    expect(ui.getUserDecision()).toBe("install");
    manager.chooseLater();
    expect(ui.getUserDecision()).toBe("later");
  });
});
