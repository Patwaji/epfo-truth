'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2Icon } from '@/components/icons'

interface ReadAloudProps {
  text: string
  lang?: string
}

/**
 * Reads the page's verdict aloud using the browser's own speech engine, for the
 * low-literacy readers the brief names. No API key, no network.
 *
 * The presence of window.speechSynthesis is not enough to know it can speak:
 * on a machine with no installed voices (common on Linux, and on some Android
 * builds) the API exists, speak() is accepted, and nothing is ever said, with
 * no error raised. Voices also arrive asynchronously, so a check on mount alone
 * reports zero on browsers that populate them later.
 *
 * So this waits for voices, and renders nothing at all when there are none. A
 * button that cannot do its job is worse than no button.
 */
export function ReadAloud({ text, lang = 'en-IN' }: ReadAloudProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [failed, setFailed] = useState(false)
  const startTimer = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  useEffect(() => stop, [stop])

  const speak = useCallback(() => {
    if (isSpeaking) {
      stop()
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.95 // a little slower, this is money and deadlines

    // Prefer an Indian English voice, then any English one, then whatever the
    // machine has. Without an explicit pick some engines stay silent.
    const preferred =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang?.startsWith('en')) ??
      voices[0]
    // Assigning a voice the engine will not accept throws, which would kill the
    // click silently. The default voice is fine if this fails.
    try {
      if (preferred) utterance.voice = preferred
    } catch {
      /* fall back to the engine default */
    }

    utterance.onstart = () => {
      if (startTimer.current) window.clearTimeout(startTimer.current)
      setIsSpeaking(true)
      setFailed(false)
    }
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      setIsSpeaking(false)
      setFailed(true)
    }

    window.speechSynthesis.speak(utterance)

    // If nothing has started speaking shortly after, the engine has swallowed
    // it. Say so rather than leaving a button that looks broken.
    startTimer.current = window.setTimeout(() => {
      if (!window.speechSynthesis.speaking) setFailed(true)
    }, 1200)
  }, [isSpeaking, stop, text, lang, voices])

  // Nothing can be spoken on this device. Render nothing.
  if (voices.length === 0) return null

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <button
        onClick={speak}
        type="button"
        aria-label={isSpeaking ? 'Stop reading' : 'Read this aloud'}
        aria-pressed={isSpeaking}
        style={{ ...styles.button, ...(isSpeaking ? styles.buttonActive : {}) }}
      >
        <span style={styles.icon} aria-hidden="true">
          <Volume2Icon size={16} />
        </span>
        <span>{isSpeaking ? 'Stop reading' : 'Listen'}</span>
      </button>

      {failed && (
        <span role="status" style={{ fontSize: '0.82rem', color: 'var(--ink-3)' }}>
          Your browser has no speech voice installed.
        </span>
      )}
    </span>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--paper)',
    border: '1px solid var(--line)',
    color: 'var(--ink)',
    padding: '0.4rem 0.85rem',
    borderRadius: '9999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
  },
  buttonActive: {
    backgroundColor: 'var(--green-soft)',
    borderColor: 'var(--green)',
    color: 'var(--green)',
  },
  icon: {
    display: 'inline-flex',
  },
}
