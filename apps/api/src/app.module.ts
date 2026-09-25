import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { GroupModule } from './modules/group/group.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
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
    PrismaModule,
    CommonModule,
    AuditModule,
    AuthModule,
    GroupModule,
    CompaniesModule,
    DirectionsModule,
    UsersModule,
    VehiclesModule,
    RoomsModule,
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
