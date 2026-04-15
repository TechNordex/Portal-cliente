'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** true = inicia órbita imediatamente */
  visible: boolean
  /** chamado quando a estrela termina de voar até o cursor */
  onComplete: () => void
}

interface TrailPt { x: number; y: number }

export function OrbitalStar({ visible, onComplete }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const onCompleteRef  = useRef(onComplete)
  const [canvasAlpha, setCanvasAlpha] = useState<'hidden' | 'showing' | 'fading'>('hidden')

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  /* ── Inicializa e roda o loop ─────────────────────────── */
  useEffect(() => {
    if (!visible) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    /* sizing */
    let W = 0, H = 0, cx = 0, cy = 0, rx = 0, ry = 0

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      const dpr = window.devicePixelRatio || 1
      W = p.clientWidth; H = p.clientHeight
      canvas.width  = W * dpr; canvas.height = H * dpr
      canvas.style.width  = `${W}px`; canvas.style.height = `${H}px`
      ctx.resetTransform(); ctx.scale(dpr, dpr)
      /* Órbita ao redor do centro do painel (onde o TypewriterTitle reside) */
      cx = W / 2;  cy = H / 2
      rx = W * 0.46; ry = H * 0.20
    }
    resize()

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    /* mouse tracking */
    const mouse = { x: -999, y: -999 }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    canvas.parentElement?.addEventListener('mousemove', onMove, { passive: true })

    /* constantes da órbita */
    const PERIOD       = 5600   // ms por volta completa
    const TILT         = -14 * (Math.PI / 180)
    const TRAIL_LEN    = 44
    const FLY_DURATION = 680    // ms para voar até o cursor

    /* estado local do loop — usa variáveis no closure, não refs */
    let phase: 'orbit' | 'fly' | 'done' = 'orbit'
    let startTs: number | null = null
    let flyStartX = 0, flyStartY = 0
    let flyTs     = 0
    let completed = false

    const trail: TrailPt[] = []

    /* easing */
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    /* desenho da cabeça + cauda (compartilhado pelos dois modos) */
    const drawStar = (x: number, y: number) => {
      /* trail */
      trail.unshift({ x, y })
      if (trail.length > TRAIL_LEN) trail.pop()

      if (trail.length > 1) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i], p2 = trail[i + 1]
          const ratio = 1 - i / trail.length
          const a     = ratio * ratio

          ctx.beginPath(); ctx.lineCap = 'round'
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(245,168,0,${(a * 0.60).toFixed(3)})`
          ctx.lineWidth   = 3.8 * ratio; ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(255,255,255,${(a * 0.40).toFixed(3)})`
          ctx.lineWidth   = 1.2 * ratio; ctx.stroke()
        }
      }

      /* glow radial */
      const gR = 12
      const g  = ctx.createRadialGradient(x, y, 0, x, y, gR)
      g.addColorStop(0,   'rgba(255,255,255,0.96)')
      g.addColorStop(0.3, 'rgba(245,168,0,0.65)')
      g.addColorStop(0.7, 'rgba(245,168,0,0.14)')
      g.addColorStop(1,   'rgba(245,168,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, gR, 0, Math.PI * 2); ctx.fill()

      /* núcleo */
      ctx.beginPath(); ctx.arc(x, y, 2.0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fill()

      /* cruz flare */
      const fl = 6
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.40)'; ctx.lineWidth = 0.5
      ctx.moveTo(x - fl, y); ctx.lineTo(x + fl, y)
      ctx.moveTo(x, y - fl); ctx.lineTo(x, y + fl)
      ctx.stroke()
    }

    /* ── Loop ──────────────────────────────────────────── */
    let raf: number

    const tick = (ts: number) => {
      if (!startTs) startTs = ts

      ctx.clearRect(0, 0, W, H)
      if (phase === 'done') return

      let x: number, y: number

      if (phase === 'orbit') {
        const elapsed = ts - startTs
        const angle   = (elapsed / PERIOD) * Math.PI * 2

        const ex = Math.cos(angle) * rx
        const ey = Math.sin(angle) * ry
        x = cx + ex * Math.cos(TILT) - ey * Math.sin(TILT)
        y = cy + ex * Math.sin(TILT) + ey * Math.cos(TILT)

        /* Órbita completa → inicia voo ao cursor */
        if (elapsed >= PERIOD) {
          phase      = 'fly'
          flyStartX  = x; flyStartY = y
          flyTs      = ts
          trail.length = 0
        }
      } else {
        /* fase 'fly': interpolação suave até o mouse */
        const t    = Math.min(1, (ts - flyTs) / FLY_DURATION)
        const ease = easeOutCubic(t)

        /* destino: posição atual do mouse (atualizada em tempo real) */
        const targetX = mouse.x > 0 ? mouse.x : cx
        const targetY = mouse.y > 0 ? mouse.y : cy * 0.3

        x = flyStartX + (targetX - flyStartX) * ease
        y = flyStartY + (targetY - flyStartY) * ease

        if (t >= 1 && !completed) {
          completed = true
          phase     = 'done'
          ctx.clearRect(0, 0, W, H)
          setCanvasAlpha('fading')         // dispara fade-out via CSS
          onCompleteRef.current()          // ativa o ShootingStarCursor
          cancelAnimationFrame(raf)
          ro.disconnect()
          canvas.parentElement?.removeEventListener('mousemove', onMove)
          return
        }
      }

      drawStar(x, y)
      raf = requestAnimationFrame(tick)
    }

    /* Fade-in suave do canvas antes de começar */
    setCanvasAlpha('showing')
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.parentElement?.removeEventListener('mousemove', onMove)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  /* ── Canvas com opacidade controlada por estado ─── */
  const opacity   = canvasAlpha === 'showing' ? 1 : 0
  const transition = canvasAlpha === 'hidden'
    ? 'none'
    : canvasAlpha === 'showing'
    ? 'opacity 1.2s ease 0.5s'
    : 'opacity 0.35s ease'

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        zIndex:        8,
        pointerEvents: 'none',
        opacity,
        transition,
      }}
    />
  )
}
