// src/components/BlockerPanel.tsx
'use client'

import type { Blocker } from '@/lib/domain/types'

const ROLE_CONFIG: Record<
  Blocker['whoFixesIt'],
  { label: string; badgeBg: string; badgeColor: string; icon: string }
> = {
  YOU: {
    label: 'Action Required: You',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    icon: '👤',
  },
  EMPLOYER: {
    label: 'Action Required: Employer',
    badgeBg: '#fff7ed',
    badgeColor: '#c2410c',
    icon: '🏢',
  },
  EPFO: {
    label: 'Action Required: EPFO Office',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    icon: '🏛️',
  },
}

export function BlockerPanel({ blocker }: { blocker: Blocker }) {
  if (!blocker || blocker.code === 'NONE') return null

  const role = ROLE_CONFIG[blocker.whoFixesIt] || {
    label: 'Action Required',
    badgeBg: '#f3f4f6',
    badgeColor: '#374151',
    icon: '⚠️',
  }

  return (
    <section
      id="blocker"
      style={{
        marginTop: '2.5rem',
        padding: '1.75rem',
        borderRadius: '16px',
        border: '1px solid var(--line, #e2e8f0)',
        backgroundColor: 'var(--paper, #ffffff)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent Top Border Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: role.badgeColor,
        }}
      />

      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: role.badgeBg,
            color: role.badgeColor,
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          <span>{role.icon}</span>
          <span>{role.label}</span>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: 'var(--ink-soft, #64748b)',
            backgroundColor: '#f8fafc',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
          }}
        >
          CODE: {blocker.code}
        </span>
      </div>

      {/* Title & Description */}
      <div style={{ marginTop: '1.25rem' }}>
        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--ink, #0f172a)',
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {blocker.title}
        </h2>
        <p
          style={{
            marginTop: '0.6rem',
            fontSize: '0.95rem',
            color: 'var(--ink-soft, #475569)',
            lineHeight: 1.6,
            maxWidth: '65ch',
          }}
        >
          {blocker.because}
        </p>
      </div>

      {/* Step-by-Step Resolution Path */}
      {blocker.fixSteps && blocker.fixSteps.length > 0 && (
        <div style={{ marginTop: '1.75rem', borderTop: '1px dashed var(--line, #e2e8f0)', paddingTop: '1.25rem' }}>
          <h4
            style={{
              fontSize: '0.8125rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-soft, #64748b)',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            Recommended Resolution Plan
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {blocker.fixSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--ink, #0f172a)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--ink, #1e293b)',
                    lineHeight: 1.5,
                    paddingTop: '0.1rem',
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}