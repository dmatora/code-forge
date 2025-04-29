import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,

  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  getScopes: (projectId) => ipcRenderer.invoke('get-scopes', projectId),
  createScope: (scope) => ipcRenderer.invoke('create-scope', scope),
  updateScope: (scope) => ipcRenderer.invoke('update-scope', scope),
  deleteScope: (id) => ipcRenderer.invoke('delete-scope', id),

  selectRootFolder: () => ipcRenderer.invoke('select-root-folder'),

  selectFolders: () => ipcRenderer.invoke('select-folders'),
  generateContext: (folders) => ipcRenderer.invoke('generate-context', folders),

  sendPrompt: (data) => ipcRenderer.invoke('send-prompt', data),
  getModels: () => ipcRenderer.invoke('get-models'),
  refreshModels: (config) => ipcRenderer.invoke('refresh-models', config),

  testTelegramConfig: (config) => ipcRenderer.invoke('test-telegram-config', config),
});
