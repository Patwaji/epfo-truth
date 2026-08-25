import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves the @ alias into src', async () => {
    const mod = await import('@/lib/domain/smoke')
    expect(mod.ok()).toBe('ok')
  })
})
