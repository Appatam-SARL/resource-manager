import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { HealthService } from './health.service.js';

const deployment: Record<string, string> = {
  'deployment.environment': 'staging',
  'deployment.version': '1.2.0',
  'deployment.commit': 'abc1234',
  'deployment.buildDate': '2026-09-29T10:00:00Z',
  databaseUrl: 'postgresql://user:super-secret@db:5432/app',
  'jwt.accessSecret': 'jwt-secret-value-that-must-never-leak',
};

function buildService(queryRaw: () => Promise<unknown>) {
  const prisma = { $queryRaw: vi.fn(queryRaw) } as unknown as PrismaService;
  const config = {
    get: vi.fn((key: string) => deployment[key]),
  } as unknown as ConfigService;
  return new HealthService(prisma, config);
}

describe('HealthService', () => {
  it('reports ok with deployment metadata when the database answers', async () => {
    const service = buildService(() => Promise.resolve([{ '?column?': 1 }]));

    const report = await service.getHealthReport();

    expect(report).toMatchObject({
      status: 'ok',
      environment: 'staging',
      version: '1.2.0',
      commit: 'abc1234',
      buildDate: '2026-09-29T10:00:00Z',
      checks: { database: 'up' },
    });
  });

  it('reports error when the database is unreachable', async () => {
    const service = buildService(() =>
      Promise.reject(Object.assign(new Error('connect ECONNREFUSED'), { code: 'P1001' })),
    );

    const report = await service.getHealthReport();

    expect(report.status).toBe('error');
    expect(report.checks.database).toBe('down');
  });

  it('never exposes secrets or connection strings', async () => {
    const service = buildService(() => Promise.resolve([]));

    const serialized = JSON.stringify(await service.getHealthReport());

    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('jwt-secret');
  });
});
