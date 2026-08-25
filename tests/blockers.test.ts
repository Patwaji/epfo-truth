import { describe, it, expect } from 'vitest'
import { detectBlocker } from '@/lib/domain/blockers'
import type { ClaimRecord, MemberProfile, TruthState } from '@/lib/domain/types'

const profile: MemberProfile = {
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

const claim: ClaimRecord = {
  id: 'C1',
  type: 'FORM31',
  filedAt: '2026-07-03',
  amountPaise: 12000000,
  memberId: 'M1',
  portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' }],
  passbook: null,
  bank: null,
  rejectionCode: null,
  grievances: [],
}

const stuck: TruthState = { code: 'NOT_PICKED_UP', contradictions: [], asOf: '2026-08-22' }

describe('detectBlocker', () => {
  it('names the name mismatch and says who fixes it', () => {
    const p = { ...profile, nameOnAadhaar: 'RAJESH KUMAAR' }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('NAME_MISMATCH_AADHAAR')
    expect(b.whoFixesIt).toBe('YOU')
    expect(b.fixSteps.length).toBeGreaterThan(0)
  })

  it('catches an unmarked date of exit and blames the employer', () => {
    const p = {
      ...profile,
      accounts: [{ ...profile.accounts[0], dateOfExitMarked: false }],
    }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('DOE_NOT_MARKED')
    expect(b.whoFixesIt).toBe('EMPLOYER')
  })

  it('identifies a disbursal hold when money left the passbook but not the bank', () => {
    const truth: TruthState = {
      code: 'DEBITED_NOT_CREDITED',
      contradictions: [],
      asOf: '2026-08-22',
    }
    const b = detectBlocker(profile, claim, truth)
    expect(b.code).toBe('MIGRATION_HOLD')
    expect(b.whoFixesIt).toBe('EPFO')
  })

  it('catches an unverified bank account', () => {
    const p = { ...profile, bankNpciVerified: false }
    expect(detectBlocker(p, claim, stuck).code).toBe('BANK_NOT_NPCI_VERIFIED')
  })

  it('catches the EPS ineligible flag on a transfer', () => {
    const p = { ...profile, epsFlaggedButIneligible: true }
    const transfer: ClaimRecord = { ...claim, type: 'FORM13' }
    expect(detectBlocker(p, transfer, stuck).code).toBe('EPS_INELIGIBLE_FLAG')
  })

  it('returns NONE when the money has arrived', () => {
    const truth: TruthState = { code: 'CREDITED', contradictions: [], asOf: '2026-08-22' }
    expect(detectBlocker(profile, claim, truth).code).toBe('NONE')
  })

  it('catches a date of birth mismatch', () => {
    const p = { ...profile, dobOnAadhaar: '1994-02-12' }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('DOB_MISMATCH')
    expect(b.whoFixesIt).toBe('YOU')
  })

  it('catches an unreadable cheque upload', () => {
    const p = { ...profile, chequeUploadLegible: false }
    expect(detectBlocker(p, claim, stuck).code).toBe('CHEQUE_UNREADABLE')
  })

  it('catches a second UAN holding money', () => {
    const p = { ...profile, otherUans: ['100000000009'] }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('MULTIPLE_UAN')
    expect(b.because).toContain('100000000009')
  })

  // Name comparison must be forgiving about how the data was typed, or we tell
  // people to "fix" a name that is already correct and send them into a
  // pointless employer-approval loop.
  it('does not flag names that differ only by case or spacing', () => {
    const p = { ...profile, nameOnAadhaar: '  rajesh   kumar ' }
    expect(detectBlocker(p, claim, stuck).code).not.toBe('NAME_MISMATCH_AADHAAR')
  })

  // The EPS flag only breaks transfers. On a withdrawal it is not the blocker,
  // and naming it would send the member chasing their ex-employer for nothing.
  it('ignores the EPS flag on a withdrawal claim', () => {
    const p = { ...profile, epsFlaggedButIneligible: true }
    expect(detectBlocker(p, claim, stuck).code).not.toBe('EPS_INELIGIBLE_FLAG')
  })

  // A rejected claim with a real profile problem must name that problem, not
  // the generic hold, because the member has to fix something and re-file.
  it('names the profile problem on a rejected claim, not the hold', () => {
    const p = { ...profile, nameOnAadhaar: 'RAJESH KUMAAR' }
    const rejected: TruthState = { code: 'REJECTED', contradictions: [], asOf: '2026-08-22' }
    expect(detectBlocker(p, claim, rejected).code).toBe('NAME_MISMATCH_AADHAAR')
  })

  it('always gives a fix path and a plain-language title for every blocker', () => {
    const cases: MemberProfile[] = [
      { ...profile, nameOnAadhaar: 'X Y' },
      { ...profile, dobOnAadhaar: '1990-01-01' },
      { ...profile, bankNpciVerified: false },
      { ...profile, chequeUploadLegible: false },
      { ...profile, otherUans: ['100000000009'] },
      { ...profile, accounts: [{ ...profile.accounts[0], dateOfExitMarked: false }] },
    ]
    for (const p of cases) {
      const b = detectBlocker(p, claim, stuck)
      expect(b.title.length).toBeGreaterThan(0)
      expect(b.because.length).toBeGreaterThan(0)
      expect(b.fixSteps.length).toBeGreaterThan(0)
      // No rejection codes or SCREAMING_SNAKE leaking into what a member reads.
      expect(b.title).not.toMatch(/[A-Z]{3,}_[A-Z]{3,}/)
    }
  })

  it('still reports a blocker when the claim has no matching account row', () => {
    const orphan: ClaimRecord = { ...claim, memberId: 'UNKNOWN' }
    const b = detectBlocker(profile, orphan, stuck)
    expect(b.code).not.toBe('NONE')
    expect(b.fixSteps.length).toBeGreaterThan(0)
  })
})
