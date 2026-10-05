import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { PushTokensService } from './push-tokens.service.js';
import { ExpoPushService } from './push/expo-push.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushTokensService, ExpoPushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
