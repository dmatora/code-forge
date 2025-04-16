interface ElectronAPI {
  getAppVersion: () => Promise;
  platform: string;

  // Project management
  getProjects: () => Promise;
  createProject: (project: any) => Promise;
  updateProject: (project: any) => Promise;
  deleteProject: (id: string) => Promise;

  // File operations
  selectFolders: () => Promise;
  generateContext: (folders: string[]) => Promise;

  // API
  getApiConfig: () => Promise<{ url: string; model: string } | null>;
  sendPrompt: (data: { 
    prompt: string; 
    context: string; 
    projectFolders?: string[];
    reasoningModel?: string;
    regularModel?: string;
  }) => Promise;
  getModels: () => Promise; // Get available models
  
  // Preferences
  getPreferences: () => Promise<{ reasoningModel?: string; regularModel?: string }>;
  saveModelPreferences: (preferences: { reasoningModel?: string; regularModel?: string }) => Promise;
}

interface Window {
  electron: ElectronAPI;
}
