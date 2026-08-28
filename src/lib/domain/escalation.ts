import type { ClaimType, Draft, GrievanceRecord, Rung, SlaResult } from './types'

/**
 * The escalation ladder.
 *
 * None of this sequence is published by EPFO. It was reconstructed from people
 * on public forums who spent months working it out: EPFiGMS replies with a
 * template, CPGRAMS actually moves because regional offices are rated on it
 * centrally, a direct email to the regional office keeps the file visible, the
 * CPGRAMS appeal reaches a supervisory officer instead of the same desk, the
 * DPG outranks all of it, and an RTI has a statutory 30-day clock that tends to
 * settle claims before the reply is even due.
 *
 * Encoding that sequence, with the letter already written, is the product.
 */

export interface DraftContext {
  uan: string
  claimId: string
  claimType: ClaimType
  filedAt: string
  amountPaise: number
  daysElapsed: number
  /** The simulated date, so drafts never quote the real wall clock. */
  today: string
  priorDockets: string[]
  /** True when the claim was rejected, which changes what waiting means. */
  rejected?: boolean
}

const MS_PER_DAY = 86_400_000

/** How long each rung gets before it counts as stalled and the next one opens. */
const STALL_DAYS: Partial<Record<Rung, number>> = {
  EPFIGMS: 5,
  CPGRAMS: 7,
  CPGRAMS_APPEAL: 7,
  DPG: 7,
}

function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY,
  )
}

function find(history: GrievanceRecord[], rung: Rung): GrievanceRecord | undefined {
  return history.find((g) => g.channel === rung)
}

/**
 * A rung is spent when it was closed without resolving anything, or when it has
 * been sitting open longer than that channel is given. Both mean the next rung
 * has been earned.
 */
function stalled(g: GrievanceRecord, rung: Rung, today: string): boolean {
  if (g.resolved) return false
  if (g.closedAt) return true
  return daysBetween(g.filedAt, today) >= (STALL_DAYS[rung] ?? 7)
}

/**
 * Which step the member has actually earned the right to take today.
 *
 * Returns WAIT when escalating now would backfire: inside EPFO's own window a
 * grievance gets a template reply, and on EPFiGMS that closure can lock the
 * member out of filing another one for thirty days.
 */
export function nextRung(
  sla: SlaResult,
  history: GrievanceRecord[],
  today: string,
  opts: { rejected?: boolean } = {},
): Rung {
  // A rejected claim is not pending, it is finished. Escalating it spends the
  // one grievance the member gets, gets closed the same day, and leaves the
  // thing that actually blocked them unfixed. They have to correct it and file
  // again; no rung on this ladder can help.
  if (opts.rejected) return 'WAIT'

  // Something in the chain worked. Do not keep climbing.
  if (history.some((g) => g.resolved)) return 'WAIT'

  if (!sla.breached && history.length === 0) return 'WAIT'

  const epfigms = find(history, 'EPFIGMS')
  if (!epfigms) return 'EPFIGMS'
  if (!stalled(epfigms, 'EPFIGMS', today)) return 'WAIT'

  const cpgrams = find(history, 'CPGRAMS')
  if (!cpgrams) return 'CPGRAMS'
  if (!stalled(cpgrams, 'CPGRAMS', today)) return 'WAIT'

  if (!find(history, 'REGIONAL_EMAIL')) return 'REGIONAL_EMAIL'

  const appeal = find(history, 'CPGRAMS_APPEAL')
  if (!appeal) return 'CPGRAMS_APPEAL'
  if (!stalled(appeal, 'CPGRAMS_APPEAL', today)) return 'WAIT'

  const dpg = find(history, 'DPG')
  if (!dpg) return 'DPG'
  if (!stalled(dpg, 'DPG', today)) return 'WAIT'

  // RTI is the top of the ladder. Once it is filed there is nowhere further to
  // send someone, so stop rather than looping.
  if (find(history, 'RTI')) return 'WAIT'

  return 'RTI'
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

const CLAIM_NAME: Record<ClaimType, string> = {
  FORM19: 'Form 19 (final PF settlement)',
  FORM31: 'Form 31 (PF advance)',
  FORM10C: 'Form 10C (pension withdrawal)',
  FORM13: 'Form 13 (PF transfer)',
}

/**
 * The letter for a given rung, already filled in.
 *
 * Every draft carries the claim ID, UAN, amount, filing date, elapsed days and
 * every prior docket number, because those are the facts an officer needs to
 * find the file, and the member should never have to assemble them again.
 */
export function draftFor(rung: Rung, ctx: DraftContext): Draft {
  const facts =
    `UAN: ${ctx.uan}\n` +
    `Claim ID: ${ctx.claimId}\n` +
    `Claim type: ${CLAIM_NAME[ctx.claimType]}\n` +
    `Amount: ${rupees(ctx.amountPaise)}\n` +
    `Date filed: ${ctx.filedAt}\n` +
    `Days elapsed: ${ctx.daysElapsed}`

  const dockets =
    ctx.priorDockets.length > 0
      ? `\n\nPrevious grievance references: ${ctx.priorDockets.join(', ')}`
      : ''

  switch (rung) {
    case 'WAIT':
      if (ctx.rejected) {
        return {
          channel: 'WAIT',
          where: 'Escalation will not help this claim',
          subject: '',
          body:
            'This claim was rejected, so it is no longer pending and there is ' +
            'nothing for a grievance to chase. Filing one now will be closed the ' +
            'same day and may stop you raising a fresh grievance for 30 days.\n\n' +
            'Fix the problem named above, then file it again. Escalation only ' +
            'applies to a claim that EPFO is sitting on.',
        }
      }
      return {
        channel: 'WAIT',
        where: 'No action needed yet',
        subject: '',
        body:
          'Your claim is still inside the stated processing window, or a grievance ' +
          'you already filed is still live. Filing another one now will be closed ' +
          'with a template reply, and on EPFiGMS that closure can stop you raising ' +
          'a fresh grievance for 30 days. The next step opens on its own.',
      }

    case 'EPFIGMS':
      return {
        channel: 'EPFIGMS',
        where: 'EPFiGMS at epfigms.gov.in',
        subject: `Claim ${ctx.claimId} pending beyond the stated timeline`,
        body:
          `My provident fund claim has not been settled within the stated timeline.\n\n${facts}\n\n` +
          'Request: please confirm the current stage of this claim and the specific ' +
          'reason for the delay. Please do not close this grievance without stating ' +
          'that reason.\n\n' +
          'File this to get a grievance number on record. It will most likely come ' +
          'back with a template reply, and that closure is what earns you the next step.',
      }

    case 'CPGRAMS':
      return {
        channel: 'CPGRAMS',
        where:
          'CPGRAMS at pgportal.gov.in (Ministry of Labour and Employment → Labour and Employment → EPFO)',
        subject: `Delay in settlement of claim ${ctx.claimId}: ${ctx.daysElapsed} days pending`,
        body:
          `My provident fund claim has been pending for ${ctx.daysElapsed} days, well ` +
          `beyond the stated processing timeline.\n\n${facts}${dockets}\n\n` +
          'My grievance on EPFiGMS was closed without addressing the issue I raised.\n\n' +
          'Request: (1) the current stage of this claim, (2) the specific reason for ' +
          'the delay, and (3) a date by which it will be settled.\n\n' +
          'CPGRAMS is monitored centrally and regional offices are rated on how they ' +
          'resolve it, which is why this step moves files that EPFiGMS does not.',
      }

    case 'REGIONAL_EMAIL':
      return {
        channel: 'REGIONAL_EMAIL',
        where: 'Direct email to your Regional PF Office, copying acc.csd@epfindia.gov.in',
        subject: `Claim ${ctx.claimId} pending ${ctx.daysElapsed} days: request for current status`,
        body:
          `Respected Sir/Madam,\n\n${facts}${dockets}\n\n` +
          'This claim has been pending well past the stated timeline and my grievances ' +
          'have not been substantively addressed. I request the current stage of the ' +
          'file and an expected settlement date.\n\n' +
          'I will follow up on this thread once a day until I receive a reply that ' +
          'states the stage of the claim.\n\nRegards',
      }

    case 'CPGRAMS_APPEAL':
      return {
        channel: 'CPGRAMS_APPEAL',
        where: 'CPGRAMS at pgportal.gov.in, then View Grievance Status, then Appeal',
        subject: `Appeal against the disposal of my grievance on claim ${ctx.claimId}`,
        body:
          'I am appealing the disposal of my grievance because the reply did not ' +
          `address the issue I raised, and my claim remains unsettled.\n\n${facts}${dockets}\n\n` +
          'The closure text did not state the stage of the claim or a reason for the ' +
          'delay. Request: reopen this grievance and provide a substantive reply.\n\n' +
          'Most people never find this appeal option. It routes the case to a ' +
          'supervisory officer instead of back to the desk that closed it.',
      }

    case 'DPG':
      return {
        channel: 'DPG',
        where: 'Directorate of Public Grievances at dpg.gov.in',
        subject: `Unresolved provident fund claim ${ctx.claimId} after the full grievance cycle`,
        body:
          'I have exhausted the EPFO and CPGRAMS grievance channels without ' +
          `resolution.\n\n${facts}${dockets}\n\n` +
          'Request: intervention to secure settlement of this claim.\n\n' +
          'After filing, reply on your existing email thread with the Regional Office ' +
          'quoting the DPG docket number. Officers clear DPG-flagged cases to avoid ' +
          'adverse marks in their own audit.',
      }

    case 'RTI':
      return {
        channel: 'RTI',
        where:
          'RTI Online at rtionline.gov.in (Public Authority: EPFO, addressed to the CPIO of your Regional Office)',
        subject: `Information request regarding claim ${ctx.claimId}`,
        body:
          "To the CPIO, Employees' Provident Fund Organisation.\n\n" +
          'Under the Right to Information Act, 2005, I request the following ' +
          `information.\n\n${facts}${dockets}\n\n` +
          `1. The current stage of claim ${ctx.claimId}, filed on ${ctx.filedAt} under UAN ${ctx.uan}.\n` +
          '2. The date this claim was assigned to a dealing officer, and the designation of that officer.\n' +
          '3. The specific reason for the delay beyond the stated processing timeline.\n' +
          '4. Copies of the file notings on this claim.\n' +
          '5. The number of claims filed in the same period at this office that remain unsettled.\n\n' +
          'An RTI must be answered within 30 days. In practice, claims are often ' +
          'settled before the reply falls due.',
      }
  }
}
