import { UpdateDownloader, sha256Hex } from "./downloader";
import { ErrorCode } from "../../infrastructure/common/types";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";
import { UpdateInfo, Version } from "../common/types";
import { MockFetch, binaryResponse } from "../tests/helpers";

const UPDATES_DIR = "updates/temp";
const DOWNLOAD_URL = "https://example.com/app.bin";

function makeInfo(overrides: Partial<UpdateInfo> = {}): UpdateInfo {
  return {
    version: new Version(1, 2, 3),
    releaseDate: "2026-07-01T00:00:00Z",
    releaseNotes: "",
    downloadUrl: DOWNLOAD_URL,
    size: 0,
    checksum: "",
    breakingChanges: false,
    ...overrides,
  };
}

describe("UpdateDownloader", () => {
  it("should download and write the artifact", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    const data = new TextEncoder().encode("update-binary-content");
    fetch.enqueueResponse(binaryResponse(data));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const callbacks: number[] = [];
    const result = await downloader.download(makeInfo(), p => callbacks.push(p));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe("updates/temp/1.2.3-stable.bin");
      expect(file.exists("updates/temp/1.2.3-stable.bin")).toBe(true);
    }
    expect(downloader.getDownloadedFile()).toBe("updates/temp/1.2.3-stable.bin");
    expect(downloader.getDownloadUrl()).toBe(DOWNLOAD_URL);
    expect(downloader.getProgress()).toBe(100);
    expect(callbacks).toContain(100);
    expect(fetch.calls).toEqual([DOWNLOAD_URL]);
  });

  it("should support chunked progress callbacks for large payloads", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    const data = new Uint8Array(200 * 1024).fill(7);
    fetch.enqueueResponse(binaryResponse(data));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const callbacks: number[] = [];
    const result = await downloader.download(makeInfo(), p => callbacks.push(p));
    expect(result.success).toBe(true);
    expect(callbacks).toContain(25);
    expect(callbacks).toContain(100);
  });

  it("should return CONNECTION_TIMEOUT when the fetch rejects", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    fetch.enqueueError(new Error("offline"));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const result = await downloader.download(makeInfo());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CONNECTION_TIMEOUT);
    expect(downloader.getProgress()).toBe(0);
    expect(downloader.getDownloadedFile()).toBeNull();
  });

  it("should return NETWORK_ERROR for a non-ok response", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    fetch.enqueueResponse(binaryResponse(new Uint8Array(0), false, 404));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const result = await downloader.download(makeInfo());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("should return UNKNOWN when reading the body fails", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    fetch.enqueueResponse({
      ok: true,
      status: 200,
      json: async () => null,
      arrayBuffer: async () => {
        throw new Error("body read failed");
      },
    });
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const result = await downloader.download(makeInfo());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.UNKNOWN);
  });

  it("should abort the download when cancelled", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    const data = new Uint8Array(200 * 1024).fill(3);
    fetch.enqueueResponse(binaryResponse(data));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const result = await downloader.download(makeInfo(), p => {
      if (p < 100) downloader.cancelDownload();
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(downloader.getProgress()).toBe(0);
    expect(downloader.getDownloadedFile()).toBeNull();
  });

  it("should propagate a write failure and reset progress", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    const data = new TextEncoder().encode("payload");
    fetch.enqueueResponse(binaryResponse(data));
    file.simulateWriteError("updates/temp/1.2.3-stable.bin");
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, fetch.handler);
    const result = await downloader.download(makeInfo());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
    expect(downloader.getProgress()).toBe(0);
  });

  it("should verify a matching checksum", async () => {
    const file = new MockFileSystem();
    const data = new TextEncoder().encode("verified-content");
    file.createFile("updates/temp/1.2.3-stable.bin", data);
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, new MockFetch().handler);
    const result = await downloader.verifyChecksum("updates/temp/1.2.3-stable.bin", sha256Hex(data));
    expect(result.success).toBe(true);
  });

  it("should reject a mismatched checksum", async () => {
    const file = new MockFileSystem();
    file.createFile("updates/temp/1.2.3-stable.bin", new TextEncoder().encode("content"));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, new MockFetch().handler);
    const result = await downloader.verifyChecksum("updates/temp/1.2.3-stable.bin", "deadbeef");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
  });

  it("should skip verification when no checksum is provided", async () => {
    const file = new MockFileSystem();
    file.createFile("updates/temp/1.2.3-stable.bin", new TextEncoder().encode("content"));
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, new MockFetch().handler);
    const result = await downloader.verifyChecksum("updates/temp/1.2.3-stable.bin", "");
    expect(result.success).toBe(true);
  });

  it("should report FILE_NOT_FOUND when the artifact is missing", async () => {
    const file = new MockFileSystem();
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, new MockFetch().handler);
    const result = await downloader.verifyChecksum("updates/temp/missing.bin", "");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
  });

  it("should return FILE_READ_ERROR when reading the artifact fails", async () => {
    const file = new MockFileSystem();
    file.createFile("updates/temp/1.2.3-stable.bin", new TextEncoder().encode("content"));
    file.simulateReadError("updates/temp/1.2.3-stable.bin");
    const downloader = new UpdateDownloader(fileEngineForMock(file), UPDATES_DIR, new MockFetch().handler);
    const result = await downloader.verifyChecksum("updates/temp/1.2.3-stable.bin", "");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_READ_ERROR);
  });

  it("should handle trailing slashes in the updates directory", async () => {
    const file = new MockFileSystem();
    const fetch = new MockFetch();
    fetch.enqueueResponse(binaryResponse(new TextEncoder().encode("x")));
    const downloader = new UpdateDownloader(fileEngineForMock(file), "updates/temp/", fetch.handler);
    const result = await downloader.download(makeInfo());
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe("updates/temp/1.2.3-stable.bin");
  });

  it("should compute a stable sha256 hex digest", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toHaveLength(64);
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(sha256Hex(new TextEncoder().encode("abc")));
  });
});
