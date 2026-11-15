import { Prisma } from '@prisma/client';

export function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'].includes(error.code))
  );
}
