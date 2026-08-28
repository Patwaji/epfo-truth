import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'

/**
 * The demo is a public URL, and these endpoints write state that every later
 * visitor sees. Without a gate one bored passer-by can advance a claim by ten
 * years or credit every persona, and the next judge opens the link to a demo
 * with no story left in it.
 *
 * Signing in as any demo persona is enough. This is not real authorisation and
 * is not modelling any, it just means a drive-by request cannot mutate shared
 * state.
 */
export async function requireDemoSession(): Promise<string | null> {
  const uan = (await cookies()).get('uan')?.value
  if (!uan) return null
  const member = await prisma.member.findUnique({ where: { uan }, select: { uan: true } })
  return member?.uan ?? null
}
