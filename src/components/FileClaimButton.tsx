'use client'

import { useState } from 'react'
import { CheckedIcon } from '@/components/icons'

/**
 * The confirm step on the pre-flight screen.
 *
 * Nothing is submitted anywhere: there is no EPFO API to file against, and the
 * brief forbids touching a live government system. So this states plainly what
 * it did and did not do, rather than pretending to submit or, worse, sitting
 * there doing nothing when clicked.
 */
export function FileClaimButton({ canFile }: { canFile: boolean }) {
  const [filed, setFiled] = useState(false)

  if (!canFile) {
    return (
      <button disabled style={{ ...base, borderColor: 'var(--line)', color: 'var(--ink-3)', cursor: 'not-allowed' }}>
        Blocked until the above is fixed
      </button>
    )
  }

  if (filed) {
    return (
      <p
        role="status"
        style={{
          margin: '1rem 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--green)',
          fontWeight: 600,
        }}
      >
        <CheckedIcon size={16} />
        Checks passed. This is where the claim would be submitted.
      </p>
    )
  }

  return (
    <button
      onClick={() => setFiled(true)}
      style={{ ...base, borderColor: 'var(--green)', color: 'var(--green)' }}
    >
      File this claim (simulated)
    </button>
  )
}

const base: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.6rem 1.1rem',
  border: '1px solid',
  background: 'transparent',
  fontWeight: 600,
  cursor: 'pointer',
}
