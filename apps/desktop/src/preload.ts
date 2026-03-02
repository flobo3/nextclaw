import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("nextclawDesktop", {
  platform: process.platform,
  version: process.versions.electron
});
