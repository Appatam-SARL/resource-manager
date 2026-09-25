import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { GroupController } from './group.controller.js';
import { GroupService } from './group.service.js';

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
