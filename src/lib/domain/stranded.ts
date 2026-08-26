import type { MemberAccount, MemberProfile } from './types'

/**
 * Old PF accounts still holding money that was never transferred across.
 *
 * PF does not follow you when you change jobs. The new employer opens a fresh
 * account under the same UAN and the old balance simply stays where it is until
 * the member files a transfer themselves. EPFO never tells anyone this, and the
 * old account is only visible if you go looking through your service history,
 * which almost nobody does.
 *
 * Sorted oldest employment first, which is the order someone reads their own
 * job history in, and keeps output stable rather than depending on row order.
 */
export function findStranded(profile: MemberProfile, currentMemberId: string): MemberAccount[] {
  return profile.accounts
    .filter(
      (a) =>
        a.memberId !== currentMemberId &&
        !a.transferredOut &&
        // An emptied account is closed, not stranded. Listing it would send
        // someone chasing a transfer worth nothing.
        a.epfBalancePaise + a.epsBalancePaise > 0,
    )
    .sort((a, b) => a.joinedOn.localeCompare(b.joinedOn))
}

/** Total held across stranded accounts, PF and pension together, in paise. */
export function strandedTotalPaise(accounts: MemberAccount[]): number {
  return accounts.reduce((sum, a) => sum + a.epfBalancePaise + a.epsBalancePaise, 0)
}
