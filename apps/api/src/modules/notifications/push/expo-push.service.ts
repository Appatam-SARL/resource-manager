import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ExpoPushMessage,
  ExpoPushResult,
  ExpoPushTicket,
} from './expo-push.types.js';

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_MAX_MESSAGES_PER_REQUEST = 100;
const EXPO_REQUEST_TIMEOUT_MS = 10_000;

type ExpoPushSendResponse = {
  data?: ExpoPushTicket[];
  errors?: { code?: string; message?: string }[];
};

/**
 * Transport layer only: sends already-built messages to the Expo Push API.
 * Business rules (who is notified, what is stored) live in NotificationsService.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly config: ConfigService) {}

  async send(messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
    const results: ExpoPushResult[] = [];
    for (let i = 0; i < messages.length; i += EXPO_MAX_MESSAGES_PER_REQUEST) {
      const chunk = messages.slice(i, i + EXPO_MAX_MESSAGES_PER_REQUEST);
      results.push(...(await this.sendChunk(chunk)));
    }
    return results;
  }

  private async sendChunk(chunk: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const accessToken = this.config.get<string>('expoPush.accessToken');
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(EXPO_PUSH_SEND_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(EXPO_REQUEST_TIMEOUT_MS),
      });
      const payload = (await response.json()) as ExpoPushSendResponse;

      if (!response.ok || !Array.isArray(payload.data)) {
        const reason = payload.errors?.[0]?.code ?? `HTTP ${response.status}`;
        this.logger.warn(`Expo push request rejected (${reason})`);
        return this.failAll(chunk, reason);
      }

      return chunk.map((message, index) => ({
        token: message.to,
        ticket: payload.data?.[index] ?? {
          status: 'error',
          message: 'Missing ticket',
        },
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn(`Expo push request failed (${reason})`);
      return this.failAll(chunk, reason);
    }
  }

  private failAll(chunk: ExpoPushMessage[], reason: string): ExpoPushResult[] {
    return chunk.map((message) => ({
      token: message.to,
      ticket: { status: 'error', message: reason },
    }));
  }
}
