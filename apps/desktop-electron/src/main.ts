import SquirrelEvents from './app/events/squirrel.events';
import ElectronEvents from './app/events/electron.events';
import { app, BrowserWindow } from 'electron';
import App from './app/app';
import { join } from 'path';

import ScopeService from './app/services/scope.service';
import ProjectService from './app/services/project.service';
import FileService from './app/services/file.service';
import { ApiService } from './app/services/api';
import SettingsService from './app/services/settings.service';

export default class Main {
  static initialize() {
    if (SquirrelEvents.handleEvents()) {
      app.quit(); // handled by squirrel
    }
  }

  static bootstrapApp() {
    App.main(app, BrowserWindow);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();
    // if (!App.isDevelopmentMode()) UpdateEvents.initAutoUpdateService();
  }

  static initializeServices() {
    const userData = app.getPath('userData');
    const projectsPath = join(userData, 'projects.json');
    const scopesPath   = join(userData, 'scopes.json');

    // Create SettingsService first
    const settingsService = new SettingsService();

    // create shared ScopeService
    const scopeService = new ScopeService(scopesPath);

    // pass the singleton into ProjectService
    new ProjectService(projectsPath, scopeService);

    // other services
    new FileService();

    // Pass settingsService to ApiService
    new ApiService(settingsService);
  }
}

/* ---------- boot sequence ---------- */
Main.initialize();
Main.initializeServices();
Main.bootstrapApp();
Main.bootstrapAppEvents();
