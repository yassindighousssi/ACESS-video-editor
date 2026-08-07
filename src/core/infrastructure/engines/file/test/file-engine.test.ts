import { IFileEngine, fileEngineForMock } from "../file-engine.interface";
import { MockFileSystem } from "../../../testing/test-harness";
import { ErrorCode } from "../../../common/types";

describe("FileEngine (Mock)", () => {
  let engine: IFileEngine;
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
    engine = fileEngineForMock(fs);
  });

  describe("read", () => {
    it("should read existing file", async () => {
      const content = new Uint8Array([1, 2, 3]);
      fs.createFile("test.bin", content);
      const result = await engine.read("test.bin");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.from(result.value)).toEqual([1, 2, 3]);
      }
    });

    it("should return FILE_NOT_FOUND for missing file", async () => {
      const result = await engine.read("nope.bin");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });
  });

  describe("write", () => {
    it("should write file successfully", async () => {
      const result = await engine.write("test.txt", new Uint8Array([10, 20]));
      expect(result.success).toBe(true);
      expect(fs.exists("test.txt")).toBe(true);
    });

    it("should return DISK_FULL when disk limit exceeded", async () => {
      fs.setDiskLimit(0);
      const result = await engine.write("test.txt", new Uint8Array(100));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.DISK_FULL);
      }
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      fs.createFile("exists.txt", new Uint8Array(1));
      const result = await engine.exists("exists.txt");
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it("should return false for missing file", async () => {
      const result = await engine.exists("ghost.txt");
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  describe("stat", () => {
    it("should return file stats", async () => {
      fs.createFile("stat.txt", new Uint8Array(100));
      const result = await engine.stat("stat.txt");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.size).toBe(100);
      }
    });

    it("should return FILE_NOT_FOUND for missing file", async () => {
      const result = await engine.stat("nope.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });
  });

  describe("delete", () => {
    it("should delete existing file", async () => {
      fs.createFile("del.txt", new Uint8Array(1));
      const result = await engine.delete("del.txt");
      expect(result.success).toBe(true);
      expect(fs.exists("del.txt")).toBe(false);
    });

    it("should return FILE_NOT_FOUND for missing file", async () => {
      const result = await engine.delete("ghost.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });
  });

  describe("list", () => {
    it("should list files in directory", async () => {
      fs.createFile("dir/a.txt", new Uint8Array(1));
      fs.createFile("dir/b.txt", new Uint8Array(2));
      const result = await engine.list("dir");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBe(2);
        expect(result.value).toContain("a.txt");
        expect(result.value).toContain("b.txt");
      }
    });

    it("should return empty for empty directory", async () => {
      const result = await engine.list("empty");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.length).toBe(0);
      }
    });
  });

  describe("move", () => {
    it("should move file", async () => {
      fs.createFile("src.txt", new Uint8Array([99]));
      const result = await engine.move("src.txt", "dest.txt");
      expect(result.success).toBe(true);
      expect(fs.exists("src.txt")).toBe(false);
      expect(fs.exists("dest.txt")).toBe(true);
    });

    it("should return FILE_NOT_FOUND for missing source", async () => {
      const result = await engine.move("ghost.txt", "dest.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_NOT_FOUND);
      }
    });
  });

  describe("error propagation", () => {
    it("should propagate CORRUPT_FILE from mock", async () => {
      fs.createFile("corrupt.dat", new Uint8Array([1]));
      fs.simulateCorruptFile("corrupt.dat");
      const result = await engine.read("corrupt.dat");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
      }
    });

    it("should propagate FILE_WRITE_ERROR from mock", async () => {
      fs.createFile("err.txt", new Uint8Array([1]));
      fs.simulateWriteError("err.txt");
      const result = await engine.write("err.txt", new Uint8Array([2]));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
      }
    });

    it("should propagate a read error from stat", async () => {
      fs.createFile("stat.dat", new Uint8Array([1]));
      fs.simulateCorruptFile("stat.dat");
      const result = await engine.stat("stat.dat");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.CORRUPT_FILE);
      }
    });

    it("should propagate a write error from move", async () => {
      fs.createFile("moved.txt", new Uint8Array([1]));
      fs.simulateWriteError("dest.txt");
      const result = await engine.move("moved.txt", "dest.txt");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ErrorCode.FILE_WRITE_ERROR);
      }
      expect(fs.exists("moved.txt")).toBe(true);
    });
  });
});
