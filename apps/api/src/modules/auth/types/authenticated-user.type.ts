import { Role, UserStatus } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  role: Role;
  companyId: string;
  directionId: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  companyId: string;
  directionId: string | null;
  company: {
    id: string;
    name: string;
  };
  direction: {
    id: string;
    name: string;
  } | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthLoginResponse = AuthTokens & {
  user: AuthenticatedUser;
};
