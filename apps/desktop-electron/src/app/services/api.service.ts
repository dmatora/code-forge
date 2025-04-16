import { ipcMain } from 'electron';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Removes the first and last line from a text string
 * @param {string} text - The input text
 * @returns {string} - Text with first and last lines removed
 */
function removeFirstAndLastLines(text) {
  // Split the text into lines
  const lines = text.split('\n');

  // Return original text if there are less than 3 lines
  if (lines.length < 3) {
    return text;
  }

  // Remove first and last lines and join back together
  return lines.slice(1, -1).join('\n');
}

export class ApiService {
  private apiUrl: string;
  private apiModel: string;
  private openaiClient;

  constructor() {
    // Read from environment variables
    this.apiUrl = process.env.OPENAI_URL || '';
    this.apiModel = process.env.OPENAI_MODEL || '';

    // Initialize OpenAI client if URL is configured
    if (this.apiUrl) {
      this.openaiClient = createOpenAI({
        baseURL: this.apiUrl,
        apiKey: process.env.OPENAI_API_KEY || 'dummy-key' // Some providers still require an API key
      });
    }

    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    ipcMain.handle('get-api-config', () => {
      return {
        url: this.apiUrl,
        maxRetries: 0,
        model: this.apiModel
      };
    });

    ipcMain.handle('send-prompt', async (_, { prompt, context, projectFolders }) => {
      if (!this.apiUrl || !this.openaiClient) {
        throw new Error('API not configured. Please set OPENAI_URL environment variable.');
      }

      try {
        // First request
        const firstResult = await generateText({
          model: this.openaiClient(this.apiModel),
          messages: [
            { role: 'user', content: `${prompt}\n\n${context}` }
          ]
        });

        // Second request with hardcoded prompt + first response + context
        console.log('Sending second request...');
        const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
        const secondPrompt = `${buildUpdatePrompt}\n\n${firstResult.text}\n\n${context}`;
        const secondResult = await generateText({
          model: this.openaiClient(this.apiModel),
          messages: [
            { role: 'user', content: secondPrompt }
          ]
        });

        // Save the second result to update.sh in the project root, removing first and last lines
        if (projectFolders && projectFolders.length > 0) {
          const projectRoot = projectFolders[0]; // Use the first folder as the project root
          const outputPath = path.join(projectRoot, 'update.sh');

          // Apply function to remove first and last lines
          const processedText = removeFirstAndLastLines(secondResult.text);

          fs.writeFileSync(outputPath, processedText);
          console.log(`Saved processed response to ${outputPath}`);
        } else {
          console.error('No project folders provided, cannot save update.sh');
        }

        // Return the first response to the user
        return { response: firstResult.text };
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    });
  }
}

export default ApiService;
