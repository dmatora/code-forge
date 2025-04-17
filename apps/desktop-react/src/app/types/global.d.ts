interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  platform: string;

  // Project management
  getProjects: () => Promise<any[]>;
  createProject: (project: any) => Promise<any>;
  updateProject: (project: any) => Promise<any>;
  deleteProject: (id: string) => Promise<boolean>;

  // File operations
  selectFolders: () => Promise<string[]>;
  generateContext: (folders: string[]) => Promise<string>;

  // API
  getApiConfig: () => Promise<{ url: string; key: string; model: string } | null>;
  updateApiConfig: (config: { apiUrl: string; apiKey: string }) => Promise<{ success: boolean, url: string, error?: string }>;
  sendPrompt: (data: {
    prompt: string;
    context: string;
    projectFolders?: string[];
    reasoningModel?: string;
    regularModel?: string;
  }) => Promise<any>;
  getModels: () => Promise<any[]>; // Get available models
  refreshModels: (config?: { apiUrl?: string; apiKey?: string }) => Promise<{ success: boolean, models?: any[], error?: string }>;

  // Preferences
  getPreferences: () => Promise<{ reasoningModel?: string; regularModel?: string; apiKey?: string }>;
  saveModelPreferences: (preferences: { reasoningModel?: string; regularModel?: string; apiKey?: string }) => Promise<any>;
}

interface Window {
  electron: ElectronAPI;
}
