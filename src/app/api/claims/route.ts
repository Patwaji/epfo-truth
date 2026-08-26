import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { toMemberProfile } from '@/lib/db/map'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'

/** Every claim for the signed-in demo member, plus any money left behind in old accounts. */
export async function GET() {
  const uan = (await cookies()).get('uan')?.value

  if (!uan) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const member = await prisma.member.findUnique({
    where: { uan },
    include: { claims: { orderBy: { filedAt: 'desc' } }, accounts: true },
  })

  if (!member) {
    return NextResponse.json({ error: 'Session points at an unknown member.' }, { status: 404 })
  }

  const profile = toMemberProfile(member)

  // The account a live claim is filed against is the one being worked on; any
  // other account still holding money is money the member does not know about.
  const currentMemberId = member.claims[0]?.memberId ?? ''
  const stranded = findStranded(profile, currentMemberId)

  return NextResponse.json({
    profile,
    claims: member.claims.map((c) => ({
      id: c.id,
      type: c.type,
      filedAt: c.filedAt,
      amountPaise: c.amountPaise,
      memberId: c.memberId,
    })),
    stranded,
    strandedTotalPaise: strandedTotalPaise(stranded),
  })
}
