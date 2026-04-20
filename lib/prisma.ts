import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 requires accelerateUrl or driver adapter
// Using accelerateUrl for direct PostgreSQL connection
const prismaClientOptions = {
  accelerateUrl: process.env.DATABASE_URL,
} as const;

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;