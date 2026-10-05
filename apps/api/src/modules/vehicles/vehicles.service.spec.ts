import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResourceStatus, ResourceType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actors, companies, vehicles } from '../../../test/fixtures/organization.js';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { VEHICLE_IMAGE_MAX_BYTES, detectImageMimeType } from './vehicle-image.js';
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
    vehicleImage: Record<'findUnique' | 'upsert' | 'delete', ReturnType<typeof vi.fn>>;
    company: { findUnique: ReturnType<typeof vi.fn> };
    reservation: { count: ReturnType<typeof vi.fn> };
  };
  let audit: { log: ReturnType<typeof vi.fn> };
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
      vehicleImage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
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
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    service = new VehiclesService(
      prisma as unknown as PrismaService,
      new AccessScopeService(),
      audit as unknown as AuditService,
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

describe('VehiclesService — image', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
  let service: VehiclesService;
  let prisma: {
    vehicle: { findUnique: ReturnType<typeof vi.fn> };
    vehicleImage: Record<'findUnique' | 'upsert' | 'delete', ReturnType<typeof vi.fn>>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let realtime: { publishResourceUpdated: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      vehicle: { findUnique: vi.fn().mockResolvedValue({ ...storedVehicle, image: null }) },
      vehicleImage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    realtime = { publishResourceUpdated: vi.fn() };
    service = new VehiclesService(
      prisma as unknown as PrismaService,
      new AccessScopeService(),
      audit as unknown as AuditService,
      realtime as unknown as RealtimeService,
    );
  });

  it('stores a JPEG uploaded by the managing company, audits it without the bytes and publishes the update', async () => {
    await service.setImage(storedVehicle.id, { buffer: jpeg, size: jpeg.length }, actors.companyAdminA);

    expect(prisma.vehicleImage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: storedVehicle.id },
        create: expect.objectContaining({ mimeType: 'image/jpeg', size: jpeg.length }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Vehicle',
        metadata: { image: 'added', mimeType: 'image/jpeg', size: jpeg.length },
      }),
    );
    expect(realtime.publishResourceUpdated).toHaveBeenCalledTimes(1);
  });

  it('refuses an admin of another company (resource shared for booking, not for management)', async () => {
    const otherCompanyAdmin = { ...actors.companyAdminA, id: 'admin-b', companyId: companies.entrepriseB.id };

    await expect(
      service.setImage(storedVehicle.id, { buffer: jpeg, size: jpeg.length }, otherCompanyAdmin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.removeImage(storedVehicle.id, otherCompanyAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.vehicleImage.upsert).not.toHaveBeenCalled();
    expect(prisma.vehicleImage.delete).not.toHaveBeenCalled();
  });

  it('refuses a file whose content is not a supported image, whatever its declared type', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    await expect(
      service.setImage(storedVehicle.id, { buffer: svg, size: svg.length }, actors.companyAdminA),
    ).rejects.toThrow('Format d’image non pris en charge');
    expect(prisma.vehicleImage.upsert).not.toHaveBeenCalled();
  });

  it('refuses a missing or oversized file', async () => {
    await expect(service.setImage(storedVehicle.id, undefined, actors.companyAdminA)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.setImage(storedVehicle.id, { buffer: jpeg, size: VEHICLE_IMAGE_MAX_BYTES + 1 }, actors.companyAdminA),
    ).rejects.toThrow('2 Mo');
  });

  it('removes an existing image and is a no-op when there is none', async () => {
    await service.removeImage(storedVehicle.id, actors.companyAdminA);
    expect(prisma.vehicleImage.delete).not.toHaveBeenCalled();

    prisma.vehicle.findUnique.mockResolvedValue({
      ...storedVehicle,
      image: { mimeType: 'image/jpeg', size: 10, updatedAt: new Date() },
    });
    await service.removeImage(storedVehicle.id, actors.companyAdminA);
    expect(prisma.vehicleImage.delete).toHaveBeenCalledWith({ where: { vehicleId: storedVehicle.id } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: { image: 'removed' } }));
  });

  it('returns 404 when the vehicle has no image', async () => {
    await expect(service.getImage(storedVehicle.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('detectImageMimeType', () => {
  it('recognises JPEG, PNG and WebP signatures only', () => {
    expect(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('image/jpeg');
    expect(detectImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageMimeType(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'binary'))).toBe('image/webp');
    expect(detectImageMimeType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageMimeType(Buffer.alloc(0))).toBeNull();
  });
});
