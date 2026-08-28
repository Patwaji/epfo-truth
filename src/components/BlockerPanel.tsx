'use client'

import { UserIcon, HomeIcon, WalletIcon, TriangleAlertIcon } from '@/components/icons'
// src/components/BlockerPanel.tsx

import type { Blocker } from '@/lib/domain/types'

const ROLE_CONFIG: Record<
  Blocker['whoFixesIt'],
  { label: string; badgeBg: string; badgeColor: string; icon: React.ComponentType<{ size?: number }> }
> = {
  YOU: {
    label: 'Action Required: You',
    badgeBg: 'var(--green-soft)',
    badgeColor: 'var(--green)',
    icon: UserIcon,
  },
  EMPLOYER: {
    label: 'Action Required: Employer',
    badgeBg: 'var(--amber-soft)',
    badgeColor: 'var(--amber)',
    icon: HomeIcon,
  },
  EPFO: {
    label: 'Action Required: EPFO Office',
    badgeBg: 'var(--crit-soft)',
    badgeColor: 'var(--crit)',
    icon: WalletIcon,
  },
}

export function BlockerPanel({ blocker }: { blocker: Blocker }) {
  if (!blocker || blocker.code === 'NONE') return null

  const role = ROLE_CONFIG[blocker.whoFixesIt] || {
    label: 'Action Required',
    badgeBg: 'var(--paper)',
    badgeColor: 'var(--ink-2)',
    icon: TriangleAlertIcon,
  }

  return (
    <section
      id="blocker"
      style={{
        marginTop: '2.5rem',
        padding: '1.75rem',
        borderRadius: '16px',
        border: '1px solid var(--line, var(--line))',
        backgroundColor: 'var(--paper, var(--paper-raised))',
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
          <span aria-hidden="true">{(() => { const Icon = role.icon; return <Icon size={16} /> })()}</span>
          <span>{role.label}</span>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: 'var(--ink-soft, var(--ink-3))',
            backgroundColor: 'var(--paper)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid var(--line)',
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
            color: 'var(--ink, var(--ink))',
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
            color: 'var(--ink-soft, var(--ink-2))',
            lineHeight: 1.6,
            maxWidth: '65ch',
          }}
        >
          {blocker.because}
        </p>
      </div>

      {/* Step-by-Step Resolution Path */}
      {blocker.fixSteps && blocker.fixSteps.length > 0 && (
        <div style={{ marginTop: '1.75rem', borderTop: '1px dashed var(--line, var(--line))', paddingTop: '1.25rem' }}>
          <h4
            style={{
              fontSize: '0.8125rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--ink-soft, var(--ink-3))',
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
                  backgroundColor: 'var(--paper)',
                  border: '1px solid var(--paper)',
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
                    backgroundColor: 'var(--ink, var(--ink))',
                    color: 'var(--paper-raised)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--ink, var(--ink))',
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