import type { UserRole } from '@gofest/shared';

export interface AuthContext {
  userId: string;
  role: UserRole;
  organizerId: string | null;
  organizerStatus: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}
