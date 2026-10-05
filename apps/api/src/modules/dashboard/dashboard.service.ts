import { Injectable } from '@nestjs/common';
import { ReservationStatus, ResourceStatus, Role } from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
  ) {}

  async getSummary(actor: AuthenticatedUser) {
    const reservationWhere = this.accessScope.reservationListWhere(actor);
    const companyId = this.resolveResourceCompanyId(actor);

    const resourceCompanyFilter = companyId ? { companyId } : {};

    const [
      reservationsTotal,
      reservationsPending,
      reservationsApproved,
      vehiclesTotal,
      vehiclesAvailable,
      roomsTotal,
      roomsAvailable,
    ] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where: reservationWhere }),
      this.prisma.reservation.count({
        where: { AND: [reservationWhere, { status: ReservationStatus.PENDING }] },
      }),
      this.prisma.reservation.count({
        where: {
          AND: [reservationWhere, { status: ReservationStatus.APPROVED }],
        },
      }),
      this.prisma.vehicle.count({ where: resourceCompanyFilter }),
      this.prisma.vehicle.count({
        where: {
          ...resourceCompanyFilter,
          status: ResourceStatus.AVAILABLE,
        },
      }),
      this.prisma.meetingRoom.count({ where: resourceCompanyFilter }),
      this.prisma.meetingRoom.count({
        where: {
          ...resourceCompanyFilter,
          status: ResourceStatus.AVAILABLE,
        },
      }),
    ]);

    return {
      role: actor.role,
      companyId: actor.role === Role.GROUP_ADMIN ? null : actor.companyId,
      directionId: actor.directionId,
      reservations: {
        total: reservationsTotal,
        pending: reservationsPending,
        approved: reservationsApproved,
      },
      resources: {
        vehicles: {
          total: vehiclesTotal,
          available: vehiclesAvailable,
        },
        rooms: {
          total: roomsTotal,
          available: roomsAvailable,
        },
      },
    };
  }

  async getReservations(actor: AuthenticatedUser, limit = 10) {
    const take = Math.min(Math.max(limit, 1), 50);
    const where = this.accessScope.reservationListWhere(actor);

    return this.prisma.reservation.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        resourceType: true,
        status: true,
        startAt: true,
        endAt: true,
        destination: true,
        meetingSubject: true,
        vehicle: {
          select: { id: true, registrationNumber: true, brand: true, model: true },
        },
        room: { select: { id: true, name: true, location: true } },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getResources(actor: AuthenticatedUser) {
    const companyId = this.resolveResourceCompanyId(actor);
    const where = companyId ? { companyId } : {};

    const [vehicles, rooms] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          registrationNumber: true,
          brand: true,
          model: true,
          seats: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { registrationNumber: 'asc' },
        take: 100,
      }),
      this.prisma.meetingRoom.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          name: true,
          location: true,
          capacity: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        take: 100,
      }),
    ]);

    return {
      vehicles,
      rooms,
      counts: {
        vehicles: vehicles.length,
        rooms: rooms.length,
        vehiclesAvailable: vehicles.filter(
          (v) => v.status === ResourceStatus.AVAILABLE,
        ).length,
        roomsAvailable: rooms.filter(
          (r) => r.status === ResourceStatus.AVAILABLE,
        ).length,
      },
    };
  }

  /**
   * GROUP_ADMIN → all companies; others → own company only.
   */
  private resolveResourceCompanyId(
    actor: AuthenticatedUser,
  ): string | undefined {
    if (actor.role === Role.GROUP_ADMIN) {
      return undefined;
    }
    return actor.companyId;
  }
}
