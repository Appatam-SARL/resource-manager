import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';

export type HealthStatus = 'ok' | 'error';
export type DependencyStatus = 'up' | 'down';

export interface HealthReport {
  status: HealthStatus;
  environment: string;
  version: string;
  commit: string;
  buildDate: string | null;
  uptimeSeconds: number;
  checks: { database: DependencyStatus };
}

const DATABASE_CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getHealthReport(): Promise<HealthReport> {
    const database = await this.checkDatabase();
    return {
      status: database === 'up' ? 'ok' : 'error',
      environment: this.configService.get<string>('deployment.environment') ?? 'development',
      version: this.configService.get<string>('deployment.version') ?? 'dev',
      commit: this.configService.get<string>('deployment.commit') ?? 'local',
      buildDate: this.configService.get<string>('deployment.buildDate') ?? null,
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            DATABASE_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      return 'up';
    } catch (error) {
      // Never log the raw error: driver messages may contain connection details.
      const code =
        error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
      this.logger.warn(`Database health check failed (code: ${code})`);
      return 'down';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
