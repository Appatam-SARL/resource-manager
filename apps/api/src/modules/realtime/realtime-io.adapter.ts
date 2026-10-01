import type { INestApplicationContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { REALTIME_MAX_PAYLOAD_BYTES } from './realtime.constants.js';

/**
 * Explicit list → that list. `*` or nothing → every origin outside production,
 * no browser origin in production (native mobile clients send no Origin header).
 */
export function resolveRealtimeCorsOrigin(
  rawOrigins: string | undefined,
  nodeEnv: string,
): string[] | boolean {
  const origins = (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
  if (origins.length > 0) return origins;
  return nodeEnv !== 'production';
}

export class RealtimeIoAdapter extends IoAdapter {
  private readonly corsOrigin: string[] | boolean;

  constructor(app: INestApplicationContext, configService: ConfigService) {
    super(app);
    const rawOrigins =
      configService.get<string>('realtime.allowedOrigins') ??
      configService.get<string>('corsOrigin');
    const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';
    this.corsOrigin = resolveRealtimeCorsOrigin(rawOrigins, nodeEnv);
    if (this.corsOrigin === false) {
      new Logger(RealtimeIoAdapter.name).warn(
        'WS_ALLOWED_ORIGINS is not set: browser clients are refused on the WebSocket.',
      );
    }
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: false },
      maxHttpBufferSize: REALTIME_MAX_PAYLOAD_BYTES,
    } as ServerOptions);
  }
}
