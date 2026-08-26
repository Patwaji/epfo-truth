import type { MemberProfile, PreflightIssue } from './types'

/**
 * Same normalisation the blocker engine uses. Case and repeated spaces are how
 * one name gets typed twice, not a discrepancy worth an employer-approval loop.
 */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ')
  return norm(a) === norm(b)
}

/**
 * Everything EPFO will silently auto-reject this claim for, found before the
 * member files it.
 *
 * EPFO checks all of this after submission and then returns a code with no
 * explanation, so people file, wait weeks, get rejected, and re-file with the
 * same mistake. Running the same checks up front turns a multi-week loop into
 * a fix they can do today.
 *
 * Returns every problem at once rather than stopping at the first, because a
 * member who fixes one thing and re-files only to hit the next one has learned
 * nothing about the queue they are in.
 */
export function preflight(profile: MemberProfile, memberId: string): PreflightIssue[] {
  const issues: PreflightIssue[] = []
  const account = profile.accounts.find((a) => a.memberId === memberId)

  if (!sameName(profile.nameOnEpfo, profile.nameOnAadhaar)) {
    issues.push({
      field: 'name',
      problem: `EPFO has "${profile.nameOnEpfo}", Aadhaar has "${profile.nameOnAadhaar}".`,
      fix:
        'Correct your name on the member portal under Manage, then Modify Basic ' +
        'Details, and get your employer to approve it before you file.',
      willRejectClaim: true,
    })
  }

  if (profile.dobOnEpfo !== profile.dobOnAadhaar) {
    issues.push({
      field: 'dob',
      problem: `EPFO has ${profile.dobOnEpfo}, Aadhaar has ${profile.dobOnAadhaar}.`,
      fix:
        'Correct the date of birth on the member portal and get your employer to ' +
        'approve it before you file.',
      willRejectClaim: true,
    })
  }

  if (!profile.bankNpciVerified) {
    issues.push({
      field: 'bank',
      problem:
        'Your bank account is not verified, so EPFO will require a cancelled ' +
        'cheque image and check it automatically.',
      fix:
        'Get your account seeded and verified against your UAN, or upload a flat, ' +
        'well-lit cheque showing your printed name, account number and IFSC.',
      willRejectClaim: true,
    })
  }

  // Only a finished job needs an exit date. Someone still employed has none,
  // and demanding one would flag every current account as broken.
  if (account && account.exitedOn !== null && !account.dateOfExitMarked) {
    issues.push({
      field: 'dateOfExit',
      problem: `${account.employer} has not marked your Date of Exit.`,
      fix:
        'Ask your employer to mark it, or mark it yourself under Manage, then ' +
        'Mark Exit, two months after your last contribution.',
      willRejectClaim: true,
    })
  }

  return issues
}
