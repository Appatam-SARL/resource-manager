import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { CommonModule } from './common/common.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { DirectionsModule } from './modules/directions/directions.module.js';
import { EquipmentsModule } from './modules/equipments/equipments.module.js';
import { GroupModule } from './modules/group/group.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuditModule,
    MailModule,
    AuthModule,
    RealtimeModule,
    GroupModule,
    CompaniesModule,
    DirectionsModule,
    UsersModule,
    VehiclesModule,
    RoomsModule,
    EquipmentsModule,
    NotificationsModule,
    ReservationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
