import * as fs from 'fs';
import { getModelsFilePath } from './utils';
import { ApiClient } from './client';

export interface Model {
  id: string;
  name: string;
}

export class ModelsService {
  private modelsFilePath: string;

  constructor(private apiClient: ApiClient) {
    this.modelsFilePath = getModelsFilePath();
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      if (!fs.existsSync(this.modelsFilePath)) {
        console.log('models.json not found, fetching available models...');
        await this.fetchAndSaveModels();
      } else {
        console.log(`${this.modelsFilePath} exists`);
      }
    } catch (error) {
      console.error('Error initializing models:', error);
      this.saveDefaultModels();
    }
  }

  public async fetchAndSaveModels(customUrl?: string, customKey?: string) {
    const url = customUrl || this.apiClient.getApiUrl();
    const key = customKey || this.apiClient.getApiKey();

    if (!url) {
      console.log('API not configured, using default model');
      this.saveDefaultModels();
      return [];
    }

    try {
      const response = await fetch(`${url}/models`, {
        headers: {
          Authorization: `Bearer ${key || 'dummy-key'}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data && Array.isArray(data.data)) {
        const models = data.data.map((model: any) => ({
          id: model.id,
          name: model.id,
        }));

        if (url === this.apiClient.getApiUrl()) {
          this.saveModels(models);
        }

        return models;
      } else {
        console.log('Invalid response format from API, using default model');
        if (url === this.apiClient.getApiUrl()) {
          this.saveDefaultModels();
        }
        return [];
      }
    } catch (error) {
      console.error('Error fetching models from API server:', error);
      if (url === this.apiClient.getApiUrl()) {
        this.saveDefaultModels();
      }
      throw error;
    }
  }

  private saveDefaultModels() {
    const defaultModel = this.apiClient.getSettings().reasoningModel || 'gpt-3.5-turbo';
    console.log(`Saving default model: ${defaultModel}`);
    this.saveModels([{ id: defaultModel, name: defaultModel }]);
    return [{ id: defaultModel, name: defaultModel }];
  }

  private saveModels(models: Model[]) {
    try {
      fs.writeFileSync(this.modelsFilePath, JSON.stringify(models, null, 2));
    } catch (error) {
      console.error('Failed to save models:', error);
    }
  }

  public getModels(): Model[] {
    try {
      if (fs.existsSync(this.modelsFilePath)) {
        const data = fs.readFileSync(this.modelsFilePath, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to read models:', error);
      return [];
    }
  }
}
