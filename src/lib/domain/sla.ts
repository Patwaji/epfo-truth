import type { SlaResult } from './types'

/**
 * EPFO's own stated processing timeline for a claim, in days.
 *
 * This is the number the whole escalation ladder hangs off: a grievance filed
 * before it is breached gets closed with a template reply, and on EPFiGMS that
 * closure can lock the member out of filing another one for 30 days. So the
 * app tells people to wait until this is genuinely exceeded.
 */
export const DEFAULT_SLA_DAYS = 20

const MS_PER_DAY = 86_400_000

/**
 * Parse a "YYYY-MM-DD" date as UTC midnight.
 *
 * Date.parse on a bare date string is already UTC, but being explicit keeps it
 * that way if these ever become full timestamps. Both ends are parsed the same
 * way, so the difference is always whole days and never drifts by one in IST.
 */
function utcMidnight(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
}

/**
 * How long a claim has been pending, and whether EPFO has missed its own
 * deadline.
 *
 * The SLA day itself is not a breach: on day 20 of a 20-day timeline EPFO is
 * still within its stated window. Only day 21 is late.
 */
export function slaClock(
  filedAt: string,
  now: string,
  slaDays: number = DEFAULT_SLA_DAYS,
): SlaResult {
  const elapsed = Math.floor((utcMidnight(now) - utcMidnight(filedAt)) / MS_PER_DAY)

  // Simulated time can be rewound by the demo controls, so clamp rather than
  // reporting a negative age.
  const daysElapsed = Math.max(0, elapsed)

  const breached = daysElapsed > slaDays

  return {
    daysElapsed,
    slaDays,
    breached,
    overdueByDays: breached ? daysElapsed - slaDays : 0,
  }
}
