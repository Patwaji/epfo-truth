import { NextResponse } from 'next/server'
import { getClaimView } from '@/lib/claimView'

/**
 * Everything the claim screen needs, derived server-side in one request.
 *
 * The stored rows are only raw observations. Every judgement — what is actually
 * true, what is blocking it, how late EPFO is, what to do next — is computed by
 * the pure domain layer in getClaimView, so this route is only transport.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = await getClaimView(id)

  if (!view) {
    return NextResponse.json({ error: 'No claim with that ID.' }, { status: 404 })
  }

  return NextResponse.json(view)
}
