import { describe, it, expect } from 'vitest'
import { slaClock, DEFAULT_SLA_DAYS } from '@/lib/domain/sla'

describe('slaClock', () => {
  it('defaults to a 20 day EPFO SLA', () => {
    expect(DEFAULT_SLA_DAYS).toBe(20)
  })

  it('is not breached inside the window', () => {
    const r = slaClock('2026-08-01', '2026-08-10')
    expect(r.daysElapsed).toBe(9)
    expect(r.breached).toBe(false)
    expect(r.overdueByDays).toBe(0)
  })

  it('is breached past the window and reports overdue days', () => {
    const r = slaClock('2026-07-03', '2026-08-22')
    expect(r.daysElapsed).toBe(50)
    expect(r.breached).toBe(true)
    expect(r.overdueByDays).toBe(30)
  })

  it('honours a custom SLA', () => {
    const r = slaClock('2026-08-01', '2026-08-10', 5)
    expect(r.breached).toBe(true)
    expect(r.overdueByDays).toBe(4)
  })

  // The day the SLA runs out is not yet a breach. Telling a member EPFO is
  // late one day early would send them to escalate before they have grounds,
  // and a premature grievance gets closed with a template reply.
  it('is not breached on the exact SLA day', () => {
    const r = slaClock('2026-08-01', '2026-08-21')
    expect(r.daysElapsed).toBe(20)
    expect(r.breached).toBe(false)
    expect(r.overdueByDays).toBe(0)
  })

  it('breaches on the day after the SLA day', () => {
    const r = slaClock('2026-08-01', '2026-08-22')
    expect(r.daysElapsed).toBe(21)
    expect(r.breached).toBe(true)
    expect(r.overdueByDays).toBe(1)
  })

  it('reports zero on the day it was filed', () => {
    const r = slaClock('2026-08-22', '2026-08-22')
    expect(r.daysElapsed).toBe(0)
    expect(r.breached).toBe(false)
  })

  // Simulated time can be rewound by the demo controls, and a real clock can
  // disagree with a stored date. Never report a negative age.
  it('never reports negative days when the dates are out of order', () => {
    const r = slaClock('2026-08-22', '2026-08-01')
    expect(r.daysElapsed).toBe(0)
    expect(r.breached).toBe(false)
    expect(r.overdueByDays).toBe(0)
  })

  // India is UTC+5:30. Parsing bare dates must not drift a day either way.
  it('counts whole days across a month boundary regardless of timezone', () => {
    expect(slaClock('2026-06-30', '2026-07-01').daysElapsed).toBe(1)
    expect(slaClock('2026-02-27', '2026-03-01').daysElapsed).toBe(2)
  })
})
