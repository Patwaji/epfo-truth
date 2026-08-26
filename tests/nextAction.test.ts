import { describe, it, expect } from 'vitest'
import { nextAction } from '@/lib/domain/nextAction'
import type { Blocker, SlaResult, TruthState } from '@/lib/domain/types'

const inTime: SlaResult = { daysElapsed: 5, slaDays: 20, breached: false, overdueByDays: 0 }
const breached: SlaResult = { daysElapsed: 50, slaDays: 20, breached: true, overdueByDays: 30 }

const hold: Blocker = {
  code: 'MIGRATION_HOLD',
  title: 'EPFO has your money and has not released it',
  because: 'It left your PF account and has not reached your bank.',
  fixSteps: ['Do not file a second claim.'],
  whoFixesIt: 'EPFO',
}

const yours: Blocker = {
  code: 'NAME_MISMATCH_AADHAAR',
  title: 'Your name is spelled differently on EPFO and Aadhaar',
  because: 'EPFO rejects automatically when these do not match.',
  fixSteps: ['Correct your name on the member portal.', 'Get employer approval.'],
  whoFixesIt: 'YOU',
}

const theirs: Blocker = {
  code: 'DOE_NOT_MARKED',
  title: 'Your old employer never marked your last working day',
  because: 'EPFO cannot settle until they do.',
  fixSteps: ['Email their HR and ask them to mark your Date of Exit.'],
  whoFixesIt: 'EMPLOYER',
}

const none: Blocker = {
  code: 'NONE',
  title: 'Nothing is blocking this claim',
  because: 'Your money has been credited.',
  fixSteps: [],
  whoFixesIt: 'EPFO',
}

const truth = (code: TruthState['code']): TruthState => ({
  code,
  contradictions: [],
  asOf: '2026-08-26',
})

describe('nextAction', () => {
  it('says nothing is left to do once the money arrives', () => {
    const a = nextAction({
      truth: truth('CREDITED'),
      blocker: none,
      sla: breached,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('CALM')
    expect(a.cta).toBeNull()
  })

  it('tells a rejected member to fix one thing and re-file', () => {
    const a = nextAction({
      truth: truth('REJECTED'),
      blocker: yours,
      sla: breached,
      rung: 'CPGRAMS',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('ACT_NOW')
    expect(a.detail).toBe(yours.title)
    expect(a.cta?.href).toBe('/claim/C1#blocker')
  })

  it('points at the fix when the member can unblock it themselves', () => {
    const a = nextAction({
      truth: truth('NOT_PICKED_UP'),
      blocker: yours,
      sla: inTime,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('ACT_NOW')
    expect(a.detail).toBe(yours.fixSteps[0])
  })

  it('marks an employer problem as blocked on someone else', () => {
    const a = nextAction({
      truth: truth('NOT_PICKED_UP'),
      blocker: theirs,
      sla: inTime,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('BLOCKED_ON_OTHERS')
    expect(a.cta?.href).toBe('/claim/C1#blocker')
  })

  it('counts down the days left while inside the window', () => {
    const a = nextAction({
      truth: truth('IN_REVIEW'),
      blocker: hold,
      sla: inTime,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('CALM')
    expect(a.headline).toContain('15')
    expect(a.cta).toBeNull()
  })

  it('sends the member to escalate once EPFO is overdue', () => {
    const a = nextAction({
      truth: truth('DEBITED_NOT_CREDITED'),
      blocker: hold,
      sla: breached,
      rung: 'CPGRAMS',
      claimId: 'C1',
    })
    expect(a.urgency).toBe('ACT_NOW')
    expect(a.headline).toContain('30')
    expect(a.cta?.href).toBe('/claim/C1#escalate')
  })

  // nextRung also returns WAIT when a grievance is already filed and has not
  // stalled yet. That happens well past the SLA, so a naive "days left"
  // subtraction prints a negative number on the most important screen.
  it('does not print negative days when waiting on a filed grievance', () => {
    const a = nextAction({
      truth: truth('DEBITED_NOT_CREDITED'),
      blocker: hold,
      sla: breached,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.headline).not.toContain('-')
    expect(a.urgency).toBe('CALM')
  })

  // A member fixing their own paperwork should not also be told to escalate.
  // Escalating a claim that is going to be auto-rejected again wastes the one
  // grievance they are allowed to file.
  it('prefers the fix over escalation when both apply', () => {
    const a = nextAction({
      truth: truth('NOT_PICKED_UP'),
      blocker: yours,
      sla: breached,
      rung: 'CPGRAMS',
      claimId: 'C1',
    })
    expect(a.detail).toBe(yours.fixSteps[0])
    expect(a.cta?.href).toBe('/claim/C1#blocker')
  })

  it('always gives a headline and a detail', () => {
    const codes: TruthState['code'][] = [
      'NOT_PICKED_UP',
      'IN_REVIEW',
      'APPROVED_AWAITING_MONEY',
      'DEBITED_NOT_CREDITED',
      'CREDITED',
      'REJECTED',
      'REGRESSED',
    ]
    for (const code of codes) {
      const a = nextAction({
        truth: truth(code),
        blocker: code === 'CREDITED' ? none : hold,
        sla: breached,
        rung: 'CPGRAMS',
        claimId: 'C1',
      })
      expect(a.headline.length).toBeGreaterThan(0)
      expect(a.detail.length).toBeGreaterThan(0)
    }
  })

  it('survives a blocker with no fix steps', () => {
    const bare: Blocker = { ...yours, fixSteps: [] }
    const a = nextAction({
      truth: truth('NOT_PICKED_UP'),
      blocker: bare,
      sla: inTime,
      rung: 'WAIT',
      claimId: 'C1',
    })
    expect(a.detail).toBe(bare.title)
  })
})
