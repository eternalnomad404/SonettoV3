/**
 * Electron Preload Script
 * 
 * Exposes safe APIs from Node.js to the renderer process.
 * Runs in isolated context for security.
 */

import { contextBridge } from 'electron';

// Expose platform info to renderer
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.versions.electron
});
