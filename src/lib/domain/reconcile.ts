import type { ClaimRecord, Contradiction, PortalStatus, TruthState } from './types'

/**
 * How far along the portal claims to be. Used only to detect regression, so
 * REJECTED sits at the top alongside SETTLED: it is terminal, not a step back.
 */
const RANK: Record<PortalStatus, number> = {
  SUBMITTED_AT_PORTAL: 1,
  UNDER_PROCESS: 2,
  APPROVED: 3,
  SETTLED: 4,
  REJECTED: 4,
}

/**
 * True when the portal has ever shown a status less advanced than one it showed
 * before. Rejections are skipped: reaching a rejection is an outcome, not a
 * glitch, and calling it a system fault would tell the member to wait when they
 * actually need to fix something and re-file.
 */
function wentBackwards(history: readonly ClaimRecord['portalHistory'][number][]): boolean {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].status
    const curr = history[i].status
    if (prev === 'REJECTED' || curr === 'REJECTED') continue
    if (RANK[curr] < RANK[prev]) return true
  }
  return false
}

function rupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN')
}

/**
 * Turn three disagreeing systems of record into one honest state.
 *
 * EPFO tracks a claim in the member portal, the passbook and (eventually) the
 * member's bank account. These routinely contradict each other and the member
 * is never shown them side by side. This is the whole product: pick the answer
 * that is actually true, and say out loud where the sources disagree.
 */
export function reconcile(claim: ClaimRecord, asOf: string): TruthState {
  const contradictions: Contradiction[] = []
  const history = claim.portalHistory
  const latest = history.length > 0 ? history[history.length - 1].status : null

  const debited = claim.passbook?.debitedPaise ?? null
  const credited = claim.bank?.creditedPaise ?? null
  const regressed = wentBackwards(history)

  if (debited !== null && credited === null) {
    contradictions.push({
      kind: 'PASSBOOK_AHEAD_OF_BANK',
      detail:
        `Your passbook shows ₹${rupees(debited)} was taken out on ` +
        `${claim.passbook!.observedAt}, but your bank has received nothing.`,
    })
  }

  if (
    claim.passbook?.settledShown &&
    latest !== null &&
    latest !== 'REJECTED' &&
    RANK[latest] < RANK.SETTLED
  ) {
    contradictions.push({
      kind: 'PORTAL_BEHIND_PASSBOOK',
      detail:
        `Your passbook says settled, but the member portal still says ` +
        `${latest.replace(/_/g, ' ').toLowerCase()}.`,
    })
  }

  if (regressed) {
    contradictions.push({
      kind: 'STATUS_WENT_BACKWARDS',
      detail:
        'Your claim status moved backwards. This is an EPFO system fault, ' +
        'not something you did.',
    })
  }

  // Order matters. Money in the bank is the one fact no other source can
  // override, so it is checked first; a portal that still says "under process"
  // after the money landed is simply wrong.
  let code: TruthState['code']
  if (credited !== null) code = 'CREDITED'
  else if (debited !== null) code = 'DEBITED_NOT_CREDITED'
  else if (latest === 'REJECTED') code = 'REJECTED'
  else if (regressed) code = 'REGRESSED'
  else if (latest === 'APPROVED' || latest === 'SETTLED') code = 'APPROVED_AWAITING_MONEY'
  else if (latest === 'UNDER_PROCESS') code = 'IN_REVIEW'
  else code = 'NOT_PICKED_UP'

  return { code, contradictions, asOf }
}
