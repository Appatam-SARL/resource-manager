export { AuthModule } from './auth.module.js';
export { AuthService } from './auth.service.js';
export { JwtAuthGuard } from './guards/jwt-auth.guard.js';
export { RolesGuard } from './guards/roles.guard.js';
export { Roles } from './decorators/roles.decorator.js';
export { CurrentUser } from './decorators/current-user.decorator.js';
export type {
  AuthenticatedUser,
  JwtPayload,
  AuthLoginResponse,
} from './types/authenticated-user.type.js';
export {
  belongsToCompany,
  belongsToDirection,
  getUserCompanyId,
  getUserDirectionId,
  getUserRole,
  hasAnyRole,
} from './utils/organizational-scope.js';
