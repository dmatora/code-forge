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
  sendPrompt: (data: { prompt: string; context: string; projectFolders?: string[] }) => Promise;
}

interface Window {
  electron: ElectronAPI;
}
