import { Global, Module } from '@nestjs/common';
import { AccessScopeService } from './authorization/access-scope.service.js';

@Global()
@Module({
  providers: [AccessScopeService],
  exports: [AccessScopeService],
})
export class CommonModule {}
