import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireDemoSession } from '@/lib/demoSession'
import type { Rung } from '@/lib/domain/types'

// Reference formats used by the real portals, so a filed grievance looks like
// the thing a member would actually receive back. The numbers are invented.
const PREFIX: Record<Exclude<Rung, 'WAIT'>, string> = {
  EPFIGMS: 'EPFOG/E/2026/',
  CPGRAMS: 'MOLBR/E/2026/',
  REGIONAL_EMAIL: 'EMAIL/2026/',
  CPGRAMS_APPEAL: 'MOLBR/A/2026/',
  DPG: 'DPG/2026/',
  RTI: 'EPFOG/R/2026/',
}

function docketFor(channel: Exclude<Rung, 'WAIT'>): string {
  // Deterministic enough to look real, without pretending to be a real number.
  const n = Math.floor(Math.random() * 9_000_000) + 1_000_000
  return `${PREFIX[channel]}${n}`
}

/** File the next escalation. Simulated: nothing leaves this machine. */
export async function POST(req: Request) {
  if (!(await requireDemoSession())) {
    return NextResponse.json(
      { error: 'Sign in first to file an escalation in this demo.' },
      { status: 401 },
    )
  }

  let body: { claimId?: unknown; channel?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with claimId and channel.' }, { status: 400 })
  }

  const claimId = typeof body.claimId === 'string' ? body.claimId : ''
  const channel = typeof body.channel === 'string' ? body.channel : ''

  if (!claimId || !channel) {
    return NextResponse.json({ error: 'claimId and channel are required.' }, { status: 400 })
  }

  if (!(channel in PREFIX)) {
    return NextResponse.json(
      { error: `Unknown escalation channel "${channel}".` },
      { status: 400 },
    )
  }

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { grievances: true },
  })

  if (!claim) {
    return NextResponse.json({ error: 'No claim with that ID.' }, { status: 404 })
  }

  // Filing the same rung twice is how a member gets a template reply and, on
  // EPFiGMS, a 30-day lockout. The app should never do it by accident.
  if (claim.grievances.some((g) => g.channel === channel)) {
    return NextResponse.json(
      { error: `You have already filed at ${channel}. Wait for it to stall before escalating.` },
      { status: 409 },
    )
  }

  const grievance = await prisma.grievance.create({
    data: {
      claimId,
      channel,
      filedAt: claim.simulatedToday,
      docket: docketFor(channel as Exclude<Rung, 'WAIT'>),
      resolved: false,
    },
  })

  return NextResponse.json({ ok: true, grievance })
}
