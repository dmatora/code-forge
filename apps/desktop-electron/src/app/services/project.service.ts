import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  name: string;
  folders: string[];
  createdAt: Date;
  updatedAt: Date;
}

class ProjectService {
  private storagePath: string;
  private projects: Project[] = [];

  constructor(storagePath: string) {
    this.storagePath = storagePath;
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
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projects = [];
    }
  }

  private saveProjects() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.projects, null, 2));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-projects', () => this.projects);

    ipcMain.handle('create-project', (_, projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newProject: Project = {
        ...projectData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.projects.push(newProject);
      this.saveProjects();
      return newProject;
    });

    ipcMain.handle('update-project', (_, project: Project) => {
      const index = this.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        this.projects[index] = {
          ...project,
          updatedAt: new Date()
        };
        this.saveProjects();
        return this.projects[index];
      }
      return null;
    });

    ipcMain.handle('delete-project', (_, id: string) => {
      this.projects = this.projects.filter(p => p.id !== id);
      this.saveProjects();
      return true;
    });
  }
}

export default ProjectService;
