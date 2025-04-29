import { ipcMain } from 'electron';
import { app } from 'electron';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsService } from './settings.service';

/**
 * Extracts content between ```\n or ```bash\n and ```
 * @param {string} text - The input text
 * @returns {string} - Extracted content or original text if no valid code block is found
 */
function extractCodeBlock(text) {
  // Regular expression to match content between ``` or ```bash and ```
  const regex = /```(?:bash)?\n([\s\S]*?)\n```/;
  const match = text.match(regex);

  // Return the captured group (content between delimiters) or original text if no match
  return match ? match[1] : text;
}

// Helper function to format processing time intelligently
function formatProcessingTime(milliseconds) {
  const totalSeconds = milliseconds / 1000;

  if (totalSeconds < 60) {
    // Less than a minute, show seconds with 2 decimal places
    return `${totalSeconds.toFixed(2)}s`;
  } else {
    // More than a minute, show minutes and seconds
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed();
    return `${minutes}m ${seconds}s`;
  }
}

export class ApiService {
  private apiUrl: string;
  private apiKey: string;
  private defaultModel: string;
  private openaiClient;
  private modelsFilePath: string; // Path to models.json file
  private unsubscribe: () => void;

  constructor(private settingsService: SettingsService) {
    // Initialize from settings
    const settings = settingsService.getSettings();
    this.apiUrl = settings.apiUrl || process.env.OPENAI_URL || '';
    this.apiKey = settings.apiKey || process.env.OPENAI_API_KEY || '';
    this.defaultModel = settings.reasoningModel || process.env.OPENAI_MODEL || '';

    // Set path to models.json in the user data directory
    this.modelsFilePath = path.join(app.getPath('userData'), 'models.json');

    // Subscribe to settings changes
    this.unsubscribe = settingsService.subscribe(() => {
      const settings = settingsService.getSettings();
      // Update local properties when settings change
      this.apiUrl = settings.apiUrl || '';
      this.apiKey = settings.apiKey || '';
      this.defaultModel = settings.reasoningModel || '';

      // Reinitialize client if needed
      if (this.apiUrl) {
        this.initializeClient();
      } else {
        this.openaiClient = null;
      }
    });

    // Initialize models and client if API URL is available
    if (this.apiUrl) {
      this.initializeModels();
      this.initializeClient();
    }

    // Setup IPC handlers for models and prompt sending
    this.setupIpcHandlers();
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
      // Ensure modelsFilePath is properly set
      if (!this.modelsFilePath) {
        this.modelsFilePath = path.join(app.getPath('userData'), 'models.json');
      }

      // Check if models.json exists
      console.log(`Checking for models.json at path: ${this.modelsFilePath}`);
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

  private async fetchAndSaveModels(customUrl?: string, customKey?: string) {
    const url = customUrl || this.apiUrl;
    const key = customKey || this.apiKey;

    if (!url) {
      console.log('API not configured, using default model');
      this.saveDefaultModels();
      return [];
    }

    try {
      const response = await fetch(`${url}/models`, {
        headers: {
          'Authorization': `Bearer ${key || 'dummy-key'}`
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

        // Only save to disk if this is the stored URL (not a temporary one)
        if (url === this.apiUrl) {
          this.saveModels(models);
        }

        return models;
      } else {
        console.log('Invalid response format from API, using default model');
        if (url === this.apiUrl) {
          this.saveDefaultModels();
        }
        return [];
      }
    } catch (error) {
      console.error('Error fetching models from API server:', error);
      if (url === this.apiUrl) {
        this.saveDefaultModels();
      }
      throw error;
    }
  }

  private saveDefaultModels() {
    const defaultModel = this.defaultModel || 'gpt-3.5-turbo';
    console.log(`Saving default model: ${defaultModel}`);
    this.saveModels([{ id: defaultModel, name: defaultModel }]);
    return [{ id: defaultModel, name: defaultModel }];
  }

  private saveModels(models) {
    try {
      fs.writeFileSync(this.modelsFilePath, JSON.stringify(models, null, 2));
    } catch (error) {
      console.error('Failed to save models:', error);
    }
  }

  private async sendTelegramNotification(message: string) {
    try {
      // Use settings service instead of reading file directly
      const settings = this.settingsService.getSettings();
      const telegramApiKey = settings.telegramApiKey;
      const telegramChatId = settings.telegramChatId;

      if (telegramApiKey && telegramChatId) {
        const url = `https://api.telegram.org/bot${telegramApiKey}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
          }),
        });

        if (!response.ok) {
          console.error(`Telegram notification failed: ${response.statusText}`, await response.json());
        } else {
          console.log('Telegram notification sent successfully.');
        }
      }
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
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

    // Add a new handler to refresh models list
    ipcMain.handle('refresh-models', async (_, config = {}) => {
      try {
        // Use the provided URL and key if available, otherwise use the stored ones
        const url = config.apiUrl || this.apiUrl;
        const key = config.apiKey || this.apiKey;

        if (!url) {
          return { success: false, error: 'No API URL configured' };
        }

        try {
          const models = await this.fetchAndSaveModels(url, key);
          return { success: true, models };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Failed to connect to API'
          };
        }
      } catch (error) {
        console.error('Failed to refresh models:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('send-prompt', async (_, { prompt, context, projectId, scopeId, reasoningModel, regularModel, useTwoStep = true }) => {
      if (!this.apiUrl || !this.openaiClient) {
        throw new Error('API not configured. Please set OPENAI_URL environment variable.');
      }

      // Use provided models or fall back to default
      const firstModel = reasoningModel || this.defaultModel;
      const secondModel = regularModel || this.defaultModel;

      console.log(`Using ${useTwoStep ? 'two-step' : 'one-step'} process`);
      console.log(`Using reasoning model: ${firstModel}`);
      if (useTwoStep) {
        console.log(`Using regular model: ${secondModel}`);
      }

      try {
        // Get the project and scope data first to make sure we have it for notifications
        const userDataPath = app.getPath('userData');
        const projectsPath = path.join(userDataPath, 'projects.json');
        const scopesPath = path.join(userDataPath, 'scopes.json');

        // Read projects file
        let projects = [];
        if (fs.existsSync(projectsPath)) {
          const projectsData = fs.readFileSync(projectsPath, 'utf8');
          projects = JSON.parse(projectsData);
        }
        const project = projects.find(p => p.id === projectId);

        // Read scopes file
        let scopes = [];
        if (fs.existsSync(scopesPath)) {
          const scopesData = fs.readFileSync(scopesPath, 'utf8');
          scopes = JSON.parse(scopesData);
          // Filter to only get scopes for this project
          scopes = scopes.filter(s => s.projectId === projectId);
        }
        const scope = scopes.find(s => s.id === scopeId);

        if (!project || !project.rootFolder || !scope) {
          throw new Error('Project root folder or scope not found, cannot save update.sh');
        }

        // Start timing
        const startTime = performance.now();
        let responseText;
        let processedText;
        let notificationMessage;

        if (useTwoStep) {
          // First request with reasoning model
          const firstResult = await generateText({
            model: this.openaiClient(firstModel),
            messages: [
              { role: 'user', content: `${prompt}\n\n${context}` }
            ]
          });

          // Measure first prompt time
          const firstPromptTime = performance.now() - startTime;

          // Second request with regular model
          console.log('Sending second request...');
          const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
          const secondPrompt = `${buildUpdatePrompt}\n\n${firstResult.text}\n\n${context}`;

          const secondStartTime = performance.now();
          const secondResult = await generateText({
            model: this.openaiClient(secondModel),
            messages: [
              { role: 'user', content: secondPrompt }
            ]
          });

          // Measure second prompt time
          const secondPromptTime = performance.now() - secondStartTime;

          // Calculate total time
          const totalTime = performance.now() - startTime;

          // Format times to be more readable
          const firstPromptFormatted = formatProcessingTime(firstPromptTime);
          const secondPromptFormatted = formatProcessingTime(secondPromptTime);
          const totalFormatted = formatProcessingTime(totalTime);

          // Use first result as response, second result for update script
          responseText = firstResult.text;
          processedText = extractCodeBlock(secondResult.text);

          // Create notification message for two-step process
          notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ Processing times:\n- First prompt: ${firstPromptFormatted}\n- Second prompt: ${secondPromptFormatted}\n- Total: ${totalFormatted}`;
        } else {
          // One-step process: direct shell script generation
          const oneStepPrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations.\n\nHere is my request:\n${prompt}\n\nHere is the context:\n${context}`;

          const oneStepResult = await generateText({
            model: this.openaiClient(firstModel),
            messages: [
              { role: 'user', content: oneStepPrompt }
            ]
          });

          // Process the single response
          responseText = oneStepResult.text;
          processedText = extractCodeBlock(oneStepResult.text);

          // Calculate total time for one-step process
          const totalTime = performance.now() - startTime;
          const totalFormatted = formatProcessingTime(totalTime);

          // Create notification message for one-step process
          notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ One-step processing time: ${totalFormatted}`;
        }

        // Save the output file
        const outputPath = path.join(project.rootFolder, 'update.sh');
        fs.writeFileSync(outputPath, processedText);
        console.log(`Saved processed response to ${outputPath}`);

        // Send the notification
        await this.sendTelegramNotification(notificationMessage);

        // Return the response to the user
        return { response: responseText };
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    });
  }
}

export default ApiService;
