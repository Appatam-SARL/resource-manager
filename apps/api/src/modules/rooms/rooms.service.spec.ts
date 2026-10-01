import { ForbiddenException } from '@nestjs/common';
import { ResourceStatus, ResourceType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actors, companies } from '../../../test/fixtures/organization.js';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { RoomsService } from './rooms.service.js';

const storedRoom = {
  id: 'room-a',
  companyId: companies.appatam.id,
  name: 'Salle A',
  location: null,
  capacity: 10,
  status: ResourceStatus.AVAILABLE,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  company: { id: companies.appatam.id, name: 'Appatam' },
};

describe('RoomsService — realtime', () => {
  let service: RoomsService;
  let prisma: {
    meetingRoom: Record<'findUnique' | 'create' | 'update' | 'delete', ReturnType<typeof vi.fn>>;
    company: { findUnique: ReturnType<typeof vi.fn> };
    reservation: { count: ReturnType<typeof vi.fn> };
  };
  let realtime: Record<
    'publishResourceCreated' | 'publishResourceUpdated' | 'publishResourceAvailability' | 'publishResourceDeleted',
    ReturnType<typeof vi.fn>
  >;

  beforeEach(() => {
    prisma = {
      meetingRoom: {
        findUnique: vi.fn().mockResolvedValue(storedRoom),
        create: vi.fn().mockResolvedValue(storedRoom),
        update: vi.fn().mockResolvedValue({ ...storedRoom, status: ResourceStatus.OUT_OF_SERVICE }),
        delete: vi.fn().mockResolvedValue(storedRoom),
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
    service = new RoomsService(
      prisma as unknown as PrismaService,
      new AccessScopeService(),
      { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService,
      realtime as unknown as RealtimeService,
    );
  });

  it('publishes resource.created after creation', async () => {
    await service.create({ companyId: companies.appatam.id, name: 'Salle A', capacity: 10 }, actors.companyAdminA);

    expect(realtime.publishResourceCreated).toHaveBeenCalledWith(ResourceType.ROOM, storedRoom);
  });

  it('publishes resource.availability.changed when the status changes', async () => {
    await service.updateStatus(storedRoom.id, ResourceStatus.OUT_OF_SERVICE, actors.companyAdminA);

    expect(realtime.publishResourceAvailability).toHaveBeenCalledWith(
      ResourceType.ROOM,
      expect.objectContaining({ status: ResourceStatus.OUT_OF_SERVICE }),
      'STATUS_CHANGED',
    );
  });

  it('publishes resource.deleted after a physical deletion', async () => {
    await service.remove(storedRoom.id, actors.companyAdminA);

    expect(realtime.publishResourceDeleted).toHaveBeenCalledWith(ResourceType.ROOM, storedRoom);
  });

  it('publishes nothing for an admin of another company', async () => {
    const otherCompanyAdmin = { ...actors.companyAdminA, id: 'admin-b', companyId: companies.entrepriseB.id };

    await expect(service.update(storedRoom.id, { capacity: 4 }, otherCompanyAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(realtime.publishResourceUpdated).not.toHaveBeenCalled();
  });
});
