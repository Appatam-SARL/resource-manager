import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService, type HealthReport } from './health.service.js';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: "État de l'API et de la base de données (public, non sensible)",
  })
  async getHealth(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthReport> {
    const report = await this.healthService.getHealthReport();
    response.status(report.status === 'ok' ? 200 : 503);
    response.setHeader('Cache-Control', 'no-store');
    return report;
  }
}
