'use client'

import { useEffect, useState } from 'react'

type Choice = 'system' | 'light' | 'dark'

const NEXT: Record<Choice, Choice> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<Choice, string> = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' }

/**
 * Theme control.
 *
 * Three states, not two: most people never touch this and should keep whatever
 * their device already decided, so "system" is the default and is offered as a
 * way back rather than being lost the moment someone clicks once.
 *
 * Deliberately a labelled text button. A sliding sun-and-moon pill is the stock
 * component every generated site ships, and it does not say which state you are
 * in without decoding an icon.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme') as Choice | null
    if (saved === 'light' || saved === 'dark') {
      setChoice(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  function cycle() {
    const next = NEXT[choice]
    setChoice(next)
    try {
      if (next === 'system') {
        localStorage.removeItem('theme')
        document.documentElement.removeAttribute('data-theme')
      } else {
        localStorage.setItem('theme', next)
        document.documentElement.setAttribute('data-theme', next)
      }
    } catch {
      // Private browsing can refuse storage. The attribute still applies for
      // this page view, which is the part the reader can see.
    }
  }

  // Render the same markup on the server and on the first client paint, so the
  // label never flickers from a stored value hydrating late.
  const label = mounted ? LABEL[choice] : LABEL.system

  return (
    <button
      onClick={cycle}
      type="button"
      aria-label={`${label}. Activate to change.`}
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--ink-2)',
        padding: '0.35rem 0.7rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
