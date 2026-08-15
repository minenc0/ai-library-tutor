import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:db/custom.db'
  const dbAuthToken = process.env.DATABASE_AUTH_TOKEN

  // If using Turso (libsql:// URL), use the adapter
  if (dbUrl.startsWith('libsql://')) {
    const libsql = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Fallback to local SQLite
  return new PrismaClient({
    log: ['query'],
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
