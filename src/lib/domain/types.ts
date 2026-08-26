// Shared domain types. Everything else imports from here so the backend and the
// UI can be built against the same shapes without waiting on each other.
//
// Money is always paise (integers). Never floats for currency.
// Dates are always ISO date strings, "YYYY-MM-DD".

export type ClaimType = 'FORM19' | 'FORM31' | 'FORM10C' | 'FORM13'

/** The exact status strings the EPFO member portal shows a member. */
export type PortalStatus =
  | 'SUBMITTED_AT_PORTAL'
  | 'UNDER_PROCESS'
  | 'APPROVED'
  | 'SETTLED'
  | 'REJECTED'

// --- The three systems of record, each reporting in its own vocabulary ---

export interface PortalReading {
  observedAt: string
  status: PortalStatus
}

export interface PassbookReading {
  observedAt: string
  settledShown: boolean
  /** null means the passbook has not shown any debit for this claim. */
  debitedPaise: number | null
}

export interface BankReading {
  observedAt: string
  /** null means nothing has arrived in the member's bank account. */
  creditedPaise: number | null
}

// --- The reconciled answer ---

export type TruthCode =
  | 'NOT_PICKED_UP'
  | 'IN_REVIEW'
  | 'APPROVED_AWAITING_MONEY'
  | 'DEBITED_NOT_CREDITED'
  | 'CREDITED'
  | 'REJECTED'
  | 'REGRESSED'

export type ContradictionKind =
  | 'PASSBOOK_AHEAD_OF_BANK'
  | 'PORTAL_BEHIND_PASSBOOK'
  | 'STATUS_WENT_BACKWARDS'

export interface Contradiction {
  kind: ContradictionKind
  /** A sentence a citizen can read. Shown directly in the UI. */
  detail: string
}

/** Alias kept so components written against `TruthStateCode` keep compiling. */
export type TruthStateCode = TruthCode

export interface TruthState {
  code: TruthCode
  contradictions: Contradiction[]
  asOf: string
}

// --- The clock ---

export interface SlaResult {
  daysElapsed: number
  slaDays: number
  breached: boolean
  overdueByDays: number
}

// --- Why it is stuck ---

export type BlockerCode =
  | 'MIGRATION_HOLD'
  | 'DOE_NOT_MARKED'
  | 'NAME_MISMATCH_AADHAAR'
  | 'DOB_MISMATCH'
  | 'BANK_NOT_NPCI_VERIFIED'
  | 'CHEQUE_UNREADABLE'
  | 'EPS_INELIGIBLE_FLAG'
  | 'MULTIPLE_UAN'
  | 'EMPLOYER_ATTESTATION_PENDING'
  | 'NONE'

export interface Blocker {
  code: BlockerCode
  /** Plain language, no jargon, no rejection codes. */
  title: string
  /** Why this happened, and why EPFO never told them. */
  because: string
  /** Exact actions, in order. */
  fixSteps: string[]
  whoFixesIt: 'YOU' | 'EMPLOYER' | 'EPFO'
}

// --- The escalation ladder ---

export type Rung =
  | 'WAIT'
  | 'EPFIGMS'
  | 'CPGRAMS'
  | 'REGIONAL_EMAIL'
  | 'CPGRAMS_APPEAL'
  | 'DPG'
  | 'RTI'

export interface GrievanceRecord {
  channel: Rung
  filedAt: string
  docket?: string
  closedAt?: string
  /** The template text they closed it with, quoted back to the member. */
  closureText?: string
  resolved: boolean
}

export interface Draft {
  channel: Rung
  /** Portal name plus URL, so the member knows where this goes. */
  where: string
  subject: string
  body: string
}

// --- The member and their money ---

export interface MemberAccount {
  /** EPFO member ID, e.g. "MH/BAN/0012345/000/0001234". */
  memberId: string
  employer: string
  joinedOn: string
  exitedOn: string | null
  /** When false, the employer never marked the exit and claims silently block. */
  dateOfExitMarked: boolean
  epfBalancePaise: number
  epsBalancePaise: number
  transferredOut: boolean
}

export interface MemberProfile {
  uan: string
  nameOnEpfo: string
  nameOnAadhaar: string
  nameOnBank: string
  dobOnEpfo: string
  dobOnAadhaar: string
  bankNpciVerified: boolean
  chequeUploadLegible: boolean
  /** Wages were above the EPS ceiling, but EPFO records say they are a member. */
  epsFlaggedButIneligible: boolean
  /** Extra UANs created during job changes. Money under these is invisible. */
  otherUans: string[]
  accounts: MemberAccount[]
}

export interface ClaimRecord {
  id: string
  type: ClaimType
  filedAt: string
  amountPaise: number
  memberId: string
  /** Every status the portal has shown, oldest first. Regression is detectable. */
  portalHistory: PortalReading[]
  passbook: PassbookReading | null
  bank: BankReading | null
  rejectionCode: string | null
  grievances: GrievanceRecord[]
}

// --- What to do right now ---

export interface NextAction {
  headline: string
  detail: string
  cta?: { label: string; href: string } | null
  urgency: 'CALM' | 'ACT_NOW' | 'BLOCKED_ON_OTHERS'
}

export interface PreflightIssue {
  field: string
  problem: string
  fix: string
  /** True when EPFO will auto-reject on this, so we block filing. */
  willRejectClaim: boolean
}
