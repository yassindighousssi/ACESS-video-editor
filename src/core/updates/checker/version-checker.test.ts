import { VersionChecker } from "./version-checker";
import { Version } from "../common/types";
import { ErrorCode } from "../../infrastructure/common/types";
import { MockFetch, mockPayload } from "../tests/helpers";

function makeChecker(overrides: { current?: Version; channel?: "stable" | "beta" | "nightly"; url?: string } = {}) {
  const fetch = new MockFetch();
  const checker = new VersionChecker({
    currentVersion: overrides.current ?? new Version(1, 0, 0),
    channel: overrides.channel ?? "stable",
    fetch: fetch.handler,
    url: overrides.url,
  });
  return { checker, fetch };
}

describe("VersionChecker", () => {
  it("should report an available newer version", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue(mockPayload({ tag_name: "v1.2.3" }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).not.toBeNull();
      expect(result.value?.version.toString()).toBe("1.2.3-stable");
      expect(result.value?.releaseNotes).toBe("Improvements");
    }
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0]).toContain("ACESS-video-editor");
    expect(checker.getLastResult()?.version.toString()).toBe("1.2.3-stable");
    expect(checker.shouldNotify()).toBe(true);
    checker.markNotified();
    expect(checker.shouldNotify()).toBe(false);
  });

  it("should report no update when versions match", async () => {
    const { checker, fetch } = makeChecker({ current: new Version(1, 2, 3) });
    fetch.enqueue(mockPayload({ tag_name: "v1.2.3" }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
    expect(checker.getLastResult()).toBeNull();
  });

  it("should report no update when the release is older", async () => {
    const { checker, fetch } = makeChecker({ current: new Version(2, 0, 0) });
    fetch.enqueue(mockPayload({ tag_name: "v1.2.3" }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
  });

  it("should offer a same-core beta when the user channel is beta", async () => {
    const { checker, fetch } = makeChecker({ current: new Version(1, 2, 3, "stable"), channel: "beta" });
    fetch.enqueue(mockPayload({ tag_name: "v1.2.3-beta" }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value?.version.channel).toBe("beta");
  });

  it("should not offer a same-core beta when the user channel is stable", async () => {
    const { checker, fetch } = makeChecker({ channel: "stable" });
    fetch.enqueue(mockPayload({ tag_name: "v1.0.0-beta" }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
  });

  it("should return CONNECTION_TIMEOUT when the fetch rejects", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueueError(new Error("network down"));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CONNECTION_TIMEOUT);
  });

  it("should return NETWORK_ERROR for a non-ok response", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue(mockPayload(), false, 500);
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("should return UNKNOWN when the payload is not JSON", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueueResponse({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("parse failed");
      },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should return UNKNOWN for malformed release payloads", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue("not an object");
    const bad = await checker.checkForUpdates();
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error).toBe(ErrorCode.UNKNOWN);

    fetch.enqueue(mockPayload({ tag_name: 42 }));
    const noTag = await checker.checkForUpdates();
    expect(noTag.success).toBe(false);

    fetch.enqueue({ tag_name: "v-not-a-version" });
    const badVersion = await checker.checkForUpdates();
    expect(badVersion.success).toBe(false);
  });

  it("should read the download URL from the first asset when present", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue({
      tag_name: "v1.2.3",
      published_at: "2026-07-01T00:00:00Z",
      body: "Notes",
      assets: [{ browser_download_url: "https://example.com/app.zip", size: 2048 }],
      checksum: "abc123",
      breaking_changes: true,
      required_version: "1.0.0",
    });
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value?.downloadUrl).toBe("https://example.com/app.zip");
      expect(result.value?.size).toBe(2048);
      expect(result.value?.checksum).toBe("abc123");
      expect(result.value?.breakingChanges).toBe(true);
      expect(result.value?.requiredVersion?.toString()).toBe("1.0.0-stable");
    }
  });

  it("should return UNKNOWN when an assets array is empty", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue({ tag_name: "v1.2.3", assets: [] });
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should return UNKNOWN when the first asset is malformed", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue({ tag_name: "v1.2.3", assets: ["not an object"] });
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(false);
  });

  it("should use a custom release URL when provided", async () => {
    const { checker, fetch } = makeChecker({ url: "https://example.com/updates.json" });
    fetch.enqueue(mockPayload());
    await checker.checkForUpdates();
    expect(fetch.calls[0]).toBe("https://example.com/updates.json");
  });

  it("should expose current version and channel controls", async () => {
    const { checker } = makeChecker({ channel: "stable" });
    expect(checker.getCurrentVersion().toString()).toBe("1.0.0-stable");
    expect(checker.getChannel()).toBe("stable");
    checker.setChannel("nightly");
    expect(checker.getChannel()).toBe("nightly");
    checker.clearCache();
    expect(checker.getLastResult()).toBeNull();
    expect(checker.shouldNotify()).toBe(false);
  });

  it("should default missing size to zero", async () => {
    const { checker, fetch } = makeChecker();
    fetch.enqueue(mockPayload({ tag_name: "v1.2.3", size: undefined }));
    const result = await checker.checkForUpdates();
    expect(result.success).toBe(true);
    if (result.success) expect(result.value?.size).toBe(0);
  });
});
