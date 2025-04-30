interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  platform: string;

  getSettings: () => Promise<{
    apiUrl?: string;
    apiKey?: string;
    reasoningModel?: string;
    regularModel?: string;
    telegramApiKey?: string;
    telegramChatId?: string;
    [key: string]: any;
  }>;
  updateSettings: (settings: any) => Promise<any>;

  getProjects: () => Promise<any[]>;
  createProject: (project: any) => Promise<any>;
  updateProject: (project: any) => Promise<any>;
  deleteProject: (id: string) => Promise<boolean>;
  selectRootFolder: () => Promise<string | null>;

  getScopes: (projectId?: string) => Promise<any[]>;
  createScope: (scope: any) => Promise<any>;
  updateScope: (scope: any) => Promise<any>;
  deleteScope: (id: string) => Promise<boolean>;

  selectFolders: () => Promise<string[]>;
  generateContext: (folders: string[]) => Promise<string>;

  generateSolution: (data: {
    prompt: string;
    context: string;
    model?: string;
  }) => Promise<{ solution: string; processingTime: string }>;

  generateUpdateScript: (data: {
    solution: string;
    context: string;
    projectId?: string;
    scopeId?: string;
    model?: string;
  }) => Promise<{ response: string; script: string; processingTime: string }>;

  generateUpdateScriptDirectly: (data: {
    prompt: string;
    context: string;
    projectId?: string;
    scopeId?: string;
    model?: string;
  }) => Promise<{ response: string; script: string; processingTime: string }>;

  getModels: () => Promise<any[]>;
  refreshModels: (config?: { apiUrl?: string; apiKey?: string }) => Promise<{ success: boolean, models?: any[], error?: string }>;

  testTelegramConfig: (config: { telegramApiKey: string; telegramChatId: string }) => Promise<{ success: boolean; error?: string }>;
}

interface Window {
  electron: ElectronAPI;
}
