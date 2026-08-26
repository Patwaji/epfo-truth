import { describe, it, expect } from 'vitest'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'
import type { MemberProfile } from '@/lib/domain/types'

const profile: MemberProfile = {
  uan: '100000000001',
  nameOnEpfo: 'A',
  nameOnAadhaar: 'A',
  nameOnBank: 'A',
  dobOnEpfo: '1994-02-11',
  dobOnAadhaar: '1994-02-11',
  bankNpciVerified: true,
  chequeUploadLegible: true,
  epsFlaggedButIneligible: false,
  otherUans: [],
  accounts: [
    {
      memberId: 'M_CURRENT',
      employer: 'Now Corp',
      joinedOn: '2026-06-01',
      exitedOn: null,
      dateOfExitMarked: false,
      epfBalancePaise: 10000000,
      epsBalancePaise: 0,
      transferredOut: false,
    },
    {
      memberId: 'M_OLD_1',
      employer: 'Old Systems',
      joinedOn: '2021-04-01',
      exitedOn: '2023-03-31',
      dateOfExitMarked: true,
      epfBalancePaise: 28000000,
      epsBalancePaise: 500000,
      transferredOut: false,
    },
    {
      memberId: 'M_OLD_2',
      employer: 'Older Ltd',
      joinedOn: '2019-01-01',
      exitedOn: '2021-03-31',
      dateOfExitMarked: true,
      epfBalancePaise: 9000000,
      epsBalancePaise: 0,
      transferredOut: true,
    },
  ],
}

describe('findStranded', () => {
  it('finds old accounts with money that was never transferred', () => {
    const s = findStranded(profile, 'M_CURRENT')
    expect(s.map((a) => a.memberId)).toEqual(['M_OLD_1'])
  })

  it('totals EPF and EPS together', () => {
    expect(strandedTotalPaise(findStranded(profile, 'M_CURRENT'))).toBe(28500000)
  })

  it('returns nothing when everything was transferred', () => {
    const p = {
      ...profile,
      accounts: profile.accounts.map((a) => ({ ...a, transferredOut: true })),
    }
    expect(findStranded(p, 'M_CURRENT')).toEqual([])
  })

  // An emptied old account is not stranded money, it is a closed account.
  // Listing it would tell someone to chase a transfer worth nothing.
  it('ignores old accounts with a zero balance', () => {
    const p = {
      ...profile,
      accounts: [
        profile.accounts[0],
        { ...profile.accounts[1], epfBalancePaise: 0, epsBalancePaise: 0 },
      ],
    }
    expect(findStranded(p, 'M_CURRENT')).toEqual([])
  })

  // A stranded account holding only a pension balance is the Imran case: the
  // PF moved across on transfer and the EPS balance was left behind.
  it('counts an account holding only an EPS balance', () => {
    const p = {
      ...profile,
      accounts: [
        profile.accounts[0],
        { ...profile.accounts[1], epfBalancePaise: 0, epsBalancePaise: 500000 },
      ],
    }
    const s = findStranded(p, 'M_CURRENT')
    expect(s).toHaveLength(1)
    expect(strandedTotalPaise(s)).toBe(500000)
  })

  it('never reports the current account as stranded', () => {
    const s = findStranded(profile, 'M_CURRENT')
    expect(s.map((a) => a.memberId)).not.toContain('M_CURRENT')
  })

  it('totals to zero for an empty list', () => {
    expect(strandedTotalPaise([])).toBe(0)
  })

  // Sorting oldest first matches how someone reads their own job history, and
  // keeps the demo output stable rather than depending on row order.
  it('returns the oldest employment first', () => {
    const p = {
      ...profile,
      accounts: [
        profile.accounts[0],
        profile.accounts[1],
        { ...profile.accounts[2], transferredOut: false },
      ],
    }
    expect(findStranded(p, 'M_CURRENT').map((a) => a.memberId)).toEqual(['M_OLD_2', 'M_OLD_1'])
  })
})
