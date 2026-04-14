'use client'

import { useEffect, useState } from 'react'

const PHRASES = [
  'do seu negócio.',
  'para todos.',
  'com transparência.',
  'sem fronteiras.',
  'do seu jeito.',
  'em tempo real.',
]

const TYPE_SPEED   = 70
const DELETE_SPEED = 38
const PAUSE_AFTER  = 2200
const PAUSE_BEFORE = 380

export function TypewriterTitle() {
  const [displayed,  setDisplayed]  = useState('')
  const [phraseIdx,  setPhraseIdx]  = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const target = PHRASES[phraseIdx]
    if (!isDeleting) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), TYPE_SPEED)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setIsDeleting(true), PAUSE_AFTER)
      return () => clearTimeout(t)
    }
    if (displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), DELETE_SPEED)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setIsDeleting(false)
      setPhraseIdx(i => (i + 1) % PHRASES.length)
    }, PAUSE_BEFORE)
    return () => clearTimeout(t)
  }, [displayed, isDeleting, phraseIdx])

  return (
    <div style={{
      opacity:       mounted ? 1 : 0,
      transition:    'opacity 0.9s ease',
      textAlign:     'center',
      padding:       '0 28px',
      userSelect:    'none',
      pointerEvents: 'none',
      lineHeight:    1.25,
    }}>
      {/* Linha estática - TAMANHO MAIOR */}
      <div style={{
        fontSize:      'clamp(24px, 3.5vw, 42px)',
        fontWeight:    600,
        color:         'rgba(255,255,255,0.78)',
        fontFamily:    'Inter, system-ui, sans-serif',
        letterSpacing: '-0.025em',
        textShadow:    '0 2px 24px rgba(0,0,0,0.95)',
        marginBottom:  '5px',
      }}>
        Construindo o futuro digital
      </div>

      {/* Linha animada dourada - TAMANHO AINDA MAIOR */}
      <div style={{
        fontSize:       'clamp(32px, 4.8vw, 64px)',
        fontWeight:     800,
        fontFamily:     'Inter, system-ui, sans-serif',
        letterSpacing:  '-0.03em',
        minHeight:      '1.2em',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '2px',
      }}>
        <span style={{
          background:           'linear-gradient(135deg, #F5A800 0%, #ffd345 50%, #F5A800 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor:  'transparent',
          backgroundClip:       'text',
          filter:               'drop-shadow(0 0 12px rgba(245,168,0,0.4))',
          animation:            'pulseGlow 3s ease-in-out infinite',
        }}>
          {displayed}
        </span>
        <span style={{
          display:      'inline-block',
          width:        '3px',
          height:       '0.9em',
          background:   '#F5A800',
          borderRadius: '4px',
          marginLeft:   '6px',
          boxShadow:    '0 0 15px rgba(245,168,0,0.8)',
          flexShrink:   0,
          opacity:      1,
          animation:    'smoothBlink 1.1s step-end infinite',
        }} />
      </div>

      <style>{`
        @keyframes smoothBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(245,168,0,0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(245,168,0,0.6)); }
        }
      `}</style>
    </div>
  )
}
