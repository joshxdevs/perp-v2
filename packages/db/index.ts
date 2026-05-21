import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });

export const prisma = new PrismaClient({ adapter });
export * from './generated/prisma/client';

