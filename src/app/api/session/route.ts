import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

// Demo sign-in only. There is no password, no real OTP and no account system:
// the UANs are fictional and the OTP is fixed so a judge can get in without
// being handed credentials. Never model a real auth flow on this.
const DEMO_OTP = '123456'

export async function POST(req: Request) {
  let body: { uan?: unknown; otp?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with uan and otp.' }, { status: 400 })
  }

  const uan = typeof body.uan === 'string' ? body.uan.trim() : ''
  const otp = typeof body.otp === 'string' ? body.otp.trim() : ''

  if (!uan || !otp) {
    return NextResponse.json({ error: 'Enter your UAN and the OTP.' }, { status: 400 })
  }

  if (otp !== DEMO_OTP) {
    return NextResponse.json(
      { error: `Wrong OTP. For this demo the OTP is always ${DEMO_OTP}.` },
      { status: 401 },
    )
  }

  const member = await prisma.member.findUnique({ where: { uan } })

  if (!member) {
    return NextResponse.json(
      { error: 'No demo member with that UAN. Pick one from the home page.' },
      { status: 404 },
    )
  }

  const res = NextResponse.json({ ok: true, uan: member.uan, name: member.nameOnEpfo })

  res.cookies.set('uan', member.uan, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24,
  })

  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('uan')
  return res
}
