import type { ClaimRecord, GrievanceRecord, MemberProfile } from '@/lib/domain/types'

// Prisma returns Json columns as `unknown`, and the domain layer is pure and
// knows nothing about the database. These mappers are the single boundary where
// stored rows become domain values, so the casts live in one reviewable place
// instead of being scattered through every route.

type MemberRow = {
  uan: string
  nameOnEpfo: string
  nameOnAadhaar: string
  nameOnBank: string
  dobOnEpfo: string
  dobOnAadhaar: string
  bankNpciVerified: boolean
  chequeUploadLegible: boolean
  epsFlaggedButIneligible: boolean
  otherUans: string[]
  accounts: {
    memberId: string
    employer: string
    joinedOn: string
    exitedOn: string | null
    dateOfExitMarked: boolean
    epfBalancePaise: number
    epsBalancePaise: number
    transferredOut: boolean
  }[]
}

type ClaimRow = {
  id: string
  type: string
  filedAt: string
  amountPaise: number
  memberId: string
  rejectionCode: string | null
  portalHistory: unknown
  passbook: unknown
  bank: unknown
  grievances: {
    channel: string
    filedAt: string
    docket: string | null
    closedAt: string | null
    closureText: string | null
    resolved: boolean
  }[]
}

export function toMemberProfile(row: MemberRow): MemberProfile {
  return {
    uan: row.uan,
    nameOnEpfo: row.nameOnEpfo,
    nameOnAadhaar: row.nameOnAadhaar,
    nameOnBank: row.nameOnBank,
    dobOnEpfo: row.dobOnEpfo,
    dobOnAadhaar: row.dobOnAadhaar,
    bankNpciVerified: row.bankNpciVerified,
    chequeUploadLegible: row.chequeUploadLegible,
    epsFlaggedButIneligible: row.epsFlaggedButIneligible,
    otherUans: row.otherUans,
    accounts: row.accounts.map((a) => ({
      memberId: a.memberId,
      employer: a.employer,
      joinedOn: a.joinedOn,
      exitedOn: a.exitedOn,
      dateOfExitMarked: a.dateOfExitMarked,
      epfBalancePaise: a.epfBalancePaise,
      epsBalancePaise: a.epsBalancePaise,
      transferredOut: a.transferredOut,
    })),
  }
}

export function toClaimRecord(row: ClaimRow): ClaimRecord {
  return {
    id: row.id,
    type: row.type as ClaimRecord['type'],
    filedAt: row.filedAt,
    amountPaise: row.amountPaise,
    memberId: row.memberId,
    portalHistory: (row.portalHistory ?? []) as ClaimRecord['portalHistory'],
    passbook: (row.passbook ?? null) as ClaimRecord['passbook'],
    bank: (row.bank ?? null) as ClaimRecord['bank'],
    rejectionCode: row.rejectionCode,
    grievances: row.grievances.map(
      (g): GrievanceRecord => ({
        channel: g.channel as GrievanceRecord['channel'],
        filedAt: g.filedAt,
        docket: g.docket ?? undefined,
        closedAt: g.closedAt ?? undefined,
        closureText: g.closureText ?? undefined,
        resolved: g.resolved,
      }),
    ),
  }
}
