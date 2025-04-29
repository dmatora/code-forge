import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface Settings {
  apiUrl?: string;
  apiKey?: string;
  reasoningModel?: string;
  regularModel?: string;
  telegramApiKey?: string;
  telegramChatId?: string;
  [key: string]: any;
}

export class SettingsService {
  private settings: Settings = {};
  private settingsPath: string;
  private listeners: Array<() => void> = [];

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.loadSettings();
    this.setupIpcHandlers();
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        this.settings = JSON.parse(data);
        console.log('Loaded settings:', this.settings);
      } else {
        this.settings = {};
        this.saveSettings();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {};
    }
  }

  private saveSettings() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
      this.listeners.forEach(callback => callback());
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.getSettings();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-settings', () => this.getSettings());
    ipcMain.handle('update-settings', (_, newSettings: Partial<Settings>) =>
      this.updateSettings(newSettings)
    );

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
        const responseBody = await response.json();
        return { success: response.ok, error: response.ok ? null : `Telegram API Error: ${response.statusText} - ${JSON.stringify(responseBody)}` };
      } catch (error) {
        return { success: false, error: `Network or fetch error: ${error.message}` };
      }
    });
  }
}

export default SettingsService;
