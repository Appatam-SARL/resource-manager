import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role, AuditAction } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PaginationQueryDto, paginate, paginationArgs } from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';

class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les journaux d’audit' })
  @ApiOkResponse()
  async list(@Query() query: AuditQueryDto) {
    const where = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyId: true,
            },
          },
        },
      }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }
}
