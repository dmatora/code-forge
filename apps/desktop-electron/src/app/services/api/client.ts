import { createOpenAI } from '@ai-sdk/openai';
import { SettingsService } from '../settings.service';

export class ApiClient {
  private apiUrl: string;
  private apiKey: string;
  private openaiClient: any;
  private unsubscribe: () => void;

  constructor(private settingsService: SettingsService) {
    const settings = settingsService.getSettings();
    this.apiUrl = settings.apiUrl || process.env.OPENAI_URL || '';
    this.apiKey = settings.apiKey || process.env.OPENAI_API_KEY || '';

    if (this.apiUrl) {
      this.initializeClient();
    }

    this.unsubscribe = settingsService.subscribe(() => {
      const settings = settingsService.getSettings();
      this.apiUrl = settings.apiUrl || '';
      this.apiKey = settings.apiKey || '';

      if (this.apiUrl) {
        this.initializeClient();
      } else {
        this.openaiClient = null;
      }
    });
  }

  public getClient(): any {
    if (!this.openaiClient && this.apiUrl) {
      this.initializeClient();
    }
    return this.openaiClient;
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getSettings(): any {
    return this.settingsService.getSettings();
  }

  private initializeClient() {
    this.openaiClient = createOpenAI({
      baseURL: this.apiUrl,
      apiKey: this.apiKey || 'dummy-key',
    });
    console.log(`OpenAI client initialized with API URL: ${this.apiUrl}`);
  }

  public destroy() {
    this.unsubscribe();
  }
}
