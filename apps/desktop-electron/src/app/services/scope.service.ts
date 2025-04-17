import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Scope {
  id: string;
  name: string;
  folders: string[];
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

class ScopeService {
  private storagePath: string;
  private scopes: Scope[] = [];

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.loadScopes();
    this.setupIpcHandlers();
  }

  private loadScopes() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        this.scopes = JSON.parse(data);
      } else {
        this.scopes = [];
        this.saveScopes();
      }
    } catch (error) {
      console.error('Failed to load scopes:', error);
      this.scopes = [];
    }
  }

  private saveScopes() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.scopes, null, 2));
    } catch (error) {
      console.error('Failed to save scopes:', error);
    }
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-scopes', (_, projectId) => {
      return projectId
        ? this.scopes.filter(s => s.projectId === projectId)
        : this.scopes;
    });

    ipcMain.handle('create-scope', (_, scopeData) => {
      const newScope: Scope = {
        ...scopeData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.scopes.push(newScope);
      this.saveScopes();
      return newScope;
    });

    ipcMain.handle('update-scope', (_, scope: Scope) => {
      const index = this.scopes.findIndex(s => s.id === scope.id);
      if (index !== -1) {
        this.scopes[index] = {
          ...scope,
          updatedAt: new Date()
        };
        this.saveScopes();
        return this.scopes[index];
      }
      return null;
    });

    ipcMain.handle('delete-scope', (_, id: string) => {
      this.scopes = this.scopes.filter(s => s.id !== id);
      this.saveScopes();
      return true;
    });
  }
}

export default ScopeService;
