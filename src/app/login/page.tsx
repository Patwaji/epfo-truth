'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uanFromLink = searchParams.get('uan') ?? ''

  const [uan, setUan] = useState(uanFromLink)
  const [otp, setOtp] = useState('123456')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uan, otp }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to authenticate UAN session')
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Network error. Unable to verify UAN credentials.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={styles.form}>
      <div style={styles.fieldGroup}>
        <label htmlFor="uan" style={styles.label}>
          Universal Account Number (UAN)
        </label>
        <input
          id="uan"
          value={uan}
          onChange={(e) => setUan(e.target.value)}
          placeholder="e.g. 100000000001"
          required
          inputMode="numeric"
          pattern="[0-9]*"
          style={styles.input}
        />
        <span style={styles.fieldHint}>12-digit national identification code</span>
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="otp" style={styles.label}>
          One-Time Password (OTP)
        </label>
        <input
          id="otp"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          inputMode="numeric"
          style={styles.input}
        />
        <span style={styles.fieldHint}>Pre-filled for hackathon prototype mode</span>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        style={{
          ...styles.submitButton,
          opacity: isLoading ? 0.7 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Verifying Credentials...' : 'Sign In to Portal →'}
      </button>
    </form>
  )
}

export default function Login() {
  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <div style={styles.topBar}>
          <Link href="/" style={styles.backLink}>
            ← Back to Overview
          </Link>
          <span style={styles.securityTag}>🔒 Secure Portal</span>
        </div>

        <h1 style={styles.title}>Member Sign In</h1>
        <p style={styles.subtitle}>
          Synthetic UANs only. The OTP is pre-filled because this is a public service demo.
        </p>

        <Suspense fallback={<div style={styles.loadingFallback}>Loading authentication form...</div>}>
          <LoginForm />
        </Suspense>

        <div style={styles.noticeFooter}>
          <p style={styles.noticeText}>
            Notice: Official EPFO services will never request your passwords or private banking details outside secure Aadhaar-linked OTP channels.
          </p>
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '2.25rem',
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  backLink: {
    fontSize: '0.875rem',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
  },
  securityTag: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#166534',
    backgroundColor: '#f0fdf4',
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    border: '1px solid #bbf7d0',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#64748b',
    marginTop: '0.5rem',
    marginBottom: '1.75rem',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.35rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 0.9rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  fieldHint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.3rem',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 0.9rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  errorIcon: {
    fontSize: '1rem',
  },
  submitButton: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  loadingFallback: {
    padding: '1.5rem',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  noticeFooter: {
    marginTop: '2rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f1f5f9',
  },
  noticeText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    lineHeight: 1.4,
    margin: 0,
  },
}