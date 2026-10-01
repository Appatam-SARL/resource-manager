import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  ResourceStatus,
  ResourceType,
} from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import {
  paginate,
  paginationArgs,
} from '../../common/dto/pagination.dto.js';
import { toPlainJson } from '../../common/utils/to-plain-json.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AuditService } from '../audit/audit.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

const vehicleSelect = {
  id: true,
  companyId: true,
  registrationNumber: true,
  brand: true,
  model: true,
  seats: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { id: true, name: true } },
} satisfies Prisma.VehicleSelect;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(actor: AuthenticatedUser, query: ListVehiclesQueryDto) {
    const companyId = this.accessScope.resolveCompanyFilter(
      actor,
      query.companyId,
    );

    const where: Prisma.VehicleWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                registrationNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        select: vehicleSelect,
        orderBy: { registrationNumber: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: vehicleSelect,
    });
    if (!vehicle) {
      throw new NotFoundException('Véhicule introuvable.');
    }
    this.accessScope.assertCanAccessCompany(actor, vehicle.companyId);
    return vehicle;
  }

  async create(dto: CreateVehicleDto, actor: AuthenticatedUser) {
    this.accessScope.assertCanManageCompany(actor, dto.companyId);
    await this.assertCompanyExists(dto.companyId);

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          companyId: dto.companyId,
          registrationNumber: dto.registrationNumber.trim(),
          brand: dto.brand.trim(),
          model: dto.model.trim(),
          seats: dto.seats,
          description: dto.description?.trim() || null,
        },
        select: vehicleSelect,
      });

      await this.audit.log({
        userId: actor.id,
        action: AuditAction.CREATE,
        entity: 'Vehicle',
        entityId: vehicle.id,
        metadata: {
          companyId: vehicle.companyId,
          registrationNumber: vehicle.registrationNumber,
        },
      });

      this.realtime.publishResourceCreated(ResourceType.VEHICLE, vehicle);
      return vehicle;
    } catch (error) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateVehicleDto, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...(dto.registrationNumber !== undefined
            ? { registrationNumber: dto.registrationNumber.trim() }
            : {}),
          ...(dto.brand !== undefined ? { brand: dto.brand.trim() } : {}),
          ...(dto.model !== undefined ? { model: dto.model.trim() } : {}),
          ...(dto.seats !== undefined ? { seats: dto.seats } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
        },
        select: vehicleSelect,
      });

      await this.audit.log({
        userId: actor.id,
        action: AuditAction.UPDATE,
        entity: 'Vehicle',
        entityId: id,
        metadata: {
          before: existing,
          after: toPlainJson(dto),
        },
      });

      this.realtime.publishResourceUpdated(ResourceType.VEHICLE, vehicle);
      return vehicle;
    } catch (error) {
      this.handleUniqueConflict(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: ResourceStatus,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: { status },
      select: vehicleSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'Vehicle',
      entityId: id,
      metadata: { from: existing.status, to: status },
    });

    this.realtime.publishResourceAvailability(
      ResourceType.VEHICLE,
      vehicle,
      'STATUS_CHANGED',
    );
    return vehicle;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const reservationCount = await this.prisma.reservation.count({
      where: { vehicleId: id },
    });

    if (reservationCount > 0) {
      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data: { status: ResourceStatus.OUT_OF_SERVICE },
        select: vehicleSelect,
      });

      await this.audit.log({
        userId: actor.id,
        action: AuditAction.STATUS_CHANGE,
        entity: 'Vehicle',
        entityId: id,
        metadata: {
          reason: 'soft_deactivate_has_reservations',
          from: existing.status,
          to: ResourceStatus.OUT_OF_SERVICE,
        },
      });

      this.realtime.publishResourceAvailability(
        ResourceType.VEHICLE,
        vehicle,
        'STATUS_CHANGED',
      );
      return {
        deleted: false,
        deactivated: true,
        vehicle,
        message:
          'Le véhicule possède des réservations : il a été mis hors service.',
      };
    }

    await this.prisma.vehicle.delete({ where: { id } });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.DELETE,
      entity: 'Vehicle',
      entityId: id,
      metadata: {
        registrationNumber: existing.registrationNumber,
        companyId: existing.companyId,
      },
    });

    this.realtime.publishResourceDeleted(ResourceType.VEHICLE, existing);
    return {
      deleted: true,
      deactivated: false,
      message: 'Véhicule supprimé.',
    };
  }

  private async assertCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }
  }

  private handleUniqueConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Un véhicule avec cette immatriculation existe déjà dans cette entreprise.',
      );
    }
  }
}
