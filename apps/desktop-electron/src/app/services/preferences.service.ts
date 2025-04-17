import { app } from 'electron';
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelPreferences {
  reasoningModel?: string;
  regularModel?: string;
  apiUrl?: string;
  apiKey?: string;
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
  }
}

export default PreferencesService;
