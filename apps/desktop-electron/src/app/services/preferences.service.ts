import { app } from 'electron';
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelPreferences {
  reasoningModel?: string;
  regularModel?: string;
  apiUrl?: string;
  apiKey?: string;
  telegramApiKey?: string;
  telegramChatId?: string;
}

export class PreferencesService {
  private preferencesFilePath: string;
  private preferences: ModelPreferences = {};

  constructor() {
    // Set path to preferences.json in the user data directory
    this.preferencesFilePath = path.join(app.getPath('userData'), 'preferences.json');
    this.loadPreferences();
    this.setupIpcHandlers();
  }

  private loadPreferences() {
    console.log(`Attempting to load preferences from: ${this.preferencesFilePath}`);
    try {
      if (fs.existsSync(this.preferencesFilePath)) {
        console.log(`Preferences file exists at: ${this.preferencesFilePath}`);
        const data = fs.readFileSync(this.preferencesFilePath, 'utf8');
        this.preferences = JSON.parse(data);
        console.log('Loaded preferences:', this.preferences);
      } else {
        console.log(`Preferences file does not exist at: ${this.preferencesFilePath}, creating empty preferences`);
        this.preferences = {};
        this.savePreferences();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        path: this.preferencesFilePath
      });
      this.preferences = {};
    }
  }

  private savePreferences() {
    try {
      console.log(`Attempting to save preferences to: ${this.preferencesFilePath}`);
      console.log(`Preferences content: ${JSON.stringify(this.preferences, null, 2)}`);

      // Check if directory exists, create it if needed
      const dirPath = path.dirname(this.preferencesFilePath);
      if (!fs.existsSync(dirPath)) {
        console.log(`Creating directory: ${dirPath}`);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Try to save the file
      fs.writeFileSync(this.preferencesFilePath, JSON.stringify(this.preferences, null, 2));
      console.log(`Successfully saved preferences to: ${this.preferencesFilePath}`);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        path: this.preferencesFilePath
      });

      // Try alternative location if writing fails
      try {
        const altPath = path.join(process.cwd(), 'preferences.json');
        console.log(`Attempting to save to alternate location: ${altPath}`);
        fs.writeFileSync(altPath, JSON.stringify(this.preferences, null, 2));
        console.log(`Successfully saved preferences to alternate location: ${altPath}`);
      } catch (altError) {
        console.error('Failed to save preferences in alternate location:', altError);
      }
    }
  }

  private setupIpcHandlers() {
    // Get all preferences
    ipcMain.handle('get-preferences', () => {
      return this.preferences;
    });

    // Save model preferences
    ipcMain.handle('save-model-preferences', (_, modelPreferences: ModelPreferences) => {
      this.preferences = {
        ...this.preferences,
        ...modelPreferences
      };
      this.savePreferences();
      return this.preferences;
    });

    // Get Telegram config
    ipcMain.handle('get-telegram-config', () => {
      return {
        telegramApiKey: this.preferences.telegramApiKey,
        telegramChatId: this.preferences.telegramChatId,
      };
    });

    // Save Telegram config
    ipcMain.handle('save-telegram-config', (_, config: { telegramApiKey: string; telegramChatId: string }) => {
      console.log('Received request to save Telegram config');
      console.log(`API Key length: ${config.telegramApiKey?.length || 0}, Chat ID: ${config.telegramChatId}`);

      try {
        this.preferences.telegramApiKey = config.telegramApiKey;
        this.preferences.telegramChatId = config.telegramChatId;
        this.savePreferences();
        return { success: true };
      } catch (error) {
        console.error('Error in save-telegram-config handler:', error);
        return { success: false, error: error.message };
      }
    });

    // Test Telegram config
    ipcMain.handle('test-telegram-config', async (_, config: { telegramApiKey: string; telegramChatId: string }) => {
      const { telegramApiKey, telegramChatId } = config;
      if (!telegramApiKey || !telegramChatId) {
        return { success: false, error: 'API Key and Chat ID are required.' };
      }

      const url = `https://api.telegram.org/bot${telegramApiKey}/sendMessage`;
      const testMessage = 'Test message from Code Forge! Configuration is working.';

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text: testMessage }),
        });
        const responseBody = await response.json(); // Read body to prevent memory leaks
        return { success: response.ok, error: response.ok ? null : `Telegram API Error: ${response.statusText} - ${JSON.stringify(responseBody)}` };
      } catch (error) {
        return { success: false, error: `Network or fetch error: ${error.message}` };
      }
    });
  }
}

export default PreferencesService;
