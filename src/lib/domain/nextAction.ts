import type { Blocker, NextAction, Rung, SlaResult, TruthState } from './types'

/**
 * The one instruction shown at the top of every claim screen.
 *
 * EPFO's failure is not a missing status, it is that the status never tells you
 * what to do. So this collapses everything the app knows into a single sentence
 * and at most one link. If a member reads nothing else, they read this.
 *
 * Order matters, and it is deliberate:
 *
 *   1. Money arrived. Nothing else is worth saying.
 *   2. Rejected. They must fix and re-file; escalation cannot help.
 *   3. Something they can fix themselves.
 *   4. Something their employer must fix.
 *   5. Everything else is EPFO's, so it turns on the clock.
 *
 * Fixes outrank escalation on purpose. Escalating a claim that is going to be
 * auto-rejected again spends the one grievance they get and buys nothing.
 */
export function nextAction(input: {
  truth: TruthState
  blocker: Blocker
  sla: SlaResult
  rung: Rung
  claimId: string
}): NextAction {
  const { truth, blocker, sla, rung, claimId } = input

  if (truth.code === 'CREDITED') {
    return {
      headline: 'Your money has arrived',
      detail: 'Nothing left to do. Check your bank statement to confirm the amount.',
      cta: null,
      urgency: 'CALM',
    }
  }

  if (truth.code === 'REJECTED') {
    return {
      headline: 'Fix one thing, then file again',
      detail: blocker.title,
      cta: { label: 'See how to fix it', href: `/claim/${claimId}#blocker` },
      urgency: 'ACT_NOW',
    }
  }

  if (blocker.whoFixesIt === 'YOU') {
    return {
      headline: 'You can unblock this yourself',
      detail: blocker.fixSteps[0] ?? blocker.title,
      cta: { label: 'See the full fix', href: `/claim/${claimId}#blocker` },
      urgency: 'ACT_NOW',
    }
  }

  if (blocker.whoFixesIt === 'EMPLOYER') {
    return {
      headline: 'Your employer has to act',
      detail: blocker.fixSteps[0] ?? blocker.title,
      cta: { label: 'Copy the message to send them', href: `/claim/${claimId}#blocker` },
      urgency: 'BLOCKED_ON_OTHERS',
    }
  }

  if (rung === 'WAIT') {
    // WAIT means two different things: still inside EPFO's window, or a
    // grievance is already filed and has not stalled yet. The second happens
    // long past the SLA, so subtracting days would print a negative countdown
    // on the most important line in the app.
    const daysLeft = sla.slaDays - sla.daysElapsed

    if (daysLeft > 0) {
      return {
        headline: `Wait: ${daysLeft} days left on the clock`,
        detail:
          'Filing a grievance before EPFO passes its own timeline gets a template ' +
          'reply, and that closure can lock you out of filing another one for 30 days.',
        cta: null,
        urgency: 'CALM',
      }
    }

    return {
      headline: 'Waiting on the grievance you already filed',
      detail:
        'Give it a few days before escalating again. Filing on top of an open ' +
        'grievance does not speed it up, and the next step opens on its own once ' +
        'this one stalls.',
      cta: null,
      urgency: 'CALM',
    }
  }

  return {
    headline: `EPFO is ${sla.overdueByDays} days overdue. Escalate now.`,
    detail: `Your next step is ${rung.replace(/_/g, ' ').toLowerCase()}. The letter is already written for you.`,
    cta: { label: 'Open the escalation', href: `/claim/${claimId}#escalate` },
    urgency: 'ACT_NOW',
  }
}
