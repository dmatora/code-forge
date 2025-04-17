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

    for (const path of folders) {
      try {
        const stats = fs.statSync(path);
        if (stats.isDirectory()) {
          markdownContent += `# Folder: ${path}\n\n`;
        } else {
          markdownContent += `# File: ${path}\n\n`;
        }
        markdownContent += await this.processFolderContents(path, 1);
      } catch (error) {
        markdownContent += `# Path: ${path} (Error: ${error.message})\n\n`;
      }
    }

    return markdownContent;
  }

  private async processFolderContents(
    folderPath: string,
    depth: number
  ): Promise<string> {
    let content = '';
    
    try {
      // Check if path exists
      if (!fs.existsSync(folderPath)) {
        return `Error: Path does not exist: ${folderPath}\n\n`;
      }

      const stats = fs.statSync(folderPath);
      const headerLevel = '#'.repeat(depth + 1);

      // If it's a file, directly process it
      if (stats.isFile()) {
        const ext = path.extname(folderPath).toLowerCase();
        if (this.excludeExtensions.includes(ext)) {
          return ''; // Skip excluded file types
        }

        const fileName = path.basename(folderPath);
        content += `${headerLevel} ${fileName}\n\n`;
        content += '```\n';
        try {
          const fileContent = fs.readFileSync(folderPath, 'utf8');
          content += fileContent;
        } catch (readError) {
          content += `Error reading file: ${readError.message}`;
        }
        content += '\n```\n\n';
        return content;
      }

      // If it's a directory, continue with existing logic
      const items = fs.readdirSync(folderPath);

      for (const item of items) {
        if (this.excludeFiles.includes(item)) continue;

        const itemPath = path.join(folderPath, item);
        
        try {
          const itemStats = fs.statSync(itemPath);

          if (itemStats.isDirectory()) {
            content += `${headerLevel} ${item}\n\n`;
            content += await this.processFolderContents(itemPath, depth + 1);
          } else if (itemStats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (this.excludeExtensions.includes(ext)) continue;

            content += `${headerLevel} ${item}\n\n`;
            content += '```\n';
            try {
              const fileContent = fs.readFileSync(itemPath, 'utf8');
              content += fileContent;
            } catch (readError) {
              content += `Error reading file: ${readError.message}`;
            }
            content += '\n```\n\n';
          }
        } catch (statError) {
          content += `${headerLevel} ${item} (Error: ${statError.message})\n\n`;
        }
      }
    } catch (error) {
      return `Error processing path ${folderPath}: ${error.message}\n\n`;
    }

    return content;
  }
}

export default FileService;
