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

  public async sendPrompt({
    prompt,
    context,
    projectId,
    scopeId,
    reasoningModel,
    regularModel,
    useTwoStep = true,
  }: {
    prompt: string;
    context: string;
    projectId?: string;
    scopeId?: string;
    reasoningModel?: string;
    regularModel?: string;
    useTwoStep?: boolean;
  }) {
    if (!this.apiClient.getApiUrl() || !this.apiClient.getClient()) {
      throw new Error(
        'API not configured. Please set OPENAI_URL environment variable.'
      );
    }

    const settings = this.apiClient.getSettings();
    const firstModel = reasoningModel || settings.reasoningModel;
    const secondModel = regularModel || settings.regularModel;

    console.log(`Using ${useTwoStep ? 'two-step' : 'one-step'} process`);
    console.log(`Using reasoning model: ${firstModel}`);
    if (useTwoStep) {
      console.log(`Using regular model: ${secondModel}`);
    }

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

    const startTime = performance.now();
    let responseText;
    let processedText;
    let notificationMessage;

    if (useTwoStep) {
      const firstResult = await generateText({
        maxRetries: 0,
        model: this.apiClient.getClient()(firstModel),
        messages: [{ role: 'user', content: `${prompt}\n\n${context}` }],
      });

      const firstPromptTime = performance.now() - startTime;

      console.log('Sending second request...');
      const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
      const secondPrompt = `${buildUpdatePrompt}\n\n${firstResult.text}\n\n${context}`;

      const secondStartTime = performance.now();
      const secondResult = await generateText({
        maxRetries: 0,
        model: this.apiClient.getClient()(secondModel),
        messages: [{ role: 'user', content: secondPrompt }],
      });

      const secondPromptTime = performance.now() - secondStartTime;
      const totalTime = performance.now() - startTime;

      const firstPromptFormatted = formatProcessingTime(firstPromptTime);
      const secondPromptFormatted = formatProcessingTime(secondPromptTime);
      const totalFormatted = formatProcessingTime(totalTime);

      responseText = firstResult.text;
      processedText = extractCodeBlock(secondResult.text);

      notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ Processing times:\n- First prompt: ${firstPromptFormatted}\n- Second prompt: ${secondPromptFormatted}\n- Total: ${totalFormatted}`;
    } else {
      const oneStepPrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations.\n\nHere is my request:\n${prompt}\n\nHere is the context:\n${context}`;

      const oneStepResult = await generateText({
        maxRetries: 0,
        model: this.apiClient.getClient()(firstModel),
        messages: [{ role: 'user', content: oneStepPrompt }],
      });

      responseText = oneStepResult.text;
      processedText = extractCodeBlock(oneStepResult.text);

      const totalTime = performance.now() - startTime;
      const totalFormatted = formatProcessingTime(totalTime);

      notificationMessage = `✅ Script update.sh generated successfully for project "${project.name}" (Scope: ${scope.name}).\n\n⏱️ One-step processing time: ${totalFormatted}`;
    }

    const outputPath = path.join(project.rootFolder, 'update.sh');
    fs.writeFileSync(outputPath, processedText);
    console.log(`Saved processed response to ${outputPath}`);

    await this.notificationsService.sendTelegramNotification(
      notificationMessage
    );

    return { response: responseText };
  }
}
