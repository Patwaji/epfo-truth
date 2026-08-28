import { prisma } from '@/lib/db/client'
import { toClaimRecord, toMemberProfile } from '@/lib/db/map'
import { reconcile } from '@/lib/domain/reconcile'
import { slaClock } from '@/lib/domain/sla'
import { detectBlocker } from '@/lib/domain/blockers'
import { nextRung, draftFor } from '@/lib/domain/escalation'
import { nextAction } from '@/lib/domain/nextAction'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'

/**
 * Everything the claim screen needs, derived in one pass.
 *
 * Shared by the API route and the page itself. The page used to fetch its own
 * API over HTTP, which on serverless meant a second cold start and a full
 * network round trip for data the same process could already read. Calling
 * this directly removes that hop.
 */
export async function getClaimView(id: string) {
  const row = await prisma.claim.findUnique({
    where: { id },
    include: {
      grievances: { orderBy: { filedAt: 'asc' } },
      member: { include: { accounts: true } },
    },
  })

  if (!row) return null

  const profile = toMemberProfile(row.member)
  const claim = toClaimRecord(row)

  // The demo clock, not the real date. A judge moves this from /demo.
  const today = row.simulatedToday

  const truth = reconcile(claim, today)
  const sla = slaClock(claim.filedAt, today)
  const blocker = detectBlocker(profile, claim, truth)

  const rejected = truth.code === 'REJECTED'
  const rung = nextRung(sla, claim.grievances, today, { rejected })
  const draft = draftFor(rung, {
    uan: profile.uan,
    claimId: claim.id,
    claimType: claim.type,
    filedAt: claim.filedAt,
    amountPaise: claim.amountPaise,
    daysElapsed: sla.daysElapsed,
    today,
    rejected,
    priorDockets: claim.grievances
      .map((g) => g.docket)
      .filter((d): d is string => typeof d === 'string'),
  })

  const action = nextAction({ truth, blocker, sla, rung, claimId: claim.id })
  const stranded = findStranded(profile, claim.memberId)

  return {
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
  }
}
