import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { toMemberProfile } from '@/lib/db/map'
import { preflight } from '@/lib/domain/preflight'
import { FileClaimButton } from '@/components/FileClaimButton'

/**
 * Check a claim before EPFO does.
 *
 * EPFO runs these same checks after you submit, then returns a code with no
 * explanation weeks later. People re-file with the same mistake and wait
 * again. Running the checks up front turns a three-week loop into something
 * fixable today, and shows every problem at once rather than one per attempt.
 *
 * Reads the database directly. A server component calling its own HTTP API is
 * an extra hop that can only fail.
 */
export default async function FilePage() {
  const uan = (await cookies()).get('uan')?.value
  if (!uan) redirect('/login')

  const member = await prisma.member.findUnique({
    where: { uan },
    include: { accounts: true },
  })
  if (!member) redirect('/login')

  const profile = toMemberProfile(member)

  // Check against the account the member would actually claim from: their most
  // recent employment.
  const account =
    [...profile.accounts].sort((a, b) => b.joinedOn.localeCompare(a.joinedOn))[0]

  const issues = account ? preflight(profile, account.memberId) : []
  const canFile = issues.length === 0

  return (
    <main className="page">
      <p className="kicker">Before you file</p>
      <h1 style={{ marginTop: '0.6rem' }}>
        {canFile ? 'Nothing here will be rejected' : `${issues.length} thing${issues.length > 1 ? 's' : ''} will get this rejected`}
      </h1>

      <p style={{ color: 'var(--ink-2)', marginTop: '1rem' }}>
        {canFile
          ? 'We checked your details against the rules EPFO applies automatically. Nothing on your profile will trigger a rejection.'
          : 'EPFO runs these checks after you submit, then rejects the claim with a code and no explanation. Here they are first, so you can fix them today instead of finding out in three weeks.'}
      </p>

      {account && (
        <p style={{ color: 'var(--ink-3)', fontSize: '0.9rem' }}>
          Checking against <strong style={{ color: 'var(--ink-2)' }}>{account.employer}</strong>
          {' · '}
          <span className="num">{account.memberId}</span>
        </p>
      )}

      {!canFile && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '2rem 0 0', display: 'grid', gap: '1rem' }}>
          {issues.map((issue, i) => (
            <li
              key={issue.field}
              style={{
                border: '1px solid var(--line)',
                borderLeft: '3px solid var(--crit)',
                background: 'var(--paper-raised)',
                padding: '1.25rem 1.4rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.74rem',
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--crit)',
                }}
              >
                {i + 1}. EPFO will reject this automatically
              </p>

              <p style={{ margin: '0.5rem 0 0', fontWeight: 600, fontSize: '1.05rem' }}>
                {issue.problem}
              </p>

              <p style={{ margin: '0.6rem 0 0', color: 'var(--ink-2)' }}>
                <strong style={{ color: 'var(--ink)' }}>Fix: </strong>
                {issue.fix}
              </p>
            </li>
          ))}
        </ol>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1.25rem 1.4rem',
          border: '1px solid var(--line)',
          background: canFile ? 'var(--green-soft)' : 'transparent',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          {canFile ? 'This claim is ready to file.' : 'Filing now would waste three weeks.'}
        </p>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--ink-2)', fontSize: '0.95rem' }}>
          {canFile
            ? 'Every check EPFO runs automatically has passed, so nothing on your profile will trigger a rejection.'
            : 'Fix the items above first. Each one is checked by EPFO the moment you submit, and any single failure rejects the whole claim with no reason given.'}
        </p>

        <FileClaimButton canFile={canFile} />
      </div>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/dashboard">Back to your claims</Link>
      </p>
    </main>
  )
}
