import * as fs from 'fs';
import * as path from 'path';
import { generateText } from 'ai';
import { performance } from 'perf_hooks';
import {
  getProjectsFilePath,
  getScopesFilePath,
  extractCodeBlock,
  formatProcessingTime,
} from './utils';
import { ApiClient } from './client';
import { NotificationsService } from './notifications';

export class PromptService {
  constructor(
    private apiClient: ApiClient,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Generates a solution based on prompt and context without creating an update script
   */
  public async generateSolution({
    prompt,
    context,
    model
  }: {
    prompt: string;
    context: string;
    model?: string;
  }) {
    if (!this.apiClient.getApiUrl() || !this.apiClient.getClient()) {
      throw new Error(
        'API not configured. Please set API URL in settings.'
      );
    }

    const settings = this.apiClient.getSettings();
    const selectedModel = model || settings.reasoningModel;

    console.log(`Generating solution using model: ${selectedModel}`);

    const startTime = performance.now();

    const result = await generateText({
      maxRetries: 0,
      model: this.apiClient.getClient()(selectedModel),
      messages: [{ role: 'user', content: `${prompt}\n\n${context}` }],
    });

    const processingTime = performance.now() - startTime;
    const formattedTime = formatProcessingTime(processingTime);

    console.log(`Solution generated in ${formattedTime}`);

    return {
      solution: result.text,
      processingTime: formattedTime
    };
  }

  /**
   * Takes an existing solution and generates an update script
   */
  public async generateUpdateScript({
    solution,
    context,
    projectId,
    scopeId,
    model
  }: {
    solution: string;
    context: string;
    projectId?: string;
    scopeId?: string;
    model?: string;
  }) {
    if (!this.apiClient.getApiUrl() || !this.apiClient.getClient()) {
      throw new Error(
        'API not configured. Please set API URL in settings.'
      );
    }

    const settings = this.apiClient.getSettings();
    const selectedModel = model || settings.regularModel || settings.reasoningModel;

    console.log(`Generating update script using model: ${selectedModel}`);

    // Project and scope validation
    const { project, scope } = this.getProjectAndScope(projectId, scopeId);

    const startTime = performance.now();

    const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
    const promptContent = `${buildUpdatePrompt}\n\n${solution}\n\n${context}`;

    const result = await generateText({
      maxRetries: 0,
      model: this.apiClient.getClient()(selectedModel),
      messages: [{ role: 'user', content: promptContent }],
    });

    const processingTime = performance.now() - startTime;
    const formattedTime = formatProcessingTime(processingTime);

    const scriptContent = extractCodeBlock(result.text);

    // Save the script to the project folder
    const outputPath = path.join(project.rootFolder, 'update.sh');
    fs.writeFileSync(outputPath, scriptContent);
    console.log(`Saved update script to ${outputPath}`);

    // Send notification
    const notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ Processing time: ${formattedTime}`;
    await this.notificationsService.sendTelegramNotification(notificationMessage);

    return {
      script: scriptContent,
      processingTime: formattedTime
    };
  }

  /**
   * Generates an update script directly from the prompt and context (one-step process)
   */
  public async generateUpdateScriptDirectly({
    prompt,
    context,
    projectId,
    scopeId,
    model
  }: {
    prompt: string;
    context: string;
    projectId?: string;
    scopeId?: string;
    model?: string;
  }) {
    if (!this.apiClient.getApiUrl() || !this.apiClient.getClient()) {
      throw new Error(
        'API not configured. Please set API URL in settings.'
      );
    }

    const settings = this.apiClient.getSettings();
    const selectedModel = model || settings.reasoningModel;

    console.log(`Generating update script directly using model: ${selectedModel}`);

    // Project and scope validation
    const { project, scope } = this.getProjectAndScope(projectId, scopeId);

    const startTime = performance.now();

    const oneStepPrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations.\n\nHere is my request:\n${prompt}\n\nHere is the context:\n${context}`;

    const result = await generateText({
      maxRetries: 0,
      model: this.apiClient.getClient()(selectedModel),
      messages: [{ role: 'user', content: oneStepPrompt }],
    });

    const processingTime = performance.now() - startTime;
    const formattedTime = formatProcessingTime(processingTime);

    const scriptContent = extractCodeBlock(result.text);

    // Save the script to the project folder
    const outputPath = path.join(project.rootFolder, 'update.sh');
    fs.writeFileSync(outputPath, scriptContent);
    console.log(`Saved update script to ${outputPath}`);

    // Send notification
    const notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ Processing time: ${formattedTime}`;
    await this.notificationsService.sendTelegramNotification(notificationMessage);

    return {
      response: result.text,
      script: scriptContent,
      processingTime: formattedTime
    };
  }

  /**
   * Helper method to get project and scope from IDs
   */
  private getProjectAndScope(projectId?: string, scopeId?: string) {
    const projectsPath = getProjectsFilePath();
    const scopesPath = getScopesFilePath();

    let projects = [];
    if (fs.existsSync(projectsPath)) {
      const projectsData = fs.readFileSync(projectsPath, 'utf8');
      projects = JSON.parse(projectsData);
    }
    const project = projects.find((p: any) => p.id === projectId);

    let scopes = [];
    if (fs.existsSync(scopesPath)) {
      const scopesData = fs.readFileSync(scopesPath, 'utf8');
      scopes = JSON.parse(scopesData);
      scopes = scopes.filter((s: any) => s.projectId === projectId);
    }
    const scope = scopes.find((s: any) => s.id === scopeId);

    if (!project || !project.rootFolder || !scope) {
      throw new Error(
        'Project root folder or scope not found, cannot save update.sh'
      );
    }

    return { project, scope };
  }
}
