'use client'

import { useState, useEffect, useCallback } from 'react'

interface ReadAloudProps {
  text: string
  lang?: string
}

export function ReadAloud({ text, lang = 'en-IN' }: ReadAloudProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (isSpeaking) {
      stop()
      return
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.95 // Slightly slower for clarity in public service context

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [text, lang, isSpeaking, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  if (!isSupported) {
    return null
  }

  return (
    <button
      onClick={speak}
      type="button"
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
      aria-pressed={isSpeaking}
      style={{
        ...styles.button,
        ...(isSpeaking ? styles.buttonActive : {}),
      }}
    >
      <span style={styles.icon}>{isSpeaking ? '⏹️' : '🔊'}</span>
      <span>{isSpeaking ? 'Stop Reading' : 'Listen'}</span>
      {isSpeaking && <span style={styles.pulseDot} />}
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    padding: '0.4rem 0.85rem',
    borderRadius: '9999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  buttonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
  },
  icon: {
    fontSize: '0.9rem',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    display: 'inline-block',
  },
}