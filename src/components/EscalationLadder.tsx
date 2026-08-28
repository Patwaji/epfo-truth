// src/components/EscalationLadder.tsx
'use client'

import { useState } from 'react'
import type { Draft, GrievanceRecord, Rung } from '@/lib/domain/types'

const ORDER: Rung[] = [
  'EPFIGMS',
  'CPGRAMS',
  'REGIONAL_EMAIL',
  'CPGRAMS_APPEAL',
  'DPG',
  'RTI',
]

const LABEL: Record<Rung, string> = {
  WAIT: 'Wait',
  EPFIGMS: 'EPFiGMS Grievance Portal',
  CPGRAMS: 'CPGRAMS Central Portal',
  REGIONAL_EMAIL: 'Regional PF Commissioner Email',
  CPGRAMS_APPEAL: 'CPGRAMS Formal Appeal',
  DPG: 'Directorate of Public Grievances',
  RTI: 'RTI Application to CPIO',
}

const RUNG_DESCRIPTIONS: Record<Rung, string> = {
  WAIT: 'Awaiting initial processing timeline.',
  EPFIGMS: 'First official level of escalation via the EPFO portal.',
  CPGRAMS: 'Centralized Public Grievance Redressal and Monitoring System.',
  REGIONAL_EMAIL: 'Direct escalation to the Regional Provident Fund Commissioner.',
  CPGRAMS_APPEAL: 'Escalation to appellate authority if initial response is evasive.',
  DPG: 'Cabinet Secretariat intervention for unresolved systemic delays.',
  RTI: 'Legal request under Right to Information Act for file movement tracking.',
}

export function EscalationLadder({
  claimId,
  rung,
  draft,
  history = [],
}: {
  claimId: string
  rung: Rung
  draft?: Draft
  history?: GrievanceRecord[]
}) {
  const [filed, setFiled] = useState<GrievanceRecord[]>(history || [])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const done = new Set(filed.map((f) => f.channel))

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  async function fileGrievance() {
    setBusy(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, channel: rung }),
      })

      if (!res.ok) {
        throw new Error('Failed to record grievance filing')
      }

      const json = await res.json()
      if (json?.grievance) {
        setFiled((prev) => [...prev, json.grievance])
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error executing action')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="escalate"
      style={{
        marginTop: '3.5rem',
        padding: '2rem',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--line, #e2e8f0)',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🚀</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink, #0f172a)', margin: 0 }}>
            Public Escalation Protocol
          </h2>
        </div>
        <p style={{ color: 'var(--ink-soft, #64748b)', fontSize: '0.925rem', marginTop: '0.4rem', maxWidth: '65ch', lineHeight: 1.5 }}>
          This unaligned escalation pathway leverages statutory administrative oversight channels to force official resolution.
        </p>
      </div>

      {/* Timeline Stepper */}
      <div style={{ position: 'relative', paddingLeft: '1rem' }}>
        {ORDER.map((r, index) => {
          const isDone = done.has(r)
          const isNow = r === rung
          const rec = filed.find((f) => f.channel === r)
          const isLast = index === ORDER.length - 1

          return (
            <div
              key={r}
              style={{
                position: 'relative',
                paddingLeft: '2.25rem',
                paddingBottom: isLast ? '0' : '2rem',
                borderLeft: isLast ? '2px solid transparent' : isDone ? '2px solid #10b981' : '2px solid #e2e8f0',
                transition: 'border-color 0.3s ease',
              }}
            >
              {/* Stepper Circle Indicator */}
              <div
                style={{
                  position: 'absolute',
                  left: '-0.65rem',
                  top: '0',
                  width: '1.25rem',
                  height: '1.25rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: isDone ? '#10b981' : isNow ? '#2563eb' : '#f1f5f9',
                  color: isDone || isNow ? '#ffffff' : '#94a3b8',
                  border: isNow ? '3px solid #bfdbfe' : '2px solid #ffffff',
                  boxShadow: isNow ? '0 0 0 4px rgba(37, 99, 235, 0.15)' : 'none',
                }}
              >
                {isDone ? '✓' : index + 1}
              </div>

              {/* Step Main Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: isNow ? '#1e40af' : isDone ? '#065f46' : 'var(--ink, #334155)',
                    }}
                  >
                    {LABEL[r]}
                  </span>

                  {isNow && (
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>
                      ACTIVE STEP
                    </span>
                  )}

                  {isDone && (
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
                      FILED
                    </span>
                  )}

                  {rec?.docket && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      Ref: {rec.docket}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.2rem', margin: 0 }}>
                  {RUNG_DESCRIPTIONS[r]}
                </p>

                {rec?.closureText && (
                  <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: '#fff7ed', borderLeft: '3px solid #f97316' }}>
                    <p style={{ fontSize: '0.825rem', color: '#9a3412', margin: 0 }}>
                      <strong>Closure Note:</strong> “{rec.closureText}” — Unresolved response triggered next escalation level.
                    </p>
                  </div>
                )}

                {/* Active Action Builder Panel */}
                {isNow && draft && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                      Recipient Channel: <span style={{ color: '#0f172a' }}>{draft.where}</span>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                      Subject: {draft.subject}
                    </div>

                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '0.825rem',
                        padding: '1rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        color: '#1e293b',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        margin: 0,
                      }}
                    >
                      {draft.body}
                    </pre>

                    {errorMessage && (
                      <p style={{ color: '#dc2626', fontSize: '0.825rem', marginTop: '0.5rem' }}>
                        {errorMessage}
                      </p>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(draft.body)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? '✓ Letter Copied!' : '📋 Copy Official Draft'}
                      </button>

                      <button
                        type="button"
                        onClick={fileGrievance}
                        disabled={busy}
                        style={{
                          padding: '0.5rem 1.25rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          opacity: busy ? 0.7 : 1,
                        }}
                      >
                        {busy ? 'Recording Filing...' : 'Mark as Filed (Simulate)'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}