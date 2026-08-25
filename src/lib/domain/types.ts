export type TruthStateCode =
  | 'NOT_PICKED_UP'
  | 'IN_REVIEW'
  | 'APPROVED_AWAITING_MONEY'
  | 'DEBITED_NOT_CREDITED'
  | 'CREDITED'
  | 'REJECTED'
  | 'REGRESSED'

export interface Contradiction {
  kind: string
  detail: string
}

export interface TruthState {
  code: TruthStateCode
  contradictions: Contradiction[]
}

export interface SlaResult {
  slaDays: number
  daysElapsed: number
  breached: boolean
  overdueByDays: number
}

export interface NextAction {
  headline: string
  detail: string
  cta?: {
    label: string
    href: string
  }
}

export interface PortalHistoryItem {
  status: string
  observedAt: string
}

export interface PassbookRecord {
  debitedPaise: number | null
  observedAt: string
}

export interface BankRecord {
  creditedPaise: number | null
  observedAt: string
}

export interface ClaimRecord {
  portalHistory: PortalHistoryItem[]
  passbook: PassbookRecord | null
  bank: BankRecord | null
}