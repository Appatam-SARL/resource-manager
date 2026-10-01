import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonModule } from '../src/common/common.module.js';
import { PrismaModule } from '../src/database/prisma.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuditModule } from '../src/modules/audit/audit.module.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import type { AuthenticatedUser } from '../src/modules/auth/types/authenticated-user.type.js';
import { NotificationsModule } from '../src/modules/notifications/notifications.module.js';
import { PushTokensService } from '../src/modules/notifications/push-tokens.service.js';
import { ExpoPushService } from '../src/modules/notifications/push/expo-push.service.js';
import { RealtimeIoAdapter } from '../src/modules/realtime/realtime-io.adapter.js';
import {
  REALTIME_ERROR_CODES,
  REALTIME_EVENTS,
  REALTIME_NAMESPACE,
  type RealtimeEventName,
} from '../src/modules/realtime/realtime.constants.js';
import { RealtimeModule } from '../src/modules/realtime/realtime.module.js';
import type { RealtimeEnvelope } from '../src/modules/realtime/realtime.types.js';
import { ReservationsModule } from '../src/modules/reservations/reservations.module.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import { actors, companies, directions, vehicles } from './fixtures/organization.js';
import { InMemoryPrisma, type InMemoryPrismaOptions } from './support/in-memory-prisma.js';

const TEST_SECRET = 'e2e-access-secret-with-at-least-32-characters';
const ALL_EVENTS = Object.values(REALTIME_EVENTS);
const SILENCE_MS = 150;

type Received = { event: RealtimeEventName; envelope: RealtimeEnvelope<Record<string, unknown>> };

interface Harness {
  app: INestApplication;
  prisma: InMemoryPrisma;
  baseUrl: string;
  tokenFor(user: AuthenticatedUser): Promise<string>;
}

async function startHarness(options: InMemoryPrismaOptions = {}): Promise<Harness> {
  const prisma = new InMemoryPrisma(options);
  Object.values(companies).forEach((company) => prisma.seedCompany(company));
  Object.values(directions).forEach((direction) => prisma.seedDirection(direction));
  Object.values(actors).forEach((actor) => prisma.seedUser(actor));
  prisma.seedVehicle(vehicles.corollaA);

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            nodeEnv: 'test',
            corsOrigin: 'http://localhost:3001',
            jwt: { accessSecret: TEST_SECRET, accessExpiresIn: '15m', refreshSecret: TEST_SECRET, refreshExpiresIn: '7d' },
            realtime: { allowedOrigins: undefined },
            expoPush: { accessToken: undefined },
          }),
        ],
      }),
      PrismaModule,
      CommonModule,
      AuditModule,
      AuthModule,
      RealtimeModule,
      UsersModule,
      NotificationsModule,
      ReservationsModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(AuditService)
    .useValue({ log: vi.fn().mockResolvedValue(undefined) })
    .overrideProvider(PushTokensService)
    .useValue({ findActiveForUsers: vi.fn().mockResolvedValue([]), deactivateTokens: vi.fn().mockResolvedValue(0) })
    .overrideProvider(ExpoPushService)
    .useValue({ send: vi.fn().mockResolvedValue([]) })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useWebSocketAdapter(new RealtimeIoAdapter(app, app.get(ConfigService)));
  await app.listen(0, '127.0.0.1');

  const jwt = app.get(JwtService);
  return {
    app,
    prisma,
    baseUrl: (await app.getUrl()).replace('[::1]', '127.0.0.1'),
    tokenFor: (user) =>
      jwt.signAsync({ sub: user.id, role: user.role, companyId: user.companyId, directionId: user.directionId }),
  };
}

class TestClient {
  readonly received: Received[] = [];
  private constructor(readonly socket: ClientSocket) {
    for (const event of ALL_EVENTS) {
      socket.on(event, (envelope: Received['envelope']) => this.received.push({ event, envelope }));
    }
  }

  static async connect(harness: Harness, auth: Record<string, unknown>): Promise<TestClient> {
    const socket = io(`${harness.baseUrl}${REALTIME_NAMESPACE}`, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    const client = new TestClient(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    // Rooms are joined in handleConnection, right after the handshake.
    await new Promise((resolve) => setTimeout(resolve, 20));
    return client;
  }

  async waitFor(event: RealtimeEventName, predicate: (data: Record<string, unknown>) => boolean = () => true) {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      const match = this.received.find((r) => r.event === event && predicate(r.envelope.data));
      if (match) return match.envelope;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Event ${event} not received`);
  }

  events(event: RealtimeEventName) {
    return this.received.filter((r) => r.event === event);
  }

  close() {
    this.socket.disconnect();
  }
}

async function connectionError(harness: Harness, auth: Record<string, unknown>) {
  const socket = io(`${harness.baseUrl}${REALTIME_NAMESPACE}`, {
    auth,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  try {
    return await new Promise<{ message: string; data?: { code: string; message: string } }>((resolve, reject) => {
      socket.once('connect', () => reject(new Error('Connection unexpectedly accepted')));
      socket.once('connect_error', (error: Error & { data?: { code: string; message: string } }) =>
        resolve({ message: error.message, data: error.data }),
      );
    });
  } finally {
    socket.disconnect();
  }
}

const silence = () => new Promise((resolve) => setTimeout(resolve, SILENCE_MS));

function inHours(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function vehicleReservationBody(startHours = 24, endHours = 26) {
  return {
    resourceType: 'VEHICLE',
    vehicleId: vehicles.corollaA.id,
    startAt: inHours(startHours),
    endAt: inHours(endHours),
    destination: 'Plateau',
    missionReason: 'Rendez-vous client',
    passengerCount: 2,
  };
}

describe('Realtime WebSocket (e2e, multi-clients)', () => {
  let harness: Harness;
  const clients: TestClient[] = [];

  async function connectAs(user: AuthenticatedUser) {
    const client = await TestClient.connect(harness, { token: await harness.tokenFor(user) });
    clients.push(client);
    return client;
  }

  async function api(user: AuthenticatedUser) {
    const token = await harness.tokenFor(user);
    const server = harness.app.getHttpServer();
    return {
      post: (path: string, body?: object) =>
        request(server).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
      patch: (path: string, body?: object) =>
        request(server).patch(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
      get: (path: string) => request(server).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
    };
  }

  beforeEach(async () => {
    harness = await startHarness();
  });

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.close());
    await harness.app.close();
  });

  describe('authentication', () => {
    it('refuses a connection without token', async () => {
      const error = await connectionError(harness, {});
      expect(error.data).toEqual({ code: REALTIME_ERROR_CODES.UNAUTHORIZED, message: 'Authentification requise.' });
    });

    it('refuses a forged token and a client-provided userId', async () => {
      const error = await connectionError(harness, { token: 'forged.jwt.token', userId: actors.groupAdmin.id });
      expect(error.data?.code).toBe(REALTIME_ERROR_CODES.UNAUTHORIZED);
    });

    it('refuses an inactive user even with a valid token', async () => {
      harness.prisma.users.get(actors.employeeA.id)!.status = UserStatus.INACTIVE;

      const error = await connectionError(harness, { token: await harness.tokenFor(actors.employeeA) });
      expect(error.data?.code).toBe(REALTIME_ERROR_CODES.UNAUTHORIZED);
    });

    it('limits the number of simultaneous connections per user', async () => {
      for (let i = 0; i < 5; i += 1) await connectAs(actors.employeeA);

      const error = await connectionError(harness, { token: await harness.tokenFor(actors.employeeA) });
      expect(error.data?.code).toBe(REALTIME_ERROR_CODES.TOO_MANY_CONNECTIONS);
    });
  });

  describe('reservation lifecycle', () => {
    it('notifies admin, requester and colleagues according to their scope, and nobody else', async () => {
      const companyAdmin = await connectAs(actors.companyAdminA);
      const groupAdmin = await connectAs(actors.groupAdmin);
      const requester = await connectAs(actors.employeeA);
      const managerTech = await connectAs(actors.managerTech);
      const managerCom = await connectAs(actors.managerCom);
      const colleague = await connectAs(actors.employeeCom);
      const otherCompany = await connectAs(actors.employeeB);

      const response = await (await api(actors.employeeA)).post('/reservations', vehicleReservationBody());
      expect(response.status).toBe(201);
      const reservationId = response.body.id as string;

      const envelope = await companyAdmin.waitFor(REALTIME_EVENTS.RESERVATION_CREATED);
      expect(envelope).toMatchObject({
        type: REALTIME_EVENTS.RESERVATION_CREATED,
        eventId: expect.any(String),
        timestamp: expect.any(String),
        data: { reservationId, companyId: companies.appatam.id, status: 'PENDING', resourceId: vehicles.corollaA.id },
      });
      await groupAdmin.waitFor(REALTIME_EVENTS.RESERVATION_CREATED);
      await requester.waitFor(REALTIME_EVENTS.RESERVATION_CREATED);
      await managerTech.waitFor(REALTIME_EVENTS.RESERVATION_CREATED);

      // Requester is notified; approvers receive their own notification.
      await requester.waitFor(REALTIME_EVENTS.NOTIFICATION_CREATED, (d) => d.entityId === reservationId);
      await companyAdmin.waitFor(REALTIME_EVENTS.NOTIFICATION_CREATED, (d) => d.entityId === reservationId);

      // A colleague only learns that the vehicle availability changed.
      const availability = await colleague.waitFor(REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED);
      expect(availability.data).toMatchObject({ resourceId: vehicles.corollaA.id, reason: 'RESERVATION_CHANGED' });
      expect(availability.data).not.toHaveProperty('userId');

      await silence();
      expect(colleague.events(REALTIME_EVENTS.RESERVATION_CREATED)).toHaveLength(0);
      expect(managerCom.events(REALTIME_EVENTS.RESERVATION_CREATED)).toHaveLength(0);
      expect(otherCompany.received).toHaveLength(0);

      const serialized = JSON.stringify([...companyAdmin.received, ...colleague.received]);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain(actors.employeeA.email);
    });

    it('keeps a single winner when two users book the same slot concurrently', async () => {
      const companyAdmin = await connectAs(actors.companyAdminA);
      const [first, second] = await Promise.all([api(actors.employeeA), api(actors.employeeCom)]);

      const responses = await Promise.all([
        first.post('/reservations', vehicleReservationBody()),
        second.post('/reservations', vehicleReservationBody()),
      ]);

      expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
      expect(harness.prisma.reservations.size).toBe(1);
      await companyAdmin.waitFor(REALTIME_EVENTS.RESERVATION_CREATED);
      await silence();
      expect(companyAdmin.events(REALTIME_EVENTS.RESERVATION_CREATED)).toHaveLength(1);
    });

    it('broadcasts approval to the requester and cancellation frees the resource', async () => {
      const requester = await connectAs(actors.employeeA);
      const colleague = await connectAs(actors.employeeCom);
      const reservationId = (await (await api(actors.employeeA)).post('/reservations', vehicleReservationBody())).body
        .id as string;

      const approve = await (await api(actors.companyAdminA)).post(`/reservations/${reservationId}/approve`);
      expect(approve.status).toBe(201);
      const approved = await requester.waitFor(REALTIME_EVENTS.RESERVATION_APPROVED);
      expect(approved.data).toMatchObject({ reservationId, status: 'APPROVED' });

      const cancel = await (await api(actors.employeeA)).post(`/reservations/${reservationId}/cancel`);
      expect(cancel.status).toBe(201);
      await requester.waitFor(REALTIME_EVENTS.RESERVATION_CANCELLED, (d) => d.status === 'CANCELLED');
      await colleague.waitFor(REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED);
      expect(colleague.events(REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED)).toHaveLength(2);

      // The slot is free again for another user.
      const rebook = await (await api(actors.employeeCom)).post('/reservations', vehicleReservationBody());
      expect(rebook.status).toBe(201);
    });

    it('emits nothing when the REST command is refused', async () => {
      const companyAdmin = await connectAs(actors.companyAdminA);

      const refused = await (await api(actors.employeeB)).post('/reservations', vehicleReservationBody());
      expect(refused.status).toBe(403);
      const invalid = await (await api(actors.employeeA)).post('/reservations', { ...vehicleReservationBody(), passengerCount: 9 });
      expect(invalid.status).toBe(400);

      await silence();
      expect(companyAdmin.received).toHaveLength(0);
    });
  });

  describe('disconnection and resynchronisation', () => {
    it('lets a client reconnect and resynchronise through REST', async () => {
      const first = await connectAs(actors.employeeA);
      first.close();

      // Event emitted while the client is offline is not replayed by the socket.
      const created = await (await api(actors.employeeA)).post('/reservations', vehicleReservationBody());
      expect(created.status).toBe(201);

      const reconnected = await connectAs(actors.employeeA);
      await silence();
      expect(reconnected.events(REALTIME_EVENTS.RESERVATION_CREATED)).toHaveLength(0);

      const list = await (await api(actors.employeeA)).get('/reservations');
      expect(list.status).toBe(200);
      expect((list.body.data as Array<{ id: string }>).map((r) => r.id)).toContain(created.body.id);

      // Live updates resume after reconnection.
      await (await api(actors.companyAdminA)).post(`/reservations/${created.body.id as string}/approve`);
      await reconnected.waitFor(REALTIME_EVENTS.RESERVATION_APPROVED);
    });

    it('closes the sockets of a user deactivated by an administrator', async () => {
      const employee = await connectAs(actors.employeeA);
      const disconnected = new Promise<string>((resolve) => employee.socket.once('disconnect', resolve));

      const response = await (await api(actors.companyAdminA)).patch(`/users/${actors.employeeA.id}/status`, {
        status: UserStatus.INACTIVE,
      });
      expect(response.status).toBe(200);

      await expect(disconnected).resolves.toBe('io server disconnect');
      const error = await connectionError(harness, { token: await harness.tokenFor(actors.employeeA) });
      expect(error.data?.code).toBe(REALTIME_ERROR_CODES.UNAUTHORIZED);
    });
  });
});

describe('Realtime e2e harness sanity', () => {
  it('without the database lock, concurrent bookings would both succeed (the lock test is meaningful)', async () => {
    const harness = await startHarness({ honorAdvisoryLocks: false });
    try {
      const server = harness.app.getHttpServer();
      const [tokenA, tokenCom] = await Promise.all([
        harness.tokenFor(actors.employeeA),
        harness.tokenFor(actors.employeeCom),
      ]);
      const responses = await Promise.all(
        [tokenA, tokenCom].map((token) =>
          request(server).post('/api/v1/reservations').set('Authorization', `Bearer ${token}`).send(vehicleReservationBody()),
        ),
      );
      expect(responses.map((r) => r.status)).toEqual([201, 201]);
    } finally {
      await harness.app.close();
    }
  });
});
