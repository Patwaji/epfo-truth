import type { Blocker, ClaimRecord, MemberProfile, TruthState } from './types'

const NONE: Blocker = {
  code: 'NONE',
  title: 'Nothing is blocking this claim',
  because: 'Your money has been credited.',
  fixSteps: [],
  whoFixesIt: 'EPFO',
}

/**
 * Compare two names the way EPFO's matching should work rather than the way a
 * naive string compare does. Case and repeated spaces are how the same name
 * gets typed twice, not a real discrepancy: flagging those would send a member
 * into an employer-approval loop to "fix" a name that is already correct.
 */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ')
  return norm(a) === norm(b)
}

/**
 * Work out what is actually stopping this claim, in language a person can act
 * on, and say who has to act.
 *
 * Profile problems are checked before system holds. A profile problem is
 * something the member or their employer can fix today; a hold is something
 * only EPFO can clear. Reporting the hold first would tell someone to sit and
 * wait when their claim is going to be auto-rejected again the moment it is
 * picked up.
 */
export function detectBlocker(
  profile: MemberProfile,
  claim: ClaimRecord,
  truth: TruthState,
): Blocker {
  if (truth.code === 'CREDITED') return NONE

  const account = profile.accounts.find((a) => a.memberId === claim.memberId)

  if (!sameName(profile.nameOnEpfo, profile.nameOnAadhaar)) {
    return {
      code: 'NAME_MISMATCH_AADHAAR',
      title: 'Your name is spelled differently on EPFO and Aadhaar',
      because:
        `EPFO has "${profile.nameOnEpfo}". Aadhaar has "${profile.nameOnAadhaar}". ` +
        'EPFO rejects a claim automatically when these do not match exactly, and it ' +
        'does not tell you that this was the reason.',
      fixSteps: [
        'Open the EPFO member portal and go to Manage, then Modify Basic Details.',
        `Enter your name exactly as it appears on Aadhaar: "${profile.nameOnAadhaar}".`,
        'Submit. Your employer has to approve this change before it reaches EPFO.',
        'Wait for the corrected name to show on your profile, then file the claim again.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (profile.dobOnEpfo !== profile.dobOnAadhaar) {
    return {
      code: 'DOB_MISMATCH',
      title: 'Your date of birth does not match Aadhaar',
      because:
        `EPFO has ${profile.dobOnEpfo}, Aadhaar has ${profile.dobOnAadhaar}. ` +
        'Any difference causes an automatic rejection.',
      fixSteps: [
        'Go to Manage, then Modify Basic Details on the member portal.',
        `Correct the date of birth to ${profile.dobOnAadhaar}.`,
        'Get your employer to approve the change.',
        'File the claim again once the correction is visible.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (account && !account.dateOfExitMarked) {
    return {
      code: 'DOE_NOT_MARKED',
      title: 'Your old employer never marked your last working day',
      because:
        `${account.employer} has not entered a Date of Exit for you. EPFO cannot ` +
        'settle or transfer this account until they do. Nothing on the EPFO portal ' +
        'tells you this is the reason.',
      fixSteps: [
        `Email ${account.employer}'s HR or PF team and ask them to mark your Date of Exit in the EPFO employer portal.`,
        'If they do not respond within 7 days, mark it yourself: member portal, Manage, Mark Exit. This becomes available two months after your last contribution.',
        'Once the exit date appears in your service history, file this claim again.',
      ],
      whoFixesIt: 'EMPLOYER',
    }
  }

  if (!profile.bankNpciVerified) {
    return {
      code: 'BANK_NOT_NPCI_VERIFIED',
      title: 'Your bank account is not verified, so a cheque image is required',
      because:
        'Because your account is not NPCI-verified, EPFO asks for a cancelled cheque. ' +
        'Blurry images, or cheques without your printed name, are rejected ' +
        'automatically by the system with no explanation.',
      fixSteps: [
        'Ask your employer to seed and verify your bank account against your UAN.',
        'If you must upload a cheque, photograph it flat and in daylight so your printed name, account number and IFSC are all readable.',
        'File the claim again once the account shows as verified.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (!profile.chequeUploadLegible) {
    return {
      code: 'CHEQUE_UNREADABLE',
      title: 'The cheque image you uploaded cannot be read',
      because:
        'EPFO rejects unclear scans automatically. You are not told this before ' +
        'you submit, or after.',
      fixSteps: [
        'Retake the photo in daylight, flat, with no shadow across the account number.',
        'Check that your printed name, account number and IFSC are all legible.',
        'Upload the new image and file the claim again.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  // Only transfers break on this. On a withdrawal the EPS flag is not the
  // blocker, and naming it would send the member chasing an ex-employer for
  // nothing.
  if (profile.epsFlaggedButIneligible && claim.type === 'FORM13') {
    return {
      code: 'EPS_INELIGIBLE_FLAG',
      title: 'EPFO thinks you are a pension scheme member when you are not',
      because:
        'Your wages were above the pension scheme ceiling when you joined, so you ' +
        'should never have been enrolled. Your records say otherwise. Transfers then ' +
        'fail with "EPS member not eligible": your PF moves across and your pension ' +
        'balance stays stranded in the old account.',
      fixSteps: [
        'Ask your former employer to file a Joint Declaration correcting your pension scheme membership.',
        'Ask EPFO in writing, not by phone, to confirm the correction has been made. Different offices give different answers, so get it on record.',
        'Check your passbook for an adjustment entry moving the pension balance into your PF.',
        'File the transfer again only after that adjustment appears.',
      ],
      whoFixesIt: 'EMPLOYER',
    }
  }

  if (profile.otherUans.length > 0) {
    return {
      code: 'MULTIPLE_UAN',
      title: 'You have more than one UAN, and your money is split between them',
      because:
        `A second UAN (${profile.otherUans.join(', ')}) was created at some point, ` +
        'usually during a job change. Money held under a different UAN will never ' +
        'appear here and will never transfer on its own.',
      fixSteps: [
        'File a UAN merge request with EPFO quoting both UAN numbers.',
        'Until they are merged, file a separate transfer from the older UAN.',
        'Confirm in the passbook that the balance actually moved before you stop following up.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (truth.code === 'DEBITED_NOT_CREDITED' || truth.code === 'REGRESSED') {
    return {
      code: 'MIGRATION_HOLD',
      title: 'EPFO has your money and has not released it',
      because:
        'The amount has already left your PF account but has not reached your bank. ' +
        'Nothing you submitted is wrong. This is a disbursal hold on EPFO’s side, ' +
        'and it is affecting a large number of claims filed in the same window.',
      fixSteps: [
        'Do not file a second claim. A duplicate can make this worse and is hard to undo.',
        'Your clock has started. Use the escalation ladder below in order, not all at once.',
        'Keep your Claim ID and UAN in every message you send.',
      ],
      whoFixesIt: 'EPFO',
    }
  }

  return {
    code: 'MIGRATION_HOLD',
    title: 'No one at EPFO has picked up your claim yet',
    because:
      'Your claim is sitting in a queue. The portal does not say this. It shows ' +
      'the same status whether someone is working on your file or nobody has ' +
      'opened it.',
    fixSteps: [
      'Wait until EPFO passes its own stated timeline, then escalate using the ladder below.',
      'Do not file a duplicate claim while this one is still open.',
    ],
    whoFixesIt: 'EPFO',
  }
}
