import SquirrelEvents from './app/events/squirrel.events';
import ElectronEvents from './app/events/electron.events';
import UpdateEvents from './app/events/update.events';
import { app, BrowserWindow } from 'electron';
import App from './app/app';
import { join } from 'path';
import ProjectService from './app/services/project.service';
import ScopeService from './app/services/scope.service';
import FileService from './app/services/file.service';
import ApiService from './app/services/api.service';
import PreferencesService from './app/services/preferences.service';

export default class Main {
  static initialize() {
    if (SquirrelEvents.handleEvents()) {
      // squirrel event handled (except first run event) and app will exit in 1000ms, so don't do anything else
      app.quit();
    }
  }

  static bootstrapApp() {
    App.main(app, BrowserWindow);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();

    // initialize auto updater service
    if (!App.isDevelopmentMode()) {
      // UpdateEvents.initAutoUpdateService();
    }
  }

  static initializeServices() {
    const userDataPath = app.getPath('userData');
    const projectsPath = join(userDataPath, 'projects.json');
    const scopesPath = join(userDataPath, 'scopes.json');

    // Initialize services
    new ProjectService(projectsPath);
    new ScopeService(scopesPath);
    new FileService();
    new ApiService();
    new PreferencesService();
  }
}

// handle setup events as quickly as possible
Main.initialize();

// initialize services
Main.initializeServices();

// bootstrap app
Main.bootstrapApp();
Main.bootstrapAppEvents();
