import { ApiClient } from './client';

export class NotificationsService {
  constructor(private apiClient: ApiClient) {}

  public async sendTelegramNotification(message: string) {
    try {
      const settings = this.apiClient.getSettings();
      const telegramApiKey = settings.telegramApiKey;
      const telegramChatId = settings.telegramChatId;

      if (telegramApiKey && telegramChatId) {
        const url = `https://api.telegram.org/bot${telegramApiKey}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
          }),
        });

        if (!response.ok) {
          console.error(
            `Telegram notification failed: ${response.statusText}`,
            await response.json()
          );
        } else {
          console.log('Telegram notification sent successfully.');
        }
      }
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }
}
