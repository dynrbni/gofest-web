import type { UserRole } from '@gofest/shared';

export interface AuthContext {
  userId: string;
  role: UserRole;
  organizerId: string | null;
  organizerStatus: string | null;
  sessionId?: string;
  familyId?: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sessionId?: string;
  familyId?: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  role: UserRole;
  sessionId?: string;
  familyId?: string;
  type: 'refresh';
}

export interface ReauthTokenPayload {
  sub: string;
  role: UserRole;
  type: 'reauth';
}
