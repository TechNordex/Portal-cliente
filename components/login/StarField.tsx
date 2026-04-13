'use client'

import { useEffect, useRef, useCallback } from 'react'

const STAR_COUNT   = 320
const HOVER_RADIUS = 120
const HOVER_BOOST  = 0.92

interface Star {
  x: number; y: number
  r:      number  // raio base
  base:   number  // opacidade idle
  bright: number  // opacidade atual
  target: number
  phase:  number  // fase twinkle
  speed:  number  // velocidade twinkle
  drift:  number  // velocidade de deriva lenta
  driftX: number  // direção X da deriva
  driftY: number
  gold:   boolean // % tem tom dourado
}

function initStars(w: number, h: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.02 + Math.random() * 0.06   // deriva muito lenta
    return {
      x:      Math.random() * w,
      y:      Math.random() * h,
      r:      0.2 + Math.random() * 0.9,
      base:   0.05 + Math.random() * 0.22,
      bright: 0,
      target: 0,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.15 + Math.random() * 0.55,
      drift:  speed,
      driftX: Math.cos(angle) * speed,
      driftY: Math.sin(angle) * speed,
      gold:   Math.random() < 0.18,
    }
  })
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef  = useRef<Star[]>([])
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(0)
  const dimRef    = useRef({ w: 0, h: 0 })

  const onMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mouseRef.current = (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height)
      ? { x, y }
      : { x: -9999, y: -9999 }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })!

    const resize = () => {
      const p = canvas.parentElement!
      dimRef.current.w = canvas.width  = p.offsetWidth
      dimRef.current.h = canvas.height = p.offsetHeight
      starsRef.current = initStars(dimRef.current.w, dimRef.current.h)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    document.addEventListener('mousemove', onMove, { passive: true })

    let last = 0

    const tick = (ts: number) => {
      const dt  = Math.min((ts - last) / 1000, 0.05)
      last = ts
      const { w, h } = dimRef.current
      const { x: mx, y: my } = mouseRef.current

      ctx.clearRect(0, 0, w, h)

      for (const s of starsRef.current) {
        // ── Deriva suave (wraparound) ──────────────────────────────
        s.x += s.driftX
        s.y += s.driftY
        if (s.x < 0)  s.x += w
        if (s.x > w)  s.x -= w
        if (s.y < 0)  s.y += h
        if (s.y > h)  s.y -= h

        // ── Twinkle (duas ondas sobrepostas para naturalidade) ─────
        const t1 = Math.sin(ts * 0.001 * s.speed + s.phase)
        const t2 = Math.sin(ts * 0.0007 * s.speed + s.phase * 1.7)
        const twinkle = s.base + (t1 * 0.6 + t2 * 0.4) * 0.06

        // ── Proximidade do mouse ───────────────────────────────────
        const dx = s.x - mx, dy = s.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const prox = Math.max(0, 1 - dist / HOVER_RADIUS)
        // Curva de falloff quadrática para glow mais dramático
        const proxSq = prox * prox

        s.target = Math.min(1, twinkle + proxSq * HOVER_BOOST)
        s.bright += (s.target - s.bright) * Math.min(1, 10 * dt)
        const α = Math.max(0, Math.min(1, s.bright))

        // ── Cor dinâmica (branca → dourada conforme hover) ─────────
        const goldBlend = s.gold ? 0.45 + proxSq * 0.55 : proxSq * 0.85
        const R = 255
        const G = Math.round(255 - goldBlend * 88)
        const B = Math.round(255 - goldBlend * 210)

        // ── Halo dourado ao redor do cursor ────────────────────────
        if (proxSq > 0.02) {
          const glowR = s.r * (3 + proxSq * 6)
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR)
          grd.addColorStop(0,   `rgba(245,168,0,${(proxSq * 0.45 * α).toFixed(3)})`)
          grd.addColorStop(0.4, `rgba(245,168,0,${(proxSq * 0.10 * α).toFixed(3)})`)
          grd.addColorStop(1,   'rgba(245,168,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        // ── Núcleo da estrela ──────────────────────────────────────
        const coreR = s.r * (1 + proxSq * 2)
        ctx.globalAlpha = α
        ctx.fillStyle   = `rgb(${R},${G},${B})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, coreR, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      document.removeEventListener('mousemove', onMove)
    }
  }, [onMove])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        1,
      }}
    />
  )
}
