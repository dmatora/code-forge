import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export function extractCodeBlock(text: string): string {
  const regex = /```(?:bash)?\n([\s\S]*?)\n```/;
  const match = text.match(regex);
  return match ? match[1] : text;
}

export function formatProcessingTime(milliseconds: number): string {
  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  } else {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed();
    return `${minutes}m ${seconds}s`;
  }
}

export function getModelsFilePath(): string {
  return path.join(app.getPath('userData'), 'models.json');
}

export function getProjectsFilePath(): string {
  return path.join(app.getPath('userData'), 'projects.json');
}

export function getScopesFilePath(): string {
  return path.join(app.getPath('userData'), 'scopes.json');
}
