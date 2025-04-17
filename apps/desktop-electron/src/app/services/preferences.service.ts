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
    try {
      if (fs.existsSync(this.preferencesFilePath)) {
        const data = fs.readFileSync(this.preferencesFilePath, 'utf8');
        this.preferences = JSON.parse(data);
        console.log('Loaded preferences:', this.preferences);
      } else {
        this.preferences = {};
        this.savePreferences();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = {};
    }
  }

  private savePreferences() {
    try {
      fs.writeFileSync(this.preferencesFilePath, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      console.error('Failed to save preferences:', error);
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
      this.preferences.telegramApiKey = config.telegramApiKey;
      this.preferences.telegramChatId = config.telegramChatId;
      this.savePreferences();
      return { success: true };
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
