import { ForbiddenException } from '@nestjs/common';
import { ResourceStatus, ResourceType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actors, companies, vehicles } from '../../../test/fixtures/organization.js';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { VehiclesService } from './vehicles.service.js';

const storedVehicle = {
  id: vehicles.corollaA.id,
  companyId: companies.appatam.id,
  registrationNumber: 'AA-123-BB',
  brand: 'Toyota',
  model: 'Corolla',
  seats: 5,
  status: ResourceStatus.AVAILABLE,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  company: { id: companies.appatam.id, name: 'Appatam' },
};

describe('VehiclesService — realtime', () => {
  let service: VehiclesService;
  let prisma: {
    vehicle: Record<'findUnique' | 'create' | 'update' | 'delete', ReturnType<typeof vi.fn>>;
    company: { findUnique: ReturnType<typeof vi.fn> };
    reservation: { count: ReturnType<typeof vi.fn> };
  };
  let realtime: Record<
    'publishResourceCreated' | 'publishResourceUpdated' | 'publishResourceAvailability' | 'publishResourceDeleted',
    ReturnType<typeof vi.fn>
  >;

  beforeEach(() => {
    prisma = {
      vehicle: {
        findUnique: vi.fn().mockResolvedValue(storedVehicle),
        create: vi.fn().mockResolvedValue(storedVehicle),
        update: vi.fn().mockResolvedValue({ ...storedVehicle, status: ResourceStatus.MAINTENANCE }),
        delete: vi.fn().mockResolvedValue(storedVehicle),
      },
      company: { findUnique: vi.fn().mockResolvedValue({ id: companies.appatam.id }) },
      reservation: { count: vi.fn().mockResolvedValue(0) },
    };
    realtime = {
      publishResourceCreated: vi.fn(),
      publishResourceUpdated: vi.fn(),
      publishResourceAvailability: vi.fn(),
      publishResourceDeleted: vi.fn(),
    };
    service = new VehiclesService(
      prisma as unknown as PrismaService,
      new AccessScopeService(),
      { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService,
      realtime as unknown as RealtimeService,
    );
  });

  it('publishes resource.created after creation', async () => {
    await service.create(
      { companyId: companies.appatam.id, registrationNumber: 'AA-123-BB', brand: 'Toyota', model: 'Corolla', seats: 5 },
      actors.companyAdminA,
    );

    expect(realtime.publishResourceCreated).toHaveBeenCalledWith(ResourceType.VEHICLE, storedVehicle);
  });

  it('publishes resource.updated after update', async () => {
    await service.update(storedVehicle.id, { seats: 7 }, actors.companyAdminA);

    expect(realtime.publishResourceUpdated).toHaveBeenCalledTimes(1);
  });

  it('publishes resource.availability.changed when the status changes', async () => {
    await service.updateStatus(storedVehicle.id, ResourceStatus.MAINTENANCE, actors.companyAdminA);

    expect(realtime.publishResourceAvailability).toHaveBeenCalledWith(
      ResourceType.VEHICLE,
      expect.objectContaining({ status: ResourceStatus.MAINTENANCE }),
      'STATUS_CHANGED',
    );
  });

  it('publishes availability (not deletion) when a vehicle with history is put out of service', async () => {
    prisma.reservation.count.mockResolvedValue(3);

    await service.remove(storedVehicle.id, actors.companyAdminA);

    expect(realtime.publishResourceAvailability).toHaveBeenCalledTimes(1);
    expect(realtime.publishResourceDeleted).not.toHaveBeenCalled();
  });

  it('publishes resource.deleted after a physical deletion', async () => {
    await service.remove(storedVehicle.id, actors.companyAdminA);

    expect(prisma.vehicle.delete).toHaveBeenCalled();
    expect(realtime.publishResourceDeleted).toHaveBeenCalledWith(ResourceType.VEHICLE, storedVehicle);
  });

  it('publishes nothing when an admin of another company tries to change the status', async () => {
    const otherCompanyAdmin = { ...actors.companyAdminA, id: 'admin-b', companyId: companies.entrepriseB.id };

    await expect(
      service.updateStatus(storedVehicle.id, ResourceStatus.OUT_OF_SERVICE, otherCompanyAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.vehicle.update).not.toHaveBeenCalled();
    expect(realtime.publishResourceAvailability).not.toHaveBeenCalled();
  });

  it('publishes nothing when an employee tries to change the status', async () => {
    await expect(
      service.updateStatus(storedVehicle.id, ResourceStatus.MAINTENANCE, actors.employeeA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(realtime.publishResourceAvailability).not.toHaveBeenCalled();
  });
});
