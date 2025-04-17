import { ipcMain } from 'electron';
import { app } from 'electron';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Removes the first and last line from a text string
 * @param {string} text - The input text
 * @returns {string} - Text with first and last lines removed
 */
function removeFirstAndLastLines(text) {
  // Split the text into lines
  const lines = text.split('\n');

  // Return original text if there are less than 3 lines
  if (lines.length < 3) {
    return text;
  }

  // Remove first and last lines and join back together
  return lines.slice(1, -1).join('\n');
}

export class ApiService {
  private apiUrl: string;
  private apiKey: string;
  private defaultModel: string;
  private openaiClient;
  private modelsFilePath: string; // Path to models.json file

  constructor() {
    // Load from preferences first, then fall back to environment variables
    this.loadApiConfigFromPreferences();

    // Set path to models.json in the user data directory
    this.modelsFilePath = path.join(app.getPath('userData'), 'models.json');

    // Setup IPC handlers first, so they're available even before API is configured
    this.setupIpcHandlers();
  }

  private async loadApiConfigFromPreferences() {
    try {
      const preferencesFilePath = path.join(app.getPath('userData'), 'preferences.json');

      if (fs.existsSync(preferencesFilePath)) {
        const data = fs.readFileSync(preferencesFilePath, 'utf8');
        const preferences = JSON.parse(data);

        // Use API URL and key from preferences, fall back to environment variables
        this.apiUrl = preferences.apiUrl || process.env.OPENAI_URL || '';
        this.apiKey = preferences.apiKey || process.env.OPENAI_API_KEY || '';
        this.defaultModel = preferences.reasoningModel || process.env.OPENAI_MODEL || '';
      } else {
        // Fall back to environment variables
        this.apiUrl = process.env.OPENAI_URL || '';
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.defaultModel = process.env.OPENAI_MODEL || '';
      }

      // Initialize client if API URL is available
      if (this.apiUrl) {
        this.initializeModels();
        this.initializeClient();
      }
    } catch (error) {
      console.error('Failed to load API config from preferences:', error);
      this.apiUrl = process.env.OPENAI_URL || '';
      this.apiKey = process.env.OPENAI_API_KEY || '';
      this.defaultModel = process.env.OPENAI_MODEL || '';

      if (this.apiUrl) {
        this.initializeModels();
        this.initializeClient();
      }
    }
  }

  private initializeClient() {
    this.openaiClient = createOpenAI({
      baseURL: this.apiUrl,
      apiKey: this.apiKey || 'dummy-key'
    });
    console.log(`OpenAI client initialized with API URL: ${this.apiUrl}`);
  }

  private async initializeModels() {
    try {
      // Check if models.json exists
      if (!fs.existsSync(this.modelsFilePath)) {
        console.log('models.json not found, fetching available models...');
        await this.fetchAndSaveModels();
      } else {
        console.log(`${this.modelsFilePath} exists`);
      }
    } catch (error) {
      console.error('Error initializing models:', error);
      // Create file with default model in case of error
      this.saveDefaultModels();
    }
  }

  private async fetchAndSaveModels() {
    if (!this.apiUrl) {
      console.log('API not configured, using default model');
      this.saveDefaultModels();
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey || 'dummy-key'}`
        }
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data && Array.isArray(data.data)) {
        const models = data.data.map(model => ({
          id: model.id,
          name: model.id
        }));

        this.saveModels(models);
        console.log(`Saved ${models.length} models to models.json`);
      } else {
        console.log('Invalid response format from API, using default model');
        this.saveDefaultModels();
      }
    } catch (error) {
      console.error('Error fetching models from API server:', error);
      this.saveDefaultModels();
    }
  }

  private saveDefaultModels() {
    const defaultModel = this.defaultModel || 'gpt-3.5-turbo';
    console.log(`Saving default model: ${defaultModel}`);
    this.saveModels([{ id: defaultModel, name: defaultModel }]);
  }

  private saveModels(models) {
    try {
      fs.writeFileSync(this.modelsFilePath, JSON.stringify(models, null, 2));
    } catch (error) {
      console.error('Failed to save models:', error);
    }
  }

  private setupIpcHandlers() {
    // Add a handler to get available models
    ipcMain.handle('get-models', () => {
      try {
        // Only return models if API URL is configured
        if (!this.apiUrl) {
          return [];
        }
        
        if (fs.existsSync(this.modelsFilePath)) {
          const data = fs.readFileSync(this.modelsFilePath, 'utf8');
          return JSON.parse(data);
        }
        return [];
      } catch (error) {
        console.error('Failed to read models:', error);
        return [];
      }
    });

    ipcMain.handle('get-api-config', () => {
      return {
        url: this.apiUrl,
        key: this.apiKey,
        maxRetries: 0,
        model: this.defaultModel
      };
    });

    ipcMain.handle('update-api-config', async (_, config: { apiUrl: string, apiKey: string }) => {
      try {
        // Update the API URL and key
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey || '';

        // Save to preferences
        const preferencesFilePath = path.join(app.getPath('userData'), 'preferences.json');
        let preferences = {};

        if (fs.existsSync(preferencesFilePath)) {
          const data = fs.readFileSync(preferencesFilePath, 'utf8');
          preferences = JSON.parse(data);
        }

        preferences = {
          ...preferences,
          apiUrl: config.apiUrl,
          apiKey: config.apiKey
        };

        fs.writeFileSync(preferencesFilePath, JSON.stringify(preferences, null, 2));

        // Re-initialize client and models if URL provided
        if (this.apiUrl) {
          this.initializeClient();
          await this.fetchAndSaveModels();
          return { success: true, url: this.apiUrl };
        } else {
          // If API URL is cleared, remove models.json
          if (fs.existsSync(this.modelsFilePath)) {
            fs.unlinkSync(this.modelsFilePath);
          }
          this.openaiClient = null;
          return { success: true, url: '' };
        }
      } catch (error) {
        console.error('Failed to update API config:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('send-prompt', async (_, { prompt, context, projectFolders, reasoningModel, regularModel }) => {
      if (!this.apiUrl || !this.openaiClient) {
        throw new Error('API not configured. Please set OPENAI_URL environment variable.');
      }

      // Use provided models or fall back to default
      const firstModel = reasoningModel || this.defaultModel;
      const secondModel = regularModel || this.defaultModel;
      
      console.log(`Using reasoning model: ${firstModel}`);
      console.log(`Using regular model: ${secondModel}`);

      try {
        // First request with reasoning model
        const firstResult = await generateText({
          model: this.openaiClient(firstModel),
          messages: [
            { role: 'user', content: `${prompt}\n\n${context}` }
          ]
        });

        // Second request with regular model
        console.log('Sending second request...');
        const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
        const secondPrompt = `${buildUpdatePrompt}\n\n${firstResult.text}\n\n${context}`;
        const secondResult = await generateText({
          model: this.openaiClient(secondModel),
          messages: [
            { role: 'user', content: secondPrompt }
          ]
        });

        // Save the second result to update.sh in the project root, removing first and last lines
        if (projectFolders && projectFolders.length > 0) {
          const projectRoot = projectFolders[0]; // Use the first folder as the project root
          const outputPath = path.join(projectRoot, 'update.sh');

          // Apply function to remove first and last lines
          const processedText = removeFirstAndLastLines(secondResult.text);

          fs.writeFileSync(outputPath, processedText);
          console.log(`Saved processed response to ${outputPath}`);
        } else {
          console.error('No project folders provided, cannot save update.sh');
        }

        // Return the first response to the user
        return { response: firstResult.text };
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    });
  }
}

export default ApiService;
