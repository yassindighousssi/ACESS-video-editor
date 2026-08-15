import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { CHANNELS } from "./ipc-channels";

function dataRoot(): string {
  return path.join(app.getPath("userData"), "data");
}

function safeResolve(relPath: string): string | null {
  const root = dataRoot();
  const target = path.resolve(root, relPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return null;
  }
  return target;
}

function mapError(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOENT" || code === "ENOTDIR") return "ERR_FILE_NOT_FOUND";
    if (code === "EACCES" || code === "EPERM") return "ERR_PERMISSION_DENIED";
    if (code === "ENOSPC") return "ERR_DISK_FULL";
    if (code === "EEXIST") return "ERR_FILE_EXISTS";
    if (code === "EISDIR") return "ERR_FILE_READ_ERROR";
  }
  return "ERR_UNKNOWN";
}

function registerFileHandlers(): void {
  ipcMain.handle(CHANNELS.fileRead, async (_event, relPath: string) => {
    const target = safeResolve(relPath);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      const data = await fs.promises.readFile(target);
      return { success: true, value: data };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.fileWrite, async (_event, payload: { path: string; data: Uint8Array }) => {
    const target = safeResolve(payload.path);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, payload.data);
      return { success: true, value: undefined };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.fileExists, async (_event, relPath: string) => {
    const target = safeResolve(relPath);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      await fs.promises.access(target, fs.constants.F_OK);
      return { success: true, value: true };
    } catch {
      return { success: true, value: false };
    }
  });

  ipcMain.handle(CHANNELS.fileStat, async (_event, relPath: string) => {
    const target = safeResolve(relPath);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      const stat = await fs.promises.stat(target);
      return {
        success: true,
        value: {
          size: stat.size,
          createdAt: stat.birthtimeMs,
          modifiedAt: stat.mtimeMs,
        },
      };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.fileDelete, async (_event, relPath: string) => {
    const target = safeResolve(relPath);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      await fs.promises.rm(target, { recursive: false });
      return { success: true, value: undefined };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.fileList, async (_event, relDir: string) => {
    const target = safeResolve(relDir);
    if (target === null) return { success: false, error: "ERR_INVALID_PATH" };
    try {
      const entries = await fs.promises.readdir(target);
      return { success: true, value: entries };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.fileMove, async (_event, payload: { src: string; dest: string }) => {
    const source = safeResolve(payload.src);
    const destination = safeResolve(payload.dest);
    if (source === null || destination === null) {
      return { success: false, error: "ERR_INVALID_PATH" };
    }
    try {
      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      await fs.promises.rename(source, destination);
      return { success: true, value: undefined };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });

  ipcMain.handle(CHANNELS.pickMedia, async () => {
    const result = await dialog.showOpenDialog({
      title: "Import media",
      properties: ["openFile"],
      filters: [
        { name: "Media", extensions: ["mp4", "mov", "avi", "mkv", "webm", "mp3", "wav", "ogg", "flac", "jpg", "jpeg", "png", "gif", "webp"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    if (filePath === undefined) return null;
    try {
      const bytes = await fs.promises.readFile(filePath);
      return {
        success: true,
        value: { name: path.basename(filePath), path: filePath, bytes },
      };
    } catch (error) {
      return { success: false, error: mapError(error) };
    }
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 480,
    title: "ACESS Video Editor",
    backgroundColor: "#0f172a",
    icon: path.join(__dirname, "..", "..", "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "..", "dist-renderer", "index.html"));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.setName("ACESS Video Editor");
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win !== undefined) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    }
  });

  app.whenReady().then(() => {
    registerFileHandlers();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
