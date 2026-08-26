import { describe, it, expect } from 'vitest'
import { preflight } from '@/lib/domain/preflight'
import type { MemberProfile } from '@/lib/domain/types'

const clean: MemberProfile = {
  uan: '100000000001',
  nameOnEpfo: 'RAJESH KUMAR',
  nameOnAadhaar: 'RAJESH KUMAR',
  nameOnBank: 'RAJESH KUMAR',
  dobOnEpfo: '1994-02-11',
  dobOnAadhaar: '1994-02-11',
  bankNpciVerified: true,
  chequeUploadLegible: true,
  epsFlaggedButIneligible: false,
  otherUans: [],
  accounts: [
    {
      memberId: 'M1',
      employer: 'Acme Softworks',
      joinedOn: '2021-04-01',
      exitedOn: '2026-05-31',
      dateOfExitMarked: true,
      epfBalancePaise: 50000000,
      epsBalancePaise: 0,
      transferredOut: false,
    },
  ],
}

describe('preflight', () => {
  it('passes a clean profile', () => {
    expect(preflight(clean, 'M1')).toEqual([])
  })

  it('catches a name mismatch as claim-rejecting', () => {
    const issues = preflight({ ...clean, nameOnAadhaar: 'RAJESH KUMAAR' }, 'M1')
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('name')
    expect(issues[0].willRejectClaim).toBe(true)
  })

  it('catches an unmarked date of exit', () => {
    const p = {
      ...clean,
      accounts: [{ ...clean.accounts[0], dateOfExitMarked: false }],
    }
    expect(preflight(p, 'M1').some((i) => i.field === 'dateOfExit')).toBe(true)
  })

  it('catches an unverified bank account', () => {
    expect(preflight({ ...clean, bankNpciVerified: false }, 'M1').some((i) => i.field === 'bank')).toBe(
      true,
    )
  })

  it('reports several problems at once', () => {
    const p = {
      ...clean,
      nameOnAadhaar: 'X',
      bankNpciVerified: false,
      dobOnAadhaar: '1994-02-12',
    }
    expect(preflight(p, 'M1').length).toBe(3)
  })

  // Same normalisation rule as the blocker engine. Telling someone to "fix" a
  // name that already matches sends them into a pointless employer-approval loop.
  it('does not flag names differing only by case or spacing', () => {
    expect(preflight({ ...clean, nameOnAadhaar: '  rajesh   kumar ' }, 'M1')).toEqual([])
  })

  // A member still working somewhere has no exit date yet, and that is correct.
  // Only a closed employment with an unmarked exit blocks a claim.
  it('does not demand an exit date for a current job', () => {
    const p = {
      ...clean,
      accounts: [{ ...clean.accounts[0], exitedOn: null, dateOfExitMarked: false }],
    }
    expect(preflight(p, 'M1').some((i) => i.field === 'dateOfExit')).toBe(false)
  })

  it('gives every issue a problem and a fix in plain language', () => {
    const p = {
      ...clean,
      nameOnAadhaar: 'X',
      bankNpciVerified: false,
      dobOnAadhaar: '1994-02-12',
      accounts: [{ ...clean.accounts[0], dateOfExitMarked: false }],
    }
    const issues = preflight(p, 'M1')
    expect(issues.length).toBe(4)
    for (const i of issues) {
      expect(i.problem.length).toBeGreaterThan(0)
      expect(i.fix.length).toBeGreaterThan(0)
      expect(i.field).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/)
    }
  })

  it('does not crash when the member id matches no account', () => {
    expect(() => preflight(clean, 'NOPE')).not.toThrow()
    expect(preflight(clean, 'NOPE')).toEqual([])
  })
})
