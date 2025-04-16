import { ipcMain } from 'electron';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

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

    ipcMain.handle('send-prompt', async (_, { prompt, context }) => {
      if (!this.apiUrl || !this.openaiClient) {
        throw new Error('API not configured. Please set OPENAI_URL environment variable.');
      }

      try {
        // Convert your prompt and context to the format expected by generateText
        const result = await generateText({
          model: this.openaiClient(this.apiModel),
          messages: [
            { role: 'user', content: `${prompt}\n\n${context}` }
          ]
        });

        return { response: result.text };
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    });
  }
}

export default ApiService;
