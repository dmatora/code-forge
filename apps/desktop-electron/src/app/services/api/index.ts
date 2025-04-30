import { ipcMain } from 'electron';
import { SettingsService } from '../settings.service';
import { ApiClient } from './client';
import { ModelsService } from './models';
import { PromptService } from './prompt';
import { NotificationsService } from './notifications';

export class ApiService {
  private apiClient: ApiClient;
  private modelsService: ModelsService;
  private promptService: PromptService;
  private notificationsService: NotificationsService;

  constructor(settingsService: SettingsService) {
    this.apiClient = new ApiClient(settingsService);
    this.notificationsService = new NotificationsService(this.apiClient);
    this.modelsService = new ModelsService(this.apiClient);
    this.promptService = new PromptService(this.apiClient, this.notificationsService);
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-models', () => {
      if (!this.apiClient.getApiUrl()) {
        return [];
      }
      return this.modelsService.getModels();
    });

    ipcMain.handle('refresh-models', async (_, config = {}) => {
      try {
        const models = await this.modelsService.fetchAndSaveModels(config.apiUrl, config.apiKey);
        return { success: true, models };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Failed to connect to API',
        };
      }
    });

    ipcMain.handle('send-prompt', async (_, data) => {
      return this.promptService.sendPrompt(data);
    });
  }
}
