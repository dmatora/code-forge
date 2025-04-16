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
  getApiConfig: () => Promise<{ url: string; model: string } | null>;
  sendPrompt: (data: { prompt: string; context: string }) => Promise<any>;
}

interface Window {
  electron: ElectronAPI;
}
