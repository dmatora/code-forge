import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class FileService {
  private excludeFiles = [
    '.DS_Store',
    '.next',
    '.nx',
    '.git',
    '.gen',
    '.env',
    '.idea',
    '.vscode',
    '.yarn',
    'dist',
    'update.sh',
    'node_modules',
    'package-lock.json',
    'yarn-lock.json',
    'pnpm-lock.yaml',
  ];

  private excludeExtensions = [
    '.jpg', '.jpeg', '.png', '.ico', '.svg', '.woff2', '.zip'
  ];

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    ipcMain.handle('select-folders', async (event) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      });

      if (canceled) {
        return [];
      }

      return filePaths;
    });

    ipcMain.handle('generate-context', async (_, folders: string[]) => {
      return this.generateContextFromFolders(folders);
    });
  }

  private async generateContextFromFolders(folders: string[]): Promise<string> {
    let markdownContent = '';

    for (const folder of folders) {
      markdownContent += `# Folder: ${folder}\n\n`;
      markdownContent += await this.processFolderContents(folder, 1);
    }

    return markdownContent;
  }

  private async processFolderContents(
    folderPath: string,
    depth: number
  ): Promise<string> {
    let content = '';
    const items = fs.readdirSync(folderPath);
    const headerLevel = '#'.repeat(depth + 1);

    for (const item of items) {
      if (this.excludeFiles.includes(item)) continue;

      const itemPath = path.join(folderPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        content += `${headerLevel} ${item}\n\n`;
        content += await this.processFolderContents(itemPath, depth + 1);
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (this.excludeExtensions.includes(ext)) continue;

        content += `${headerLevel} ${item}\n\n`;
        content += '```\n';
        const fileContent = fs.readFileSync(itemPath, 'utf8');
        content += fileContent;
        content += '\n```\n\n';
      }
    }

    return content;
  }
}

export default FileService;
