import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { toMemberProfile } from '@/lib/db/map'
import { preflight } from '@/lib/domain/preflight'

/** Everything EPFO would auto-reject this claim for, checked before filing. */
export async function POST(req: Request) {
  let body: { uan?: unknown; memberId?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with uan and memberId.' }, { status: 400 })
  }

  const uan = typeof body.uan === 'string' ? body.uan : ''
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''

  if (!uan || !memberId) {
    return NextResponse.json({ error: 'uan and memberId are required.' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({ where: { uan }, include: { accounts: true } })

  if (!member) {
    return NextResponse.json({ error: 'No member with that UAN.' }, { status: 404 })
  }

  const issues = preflight(toMemberProfile(member), memberId)

  return NextResponse.json({ issues, canFile: issues.length === 0 })
}
