import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireDemoSession } from '@/lib/demoSession'

const MS_PER_DAY = 86_400_000

/**
 * Judge demo control: move this claim's simulated clock, or release the money.
 *
 * Not part of the citizen experience. It exists so the SLA breach and the
 * escalation ladder can be demonstrated in twenty seconds instead of fifty days.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!(await requireDemoSession())) {
    return NextResponse.json(
      { error: 'Sign in as one of the demo people first, then use these controls.' },
      { status: 401 },
    )
  }

  let body: { advanceDays?: unknown; creditNow?: unknown; reset?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Send a JSON body.' }, { status: 400 })
  }

  const advanceDays = typeof body.advanceDays === 'number' ? body.advanceDays : 0
  const creditNow = body.creditNow === true
  const reset = body.reset === true

  if (!Number.isFinite(advanceDays) || Math.abs(advanceDays) > 3650) {
    return NextResponse.json({ error: 'advanceDays must be within 10 years.' }, { status: 400 })
  }

  const claim = await prisma.claim.findUnique({ where: { id } })

  if (!claim) {
    return NextResponse.json({ error: 'No claim with that ID.' }, { status: 404 })
  }

  // Rewinding to the filing date is the cheapest way back to a clean demo
  // without reseeding the whole database between judges.
  if (reset) {
    const updated = await prisma.claim.update({
      where: { id },
      data: { simulatedToday: claim.filedAt, bank: { observedAt: claim.filedAt, creditedPaise: null } },
    })
    return NextResponse.json({ ok: true, today: updated.simulatedToday, reset: true })
  }

  const today = new Date(Date.parse(`${claim.simulatedToday}T00:00:00Z`) + advanceDays * MS_PER_DAY)
    .toISOString()
    .slice(0, 10)

  const updated = await prisma.claim.update({
    where: { id },
    data: {
      simulatedToday: today,
      ...(creditNow ? { bank: { observedAt: today, creditedPaise: claim.amountPaise } } : {}),
    },
  })

  return NextResponse.json({ ok: true, today: updated.simulatedToday, credited: creditNow })
}
