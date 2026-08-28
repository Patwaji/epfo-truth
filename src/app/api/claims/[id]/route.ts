import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { toClaimRecord, toMemberProfile } from '@/lib/db/map'
import { reconcile } from '@/lib/domain/reconcile'
import { slaClock } from '@/lib/domain/sla'
import { detectBlocker } from '@/lib/domain/blockers'
import { nextAction } from '@/lib/domain/nextAction'
import { nextRung, draftFor } from '@/lib/domain/escalation'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'

/**
 * Everything the claim screen needs, derived server-side in one request.
 *
 * The stored rows are only raw observations. Every judgement — what is actually
 * true, what is blocking it, how late EPFO is, what to do next — is computed
 * here by the pure domain layer, so the UI renders answers rather than deciding
 * anything itself.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const row = await prisma.claim.findUnique({
    where: { id },
    include: {
      grievances: { orderBy: { filedAt: 'asc' } },
      member: { include: { accounts: true } },
    },
  })

  if (!row) {
    return NextResponse.json({ error: 'No claim with that ID.' }, { status: 404 })
  }

  const profile = toMemberProfile(row.member)
  const claim = toClaimRecord(row)

  // The demo clock, not the real date. A judge moves this from /demo.
  const today = row.simulatedToday

  const truth = reconcile(claim, today)
  const sla = slaClock(claim.filedAt, today)
  const blocker = detectBlocker(profile, claim, truth)

  const rung = nextRung(sla, claim.grievances, today)
  const draft = draftFor(rung, {
    uan: profile.uan,
    claimId: claim.id,
    claimType: claim.type,
    filedAt: claim.filedAt,
    amountPaise: claim.amountPaise,
    daysElapsed: sla.daysElapsed,
    today,
    priorDockets: claim.grievances
      .map((g) => g.docket)
      .filter((d): d is string => typeof d === 'string'),
  })

  const action = nextAction({ truth, blocker, sla, rung, claimId: claim.id })

  const stranded = findStranded(profile, claim.memberId)

  return NextResponse.json({
    claim,
    profile,
    truth,
    sla,
    blocker,
    rung,
    draft,
    action,
    today,
    stranded,
    strandedTotalPaise: strandedTotalPaise(stranded),
  })
}
