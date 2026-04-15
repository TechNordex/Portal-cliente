'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/* ─── Tipos ──────────────────────────────────────────── */
type Phase = 'enter' | 'hold' | 'fly' | 'reveal' | 'done'

interface Props {
  /** Ref para o wrapper da logo real na página (opacity:0 durante intro) */
  realLogoWrapRef: React.RefObject<HTMLDivElement | null>
  /** Chamado quando o overlay termina — libera a página */
  onDone: () => void
  /** Chamado quando a fase 'fly' começa — exibe painéis por baixo */
  onReveal: () => void
}

/* ─── Campo de estrelas leve (apenas para o overlay) ─── */
function IntroStars({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })!

    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.15 + Math.random() * 0.85,
      base: 0.03 + Math.random() * 0.16,
      phase: Math.random() * Math.PI * 2,
      speed: 0.08 + Math.random() * 0.45,
      gold: Math.random() < 0.14,
    }))

    let raf: number
    const tick = (ts: number) => {
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        const t = Math.sin(ts * 0.001 * s.speed + s.phase)
        const a = Math.max(0, s.base + t * 0.045)
        ctx.globalAlpha = a
        ctx.fillStyle = s.gold ? '#F5A800' : '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: active ? 0.85 : 0,
        transition: 'opacity 1.4s ease',
      }}
    />
  )
}

/* ─── Overlay principal ───────────────────────────────── */
export function IntroOverlay({ realLogoWrapRef, onDone, onReveal }: Props) {
  const [phase, setPhase] = useState<Phase>('enter')
  const introLogoRef = useRef<HTMLDivElement>(null)
  const skipped = useRef(false)
  const revealCalled = useRef(false)

  /* ── Skip ─────────────────────────────────────────── */
  const skip = useCallback(() => {
    if (skipped.current) return
    skipped.current = true
    if (!revealCalled.current) { revealCalled.current = true; onReveal() }
    setPhase('done')
    onDone()
  }, [onDone, onReveal])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') skip() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [skip])

  /* ── Máquina de fases ───────────────────────────────  */
  useEffect(() => {
    // A animação roda sempre que a tela carrega

    const timers = [
      // 0 → enter: logo surge
      setTimeout(() => setPhase('hold'), 420),

      // hold → fly: logo voa para posição real
      setTimeout(() => setPhase('fly'), 2100),

      // fly → reveal: overlay faz fade-out, painéis sobem
      setTimeout(() => {
        setPhase('reveal')
        if (!revealCalled.current) { revealCalled.current = true; onReveal() }
      }, 2850),

      // reveal → done: desmonta overlay
      setTimeout(() => {
        if (!skipped.current) { setPhase('done'); onDone() }
      }, 3500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone, onReveal])

  /* ── FLIP: anima logo intro → posição real ─────────── */
  useEffect(() => {
    if (phase !== 'fly') return
    const intro = introLogoRef.current
    const target = realLogoWrapRef.current
    if (!intro || !target) return

    const iR = intro.getBoundingClientRect()
    let tR = target.getBoundingClientRect()

    if (tR.width === 0) {
      const mobileTarget = document.getElementById('login-mobile-logo')
      if (mobileTarget) {
        tR = mobileTarget.getBoundingClientRect()
      }
    }

    const dx = (tR.left + tR.width / 2) - (iR.left + iR.width / 2)
    const dy = (tR.top + tR.height / 2) - (iR.top + iR.height / 2)
    const scale = tR.width / iR.width

    /* Força reflow antes de ligar a transição */
    intro.style.transition = 'none'
    void intro.getBoundingClientRect()

    intro.style.transition = [
      'transform 0.88s cubic-bezier(0.22,1,0.36,1)',
      'opacity   0.50s ease 0.30s',
      'filter    0.50s ease',
    ].join(', ')

    intro.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
    intro.style.opacity = '0'
    intro.style.filter = 'drop-shadow(0 0 24px rgba(245,168,0,0.2))'
  }, [phase, realLogoWrapRef])

  /* ── Done: desmonta ─────────────────────────────────── */
  if (phase === 'done') return null

  /* ── Estilos dinâmicos ──────────────────────────────── */
  const overlayOpacity = phase === 'reveal' ? 0 : 1

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#060606',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: overlayOpacity,
        transition: phase === 'reveal'
          ? 'opacity 0.65s cubic-bezier(0.22,1,0.36,1)'
          : undefined,
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Campo de estrelas suave */}
      <IntroStars active={phase !== 'enter'} />

      {/* Logo — elemento que voa */}
      <div
        ref={introLogoRef}
        style={{
          position: 'relative',
          zIndex: 2,
          transformOrigin: 'center center',
          opacity: phase === 'enter' ? 0 : 1,
          transition: phase === 'enter'
            ? 'opacity 0.55s ease'
            : undefined,
          /* Animação de pulse só no hold */
          animation: phase === 'hold'
            ? 'nordexIntroPulse 2.6s ease-in-out infinite'
            : 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
          alt="Nordex Tech"
          style={{
            width: 'clamp(180px, 20vw, 290px)',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 64px rgba(245,168,0,0.60)) drop-shadow(0 8px 36px rgba(0,0,0,0.95))',
          }}
        />
      </div>

      {/* Linha de loading durante 'hold' */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '1px',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        opacity: phase === 'hold' ? 1 : 0,
        transition: 'opacity 0.4s ease',
        borderRadius: '999px',
      }}>
        <div style={{
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #F5A800, transparent)',
          animation: 'nordexSweep 1.8s ease-in-out infinite',
        }} />
      </div>

      {/* Dica de pular */}
      <p style={{
        position: 'absolute',
        bottom: '32px',
        right: '40px',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.16)',
        letterSpacing: '0.16em',
        margin: 0,
        opacity: phase === 'hold' ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
        textTransform: 'uppercase',
      }}>
        Clique para pular · Esc
      </p>

      <style>{`
        @keyframes nordexIntroPulse {
          0%, 100% {
            filter: drop-shadow(0 0 56px rgba(245,168,0,0.60)) drop-shadow(0 0 110px rgba(245,168,0,0.28));
          }
          50% {
            filter: drop-shadow(0 0 88px rgba(245,168,0,0.92)) drop-shadow(0 0 160px rgba(245,168,0,0.50));
          }
        }
        @keyframes nordexSweep {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(350%);  }
        }
      `}</style>
    </div>
  )
}
