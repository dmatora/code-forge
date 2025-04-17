import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,

  // Project management (new)
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  // Scope management (renamed from projects)
  getScopes: (projectId) => ipcRenderer.invoke('get-scopes', projectId),
  createScope: (scope) => ipcRenderer.invoke('create-scope', scope),
  updateScope: (scope) => ipcRenderer.invoke('update-scope', scope),
  deleteScope: (id) => ipcRenderer.invoke('delete-scope', id),

  // Project folder selection (only single folder)
  selectRootFolder: () => ipcRenderer.invoke('select-root-folder'),

  // File operations (unchanged)
  selectFolders: () => ipcRenderer.invoke('select-folders'),
  generateContext: (folders) => ipcRenderer.invoke('generate-context', folders),

  // API (update to use project root folder)
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  updateApiConfig: (config) => ipcRenderer.invoke('update-api-config', config),
  sendPrompt: (data) => ipcRenderer.invoke('send-prompt', data),
  getModels: () => ipcRenderer.invoke('get-models'),
  refreshModels: (config) => ipcRenderer.invoke('refresh-models', config),

  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  saveModelPreferences: (preferences) => ipcRenderer.invoke('save-model-preferences', preferences),

  // Telegram Notifications
  getTelegramConfig: () => ipcRenderer.invoke('get-telegram-config'),
  saveTelegramConfig: (config) => ipcRenderer.invoke('save-telegram-config', config),
  testTelegramConfig: (config) => ipcRenderer.invoke('test-telegram-config', config),
});
