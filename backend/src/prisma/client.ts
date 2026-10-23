import { PrismaClient } from '@prisma/client';

let databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  // Strip accidental quotes if user pasted with quotes in Render Environment settings
  databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '');
}

export const prisma = new PrismaClient(
  databaseUrl
    ? {
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      }
    : undefined
);

