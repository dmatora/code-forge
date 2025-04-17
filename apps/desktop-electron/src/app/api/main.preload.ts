import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,

  // Project management
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  // File operations
  selectFolders: () => ipcRenderer.invoke('select-folders'),
  generateContext: (folders) => ipcRenderer.invoke('generate-context', folders),

  // API
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  updateApiConfig: (config) => ipcRenderer.invoke('update-api-config', config),
  sendPrompt: (data) => ipcRenderer.invoke('send-prompt', data),
  getModels: () => ipcRenderer.invoke('get-models'), // Get available models
  
  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  saveModelPreferences: (preferences) => ipcRenderer.invoke('save-model-preferences', preferences),
});
