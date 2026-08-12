import { UpdateInstaller } from "./installer";
import { ErrorCode } from "../../infrastructure/common/types";
import { MockFileSystem } from "../../infrastructure/testing/test-harness";
import { fileEngineForMock } from "../../infrastructure/engines/file/file-engine.interface";
import { UpdateInfo, Version } from "../common/types";
import { MockProcess } from "../tests/helpers";

const APP_DIR = "app";

function makeInfo(overrides: Partial<UpdateInfo> = {}): UpdateInfo {
  return {
    version: new Version(1, 2, 3),
    releaseDate: "2026-07-01T00:00:00Z",
    releaseNotes: "",
    downloadUrl: "https://example.com/app.bin",
    size: 0,
    checksum: "",
    breakingChanges: false,
    ...overrides,
  };
}

function readText(file: MockFileSystem, path: string): string {
  const result = file.readFile(path);
  if (!result.success) return "";
  return new TextDecoder().decode(result.data);
}

describe("UpdateInstaller", () => {
  it("should install and rewrite the manifest", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("binary-payload"));
    const process = new MockProcess();
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
      process,
    });
    const result = await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(result.success).toBe(true);
    expect(installer.hasInstalled()).toBe(true);
    expect(installer.getBackupPath()).toBe("app/backup/current-version.json");
    expect(file.exists("app/backup/current-version.json")).toBe(true);
    expect(file.exists("app/tempo-update.bin")).toBe(true);
    expect(readText(file, "app/current-version.json")).toContain('"patch":3');
    installer.restartApp();
    expect(process.restartCount).toBe(1);
  });

  it("should back up an existing manifest", async () => {
    const file = new MockFileSystem();
    file.createFile("app/current-version.json", new TextEncoder().encode("{\"major\":1,\"patch\":0}"));
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.createBackup();
    expect(result.success).toBe(true);
    expect(readText(file, "app/backup/current-version.json")).toBe('{"major":1,"patch":0}');
  });

  it("should proceed with a breaking change when confirmed", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
      confirmBreakingChange: () => true,
    });
    const result = await installer.install(makeInfo({ breakingChanges: true }), "app/tempo-update.bin");
    expect(result.success).toBe(true);
    expect(installer.hasInstalled()).toBe(true);
  });

  it("should refuse a breaking change when not confirmed", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
      confirmBreakingChange: () => false,
    });
    const result = await installer.install(makeInfo({ breakingChanges: true }), "app/tempo-update.bin");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.OPERATION_FAILED);
    expect(installer.hasInstalled()).toBe(false);
  });

  it("should install a breaking change without a confirmation callback", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo({ breakingChanges: true }), "app/tempo-update.bin");
    expect(result.success).toBe(true);
  });

  it("should report FILE_NOT_FOUND when the downloaded file is missing", async () => {
    const file = new MockFileSystem();
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo(), "app/missing.bin");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
  });

  it("should propagate a backup write failure", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    file.simulateWriteError("app/backup/current-version.json");
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
  });

  it("should propagate an artifact write failure", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    file.simulateWriteError("app/tempo-update.bin");
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
  });

  it("should propagate a manifest write failure", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    file.simulateWriteError("app/current-version.json");
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
  });

  it("should roll back a completed install", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    file.createFile("app/current-version.json", new TextEncoder().encode('{"major":1,"patch":0}'));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(installer.hasInstalled()).toBe(true);
    const rollback = await installer.rollback();
    expect(rollback.success).toBe(true);
    expect(installer.hasInstalled()).toBe(false);
    expect(readText(file, "app/current-version.json")).toBe('{"major":1,"patch":0}');
    expect(file.exists("app/tempo-update.bin")).toBe(false);
  });

  it("should fail to roll back without a backup", async () => {
    const file = new MockFileSystem();
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    const rollback = await installer.rollback();
    expect(rollback.success).toBe(false);
    if (!rollback.success) expect(rollback.error).toBe(ErrorCode.OPERATION_FAILED);
  });

  it("should restart without a process hook", () => {
    const installer = new UpdateInstaller({
      file: fileEngineForMock(new MockFileSystem()),
      appDir: APP_DIR,
      currentVersion: new Version(1, 0, 0),
    });
    expect(() => installer.restartApp()).not.toThrow();
  });

  it("should handle trailing slashes in the app directory", async () => {
    const file = new MockFileSystem();
    file.createFile("app/tempo-update.bin", new TextEncoder().encode("payload"));
    const installer = new UpdateInstaller({
      file: fileEngineForMock(file),
      appDir: "app/",
      currentVersion: new Version(1, 0, 0),
    });
    const result = await installer.install(makeInfo(), "app/tempo-update.bin");
    expect(result.success).toBe(true);
    expect(installer.getBackupPath()).toBe("app/backup/current-version.json");
  });
});
