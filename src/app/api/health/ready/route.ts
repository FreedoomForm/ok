import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const startedAt = performance.now()

  try {
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      checks: {
        database: {
          status: 'ok',
          latencyMs: Math.round(performance.now() - startedAt),
        },
      },
    })
  } catch {
    return NextResponse.json(
      {
        status: 'not_ready',
        checks: {
          database: {
            status: 'error',
            latencyMs: Math.round(performance.now() - startedAt),
          },
        },
      },
      { status: 503 }
    )
  }
}
