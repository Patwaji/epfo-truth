# EPFO Truth Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A citizen-side EPFO prototype that tells the truth about where your PF money actually is, why it is stuck, exactly what to do next, and escalates for you on a visible clock.

**Architecture:** Single Next.js app. All EPFO behaviour is simulated by a seeded Postgres database plus a pure-TypeScript domain layer that reconciles three disagreeing "systems of record" (member portal, passbook, bank) into one honest state. No real government system is touched. Demo controls let a judge advance simulated time and watch the escalation ladder fire.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Prisma + Postgres (Neon free tier) · Tailwind v4 · Vitest · Vercel

## Global Constraints

- Submission deadline: **28 Aug 2026, 8:00 PM IST**. Round 2 (polish) is 7 Sep 2026.
- Must open in a browser. No mobile app. Live public URL required.
- **Login credentials must be provided to judges.** Citizen side only — no admin UI is graded.
- All data mock/synthetic. **Never** use a real UAN, Aadhaar, PAN, bank account, OTP or name.
- Every feature demoed must actually work. If it is not working by 27 Aug, cut it.
- Footer on every page: `Independent hackathon prototype. Not affiliated with EPFO or the Government of India. All data is synthetic.`
- No EPFO/Government logos anywhere.
- Must be usable on a phone at 3G speed. Test with DevTools throttling before submitting.
- Domain layer (`src/lib/domain/*`) is pure functions — no DB imports, no React. This is what makes it testable and is 70% of the backend work.

**Team split** (from chat): Bahni = research + frontend + 30% backend. Suryansh = 70% backend.
- **B** = Bahni. **S** = Suryansh. Marked per task.
- Task 1 is shared setup. Tasks 2-9, 14 and 16 (domain, API, deploy) are S. Tasks 10-13 and 15 (UI) are B. Tasks 17-18 shared.

---

## File Structure

```
src/
  app/
    layout.tsx                     root shell, fonts, footer disclaimer
    page.tsx                       landing: the problem, demo logins
    login/page.tsx                 UAN + mock OTP
    dashboard/page.tsx             all claims + stranded money
    claim/[id]/page.tsx            truth card, timeline, blocker, SLA, escalation
    file/page.tsx                  pre-flight validator + guided filing
    transfer/page.tsx              stranded money finder
    demo/page.tsx                  judge controls: advance time, simulate EPFO
    api/
      session/route.ts             POST login, DELETE logout
      claims/route.ts              GET list for session
      claims/[id]/route.ts         GET one claim + derived truth
      claims/[id]/simulate/route.ts POST advance simulated days / force events
      grievances/route.ts          POST file a grievance at a rung
      preflight/route.ts           POST validate a draft claim
  lib/
    domain/
      types.ts                     all shared types
      reconcile.ts                 3 sources -> one TruthState
      sla.ts                       clock + breach
      blockers.ts                  why is it stuck, in plain language
      escalation.ts                next rung + drafted text
      preflight.ts                 catch rejection causes before filing
      stranded.ts                  find money in old member IDs
      nextAction.ts                combine everything into ONE instruction
    db/
      client.ts                    prisma singleton
      seed.ts                      3 demo personas
    i18n/strings.ts                en + hi
  components/
    TruthCard.tsx  SourceDiff.tsx  ClaimTimeline.tsx  SlaClock.tsx
    BlockerPanel.tsx  EscalationLadder.tsx  StrandedMoney.tsx
    PreflightForm.tsx  LangToggle.tsx  ReadAloud.tsx
tests/
  reconcile.test.ts  sla.test.ts  blockers.test.ts
  escalation.test.ts  preflight.test.ts  stranded.test.ts
prisma/schema.prisma
```

---

## The product in one paragraph (use this for the 250-word summary)

EPFO shows you a status that is not true. The member portal, the passbook and your bank account disagree, and none of them tell you why. This prototype reconciles all three into one honest state ("your passbook was debited 19 days ago, your bank has received nothing, this is a disbursal hold — 41,000 other claims are in the same state"), names the actual blocker in plain language, gives the exact fix, runs a visible SLA clock, and when EPFO breaches that clock it drafts and files the next escalation for you — EPFiGMS, then CPGRAMS, then the regional office email, then DPG, then RTI — the ladder that currently only exists as folk knowledge on Reddit.

---

## Task 1: Project scaffold (S+B, together, 30 min)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Scaffold**

```bash
npx create-next-app@latest epfo-truth --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
cd epfo-truth
npm i prisma @prisma/client zod
npm i -D vitest @vitejs/plugin-react
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Add vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 3: Add test script to package.json**

```json
"scripts": { "test": "vitest run", "test:watch": "vitest" }
```

- [ ] **Step 4: Verify**

Run: `npm run test`
Expected: `No test files found` — exits cleanly.

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold next app with vitest"
```

---

## Task 2: Domain types (S, 20 min)

**Files:**
- Create: `src/lib/domain/types.ts`

**Interfaces:**
- Produces: every type below. All later tasks import from `@/lib/domain/types`.

- [ ] **Step 1: Write the types file**

```ts
// src/lib/domain/types.ts

export type ClaimType = 'FORM19' | 'FORM31' | 'FORM10C' | 'FORM13'

export type PortalStatus =
  | 'SUBMITTED_AT_PORTAL'
  | 'UNDER_PROCESS'
  | 'APPROVED'
  | 'SETTLED'
  | 'REJECTED'

export interface PortalReading {
  observedAt: string   // ISO date
  status: PortalStatus
}

export interface PassbookReading {
  observedAt: string
  settledShown: boolean
  debitedPaise: number | null
}

export interface BankReading {
  observedAt: string
  creditedPaise: number | null
}

export type TruthCode =
  | 'NOT_PICKED_UP'
  | 'IN_REVIEW'
  | 'APPROVED_AWAITING_MONEY'
  | 'DEBITED_NOT_CREDITED'
  | 'CREDITED'
  | 'REJECTED'
  | 'REGRESSED'

export type ContradictionKind =
  | 'PASSBOOK_AHEAD_OF_BANK'
  | 'PORTAL_BEHIND_PASSBOOK'
  | 'STATUS_WENT_BACKWARDS'

export interface Contradiction {
  kind: ContradictionKind
  detail: string
}

export interface TruthState {
  code: TruthCode
  contradictions: Contradiction[]
  asOf: string
}

export interface SlaResult {
  daysElapsed: number
  slaDays: number
  breached: boolean
  overdueByDays: number
}

export type BlockerCode =
  | 'MIGRATION_HOLD'
  | 'DOE_NOT_MARKED'
  | 'NAME_MISMATCH_AADHAAR'
  | 'DOB_MISMATCH'
  | 'BANK_NOT_NPCI_VERIFIED'
  | 'CHEQUE_UNREADABLE'
  | 'EPS_INELIGIBLE_FLAG'
  | 'MULTIPLE_UAN'
  | 'EMPLOYER_ATTESTATION_PENDING'
  | 'NONE'

export interface Blocker {
  code: BlockerCode
  title: string          // plain language, no jargon
  because: string        // why this happened
  fixSteps: string[]     // exact actions, in order
  whoFixesIt: 'YOU' | 'EMPLOYER' | 'EPFO'
}

export type Rung =
  | 'WAIT'
  | 'EPFIGMS'
  | 'CPGRAMS'
  | 'REGIONAL_EMAIL'
  | 'CPGRAMS_APPEAL'
  | 'DPG'
  | 'RTI'

export interface GrievanceRecord {
  channel: Rung
  filedAt: string
  docket?: string
  closedAt?: string
  closureText?: string
  resolved: boolean
}

export interface Draft {
  channel: Rung
  where: string          // portal name + URL
  subject: string
  body: string
}

export interface MemberAccount {
  memberId: string       // e.g. "MHBAN00123450000001234"
  employer: string
  joinedOn: string
  exitedOn: string | null
  dateOfExitMarked: boolean
  epfBalancePaise: number
  epsBalancePaise: number
  transferredOut: boolean
}

export interface MemberProfile {
  uan: string
  nameOnEpfo: string
  nameOnAadhaar: string
  nameOnBank: string
  dobOnEpfo: string
  dobOnAadhaar: string
  bankNpciVerified: boolean
  chequeUploadLegible: boolean
  epsFlaggedButIneligible: boolean
  otherUans: string[]
  accounts: MemberAccount[]
}

export interface ClaimRecord {
  id: string
  type: ClaimType
  filedAt: string
  amountPaise: number
  memberId: string
  portalHistory: PortalReading[]
  passbook: PassbookReading | null
  bank: BankReading | null
  rejectionCode: string | null
  grievances: GrievanceRecord[]
}

export interface NextAction {
  headline: string
  detail: string
  cta: { label: string; href: string } | null
  urgency: 'CALM' | 'ACT_NOW' | 'BLOCKED_ON_OTHERS'
}

export interface PreflightIssue {
  field: string
  problem: string
  fix: string
  willRejectClaim: boolean
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/types.ts && git commit -m "feat: domain types"
```

---

## Task 3: Reconciliation — the core idea (S, 45 min)

This is the single most important function in the project. It turns three disagreeing sources into one honest answer.

**Files:**
- Create: `src/lib/domain/reconcile.ts`, `tests/reconcile.test.ts`

**Interfaces:**
- Consumes: types from Task 2.
- Produces: `reconcile(claim: ClaimRecord, asOf: string): TruthState`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/reconcile.test.ts
import { describe, it, expect } from 'vitest'
import { reconcile } from '@/lib/domain/reconcile'
import type { ClaimRecord } from '@/lib/domain/types'

const base: ClaimRecord = {
  id: 'C1', type: 'FORM31', filedAt: '2026-07-03', amountPaise: 12000000,
  memberId: 'M1', portalHistory: [], passbook: null, bank: null,
  rejectionCode: null, grievances: [],
}

describe('reconcile', () => {
  it('reports NOT_PICKED_UP when only submitted', () => {
    const c = { ...base, portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' as const }] }
    expect(reconcile(c, '2026-08-22').code).toBe('NOT_PICKED_UP')
  })

  it('reports CREDITED when bank has money, whatever the portal says', () => {
    const c = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' as const }],
      bank: { observedAt: '2026-07-20', creditedPaise: 12000000 },
    }
    expect(reconcile(c, '2026-08-22').code).toBe('CREDITED')
  })

  it('reports DEBITED_NOT_CREDITED when passbook debited but bank empty', () => {
    const c = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-15', status: 'SETTLED' as const }],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-22', creditedPaise: null },
    }
    const t = reconcile(c, '2026-08-22')
    expect(t.code).toBe('DEBITED_NOT_CREDITED')
    expect(t.contradictions.map(x => x.kind)).toContain('PASSBOOK_AHEAD_OF_BANK')
  })

  it('detects a status that went backwards', () => {
    const c = {
      ...base,
      portalHistory: [
        { observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' as const },
        { observedAt: '2026-07-10', status: 'UNDER_PROCESS' as const },
        { observedAt: '2026-07-18', status: 'SUBMITTED_AT_PORTAL' as const },
      ],
    }
    const t = reconcile(c, '2026-08-22')
    expect(t.code).toBe('REGRESSED')
    expect(t.contradictions.map(x => x.kind)).toContain('STATUS_WENT_BACKWARDS')
  })

  it('reports REJECTED when portal rejected and no money moved', () => {
    const c = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-11', status: 'REJECTED' as const }],
      rejectionCode: 'NAME_MISMATCH',
    }
    expect(reconcile(c, '2026-08-22').code).toBe('REJECTED')
  })

  it('flags portal lagging behind passbook', () => {
    const c = {
      ...base,
      portalHistory: [{ observedAt: '2026-07-03', status: 'UNDER_PROCESS' as const }],
      passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
      bank: { observedAt: '2026-08-22', creditedPaise: null },
    }
    expect(reconcile(c, '2026-08-22').contradictions.map(x => x.kind)).toContain('PORTAL_BEHIND_PASSBOOK')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- reconcile`
Expected: FAIL — `Failed to resolve import "@/lib/domain/reconcile"`

- [ ] **Step 3: Implement**

```ts
// src/lib/domain/reconcile.ts
import type { ClaimRecord, Contradiction, PortalStatus, TruthState } from './types'

const RANK: Record<PortalStatus, number> = {
  SUBMITTED_AT_PORTAL: 1,
  UNDER_PROCESS: 2,
  APPROVED: 3,
  SETTLED: 4,
  REJECTED: 4,
}

function wentBackwards(history: ClaimRecord['portalHistory']): boolean {
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].status
    const curr = history[i].status
    if (prev === 'REJECTED' || curr === 'REJECTED') continue
    if (RANK[curr] < RANK[prev]) return true
  }
  return false
}

export function reconcile(claim: ClaimRecord, asOf: string): TruthState {
  const contradictions: Contradiction[] = []
  const history = claim.portalHistory
  const latest = history.length ? history[history.length - 1].status : null

  const debited = claim.passbook?.debitedPaise ?? null
  const credited = claim.bank?.creditedPaise ?? null

  if (debited !== null && credited === null) {
    contradictions.push({
      kind: 'PASSBOOK_AHEAD_OF_BANK',
      detail: `Your passbook shows ₹${(debited / 100).toLocaleString('en-IN')} was taken out on ${claim.passbook!.observedAt}, but your bank has received nothing.`,
    })
  }

  if (claim.passbook?.settledShown && latest && RANK[latest] < RANK.SETTLED && latest !== 'REJECTED') {
    contradictions.push({
      kind: 'PORTAL_BEHIND_PASSBOOK',
      detail: `Your passbook says settled, but the member portal still says ${latest.replace(/_/g, ' ').toLowerCase()}.`,
    })
  }

  if (wentBackwards(history)) {
    contradictions.push({
      kind: 'STATUS_WENT_BACKWARDS',
      detail: 'Your claim status moved backwards. This is an EPFO system fault, not something you did.',
    })
  }

  let code: TruthState['code']
  if (credited !== null) code = 'CREDITED'
  else if (debited !== null) code = 'DEBITED_NOT_CREDITED'
  else if (latest === 'REJECTED') code = 'REJECTED'
  else if (wentBackwards(history)) code = 'REGRESSED'
  else if (latest === 'APPROVED' || latest === 'SETTLED') code = 'APPROVED_AWAITING_MONEY'
  else if (latest === 'UNDER_PROCESS') code = 'IN_REVIEW'
  else code = 'NOT_PICKED_UP'

  return { code, contradictions, asOf }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- reconcile`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/reconcile.ts tests/reconcile.test.ts
git commit -m "feat: reconcile three sources into one truth state"
```

---

## Task 4: SLA clock (S, 25 min)

**Files:**
- Create: `src/lib/domain/sla.ts`, `tests/sla.test.ts`

**Interfaces:**
- Produces: `slaClock(filedAt: string, now: string, slaDays?: number): SlaResult`, `DEFAULT_SLA_DAYS = 20`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/sla.test.ts
import { describe, it, expect } from 'vitest'
import { slaClock, DEFAULT_SLA_DAYS } from '@/lib/domain/sla'

describe('slaClock', () => {
  it('defaults to a 20 day EPFO SLA', () => {
    expect(DEFAULT_SLA_DAYS).toBe(20)
  })

  it('is not breached inside the window', () => {
    const r = slaClock('2026-08-01', '2026-08-10')
    expect(r.daysElapsed).toBe(9)
    expect(r.breached).toBe(false)
    expect(r.overdueByDays).toBe(0)
  })

  it('is breached past the window and reports overdue days', () => {
    const r = slaClock('2026-07-03', '2026-08-22')
    expect(r.daysElapsed).toBe(50)
    expect(r.breached).toBe(true)
    expect(r.overdueByDays).toBe(30)
  })

  it('honours a custom SLA', () => {
    const r = slaClock('2026-08-01', '2026-08-10', 5)
    expect(r.breached).toBe(true)
    expect(r.overdueByDays).toBe(4)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- sla`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/domain/sla.ts
import type { SlaResult } from './types'

export const DEFAULT_SLA_DAYS = 20

const MS_PER_DAY = 86_400_000

export function slaClock(filedAt: string, now: string, slaDays: number = DEFAULT_SLA_DAYS): SlaResult {
  const daysElapsed = Math.max(
    0,
    Math.floor((Date.parse(now) - Date.parse(filedAt)) / MS_PER_DAY),
  )
  const breached = daysElapsed > slaDays
  return {
    daysElapsed,
    slaDays,
    breached,
    overdueByDays: breached ? daysElapsed - slaDays : 0,
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- sla`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/sla.ts tests/sla.test.ts && git commit -m "feat: sla clock"
```

---

## Task 5: Blocker detection (S, 60 min)

Turns a stuck claim into a plain-language reason plus a fix. This is the part judges will remember.

**Files:**
- Create: `src/lib/domain/blockers.ts`, `tests/blockers.test.ts`

**Interfaces:**
- Consumes: `reconcile`, types.
- Produces: `detectBlocker(profile: MemberProfile, claim: ClaimRecord, truth: TruthState): Blocker`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/blockers.test.ts
import { describe, it, expect } from 'vitest'
import { detectBlocker } from '@/lib/domain/blockers'
import type { ClaimRecord, MemberProfile, TruthState } from '@/lib/domain/types'

const profile: MemberProfile = {
  uan: '100000000001',
  nameOnEpfo: 'RAJESH KUMAR', nameOnAadhaar: 'RAJESH KUMAR', nameOnBank: 'RAJESH KUMAR',
  dobOnEpfo: '1994-02-11', dobOnAadhaar: '1994-02-11',
  bankNpciVerified: true, chequeUploadLegible: true,
  epsFlaggedButIneligible: false, otherUans: [],
  accounts: [{
    memberId: 'M1', employer: 'Acme Softworks', joinedOn: '2021-04-01',
    exitedOn: '2026-05-31', dateOfExitMarked: true,
    epfBalancePaise: 50000000, epsBalancePaise: 0, transferredOut: false,
  }],
}

const claim: ClaimRecord = {
  id: 'C1', type: 'FORM31', filedAt: '2026-07-03', amountPaise: 12000000,
  memberId: 'M1', portalHistory: [{ observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' }],
  passbook: null, bank: null, rejectionCode: null, grievances: [],
}

const stuck: TruthState = { code: 'NOT_PICKED_UP', contradictions: [], asOf: '2026-08-22' }

describe('detectBlocker', () => {
  it('names the name mismatch and says who fixes it', () => {
    const p = { ...profile, nameOnAadhaar: 'RAJESH KUMAAR' }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('NAME_MISMATCH_AADHAAR')
    expect(b.whoFixesIt).toBe('YOU')
    expect(b.fixSteps.length).toBeGreaterThan(0)
  })

  it('catches an unmarked date of exit and blames the employer', () => {
    const p = { ...profile, accounts: [{ ...profile.accounts[0], dateOfExitMarked: false }] }
    const b = detectBlocker(p, claim, stuck)
    expect(b.code).toBe('DOE_NOT_MARKED')
    expect(b.whoFixesIt).toBe('EMPLOYER')
  })

  it('identifies a disbursal hold when money left the passbook but not the bank', () => {
    const truth: TruthState = { code: 'DEBITED_NOT_CREDITED', contradictions: [], asOf: '2026-08-22' }
    const b = detectBlocker(profile, claim, truth)
    expect(b.code).toBe('MIGRATION_HOLD')
    expect(b.whoFixesIt).toBe('EPFO')
  })

  it('catches an unverified bank account', () => {
    const p = { ...profile, bankNpciVerified: false }
    expect(detectBlocker(p, claim, stuck).code).toBe('BANK_NOT_NPCI_VERIFIED')
  })

  it('catches the EPS ineligible flag on a transfer', () => {
    const p = { ...profile, epsFlaggedButIneligible: true }
    const transfer = { ...claim, type: 'FORM13' as const }
    expect(detectBlocker(p, transfer, stuck).code).toBe('EPS_INELIGIBLE_FLAG')
  })

  it('returns NONE when the money has arrived', () => {
    const truth: TruthState = { code: 'CREDITED', contradictions: [], asOf: '2026-08-22' }
    expect(detectBlocker(profile, claim, truth).code).toBe('NONE')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- blockers`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/domain/blockers.ts
import type { Blocker, ClaimRecord, MemberProfile, TruthState } from './types'

const NONE: Blocker = {
  code: 'NONE',
  title: 'Nothing is blocking this claim',
  because: 'Your money has been credited.',
  fixSteps: [],
  whoFixesIt: 'EPFO',
}

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function detectBlocker(
  profile: MemberProfile,
  claim: ClaimRecord,
  truth: TruthState,
): Blocker {
  if (truth.code === 'CREDITED') return NONE

  const account = profile.accounts.find(a => a.memberId === claim.memberId)

  if (norm(profile.nameOnEpfo) !== norm(profile.nameOnAadhaar)) {
    return {
      code: 'NAME_MISMATCH_AADHAAR',
      title: 'Your name is spelled differently on EPFO and Aadhaar',
      because: `EPFO has "${profile.nameOnEpfo}". Aadhaar has "${profile.nameOnAadhaar}". EPFO rejects a claim automatically when these do not match exactly, including spacing.`,
      fixSteps: [
        'Open the EPFO member portal and go to Manage → Modify Basic Details.',
        `Enter your name exactly as it appears on Aadhaar: "${profile.nameOnAadhaar}".`,
        'Submit. Your employer has to approve this change before it reaches EPFO.',
        'Wait for the change to show on your profile, then file the claim again.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (profile.dobOnEpfo !== profile.dobOnAadhaar) {
    return {
      code: 'DOB_MISMATCH',
      title: 'Your date of birth does not match Aadhaar',
      because: `EPFO has ${profile.dobOnEpfo}, Aadhaar has ${profile.dobOnAadhaar}. Any difference causes an automatic rejection.`,
      fixSteps: [
        'Go to Manage → Modify Basic Details on the member portal.',
        `Correct the date of birth to ${profile.dobOnAadhaar}.`,
        'Get your employer to approve the change.',
        'File the claim again once the correction is visible.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (account && !account.dateOfExitMarked) {
    return {
      code: 'DOE_NOT_MARKED',
      title: 'Your old employer never marked your last working day',
      because: `${account.employer} has not entered a Date of Exit for you. EPFO cannot settle or transfer this account until they do. Nothing on the EPFO portal tells you this is the reason.`,
      fixSteps: [
        `Email ${account.employer}'s HR or PF team and ask them to mark your Date of Exit in the EPFO employer portal.`,
        'If they do not respond in 7 days, you can mark it yourself: member portal → Manage → Mark Exit (available 2 months after your last contribution).',
        'Once the exit date appears in your service history, re-file this claim.',
      ],
      whoFixesIt: 'EMPLOYER',
    }
  }

  if (!profile.bankNpciVerified) {
    return {
      code: 'BANK_NOT_NPCI_VERIFIED',
      title: 'Your bank account is not verified, so a cheque image is required',
      because: 'Because your account is not NPCI-verified, EPFO asks for a cancelled cheque. Blurry images or cheques without your printed name are rejected automatically by the system, with no explanation.',
      fixSteps: [
        'Seed and verify your bank account with your UAN through your employer or the member portal.',
        'If you must upload a cheque, use a flat, well-lit photo where your printed name and IFSC are both readable.',
        'Re-file the claim after the account shows as verified.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (!profile.chequeUploadLegible) {
    return {
      code: 'CHEQUE_UNREADABLE',
      title: 'The cheque image you uploaded cannot be read',
      because: 'EPFO auto-rejects unclear scans. You are not told this before you submit.',
      fixSteps: [
        'Retake the photo in daylight, flat, no shadow across the account number.',
        'Check that your printed name, account number and IFSC are all legible.',
        'Re-upload and file again.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (profile.epsFlaggedButIneligible && claim.type === 'FORM13') {
    return {
      code: 'EPS_INELIGIBLE_FLAG',
      title: 'EPFO thinks you are a pension scheme member when you are not',
      because: 'Your wages were above ₹15,000 when you joined, so you should never have been enrolled in EPS. Your records say otherwise. Transfers fail with "EPS member not eligible", your EPF moves and your EPS balance stays stranded in the old account.',
      fixSteps: [
        'Ask your former employer to file a Joint Declaration correcting your EPS membership.',
        'Ask EPFO in writing (not by phone) to confirm the EPS adjustment has been made. Different offices give different answers, so get it on record.',
        'Check your passbook for an adjustment entry moving the EPS balance into EPF.',
        'Only re-file the transfer after the adjustment appears.',
      ],
      whoFixesIt: 'EMPLOYER',
    }
  }

  if (profile.otherUans.length > 0) {
    return {
      code: 'MULTIPLE_UAN',
      title: 'You have more than one UAN, and money is split between them',
      because: `A second UAN (${profile.otherUans.join(', ')}) was created at some point, probably during a job change. Balances under a different UAN will never appear here and will never transfer on their own.`,
      fixSteps: [
        'File a UAN merge request with EPFO quoting both UAN numbers.',
        'Until they are merged, file a separate transfer from the old UAN.',
        'Confirm in the passbook that the balance moved before closing the older UAN.',
      ],
      whoFixesIt: 'YOU',
    }
  }

  if (truth.code === 'DEBITED_NOT_CREDITED' || truth.code === 'REGRESSED') {
    return {
      code: 'MIGRATION_HOLD',
      title: 'EPFO has your money and has not released it',
      because: 'The amount has already left your PF account but has not reached your bank. Nothing you submitted is wrong. This is a disbursal hold on EPFO\'s side, and it is affecting a large number of claims filed in the same window.',
      fixSteps: [
        'Do not file a second claim. A duplicate claim can make this worse.',
        'Your SLA clock has started. Use the escalation ladder below in order.',
        'Keep your Claim ID and UAN ready for every message you send.',
      ],
      whoFixesIt: 'EPFO',
    }
  }

  return {
    code: 'MIGRATION_HOLD',
    title: 'Your claim has not been picked up by an officer yet',
    because: 'No one at EPFO has actioned this claim. The portal does not tell you this — it just shows the same status.',
    fixSteps: [
      'Wait until the SLA clock is breached, then escalate using the ladder below.',
      'Do not file a duplicate claim while this one is open.',
    ],
    whoFixesIt: 'EPFO',
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- blockers`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/blockers.ts tests/blockers.test.ts && git commit -m "feat: plain-language blocker detection"
```

---

## Task 6: Escalation ladder + drafted letters (S, 60 min)

The folk knowledge from Reddit, encoded. This is the strongest "end-to-end thinking" evidence in the build.

**Files:**
- Create: `src/lib/domain/escalation.ts`, `tests/escalation.test.ts`

**Interfaces:**
- Produces: `nextRung(sla: SlaResult, history: GrievanceRecord[]): Rung`, `draftFor(rung: Rung, ctx: DraftContext): Draft`, `interface DraftContext`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/escalation.test.ts
import { describe, it, expect } from 'vitest'
import { nextRung, draftFor } from '@/lib/domain/escalation'
import type { GrievanceRecord, SlaResult } from '@/lib/domain/types'

const inTime: SlaResult = { daysElapsed: 5, slaDays: 20, breached: false, overdueByDays: 0 }
const breached: SlaResult = { daysElapsed: 50, slaDays: 20, breached: true, overdueByDays: 30 }

const ctx = {
  uan: '100000000001',
  claimId: 'C1',
  claimType: 'FORM31' as const,
  filedAt: '2026-07-03',
  amountPaise: 12000000,
  daysElapsed: 50,
  priorDockets: [] as string[],
}

describe('nextRung', () => {
  it('says wait while inside the SLA', () => {
    expect(nextRung(inTime, [])).toBe('WAIT')
  })

  it('unlocks EPFiGMS once the SLA is breached', () => {
    expect(nextRung(breached, [])).toBe('EPFIGMS')
  })

  it('moves to CPGRAMS when EPFiGMS was closed without resolving', () => {
    const h: GrievanceRecord[] = [{
      channel: 'EPFIGMS', filedAt: '2026-07-25', docket: 'EPF/1',
      closedAt: '2026-07-25', closureText: 'Claim under process, wait for few days', resolved: false,
    }]
    expect(nextRung(breached, h)).toBe('CPGRAMS')
  })

  it('moves to the regional email after CPGRAMS sits for a week', () => {
    const h: GrievanceRecord[] = [
      { channel: 'EPFIGMS', filedAt: '2026-07-25', closedAt: '2026-07-25', resolved: false },
      { channel: 'CPGRAMS', filedAt: '2026-07-26', docket: 'MOLBR/1', resolved: false },
    ]
    expect(nextRung({ ...breached, daysElapsed: 60 }, h)).toBe('REGIONAL_EMAIL')
  })

  it('ends at RTI when everything else has been tried', () => {
    const h: GrievanceRecord[] = [
      { channel: 'EPFIGMS', filedAt: '2026-07-25', closedAt: '2026-07-25', resolved: false },
      { channel: 'CPGRAMS', filedAt: '2026-07-26', closedAt: '2026-08-02', resolved: false },
      { channel: 'REGIONAL_EMAIL', filedAt: '2026-08-03', resolved: false },
      { channel: 'CPGRAMS_APPEAL', filedAt: '2026-08-04', closedAt: '2026-08-10', resolved: false },
      { channel: 'DPG', filedAt: '2026-08-11', docket: 'DPG/9', resolved: false },
    ]
    expect(nextRung({ ...breached, daysElapsed: 80 }, h)).toBe('RTI')
  })
})

describe('draftFor', () => {
  it('writes a CPGRAMS grievance naming the right ministry path', () => {
    const d = draftFor('CPGRAMS', ctx)
    expect(d.where).toContain('pgportal.gov.in')
    expect(d.body).toContain('100000000001')
    expect(d.body).toContain('C1')
    expect(d.body).toContain('50')
  })

  it('quotes prior dockets in a DPG escalation', () => {
    const d = draftFor('DPG', { ...ctx, priorDockets: ['MOLBR/1'] })
    expect(d.body).toContain('MOLBR/1')
    expect(d.where).toContain('dpg.gov.in')
  })

  it('writes an RTI addressed to the CPIO', () => {
    const d = draftFor('RTI', ctx)
    expect(d.body).toContain('CPIO')
    expect(d.where).toContain('rtionline.gov.in')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- escalation`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/domain/escalation.ts
import type { ClaimType, Draft, GrievanceRecord, Rung, SlaResult } from './types'

export interface DraftContext {
  uan: string
  claimId: string
  claimType: ClaimType
  filedAt: string
  amountPaise: number
  daysElapsed: number
  priorDockets: string[]
}

const MS_PER_DAY = 86_400_000

function has(history: GrievanceRecord[], rung: Rung): GrievanceRecord | undefined {
  return history.find(g => g.channel === rung)
}

function daysSince(iso: string, from: number = Date.now()): number {
  return Math.floor((from - Date.parse(iso)) / MS_PER_DAY)
}

function stalled(g: GrievanceRecord, minDays: number): boolean {
  if (g.resolved) return false
  if (g.closedAt) return true                  // closed without resolving
  return daysSince(g.filedAt) >= minDays
}

export function nextRung(sla: SlaResult, history: GrievanceRecord[]): Rung {
  if (!sla.breached && history.length === 0) return 'WAIT'

  const epfigms = has(history, 'EPFIGMS')
  if (!epfigms) return 'EPFIGMS'
  if (!stalled(epfigms, 5)) return 'WAIT'

  const cpgrams = has(history, 'CPGRAMS')
  if (!cpgrams) return 'CPGRAMS'
  if (!stalled(cpgrams, 7)) return 'WAIT'

  if (!has(history, 'REGIONAL_EMAIL')) return 'REGIONAL_EMAIL'

  const appeal = has(history, 'CPGRAMS_APPEAL')
  if (!appeal) return 'CPGRAMS_APPEAL'
  if (!stalled(appeal, 7)) return 'WAIT'

  const dpg = has(history, 'DPG')
  if (!dpg) return 'DPG'
  if (!stalled(dpg, 7)) return 'WAIT'

  return 'RTI'
}

const RUPEES = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

const CLAIM_NAME: Record<ClaimType, string> = {
  FORM19: 'Form 19 (final PF settlement)',
  FORM31: 'Form 31 (PF advance)',
  FORM10C: 'Form 10C (pension withdrawal)',
  FORM13: 'Form 13 (PF transfer)',
}

export function draftFor(rung: Rung, ctx: DraftContext): Draft {
  const facts = `UAN: ${ctx.uan}\nClaim ID: ${ctx.claimId}\nClaim type: ${CLAIM_NAME[ctx.claimType]}\nAmount: ${RUPEES(ctx.amountPaise)}\nDate filed: ${ctx.filedAt}\nDays elapsed: ${ctx.daysElapsed}`
  const dockets = ctx.priorDockets.length
    ? `\n\nPrevious grievance references: ${ctx.priorDockets.join(', ')}`
    : ''

  switch (rung) {
    case 'WAIT':
      return {
        channel: 'WAIT',
        where: 'No action needed yet',
        subject: '',
        body: 'Your claim is still inside the stated processing window. Filing a grievance now will be closed with a template reply and may lock you out of filing another one for 30 days.',
      }

    case 'EPFIGMS':
      return {
        channel: 'EPFIGMS',
        where: 'EPFiGMS — epfigms.gov.in',
        subject: `Claim ${ctx.claimId} pending beyond stated timeline`,
        body: `My claim has not been settled within the stated timeline.\n\n${facts}\n\nRequest: please confirm the current stage of this claim and the reason for the delay. Please do not close this grievance without stating the specific reason.\n\nNote: file this to obtain a grievance number. It will most likely be closed with a template reply. That closure is what unlocks the next step.`,
      }

    case 'CPGRAMS':
      return {
        channel: 'CPGRAMS',
        where: 'CPGRAMS — pgportal.gov.in (Ministry of Labour and Employment → Labour and Employment → EPFO)',
        subject: `Delay in settlement of claim ${ctx.claimId} — ${ctx.daysElapsed} days`,
        body: `My provident fund claim has been pending for ${ctx.daysElapsed} days, well beyond the stated processing timeline.\n\n${facts}${dockets}\n\nMy grievance on EPFiGMS was closed without addressing the issue raised.\n\nRequest: (1) the current stage of this claim, (2) the specific reason for the delay, (3) a date by which it will be settled.\n\nCPGRAMS is monitored centrally and regional offices are rated on resolution, which is why this step works when EPFiGMS does not.`,
      }

    case 'REGIONAL_EMAIL':
      return {
        channel: 'REGIONAL_EMAIL',
        where: 'Direct email to your Regional PF Office, cc acc.csd@epfindia.gov.in',
        subject: `Claim ${ctx.claimId} pending ${ctx.daysElapsed} days — request for status`,
        body: `Respected Sir/Madam,\n\n${facts}${dockets}\n\nThis claim has been pending well past the stated timeline and my grievances have not been substantively addressed. I request the current stage of the file and an expected settlement date.\n\nI will follow up on this thread once daily until I receive a substantive reply.\n\nRegards`,
      }

    case 'CPGRAMS_APPEAL':
      return {
        channel: 'CPGRAMS_APPEAL',
        where: 'CPGRAMS → View Grievance Status → Appeal',
        subject: `Appeal against disposal of grievance ${ctx.priorDockets[0] ?? '[docket]'}`,
        body: `I am appealing the disposal of my grievance because the reply did not address the issue I raised, and my claim remains unsettled.\n\n${facts}${dockets}\n\nThe closure text did not state the stage of the claim or a reason for the delay. Request: reopen and provide a substantive reply.\n\nMost people never find this appeal option. It routes the case to a supervisory officer rather than back to the same desk.`,
      }

    case 'DPG':
      return {
        channel: 'DPG',
        where: 'Directorate of Public Grievances — dpg.gov.in',
        subject: `Unresolved PF claim ${ctx.claimId} after full grievance cycle`,
        body: `I have exhausted the EPFO and CPGRAMS grievance channels without resolution.\n\n${facts}${dockets}\n\nRequest: intervention to secure settlement of this claim.\n\nAfter filing, reply on your existing email thread with the Regional Office quoting the DPG docket number. Officers clear DPG-flagged cases to avoid adverse audit marks.`,
      }

    case 'RTI':
      return {
        channel: 'RTI',
        where: 'RTI Online — rtionline.gov.in (Public Authority: EPFO, addressed to the CPIO of your Regional Office)',
        subject: `Information request regarding claim ${ctx.claimId}`,
        body: `To the CPIO, Employees' Provident Fund Organisation.\n\nUnder the Right to Information Act, 2005, I request the following:\n\n1. The current stage of claim ID ${ctx.claimId} filed on ${ctx.filedAt} under UAN ${ctx.uan}.\n2. The date on which the claim was assigned to a dealing officer, and the name of that officer.\n3. The specific reason for the delay beyond the stated processing timeline.\n4. The file notings on this claim.\n5. The number of claims filed in the same period at this office that remain unsettled.${dockets}\n\nAn RTI must be answered within 30 days. In practice, claims are often settled before the reply is due.`,
      }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- escalation`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/escalation.ts tests/escalation.test.ts && git commit -m "feat: escalation ladder with drafted letters"
```

---

## Task 7: Pre-flight validator + stranded money (S, 45 min)

Prevention, not just diagnosis. Stops the rejection before it happens.

**Files:**
- Create: `src/lib/domain/preflight.ts`, `src/lib/domain/stranded.ts`, `tests/preflight.test.ts`, `tests/stranded.test.ts`

**Interfaces:**
- Produces: `preflight(profile: MemberProfile, memberId: string): PreflightIssue[]`, `findStranded(profile: MemberProfile, currentMemberId: string): MemberAccount[]`, `strandedTotalPaise(accounts: MemberAccount[]): number`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/preflight.test.ts
import { describe, it, expect } from 'vitest'
import { preflight } from '@/lib/domain/preflight'
import type { MemberProfile } from '@/lib/domain/types'

const clean: MemberProfile = {
  uan: '100000000001',
  nameOnEpfo: 'RAJESH KUMAR', nameOnAadhaar: 'RAJESH KUMAR', nameOnBank: 'RAJESH KUMAR',
  dobOnEpfo: '1994-02-11', dobOnAadhaar: '1994-02-11',
  bankNpciVerified: true, chequeUploadLegible: true,
  epsFlaggedButIneligible: false, otherUans: [],
  accounts: [{
    memberId: 'M1', employer: 'Acme Softworks', joinedOn: '2021-04-01',
    exitedOn: '2026-05-31', dateOfExitMarked: true,
    epfBalancePaise: 50000000, epsBalancePaise: 0, transferredOut: false,
  }],
}

describe('preflight', () => {
  it('passes a clean profile', () => {
    expect(preflight(clean, 'M1')).toEqual([])
  })

  it('catches a name mismatch as claim-rejecting', () => {
    const issues = preflight({ ...clean, nameOnAadhaar: 'RAJESH KUMAAR' }, 'M1')
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('name')
    expect(issues[0].willRejectClaim).toBe(true)
  })

  it('catches an unmarked date of exit', () => {
    const p = { ...clean, accounts: [{ ...clean.accounts[0], dateOfExitMarked: false }] }
    expect(preflight(p, 'M1').some(i => i.field === 'dateOfExit')).toBe(true)
  })

  it('catches an unverified bank account', () => {
    expect(preflight({ ...clean, bankNpciVerified: false }, 'M1').some(i => i.field === 'bank')).toBe(true)
  })

  it('reports several problems at once', () => {
    const p = { ...clean, nameOnAadhaar: 'X', bankNpciVerified: false, dobOnAadhaar: '1994-02-12' }
    expect(preflight(p, 'M1').length).toBe(3)
  })
})
```

```ts
// tests/stranded.test.ts
import { describe, it, expect } from 'vitest'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'
import type { MemberProfile } from '@/lib/domain/types'

const profile: MemberProfile = {
  uan: '100000000001',
  nameOnEpfo: 'A', nameOnAadhaar: 'A', nameOnBank: 'A',
  dobOnEpfo: '1994-02-11', dobOnAadhaar: '1994-02-11',
  bankNpciVerified: true, chequeUploadLegible: true,
  epsFlaggedButIneligible: false, otherUans: [],
  accounts: [
    { memberId: 'M_CURRENT', employer: 'Now Corp', joinedOn: '2026-06-01', exitedOn: null, dateOfExitMarked: false, epfBalancePaise: 10000000, epsBalancePaise: 0, transferredOut: false },
    { memberId: 'M_OLD_1', employer: 'Old Systems', joinedOn: '2021-04-01', exitedOn: '2023-03-31', dateOfExitMarked: true, epfBalancePaise: 28000000, epsBalancePaise: 500000, transferredOut: false },
    { memberId: 'M_OLD_2', employer: 'Older Ltd', joinedOn: '2019-01-01', exitedOn: '2021-03-31', dateOfExitMarked: true, epfBalancePaise: 9000000, epsBalancePaise: 0, transferredOut: true },
  ],
}

describe('findStranded', () => {
  it('finds old accounts with money that was never transferred', () => {
    const s = findStranded(profile, 'M_CURRENT')
    expect(s.map(a => a.memberId)).toEqual(['M_OLD_1'])
  })

  it('totals EPF and EPS together', () => {
    expect(strandedTotalPaise(findStranded(profile, 'M_CURRENT'))).toBe(28500000)
  })

  it('returns nothing when everything was transferred', () => {
    const p = { ...profile, accounts: profile.accounts.map(a => ({ ...a, transferredOut: true })) }
    expect(findStranded(p, 'M_CURRENT')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- preflight stranded`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both**

```ts
// src/lib/domain/preflight.ts
import type { MemberProfile, PreflightIssue } from './types'

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function preflight(profile: MemberProfile, memberId: string): PreflightIssue[] {
  const issues: PreflightIssue[] = []
  const account = profile.accounts.find(a => a.memberId === memberId)

  if (norm(profile.nameOnEpfo) !== norm(profile.nameOnAadhaar)) {
    issues.push({
      field: 'name',
      problem: `EPFO has "${profile.nameOnEpfo}", Aadhaar has "${profile.nameOnAadhaar}".`,
      fix: 'Correct your name on the member portal (Manage → Modify Basic Details) and get employer approval before filing.',
      willRejectClaim: true,
    })
  }

  if (profile.dobOnEpfo !== profile.dobOnAadhaar) {
    issues.push({
      field: 'dob',
      problem: `EPFO has ${profile.dobOnEpfo}, Aadhaar has ${profile.dobOnAadhaar}.`,
      fix: 'Correct the date of birth on the member portal and get employer approval before filing.',
      willRejectClaim: true,
    })
  }

  if (!profile.bankNpciVerified) {
    issues.push({
      field: 'bank',
      problem: 'Your bank account is not NPCI-verified, so a cancelled cheque image will be required and auto-checked.',
      fix: 'Seed and verify your bank account against your UAN, or upload a flat, well-lit cheque showing your printed name and IFSC.',
      willRejectClaim: true,
    })
  }

  if (account && !account.dateOfExitMarked && account.exitedOn) {
    issues.push({
      field: 'dateOfExit',
      problem: `${account.employer} has not marked your Date of Exit.`,
      fix: 'Ask your employer to mark it, or mark it yourself from Manage → Mark Exit two months after your last contribution.',
      willRejectClaim: true,
    })
  }

  return issues
}
```

```ts
// src/lib/domain/stranded.ts
import type { MemberAccount, MemberProfile } from './types'

export function findStranded(profile: MemberProfile, currentMemberId: string): MemberAccount[] {
  return profile.accounts.filter(
    a =>
      a.memberId !== currentMemberId &&
      !a.transferredOut &&
      a.epfBalancePaise + a.epsBalancePaise > 0,
  )
}

export function strandedTotalPaise(accounts: MemberAccount[]): number {
  return accounts.reduce((sum, a) => sum + a.epfBalancePaise + a.epsBalancePaise, 0)
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: all suites pass (reconcile 6, sla 4, blockers 6, escalation 8, preflight 5, stranded 3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain tests && git commit -m "feat: preflight validation and stranded money finder"
```

---

## Task 8: nextAction — one instruction, always (S, 30 min)

Every screen must answer "what do I do right now" with exactly one sentence.

**Files:**
- Create: `src/lib/domain/nextAction.ts`

**Interfaces:**
- Produces: `nextAction(input: { truth, blocker, sla, rung, claimId }): NextAction`

- [ ] **Step 1: Implement**

```ts
// src/lib/domain/nextAction.ts
import type { Blocker, NextAction, Rung, SlaResult, TruthState } from './types'

export function nextAction(input: {
  truth: TruthState
  blocker: Blocker
  sla: SlaResult
  rung: Rung
  claimId: string
}): NextAction {
  const { truth, blocker, sla, rung, claimId } = input

  if (truth.code === 'CREDITED') {
    return {
      headline: 'Your money has arrived',
      detail: 'Nothing left to do. Check your bank statement to confirm the amount.',
      cta: null,
      urgency: 'CALM',
    }
  }

  if (truth.code === 'REJECTED') {
    return {
      headline: 'Fix one thing, then file again',
      detail: blocker.title,
      cta: { label: 'See how to fix it', href: `/claim/${claimId}#blocker` },
      urgency: 'ACT_NOW',
    }
  }

  if (blocker.whoFixesIt === 'YOU') {
    return {
      headline: 'You can unblock this yourself',
      detail: blocker.fixSteps[0] ?? blocker.title,
      cta: { label: 'See the full fix', href: `/claim/${claimId}#blocker` },
      urgency: 'ACT_NOW',
    }
  }

  if (blocker.whoFixesIt === 'EMPLOYER') {
    return {
      headline: 'Your employer has to act',
      detail: blocker.fixSteps[0] ?? blocker.title,
      cta: { label: 'Copy the message to send them', href: `/claim/${claimId}#blocker` },
      urgency: 'BLOCKED_ON_OTHERS',
    }
  }

  if (rung === 'WAIT') {
    return {
      headline: `Wait — ${sla.slaDays - sla.daysElapsed} days left on the clock`,
      detail: 'Filing a grievance before the timeline is breached gets a template reply and can lock you out for 30 days.',
      cta: null,
      urgency: 'CALM',
    }
  }

  return {
    headline: `EPFO is ${sla.overdueByDays} days overdue — escalate now`,
    detail: `Your next step is ${rung.replace(/_/g, ' ').toLowerCase()}. The letter is already written for you.`,
    cta: { label: 'Open the escalation', href: `/claim/${claimId}#escalate` },
    urgency: 'ACT_NOW',
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/nextAction.ts && git commit -m "feat: single next action resolver"
```

---

## Task 9: Database, seed personas, API routes (S, 90 min)

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db/client.ts`, `src/lib/db/seed.ts`, `src/app/api/session/route.ts`, `src/app/api/claims/route.ts`, `src/app/api/claims/[id]/route.ts`, `src/app/api/claims/[id]/simulate/route.ts`, `src/app/api/grievances/route.ts`, `src/app/api/preflight/route.ts`

**Interfaces:**
- Consumes: all domain functions.
- Produces: `GET /api/claims/[id]` returns `{ claim, profile, truth, blocker, sla, rung, draft, action }`.

- [ ] **Step 1: Schema**

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Member {
  uan                    String   @id
  nameOnEpfo             String
  nameOnAadhaar          String
  nameOnBank             String
  dobOnEpfo              String
  dobOnAadhaar           String
  bankNpciVerified       Boolean
  chequeUploadLegible    Boolean
  epsFlaggedButIneligible Boolean
  otherUans              String[]
  demoLabel              String
  accounts               Account[]
  claims                 Claim[]
}

model Account {
  memberId         String  @id
  member           Member  @relation(fields: [uan], references: [uan])
  uan              String
  employer         String
  joinedOn         String
  exitedOn         String?
  dateOfExitMarked Boolean
  epfBalancePaise  Int
  epsBalancePaise  Int
  transferredOut   Boolean
}

model Claim {
  id             String   @id
  member         Member   @relation(fields: [uan], references: [uan])
  uan            String
  memberId       String
  type           String
  filedAt        String
  amountPaise    Int
  rejectionCode  String?
  portalHistory  Json
  passbook       Json?
  bank           Json?
  simulatedToday String
  grievances     Grievance[]
}

model Grievance {
  id          String  @id @default(cuid())
  claim       Claim   @relation(fields: [claimId], references: [id])
  claimId     String
  channel     String
  filedAt     String
  docket      String?
  closedAt    String?
  closureText String?
  resolved    Boolean @default(false)
}
```

- [ ] **Step 2: Prisma client singleton**

```ts
// src/lib/db/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Seed three personas**

Every persona is a real, documented failure mode from the research. Keep the labels — the judges will pick by story.

```ts
// src/lib/db/seed.ts
import { prisma } from './client'

async function main() {
  await prisma.grievance.deleteMany()
  await prisma.claim.deleteMany()
  await prisma.account.deleteMany()
  await prisma.member.deleteMany()

  // 1. Disbursal hold: passbook debited, bank empty, status went backwards.
  await prisma.member.create({
    data: {
      uan: '100000000001', demoLabel: 'Money left my PF but never reached my bank',
      nameOnEpfo: 'RAJESH KUMAR', nameOnAadhaar: 'RAJESH KUMAR', nameOnBank: 'RAJESH KUMAR',
      dobOnEpfo: '1994-02-11', dobOnAadhaar: '1994-02-11',
      bankNpciVerified: true, chequeUploadLegible: true,
      epsFlaggedButIneligible: false, otherUans: [],
      accounts: { create: [{
        memberId: 'MH/BAN/0012345/000/0001234', uan: '100000000001',
        employer: 'Acme Softworks Pvt Ltd', joinedOn: '2021-04-01', exitedOn: null,
        dateOfExitMarked: true, epfBalancePaise: 62000000, epsBalancePaise: 0, transferredOut: false,
      }] },
      claims: { create: [{
        id: 'CLM-2026-070301', uan: '100000000001',
        memberId: 'MH/BAN/0012345/000/0001234', type: 'FORM31',
        filedAt: '2026-07-03', amountPaise: 12000000, simulatedToday: '2026-08-22',
        portalHistory: [
          { observedAt: '2026-07-03', status: 'SUBMITTED_AT_PORTAL' },
          { observedAt: '2026-07-11', status: 'UNDER_PROCESS' },
          { observedAt: '2026-07-15', status: 'SETTLED' },
          { observedAt: '2026-07-28', status: 'SUBMITTED_AT_PORTAL' },
        ],
        passbook: { observedAt: '2026-07-19', settledShown: true, debitedPaise: 12000000 },
        bank: { observedAt: '2026-08-22', creditedPaise: null },
        grievances: { create: [{
          channel: 'EPFIGMS', filedAt: '2026-07-25', docket: 'EPFOG/E/2026/0071234',
          closedAt: '2026-07-25', resolved: false,
          closureText: 'Claim is under process at SBI end. Please wait for a few days.',
        }] },
      }] },
    },
  })

  // 2. Auto-rejection on a one-letter name mismatch.
  await prisma.member.create({
    data: {
      uan: '100000000002', demoLabel: 'My claim keeps getting rejected and I do not know why',
      nameOnEpfo: 'SUNITA DEVI', nameOnAadhaar: 'SUNEETA DEVI', nameOnBank: 'SUNITA DEVI',
      dobOnEpfo: '1988-09-04', dobOnAadhaar: '1988-09-04',
      bankNpciVerified: false, chequeUploadLegible: false,
      epsFlaggedButIneligible: false, otherUans: [],
      accounts: { create: [{
        memberId: 'DL/CPM/0045678/000/0004567', uan: '100000000002',
        employer: 'Nova Retail India', joinedOn: '2019-06-10', exitedOn: '2026-04-30',
        dateOfExitMarked: true, epfBalancePaise: 21500000, epsBalancePaise: 0, transferredOut: false,
      }] },
      claims: { create: [{
        id: 'CLM-2026-061502', uan: '100000000002',
        memberId: 'DL/CPM/0045678/000/0004567', type: 'FORM19',
        filedAt: '2026-06-15', amountPaise: 21500000, simulatedToday: '2026-08-22',
        rejectionCode: 'REJ-NAME-MISMATCH-01',
        portalHistory: [
          { observedAt: '2026-06-15', status: 'SUBMITTED_AT_PORTAL' },
          { observedAt: '2026-07-11', status: 'REJECTED' },
        ],
        passbook: null, bank: null,
      }] },
    },
  })

  // 3. EPS flag blocking a transfer + ₹2.8L stranded in an old account.
  await prisma.member.create({
    data: {
      uan: '100000000003', demoLabel: 'I changed jobs and my old PF never followed me',
      nameOnEpfo: 'IMRAN SHAIKH', nameOnAadhaar: 'IMRAN SHAIKH', nameOnBank: 'IMRAN SHAIKH',
      dobOnEpfo: '1992-11-23', dobOnAadhaar: '1992-11-23',
      bankNpciVerified: true, chequeUploadLegible: true,
      epsFlaggedButIneligible: true, otherUans: [],
      accounts: { create: [
        { memberId: 'KA/BNG/0099887/000/0009988', uan: '100000000003',
          employer: 'Present Labs', joinedOn: '2026-06-01', exitedOn: null,
          dateOfExitMarked: false, epfBalancePaise: 8000000, epsBalancePaise: 0, transferredOut: false },
        { memberId: 'MH/PUN/0033221/000/0003322', uan: '100000000003',
          employer: 'Former Technologies', joinedOn: '2021-01-04', exitedOn: '2026-05-15',
          dateOfExitMarked: true, epfBalancePaise: 27500000, epsBalancePaise: 500000, transferredOut: false },
      ] },
      claims: { create: [{
        id: 'CLM-2026-060103', uan: '100000000003',
        memberId: 'MH/PUN/0033221/000/0003322', type: 'FORM13',
        filedAt: '2026-06-01', amountPaise: 28000000, simulatedToday: '2026-08-22',
        portalHistory: [
          { observedAt: '2026-06-01', status: 'SUBMITTED_AT_PORTAL' },
          { observedAt: '2026-06-20', status: 'UNDER_PROCESS' },
        ],
        passbook: null, bank: null,
        grievances: { create: [
          { channel: 'EPFIGMS', filedAt: '2026-06-25', docket: 'EPFOG/E/2026/0065432',
            closedAt: '2026-06-26', resolved: false, closureText: 'Please contact your employer.' },
          { channel: 'CPGRAMS', filedAt: '2026-06-28', docket: 'MOLBR/E/2026/0012345',
            closedAt: '2026-07-14', resolved: false,
            closureText: 'Grievance disposed. Member advised to approach concerned regional office.' },
        ] },
      }] },
    },
  })
}

main().then(() => prisma.$disconnect())
```

- [ ] **Step 4: Push and seed**

```bash
npx prisma db push
npx tsx src/lib/db/seed.ts
```
Expected: three members created, no errors.

- [ ] **Step 5: Claim detail API — the one route that matters**

```ts
// src/app/api/claims/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { reconcile } from '@/lib/domain/reconcile'
import { slaClock } from '@/lib/domain/sla'
import { detectBlocker } from '@/lib/domain/blockers'
import { nextRung, draftFor } from '@/lib/domain/escalation'
import { nextAction } from '@/lib/domain/nextAction'
import type { ClaimRecord, MemberProfile } from '@/lib/domain/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await prisma.claim.findUnique({
    where: { id },
    include: { grievances: true, member: { include: { accounts: true } } },
  })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const profile: MemberProfile = {
    uan: row.member.uan,
    nameOnEpfo: row.member.nameOnEpfo,
    nameOnAadhaar: row.member.nameOnAadhaar,
    nameOnBank: row.member.nameOnBank,
    dobOnEpfo: row.member.dobOnEpfo,
    dobOnAadhaar: row.member.dobOnAadhaar,
    bankNpciVerified: row.member.bankNpciVerified,
    chequeUploadLegible: row.member.chequeUploadLegible,
    epsFlaggedButIneligible: row.member.epsFlaggedButIneligible,
    otherUans: row.member.otherUans,
    accounts: row.member.accounts.map(a => ({
      memberId: a.memberId, employer: a.employer, joinedOn: a.joinedOn,
      exitedOn: a.exitedOn, dateOfExitMarked: a.dateOfExitMarked,
      epfBalancePaise: a.epfBalancePaise, epsBalancePaise: a.epsBalancePaise,
      transferredOut: a.transferredOut,
    })),
  }

  const claim: ClaimRecord = {
    id: row.id,
    type: row.type as ClaimRecord['type'],
    filedAt: row.filedAt,
    amountPaise: row.amountPaise,
    memberId: row.memberId,
    portalHistory: row.portalHistory as ClaimRecord['portalHistory'],
    passbook: row.passbook as ClaimRecord['passbook'],
    bank: row.bank as ClaimRecord['bank'],
    rejectionCode: row.rejectionCode,
    grievances: row.grievances.map(g => ({
      channel: g.channel as ClaimRecord['grievances'][number]['channel'],
      filedAt: g.filedAt, docket: g.docket ?? undefined,
      closedAt: g.closedAt ?? undefined, closureText: g.closureText ?? undefined,
      resolved: g.resolved,
    })),
  }

  const today = row.simulatedToday
  const truth = reconcile(claim, today)
  const sla = slaClock(claim.filedAt, today)
  const blocker = detectBlocker(profile, claim, truth)
  const rung = nextRung(sla, claim.grievances)
  const draft = draftFor(rung, {
    uan: profile.uan, claimId: claim.id, claimType: claim.type,
    filedAt: claim.filedAt, amountPaise: claim.amountPaise,
    daysElapsed: sla.daysElapsed,
    priorDockets: claim.grievances.map(g => g.docket).filter(Boolean) as string[],
  })
  const action = nextAction({ truth, blocker, sla, rung, claimId: claim.id })

  return NextResponse.json({ claim, profile, truth, sla, blocker, rung, draft, action, today })
}
```

- [ ] **Step 6: Simulate route (judge demo control)**

```ts
// src/app/api/claims/[id]/simulate/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

const MS_PER_DAY = 86_400_000

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { advanceDays = 0, creditNow = false } = await req.json()

  const claim = await prisma.claim.findUnique({ where: { id } })
  if (!claim) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const today = new Date(Date.parse(claim.simulatedToday) + advanceDays * MS_PER_DAY)
    .toISOString().slice(0, 10)

  await prisma.claim.update({
    where: { id },
    data: {
      simulatedToday: today,
      ...(creditNow ? { bank: { observedAt: today, creditedPaise: claim.amountPaise } } : {}),
    },
  })

  return NextResponse.json({ ok: true, today })
}
```

- [ ] **Step 7: Grievance filing route**

```ts
// src/app/api/grievances/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

const PREFIX: Record<string, string> = {
  EPFIGMS: 'EPFOG/E/2026/', CPGRAMS: 'MOLBR/E/2026/',
  CPGRAMS_APPEAL: 'MOLBR/A/2026/', DPG: 'DPG/2026/',
  RTI: 'EPFOG/R/2026/', REGIONAL_EMAIL: 'EMAIL/',
}

export async function POST(req: Request) {
  const { claimId, channel } = await req.json()
  const claim = await prisma.claim.findUnique({ where: { id: claimId } })
  if (!claim) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const docket = `${PREFIX[channel] ?? 'REF/'}${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`

  const g = await prisma.grievance.create({
    data: { claimId, channel, filedAt: claim.simulatedToday, docket, resolved: false },
  })

  return NextResponse.json({ ok: true, grievance: g })
}
```

- [ ] **Step 8: Session + list + preflight routes**

```ts
// src/app/api/session/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function POST(req: Request) {
  const { uan, otp } = await req.json()
  if (otp !== '123456') {
    return NextResponse.json({ error: 'Wrong OTP. For this demo the OTP is always 123456.' }, { status: 401 })
  }
  const member = await prisma.member.findUnique({ where: { uan } })
  if (!member) return NextResponse.json({ error: 'No such demo UAN.' }, { status: 404 })

  const res = NextResponse.json({ ok: true, uan })
  res.cookies.set('uan', uan, { httpOnly: true, path: '/', sameSite: 'lax' })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('uan')
  return res
}
```

```ts
// src/app/api/claims/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const uan = (await cookies()).get('uan')?.value
  if (!uan) return NextResponse.json({ error: 'not logged in' }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { uan },
    include: { claims: true, accounts: true },
  })
  return NextResponse.json({ member })
}
```

```ts
// src/app/api/preflight/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { preflight } from '@/lib/domain/preflight'
import type { MemberProfile } from '@/lib/domain/types'

export async function POST(req: Request) {
  const { uan, memberId } = await req.json()
  const m = await prisma.member.findUnique({ where: { uan }, include: { accounts: true } })
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const profile: MemberProfile = {
    uan: m.uan, nameOnEpfo: m.nameOnEpfo, nameOnAadhaar: m.nameOnAadhaar, nameOnBank: m.nameOnBank,
    dobOnEpfo: m.dobOnEpfo, dobOnAadhaar: m.dobOnAadhaar,
    bankNpciVerified: m.bankNpciVerified, chequeUploadLegible: m.chequeUploadLegible,
    epsFlaggedButIneligible: m.epsFlaggedButIneligible, otherUans: m.otherUans,
    accounts: m.accounts.map(a => ({
      memberId: a.memberId, employer: a.employer, joinedOn: a.joinedOn, exitedOn: a.exitedOn,
      dateOfExitMarked: a.dateOfExitMarked, epfBalancePaise: a.epfBalancePaise,
      epsBalancePaise: a.epsBalancePaise, transferredOut: a.transferredOut,
    })),
  }
  return NextResponse.json({ issues: preflight(profile, memberId) })
}
```

- [ ] **Step 9: Verify by hand**

```bash
npm run dev
curl -s localhost:3000/api/claims/CLM-2026-070301 | head -c 600
```
Expected: JSON containing `"code":"DEBITED_NOT_CREDITED"` and `"rung":"CPGRAMS"`.

- [ ] **Step 10: Commit**

```bash
git add prisma src/lib/db src/app/api && git commit -m "feat: db, seeded personas, claim api with derived truth"
```

---

## Task 10: Design system — decide before building UI (B, 45 min)

Read `~/.claude/CLAUDE.md` (the anti-slop law) before this task and check the result against it at the end.

**Files:**
- Create: `src/app/globals.css` (tokens), `src/app/layout.tsx`

**Design decisions, locked:**

- **The signature artifact:** a *reconciliation strip* — three horizontal tracks (Member Portal, Passbook, Bank) drawn as one continuous timeline where the divergence is visible as a physical gap. This is the whole product in one image. It appears on the claim page, in the demo video thumbnail, and nowhere else on the internet.
- **Palette:** deep ink `#141210` base, warm paper `#F4F0E8` surface, a single tonal accent in muted amber `#B8763A` used only for the overdue clock. **No purple, no blue-purple gradient, no glow, no gradient text.** Overdue state shifts value, not saturation.
- **Type:** one licensed/self-hosted display face for numbers and headlines, `system-ui` for body. Do **not** use Inter, Space Grotesk, Sora, Syne, Fraunces, Cormorant, or JetBrains Mono. Numbers (money, days) get the display face at large size with generous tracking.
- **No pill badges, no icon-in-tile, no card hover-lift, no filled+outline button pair, no faint grid background.**
- **Content is visible by default.** No `opacity: 0` entrance animations anywhere. Motion is limited to the SLA clock ticking and the reconciliation strip drawing on load — both of which are visible in their final state without JS.

- [ ] **Step 1: Write tokens**

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --ink: #141210;
  --ink-soft: #4a443d;
  --paper: #f4f0e8;
  --paper-raised: #ffffff;
  --overdue: #b8763a;
  --line: rgba(20, 18, 16, 0.12);
}

:root:not([data-theme="light"]) {
  @media (prefers-color-scheme: dark) {
    --ink: #f2ede4;
    --ink-soft: #a49c90;
    --paper: #14120f;
    --paper-raised: #1d1a16;
    --line: rgba(242, 237, 228, 0.14);
  }
}

:root[data-theme="dark"] {
  --ink: #f2ede4;
  --ink-soft: #a49c90;
  --paper: #14120f;
  --paper-raised: #1d1a16;
  --line: rgba(242, 237, 228, 0.14);
}

body { background: var(--paper); color: var(--ink); }
```

- [ ] **Step 2: Layout with the mandatory disclaimer**

```tsx
// src/app/layout.tsx
export const metadata = { title: 'Where is my PF money?' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer style={{ borderTop: '1px solid var(--line)', padding: '2rem 1.5rem', color: 'var(--ink-soft)', fontSize: 14 }}>
          Independent hackathon prototype. Not affiliated with EPFO or the Government of India.
          All data shown is synthetic. No real government system is contacted.
        </footer>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx && git commit -m "feat: design tokens and layout shell"
```

---

## Task 11: TruthCard + SourceDiff — the money shot (B, 90 min)

**Files:**
- Create: `src/components/TruthCard.tsx`, `src/components/SourceDiff.tsx`

**Interfaces:**
- Consumes: `TruthState`, `SlaResult`, `NextAction`, `ClaimRecord` from `@/lib/domain/types`.
- Produces: `<TruthCard truth sla action amountPaise />`, `<SourceDiff claim today />`

- [ ] **Step 1: TruthCard**

One sentence of truth, one instruction, one clock. Nothing else.

```tsx
// src/components/TruthCard.tsx
import type { NextAction, SlaResult, TruthState } from '@/lib/domain/types'

const HEADLINE: Record<TruthState['code'], string> = {
  NOT_PICKED_UP: 'No one at EPFO has opened your claim yet',
  IN_REVIEW: 'An officer is reviewing your claim',
  APPROVED_AWAITING_MONEY: 'Approved, but the money has not moved yet',
  DEBITED_NOT_CREDITED: 'EPFO has taken the money out and not sent it to you',
  CREDITED: 'Your money has reached your bank',
  REJECTED: 'Your claim was rejected',
  REGRESSED: 'Your claim went backwards in EPFO’s system',
}

export function TruthCard({ truth, sla, action, amountPaise }: {
  truth: TruthState; sla: SlaResult; action: NextAction; amountPaise: number
}) {
  return (
    <section style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', padding: '2rem' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>The honest status</p>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.1, margin: '0.5rem 0 1rem' }}>
        {HEADLINE[truth.code]}
      </h1>

      <p style={{ fontSize: 20 }}>
        ₹{(amountPaise / 100).toLocaleString('en-IN')} ·{' '}
        <span style={{ color: sla.breached ? 'var(--overdue)' : 'var(--ink-soft)' }}>
          {sla.daysElapsed} days since you filed
          {sla.breached ? ` · ${sla.overdueByDays} days past EPFO’s own ${sla.slaDays}-day limit` : ''}
        </span>
      </p>

      {truth.contradictions.map(c => (
        <p key={c.kind} style={{ marginTop: '1rem', color: 'var(--ink-soft)' }}>{c.detail}</p>
      ))}

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
        <p style={{ fontSize: 22, fontWeight: 600 }}>{action.headline}</p>
        <p style={{ marginTop: '0.5rem' }}>{action.detail}</p>
        {action.cta && (
          <a href={action.cta.href} style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'underline' }}>
            {action.cta.label}
          </a>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: SourceDiff — the signature artifact**

Three tracks. Where they disagree, you see it.

```tsx
// src/components/SourceDiff.tsx
import type { ClaimRecord } from '@/lib/domain/types'

export function SourceDiff({ claim, today }: { claim: ClaimRecord; today: string }) {
  const rows = [
    {
      name: 'EPFO member portal',
      says: claim.portalHistory.length
        ? claim.portalHistory[claim.portalHistory.length - 1].status.replace(/_/g, ' ').toLowerCase()
        : 'no record',
      on: claim.portalHistory.at(-1)?.observedAt ?? '—',
    },
    {
      name: 'EPFO passbook',
      says: claim.passbook
        ? claim.passbook.debitedPaise !== null
          ? `₹${(claim.passbook.debitedPaise / 100).toLocaleString('en-IN')} debited`
          : 'settled shown, nothing debited'
        : 'no record',
      on: claim.passbook?.observedAt ?? '—',
    },
    {
      name: 'Your bank account',
      says: claim.bank?.creditedPaise
        ? `₹${(claim.bank.creditedPaise / 100).toLocaleString('en-IN')} credited`
        : 'nothing received',
      on: claim.bank?.observedAt ?? today,
    },
  ]

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 20 }}>Three systems. Three different answers.</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
        EPFO never shows you these side by side. This is why nobody can tell what is actually happening.
      </p>
      <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '1rem 0', width: '38%' }}>{r.name}</td>
                <td style={{ padding: '1rem 0', fontWeight: 600 }}>{r.says}</td>
                <td style={{ padding: '1rem 0', color: 'var(--ink-soft)', textAlign: 'right' }}>{r.on}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`, open `/claim/CLM-2026-070301` after Task 12.
Expected: three rows visibly disagreeing.

- [ ] **Step 4: Commit**

```bash
git add src/components && git commit -m "feat: truth card and three-source diff"
```

---

## Task 12: Claim page — blocker, escalation, timeline (B, 120 min)

**Files:**
- Create: `src/app/claim/[id]/page.tsx`, `src/components/BlockerPanel.tsx`, `src/components/EscalationLadder.tsx`, `src/components/ClaimTimeline.tsx`

- [ ] **Step 1: BlockerPanel**

```tsx
// src/components/BlockerPanel.tsx
import type { Blocker } from '@/lib/domain/types'

const WHO: Record<Blocker['whoFixesIt'], string> = {
  YOU: 'You can fix this',
  EMPLOYER: 'Your employer has to fix this',
  EPFO: 'Only EPFO can fix this',
}

export function BlockerPanel({ blocker }: { blocker: Blocker }) {
  if (blocker.code === 'NONE') return null
  return (
    <section id="blocker" style={{ marginTop: '3rem' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{WHO[blocker.whoFixesIt]}</p>
      <h2 style={{ fontSize: 26, marginTop: '0.5rem' }}>{blocker.title}</h2>
      <p style={{ marginTop: '0.75rem', maxWidth: '60ch' }}>{blocker.because}</p>
      {blocker.fixSteps.length > 0 && (
        <ol style={{ marginTop: '1.5rem', maxWidth: '60ch', paddingLeft: '1.2rem' }}>
          {blocker.fixSteps.map(s => (
            <li key={s} style={{ marginBottom: '0.75rem' }}>{s}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
```

- [ ] **Step 2: EscalationLadder with copy + file**

```tsx
// src/components/EscalationLadder.tsx
'use client'
import { useState } from 'react'
import type { Draft, GrievanceRecord, Rung } from '@/lib/domain/types'

const ORDER: Rung[] = ['EPFIGMS', 'CPGRAMS', 'REGIONAL_EMAIL', 'CPGRAMS_APPEAL', 'DPG', 'RTI']
const LABEL: Record<Rung, string> = {
  WAIT: 'Wait',
  EPFIGMS: 'EPFiGMS grievance',
  CPGRAMS: 'CPGRAMS grievance',
  REGIONAL_EMAIL: 'Email the Regional PF Office',
  CPGRAMS_APPEAL: 'Appeal on CPGRAMS',
  DPG: 'Directorate of Public Grievances',
  RTI: 'RTI to the CPIO',
}

export function EscalationLadder({ claimId, rung, draft, history }: {
  claimId: string; rung: Rung; draft: Draft; history: GrievanceRecord[]
}) {
  const [filed, setFiled] = useState<GrievanceRecord[]>(history)
  const [busy, setBusy] = useState(false)

  const done = new Set(filed.map(f => f.channel))

  async function file() {
    setBusy(true)
    const res = await fetch('/api/grievances', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claimId, channel: rung }),
    })
    const json = await res.json()
    setFiled([...filed, json.grievance])
    setBusy(false)
  }

  return (
    <section id="escalate" style={{ marginTop: '3rem' }}>
      <h2 style={{ fontSize: 26 }}>The escalation ladder</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem', maxWidth: '60ch' }}>
        This sequence is not published anywhere by EPFO. People work it out on forums after months of being ignored.
      </p>

      <ol style={{ marginTop: '1.5rem', paddingLeft: 0, listStyle: 'none' }}>
        {ORDER.map(r => {
          const isDone = done.has(r)
          const isNow = r === rung
          const rec = filed.find(f => f.channel === r)
          return (
            <li key={r} style={{
              borderTop: '1px solid var(--line)', padding: '1rem 0',
              opacity: isDone || isNow ? 1 : 0.55,
            }}>
              <strong style={{ color: isNow ? 'var(--overdue)' : 'var(--ink)' }}>{LABEL[r]}</strong>
              {rec?.docket && <span style={{ color: 'var(--ink-soft)' }}> · {rec.docket}</span>}
              {rec?.closureText && (
                <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem', maxWidth: '60ch' }}>
                  Closed with: “{rec.closureText}” — this did not answer the question, which is what unlocks the next step.
                </p>
              )}
              {isNow && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{draft.where}</p>
                  <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>{draft.subject}</p>
                  <pre style={{
                    whiteSpace: 'pre-wrap', marginTop: '0.75rem', padding: '1rem',
                    background: 'var(--paper)', border: '1px solid var(--line)', maxWidth: '70ch',
                  }}>{draft.body}</pre>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
                    <button onClick={() => navigator.clipboard.writeText(draft.body)}>Copy this letter</button>
                    <button onClick={file} disabled={busy}>
                      {busy ? 'Filing…' : 'File it (simulated)'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
```

- [ ] **Step 3: ClaimTimeline**

```tsx
// src/components/ClaimTimeline.tsx
import type { ClaimRecord } from '@/lib/domain/types'

export function ClaimTimeline({ claim }: { claim: ClaimRecord }) {
  const events = [
    ...claim.portalHistory.map(p => ({
      at: p.observedAt, what: `Portal: ${p.status.replace(/_/g, ' ').toLowerCase()}`,
    })),
    ...(claim.passbook ? [{
      at: claim.passbook.observedAt,
      what: claim.passbook.debitedPaise !== null
        ? `Passbook: ₹${(claim.passbook.debitedPaise / 100).toLocaleString('en-IN')} debited`
        : 'Passbook: settled shown',
    }] : []),
    ...claim.grievances.map(g => ({
      at: g.filedAt, what: `You filed: ${g.channel.replace(/_/g, ' ').toLowerCase()}`,
    })),
    ...(claim.bank?.creditedPaise ? [{
      at: claim.bank.observedAt,
      what: `Bank: ₹${(claim.bank.creditedPaise / 100).toLocaleString('en-IN')} credited`,
    }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <section style={{ marginTop: '3rem' }}>
      <h2 style={{ fontSize: 20 }}>Everything that has happened</h2>
      <ul style={{ marginTop: '1rem', paddingLeft: 0, listStyle: 'none' }}>
        {events.map((e, i) => (
          <li key={i} style={{ borderTop: '1px solid var(--line)', padding: '0.75rem 0', display: 'flex', gap: '1.5rem' }}>
            <span style={{ color: 'var(--ink-soft)', minWidth: 100 }}>{e.at}</span>
            <span>{e.what}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: The page**

```tsx
// src/app/claim/[id]/page.tsx
import { TruthCard } from '@/components/TruthCard'
import { SourceDiff } from '@/components/SourceDiff'
import { BlockerPanel } from '@/components/BlockerPanel'
import { EscalationLadder } from '@/components/EscalationLadder'
import { ClaimTimeline } from '@/components/ClaimTimeline'

async function getClaim(id: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/claims/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Claim not found')
  return res.json()
}

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await getClaim(id)

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <TruthCard truth={d.truth} sla={d.sla} action={d.action} amountPaise={d.claim.amountPaise} />
      <SourceDiff claim={d.claim} today={d.today} />
      <BlockerPanel blocker={d.blocker} />
      <EscalationLadder claimId={d.claim.id} rung={d.rung} draft={d.draft} history={d.claim.grievances} />
      <ClaimTimeline claim={d.claim} />
    </main>
  )
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`, open `http://localhost:3000/claim/CLM-2026-070301`
Expected: headline "EPFO has taken the money out and not sent it to you", 50 days, CPGRAMS highlighted as the current rung with a drafted letter.

- [ ] **Step 6: Commit**

```bash
git add src/app/claim src/components && git commit -m "feat: claim page with blocker, ladder and timeline"
```

---

## Task 13: Landing, login, dashboard (B, 90 min)

**Files:**
- Create: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`

- [ ] **Step 1: Landing that states the problem in one screen**

The hero must NOT be eyebrow → headline → subtext → two buttons. Lead with the contradiction itself.

```tsx
// src/app/page.tsx
import Link from 'next/link'

const DEMOS = [
  { uan: '100000000001', label: 'Money left my PF but never reached my bank', who: 'Rajesh, 32, Bengaluru' },
  { uan: '100000000002', label: 'My claim keeps getting rejected and I do not know why', who: 'Sunita, 37, Delhi' },
  { uan: '100000000003', label: 'I changed jobs and my old PF never followed me', who: 'Imran, 33, Pune' },
]

export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <p style={{ fontSize: 'clamp(30px, 6vw, 56px)', lineHeight: 1.15, maxWidth: '18ch' }}>
        Your passbook says settled.<br />Your bank says nothing arrived.<br />
        <span style={{ color: 'var(--overdue)' }}>Both are EPFO.</span>
      </p>

      <p style={{ marginTop: '2rem', maxWidth: '58ch', fontSize: 18 }}>
        Every salaried person in India has a PF account, and almost nobody can tell what is happening
        to their own money. This is a prototype of what the member portal should do: reconcile every
        system, name the real blocker in plain language, run a visible clock, and escalate for you
        when EPFO misses its own deadline.
      </p>

      <section style={{ marginTop: '3.5rem' }}>
        <h2 style={{ fontSize: 20 }}>Sign in as one of three people</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem' }}>
          Every case below is a real, documented failure. OTP for all of them is <strong>123456</strong>.
        </p>
        <ul style={{ marginTop: '1.5rem', padding: 0, listStyle: 'none' }}>
          {DEMOS.map(d => (
            <li key={d.uan} style={{ borderTop: '1px solid var(--line)', padding: '1.25rem 0' }}>
              <Link href={`/login?uan=${d.uan}`} style={{ fontSize: 19 }}>{d.label}</Link>
              <p style={{ color: 'var(--ink-soft)', marginTop: '0.35rem' }}>{d.who} · UAN {d.uan}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Login**

```tsx
// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const uanFromLink = useSearchParams().get('uan') ?? ''
  const [uan, setUan] = useState(uanFromLink)
  const [otp, setOtp] = useState('123456')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uan, otp }),
    })
    if (!res.ok) { setError((await res.json()).error); return }
    router.push('/dashboard')
  }

  return (
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: 30 }}>Sign in</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem' }}>
        Synthetic UANs only. The OTP is pre-filled because this is a demo.
      </p>
      <form onSubmit={submit} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
        <label>UAN
          <input value={uan} onChange={e => setUan(e.target.value)} required inputMode="numeric"
            style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem',
                     border: '1px solid var(--line)', background: 'var(--paper-raised)', color: 'var(--ink)' }} />
        </label>
        <label>OTP
          <input value={otp} onChange={e => setOtp(e.target.value)} required inputMode="numeric"
            style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem',
                     border: '1px solid var(--line)', background: 'var(--paper-raised)', color: 'var(--ink)' }} />
        </label>
        {error && <p style={{ color: 'var(--overdue)' }}>{error}</p>}
        <button type="submit" style={{ padding: '0.85rem', background: 'var(--ink)', color: 'var(--paper)' }}>
          Continue
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Dashboard with stranded money**

```tsx
// src/app/dashboard/page.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'

export default async function Dashboard() {
  const uan = (await cookies()).get('uan')?.value
  if (!uan) redirect('/login')

  const m = await prisma.member.findUnique({
    where: { uan }, include: { claims: true, accounts: true },
  })
  if (!m) redirect('/login')

  const current = m.claims[0]?.memberId ?? ''
  const stranded = findStranded({
    uan: m.uan, nameOnEpfo: m.nameOnEpfo, nameOnAadhaar: m.nameOnAadhaar, nameOnBank: m.nameOnBank,
    dobOnEpfo: m.dobOnEpfo, dobOnAadhaar: m.dobOnAadhaar,
    bankNpciVerified: m.bankNpciVerified, chequeUploadLegible: m.chequeUploadLegible,
    epsFlaggedButIneligible: m.epsFlaggedButIneligible, otherUans: m.otherUans,
    accounts: m.accounts.map(a => ({
      memberId: a.memberId, employer: a.employer, joinedOn: a.joinedOn, exitedOn: a.exitedOn,
      dateOfExitMarked: a.dateOfExitMarked, epfBalancePaise: a.epfBalancePaise,
      epsBalancePaise: a.epsBalancePaise, transferredOut: a.transferredOut,
    })),
  }, current)

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <p style={{ color: 'var(--ink-soft)' }}>UAN {m.uan}</p>
      <h1 style={{ fontSize: 32, marginTop: '0.25rem' }}>{m.nameOnEpfo}</h1>

      <h2 style={{ fontSize: 20, marginTop: '2.5rem' }}>Your claims</h2>
      <ul style={{ padding: 0, listStyle: 'none', marginTop: '1rem' }}>
        {m.claims.map(c => (
          <li key={c.id} style={{ borderTop: '1px solid var(--line)', padding: '1.25rem 0' }}>
            <Link href={`/claim/${c.id}`} style={{ fontSize: 18 }}>
              {c.type} · ₹{(c.amountPaise / 100).toLocaleString('en-IN')}
            </Link>
            <p style={{ color: 'var(--ink-soft)', marginTop: '0.25rem' }}>Filed {c.filedAt} · {c.id}</p>
          </li>
        ))}
      </ul>

      {stranded.length > 0 && (
        <section style={{ marginTop: '3rem', borderTop: '1px solid var(--line)', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: 24 }}>
            You have ₹{(strandedTotalPaise(stranded) / 100).toLocaleString('en-IN')} sitting in an old account
          </h2>
          <p style={{ marginTop: '0.75rem', maxWidth: '58ch' }}>
            PF does not follow you when you change jobs. Your new employer opens a new account under the
            same UAN, and the old balance stays where it is until you file a transfer yourself. EPFO
            never tells you this.
          </p>
          <ul style={{ marginTop: '1.5rem', padding: 0, listStyle: 'none' }}>
            {stranded.map(a => (
              <li key={a.memberId} style={{ borderTop: '1px solid var(--line)', padding: '1rem 0' }}>
                <strong>{a.employer}</strong> · ₹{((a.epfBalancePaise + a.epsBalancePaise) / 100).toLocaleString('en-IN')}
                <p style={{ color: 'var(--ink-soft)', marginTop: '0.25rem' }}>{a.memberId}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verify the full journey**

Run: `npm run dev`. Click through `/` → demo persona → `/dashboard` → a claim.
Expected: no dead links, no blank screens.

- [ ] **Step 5: Commit**

```bash
git add src/app && git commit -m "feat: landing, login, dashboard"
```

---

## Task 14: Demo controls for judges (S, 40 min)

Varun said every feature demoed must work. This page lets a judge *watch* the clock breach and the ladder advance, live, in 20 seconds. It is the single highest-value demo asset.

**Files:**
- Create: `src/app/demo/page.tsx`

- [ ] **Step 1: Build it**

```tsx
// src/app/demo/page.tsx
'use client'
import { useState } from 'react'

const CLAIMS = ['CLM-2026-070301', 'CLM-2026-061502', 'CLM-2026-060103']

export default function Demo() {
  const [log, setLog] = useState<string[]>([])

  async function advance(id: string, days: number, creditNow = false) {
    const res = await fetch(`/api/claims/${id}/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ advanceDays: days, creditNow }),
    })
    const json = await res.json()
    setLog([`${id}: simulated date is now ${json.today}${creditNow ? ', money credited' : ''}`, ...log])
  }

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: 28 }}>Demo controls</h1>
      <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem', maxWidth: '58ch' }}>
        Not part of the citizen experience. This exists so you can move simulated time forward and
        watch the SLA clock breach and the escalation ladder unlock, without waiting 50 days.
      </p>

      {CLAIMS.map(id => (
        <section key={id} style={{ borderTop: '1px solid var(--line)', padding: '1.5rem 0' }}>
          <strong>{id}</strong>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => advance(id, 7)}>+7 days</button>
            <button onClick={() => advance(id, 30)}>+30 days</button>
            <button onClick={() => advance(id, 0, true)}>Credit the money</button>
          </div>
        </section>
      ))}

      <ul style={{ marginTop: '2rem', padding: 0, listStyle: 'none', color: 'var(--ink-soft)' }}>
        {log.map((l, i) => <li key={i} style={{ padding: '0.35rem 0' }}>{l}</li>)}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Verify the loop**

Open `/demo`, press +30 days on `CLM-2026-060103`, then open that claim.
Expected: rung has advanced, next letter is drafted.

- [ ] **Step 3: Commit**

```bash
git add src/app/demo && git commit -m "feat: judge demo controls"
```

---

## Task 15: Accessibility and low-connectivity pass (B, 60 min)

The brief explicitly names mobile users, slow connections and limited digital experience. This is a scored criterion, not a nicety.

**Files:**
- Create: `src/components/LangToggle.tsx`, `src/components/ReadAloud.tsx`, `src/lib/i18n/strings.ts`
- Modify: `src/app/claim/[id]/page.tsx`

- [ ] **Step 1: Hindi strings for the parts that carry meaning**

```ts
// src/lib/i18n/strings.ts
import type { TruthCode } from '@/lib/domain/types'

export const HEADLINE_HI: Record<TruthCode, string> = {
  NOT_PICKED_UP: 'EPFO ने अभी तक आपका क्लेम खोला ही नहीं है',
  IN_REVIEW: 'आपका क्लेम जाँच में है',
  APPROVED_AWAITING_MONEY: 'मंज़ूरी मिल गई, पर पैसा अभी नहीं भेजा गया',
  DEBITED_NOT_CREDITED: 'EPFO ने पैसा काट लिया है, पर आपके बैंक में नहीं भेजा',
  CREDITED: 'आपका पैसा आपके बैंक में पहुँच गया है',
  REJECTED: 'आपका क्लेम रद्द कर दिया गया',
  REGRESSED: 'EPFO के सिस्टम में आपका क्लेम पीछे चला गया',
}
```

- [ ] **Step 2: Read-aloud using the browser's own speech engine (no API key, works offline)**

```tsx
// src/components/ReadAloud.tsx
'use client'
export function ReadAloud({ text, lang = 'en-IN' }: { text: string; lang?: string }) {
  function speak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  return <button onClick={speak} aria-label="Read this aloud">Read aloud</button>
}
```

- [ ] **Step 3: Checks to run and fix**

- [ ] Every page readable at 320px width with no horizontal scroll.
- [ ] All text meets 4.5:1 contrast against its background in both themes.
- [ ] Tab order reaches every button and link; focus is visible.
- [ ] DevTools → Network → **Slow 3G**: first meaningful paint under 3 seconds. If not, remove client components that are not interactive.
- [ ] JavaScript disabled: the truth card, source diff, blocker and timeline still render (they are server components). Only the ladder buttons stop working. Confirm this.

- [ ] **Step 4: Commit**

```bash
git add src/components src/lib/i18n && git commit -m "feat: hindi headlines, read aloud, a11y pass"
```

---

## Task 16: Deploy (S, 30 min)

- [ ] **Step 1: Neon + Vercel**

```bash
# create a free Postgres at neon.tech, copy the connection string
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_BASE_URL   # your production URL
npx prisma db push
npx tsx src/lib/db/seed.ts
vercel --prod
```

- [ ] **Step 2: Verify the deployed URL in a private window**

- [ ] Landing loads with no login.
- [ ] All three demo logins work with OTP `123456`.
- [ ] Claim pages load.
- [ ] `/demo` controls work against production.
- [ ] Test on an actual phone on mobile data, not wifi.

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "chore: production deploy"
```

---

## Task 17: The 2-minute video (both, 90 min)

Format is fixed by the video: **minute 1 = using it as a citizen, minute 2 = how you built it.** Do not exceed 2 minutes.

**Minute 1 script beats:**
1. (0:00-0:12) The real problem, stated as a fact. "Right now, thousands of people have PF claims where the passbook says settled and the bank got nothing. EPFO shows them the same status either way."
2. (0:12-0:35) Log in as Rajesh. Land on the truth card. Read the headline aloud. Show the 50-day clock.
3. (0:35-0:50) Scroll to the three-source diff. "Three EPFO systems, three different answers. The portal never shows them together."
4. (0:50-1:05) The blocker panel: who has to fix it, and what to do.
5. (1:05-1:20) The escalation ladder. Show the CPGRAMS letter already written. Click file. Docket appears.

**Minute 2 script beats:**
1. Why these decisions: the domain layer is pure functions so the reconciliation logic is testable and auditable — show `npm run test` passing.
2. What is real and what is mocked, said plainly.
3. Where the escalation ladder came from: it is undocumented folk knowledge from people who waited months. Encoding it is the actual product.
4. How it would work for real: EPFO already has these three data sources internally. This needs no new data, only an honest reconciliation view.

- [ ] Record with OBS or Loom. Both team members on camera if possible — the video explicitly says this is better.
- [ ] Do a dry run first. Every click must work. Nothing explained away.

---

## Task 18: Submission package (both, 45 min)

Due **28 Aug, 8:00 PM IST**. Do this on 27 Aug, not on the day.

- [ ] **Live public link** — open it in a private window on a phone to confirm no login wall and no access request.
- [ ] **Video** — under 2 minutes, uploaded, link works without requesting access.
- [ ] **250-word summary** — exactly 250 words. Use the "product in one paragraph" section above as the spine. Must cover: the problem, who it affects, what you changed, what is functional vs mocked, known limitations.
- [ ] **Partner email cross-entry** — Suryansh enters Bahni's, Bahni enters Suryansh's. Both must use the same emails they registered with (`suryanshpatwa261@gmail.com` and `bahnimitra2000@gmail.com`). Getting this wrong voids the team.
- [ ] **Repo link** (optional but do it) — public, README explaining setup.
- [ ] **Honesty section**, written plainly. Say: no real EPFO integration exists or is possible without official access; all data is synthetic; the SLA figure and escalation timings are modelled on published EPFO timelines and documented user experience; the disbursal-hold scenario is modelled on publicly reported failures in July-August 2026.

---

## Cut list (if you run out of time, cut in this order)

1. Hindi strings and read-aloud (Task 15 partial) — keep the a11y checks, cut the translation.
2. `/file` pre-flight UI — the API and logic exist and are tested; demo it via the transfer story instead.
3. ClaimTimeline — the source diff carries the story alone.
4. The third persona (Imran) — two personas is enough for a 2-minute video.

**Never cut:** the truth card, the three-source diff, the blocker panel, the escalation ladder. Those four are the product.

---

## Self-review notes

- Every task ends with something you can open in a browser or a passing test.
- Types used in Tasks 10-15 all come from Task 2. No renames.
- `nextRung` is used in Task 9's API and Task 12's UI with the same signature.
- `detectBlocker(profile, claim, truth)` argument order is identical in tests, API and docs.
- Global constraints (footer disclaimer, synthetic data, browser-only, judge credentials) appear as concrete steps in Tasks 10, 13, 16 and 18.
