import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './types';
import ScopeService from './scope.service';
import { OpenDialogOptions } from 'electron';

class ProjectService {
  private storagePath: string;
  private projects: Project[] = [];
  private scopeService: ScopeService;

  constructor(storagePath: string, scopeService: ScopeService) {
    this.storagePath = storagePath;
    this.scopeService = scopeService;

    this.loadProjects();
    this.setupIpcHandlers();
  }

  private loadProjects() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this.projects = JSON.parse(data);
      } else {
        this.projects = [];
        this.saveProjects();
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      this.projects = [];
    }
  }

  private saveProjects() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.projects, null, 2));
    } catch (err) {
      console.error('Failed to save projects:', err);
    }
  }

  private createOrUpdateDefaultScope(projectId: string, rootFolder: string) {
    this.scopeService.createOrUpdateDefaultScope(projectId, rootFolder);
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-projects', () => this.projects);

    ipcMain.handle('create-project', (_, data) => {
      const project: Project = {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.projects.push(project);
      this.saveProjects();

      this.createOrUpdateDefaultScope(project.id, project.rootFolder);
      return project;
    });

    ipcMain.handle('update-project', (_, updated: Project) => {
      const idx = this.projects.findIndex((p) => p.id === updated.id);
      if (idx === -1) return null;

      const rootChanged = this.projects[idx].rootFolder !== updated.rootFolder;

      this.projects[idx] = { ...updated, updatedAt: new Date() };
      this.saveProjects();

      if (rootChanged) {
        this.createOrUpdateDefaultScope(updated.id, updated.rootFolder);
      }
      return this.projects[idx];
    });

    ipcMain.handle('delete-project', (_, id: string) => {
      this.projects = this.projects.filter((p) => p.id !== id);
      this.saveProjects();
      return true;
    });

    ipcMain.handle('select-root-folder', async () => {
      const options: OpenDialogOptions = {
        properties: ['openDirectory']
      };
      const { canceled, filePaths } = await dialog.showOpenDialog(options);
      return canceled || !filePaths.length ? null : filePaths[0];
    });
  }
}

export default ProjectService;
