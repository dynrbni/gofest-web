import type { UserRole } from '@gofest/shared';

export interface AuthContext {
  userId: string;
  role: UserRole;
  organizerId: string | null;
  organizerStatus: string | null;
}

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthContext;
    }
  }
}

export {};
