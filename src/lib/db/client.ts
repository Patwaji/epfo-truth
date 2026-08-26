import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// Prisma 7 requires an explicit driver adapter for SQL providers, and no longer
// reads .env by itself. Next.js loads .env for the app; the seed script imports
// dotenv before this module.

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add a Postgres connection string to .env — ' +
        'run `npx create-db` for a free one, or use a Neon database.',
    )
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Next.js hot-reloads modules in development, which would otherwise open a new
// connection pool on every edit until Postgres refuses them.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const client = createClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    return client
  }
  return globalForPrisma.prisma
}

/**
 * Connects on first query, not on import.
 *
 * `next build` evaluates every route module to collect page data, with no
 * database and often no environment. Constructing the client at import time
 * fails the whole build; this defers it until a request actually needs it, so a
 * missing DATABASE_URL surfaces as a request-time error rather than a build one.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver)
  },
})
