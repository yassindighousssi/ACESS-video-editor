import { contextBridge, ipcRenderer } from "electron";
import { CHANNELS } from "./ipc-channels";

const api = {
  file: {
    read: (path: string) => ipcRenderer.invoke(CHANNELS.fileRead, path),
    write: (path: string, data: Uint8Array) => ipcRenderer.invoke(CHANNELS.fileWrite, { path, data }),
    exists: (path: string) => ipcRenderer.invoke(CHANNELS.fileExists, path),
    stat: (path: string) => ipcRenderer.invoke(CHANNELS.fileStat, path),
    delete: (path: string) => ipcRenderer.invoke(CHANNELS.fileDelete, path),
    list: (dir: string) => ipcRenderer.invoke(CHANNELS.fileList, dir),
    move: (src: string, dest: string) => ipcRenderer.invoke(CHANNELS.fileMove, { src, dest }),
  },
  pickMedia: () => ipcRenderer.invoke(CHANNELS.pickMedia),
};

contextBridge.exposeInMainWorld("ace", api);
