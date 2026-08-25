import { describe, it, expect } from 'vitest'
import { reconcile } from '@/lib/domain/reconcile'
import type { ClaimRecord } from '@/lib/domain/types'

const base: ClaimRecord = {
  id: 'C1',
  type: 'FORM31',
  filedAt: '2026-07-03',
  amountPaise: 12000000,
  memberId: 'M1',
  portalHistory: [],
  passbook: null,
  bank: null,
  rejectionCode: null,
  grievances: [],
}

describe('reconcile', () => {
  it('reports NOT_PICKED_UP when only submitted', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' }],
    }
    expect(reconcile(c, '2026-08-22').code).toBe('NOT_PICKED_UP')
  })

  it('reports CREDITED when bank has money, whatever the portal says', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' }],
      bank: { observedAt: '2026-07-20', creditedPaise: 12000000 },
    }
    expect(reconcile(c, '2026-08-22').code).toBe('CREDITED')
  })

  it('reports DEBITED_NOT_CREDITED when passbook debited but bank empty', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-15', status: 'SETTLED' }],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-22', creditedPaise: null },
    }
    const t = reconcile(c, '2026-08-22')
    expect(t.code).toBe('DEBITED_NOT_CREDITED')
    expect(t.contradictions.map((x) => x.kind)).toContain('PASSBOOK_AHEAD_OF_BANK')
  })

  it('detects a status that went backwards', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [
        { observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' },
        { observedAt: '2026-07-10', status: 'UNDER_PROCESS' },
        { observedAt: '2026-07-18', status: 'SUBMITTED_AT_PORTAL' },
      ],
    }
    const t = reconcile(c, '2026-08-22')
    expect(t.code).toBe('REGRESSED')
    expect(t.contradictions.map((x) => x.kind)).toContain('STATUS_WENT_BACKWARDS')
  })

  it('reports REJECTED when portal rejected and no money moved', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-11', status: 'REJECTED' }],
      rejectionCode: 'NAME_MISMATCH',
    }
    expect(reconcile(c, '2026-08-22').code).toBe('REJECTED')
  })

  it('flags portal lagging behind passbook', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-03', status: 'UNDER_PROCESS' }],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-22', creditedPaise: null },
    }
    expect(reconcile(c, '2026-08-22').contradictions.map((x) => x.kind)).toContain(
      'PORTAL_BEHIND_PASSBOOK',
    )
  })

  // Money arriving is the one fact no other source can override. Rajesh's claim
  // regressed on the portal AND was debited, but once the bank shows a credit
  // the honest answer is simply that he has his money.
  it('lets a bank credit win over a regression and a debit', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [
        { observedAt: '2026-07-03', status: 'UNDER_PROCESS' },
        { observedAt: '2026-07-18', status: 'SUBMITTED_AT_PORTAL' },
      ],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-01', creditedPaise: 12000000 },
    }
    expect(reconcile(c, '2026-08-22').code).toBe('CREDITED')
  })

  // A rejection is terminal, not a backwards step. Flagging it as a regression
  // would tell the member the system glitched when in fact they must act.
  it('does not treat a rejection as a backwards step', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [
        { observedAt: '2026-06-15', status: 'SUBMITTED_AT_PORTAL' },
        { observedAt: '2026-06-20', status: 'UNDER_PROCESS' },
        { observedAt: '2026-07-11', status: 'REJECTED' },
      ],
      rejectionCode: 'REJ-NAME-MISMATCH-01',
    }
    const t = reconcile(c, '2026-08-22')
    expect(t.code).toBe('REJECTED')
    expect(t.contradictions.map((x) => x.kind)).not.toContain('STATUS_WENT_BACKWARDS')
  })

  it('handles a claim with no readings at all', () => {
    const t = reconcile(base, '2026-08-22')
    expect(t.code).toBe('NOT_PICKED_UP')
    expect(t.contradictions).toEqual([])
    expect(t.asOf).toBe('2026-08-22')
  })

  it('writes contradiction detail a citizen can actually read', () => {
    const c: ClaimRecord = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-15', status: 'SETTLED' }],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-22', creditedPaise: null },
    }
    const gap = reconcile(c, '2026-08-22').contradictions.find(
      (x) => x.kind === 'PASSBOOK_AHEAD_OF_BANK',
    )
    expect(gap?.detail).toContain('1,20,000')
    expect(gap?.detail).toContain('2026-07-19')
  })
})
