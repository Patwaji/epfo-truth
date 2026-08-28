import { describe, it, expect } from 'vitest'
import { nextRung, draftFor } from '@/lib/domain/escalation'
import type { DraftContext } from '@/lib/domain/escalation'
import type { GrievanceRecord, SlaResult } from '@/lib/domain/types'

const inTime: SlaResult = { daysElapsed: 5, slaDays: 20, breached: false, overdueByDays: 0 }
const breached: SlaResult = { daysElapsed: 50, slaDays: 20, breached: true, overdueByDays: 30 }

const ctx: DraftContext = {
  uan: '100000000001',
  claimId: 'CLM-2026-070301',
  claimType: 'FORM31',
  filedAt: '2026-07-03',
  amountPaise: 12000000,
  daysElapsed: 50,
  today: '2026-08-22',
  priorDockets: [],
}

// Closed on the day it was filed, with a template reply. This is the shape
// almost every EPFiGMS grievance comes back in.
const closedUnresolved = (channel: GrievanceRecord['channel'], filedAt: string): GrievanceRecord => ({
  channel,
  filedAt,
  docket: `${channel}/1`,
  closedAt: filedAt,
  closureText: 'Claim under process, please wait for a few days.',
  resolved: false,
})

const openSince = (channel: GrievanceRecord['channel'], filedAt: string): GrievanceRecord => ({
  channel,
  filedAt,
  docket: `${channel}/1`,
  resolved: false,
})

describe('nextRung', () => {
  it('says wait while inside the SLA', () => {
    expect(nextRung(inTime, [], ctx.today)).toBe('WAIT')
  })

  it('unlocks EPFiGMS once the SLA is breached', () => {
    expect(nextRung(breached, [], ctx.today)).toBe('EPFIGMS')
  })

  it('moves to CPGRAMS when EPFiGMS was closed without resolving', () => {
    const h = [closedUnresolved('EPFIGMS', '2026-07-25')]
    expect(nextRung(breached, h, ctx.today)).toBe('CPGRAMS')
  })

  it('waits while EPFiGMS is still open and recent', () => {
    const h = [openSince('EPFIGMS', '2026-08-20')]
    expect(nextRung(breached, h, '2026-08-22')).toBe('WAIT')
  })

  it('moves on when EPFiGMS has sat open past its own window', () => {
    const h = [openSince('EPFIGMS', '2026-07-25')]
    expect(nextRung(breached, h, '2026-08-22')).toBe('CPGRAMS')
  })

  it('moves to the regional email after CPGRAMS stalls', () => {
    const h = [
      closedUnresolved('EPFIGMS', '2026-07-25'),
      closedUnresolved('CPGRAMS', '2026-07-26'),
    ]
    expect(nextRung(breached, h, '2026-08-22')).toBe('REGIONAL_EMAIL')
  })

  it('ends at RTI when everything else has been tried', () => {
    const h = [
      closedUnresolved('EPFIGMS', '2026-07-25'),
      closedUnresolved('CPGRAMS', '2026-07-26'),
      openSince('REGIONAL_EMAIL', '2026-08-03'),
      closedUnresolved('CPGRAMS_APPEAL', '2026-08-04'),
      closedUnresolved('DPG', '2026-08-11'),
    ]
    expect(nextRung(breached, h, '2026-08-22')).toBe('RTI')
  })

  // A resolved grievance means the claim moved. Continuing to climb would send
  // someone to the DPG over a problem that no longer exists.
  it('stops climbing once a grievance actually resolved it', () => {
    const h: GrievanceRecord[] = [
      { channel: 'EPFIGMS', filedAt: '2026-07-25', docket: 'E/1', resolved: true },
    ]
    expect(nextRung(breached, h, '2026-08-22')).toBe('WAIT')
  })

  // The whole ladder is exhausted. There is no rung above RTI, and pretending
  // otherwise would loop the member forever.
  it('stays at RTI once RTI has been filed', () => {
    const h = [
      closedUnresolved('EPFIGMS', '2026-07-25'),
      closedUnresolved('CPGRAMS', '2026-07-26'),
      openSince('REGIONAL_EMAIL', '2026-08-03'),
      closedUnresolved('CPGRAMS_APPEAL', '2026-08-04'),
      closedUnresolved('DPG', '2026-08-11'),
      openSince('RTI', '2026-08-20'),
    ]
    expect(nextRung(breached, h, '2026-08-22')).toBe('WAIT')
  })
})

describe('draftFor', () => {
  it('writes a CPGRAMS grievance naming the right ministry path', () => {
    const d = draftFor('CPGRAMS', ctx)
    expect(d.where).toContain('pgportal.gov.in')
    expect(d.where).toContain('Labour')
    expect(d.body).toContain('100000000001')
    expect(d.body).toContain('CLM-2026-070301')
    expect(d.body).toContain('50')
  })

  it('quotes prior dockets in a DPG escalation', () => {
    const d = draftFor('DPG', { ...ctx, priorDockets: ['MOLBR/E/2026/0012345'] })
    expect(d.body).toContain('MOLBR/E/2026/0012345')
    expect(d.where).toContain('dpg.gov.in')
  })

  it('writes an RTI addressed to the CPIO', () => {
    const d = draftFor('RTI', ctx)
    expect(d.body).toContain('CPIO')
    expect(d.body).toContain('Right to Information')
    expect(d.where).toContain('rtionline.gov.in')
  })

  it('gives every rung a where, a subject and a body', () => {
    const rungs = ['EPFIGMS', 'CPGRAMS', 'REGIONAL_EMAIL', 'CPGRAMS_APPEAL', 'DPG', 'RTI'] as const
    for (const r of rungs) {
      const d = draftFor(r, ctx)
      expect(d.channel).toBe(r)
      expect(d.where.length).toBeGreaterThan(0)
      expect(d.subject.length).toBeGreaterThan(0)
      expect(d.body.length).toBeGreaterThan(40)
      // The member pastes this into a government form. No template holes.
      expect(d.body).not.toMatch(/\[|\bTODO\b|undefined|NaN/)
    }
  })

  it('explains why waiting is the right move, rather than leaving it blank', () => {
    const d = draftFor('WAIT', ctx)
    expect(d.subject).toBe('')
    expect(d.body.length).toBeGreaterThan(40)
    expect(d.body.toLowerCase()).toContain('30 days')
  })

  it('names the amount in rupees, not paise', () => {
    expect(draftFor('CPGRAMS', ctx).body).toContain('1,20,000')
  })

  it('spells out the claim type rather than leaking a form code', () => {
    expect(draftFor('CPGRAMS', ctx).body).toContain('Form 31')
  })
})
