'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Without this a judge signs in as one persona and has no obvious way back.
 * Most people will assume the demo only has one user.
 */
export function SignOut() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    try {
      await fetch('/api/session', { method: 'DELETE' })
      router.push('/')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--ink-2)',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
    >
      {busy ? 'Signing out…' : 'Sign out / switch person'}
    </button>
  )
}
