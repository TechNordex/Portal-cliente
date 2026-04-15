'use client'

import { useEffect, useRef } from 'react'

export function ShootingStarCursor({ active = true }: { active?: boolean }) {
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width  = 0
    let height = 0

    /* ── Posições ─────────────────────────────────── */
    const target = { x: -400, y: -400 }   // mouse real
    const smooth = { x: -400, y: -400 }   // posição suavizada (lerp)
    const prev   = { x: -400, y: -400 }   // frame anterior → velocidade

    /* ── Trail: array de pontos circulares ─────────── */
    const TRAIL_MAX = 52
    const trail: { x: number; y: number }[] = []

    /* ── Faíscas ────────────────────────────────────── */
    interface Spark {
      x: number; y: number
      vx: number; vy: number
      life: number
      size: number
      gold: boolean
    }
    const sparks: Spark[] = []

    /* ── Estado global ──────────────────────────────── */
    let inside      = false
    let alpha       = 0
    let alphaTarget = 0

    /* ── Canvas sizing ──────────────────────────────── */
    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      const dpr = window.devicePixelRatio || 1
      width  = p.clientWidth
      height = p.clientHeight
      canvas.width  = width  * dpr
      canvas.height = height * dpr
      canvas.style.width  = `${width}px`
      canvas.style.height = `${height}px`
      ctx.resetTransform()
      ctx.scale(dpr, dpr)
    }
    resize()

    const ro = new ResizeObserver(resize)
    const parent = canvas.parentElement
    if (parent) {
      ro.observe(parent)
      /* ── Garante cursor none em TODOS os filhos ─── */
      parent.style.setProperty('cursor', 'none', 'important')
    }

    /* ── Burst radial de entrada ────────────────────── */
    function burst(cx: number, cy: number) {
      const N = 16
      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 + Math.random() * 0.3
        const spd   = 1.0 + Math.random() * 3.5
        sparks.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          size: 1.0 + Math.random() * 2.4,
          gold: Math.random() > 0.35,
        })
      }
    }

    /* ── Eventos ────────────────────────────────────── */
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      target.x = e.clientX - r.left
      target.y = e.clientY - r.top
    }

    const onEnter = (e: MouseEvent) => {
      inside      = true
      alphaTarget = 1
      const r  = canvas.getBoundingClientRect()
      const ex = e.clientX - r.left
      const ey = e.clientY - r.top
      // Não deixa o smooth disparar do corner errado
      smooth.x = prev.x = target.x = ex
      smooth.y = prev.y = target.y = ey
      trail.length = 0
      burst(ex, ey)
    }

    const onLeave = () => {
      inside      = false
      alphaTarget = 0
      target.x    = -400
      target.y    = -400
    }

    if (parent) {
      parent.addEventListener('mousemove',  onMove,  { passive: true })
      parent.addEventListener('mouseenter', onEnter, { passive: true })
      parent.addEventListener('mouseleave', onLeave, { passive: true })
    }

    /* ── Loop de animação ───────────────────────────── */
    let raf: number

    const tick = () => {
      ctx.clearRect(0, 0, width, height)

      /* Cursor inativo durante intro / órbita */
      if (!activeRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }

      /* Alpha global (fade in rápido, fade out devagar) */
      const aSpd = inside ? 0.12 : 0.055
      alpha += (alphaTarget - alpha) * aSpd

      /* Quando totalmente fora e invisible: apenas loop */
      if (alpha < 0.003 && !inside) {
        trail.length = 0
        raf = requestAnimationFrame(tick)
        return
      }

      /* ── Velocidade do mouse ─────────────── */
      prev.x = smooth.x
      prev.y = smooth.y

      /* Lerp duplo: posição + sobreshooting amortecido */
      const lerpBase = 0.14
      smooth.x += (target.x - smooth.x) * lerpBase
      smooth.y += (target.y - smooth.y) * lerpBase

      const vx    = smooth.x - prev.x
      const vy    = smooth.y - prev.y
      const speed = Math.sqrt(vx * vx + vy * vy)
      const sN    = Math.min(1, speed / 9)          // normalizado 0…1

      /* ── Trail ──────────────────────────── */
      if (inside || trail.length > 0) {
        trail.unshift({ x: smooth.x, y: smooth.y })
        if (!inside) trail.pop()                     // drena ao sair
      }
      if (trail.length > TRAIL_MAX) trail.pop()

      /* Trail — linhas retas segmentadas (look original) */
      if (trail.length > 1) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p1    = trail[i]
          const p2    = trail[i + 1]
          const ratio = 1 - i / trail.length
          const a     = ratio * alpha

          /* Corpo dourado */
          ctx.beginPath()
          ctx.lineCap  = 'round'
          ctx.lineJoin = 'round'
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(245,168,0,${(a * (0.45 + sN * 0.18)).toFixed(3)})`
          ctx.lineWidth   = (4 + sN * 2) * ratio
          ctx.stroke()

          /* Núcleo branco fino central */
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(255,255,255,${(a * (0.30 + sN * 0.12)).toFixed(3)})`
          ctx.lineWidth   = 1.5 * ratio
          ctx.stroke()
        }
      }

      /* ── Faíscas ─────────────────────────── */
      /* Emissão contínua em movimento rápido */
      if (inside && speed > 1.8 && Math.random() > 0.65) {
        sparks.push({
          x: smooth.x, y: smooth.y,
          vx: (Math.random() - 0.5) * 2.8,
          vy: (Math.random() - 0.5) * 2.8,
          life: 1,
          size: 0.7 + Math.random() * 1.6,
          gold: Math.random() > 0.3,
        })
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x  += s.vx
        s.y  += s.vy
        s.vx *= 0.90
        s.vy *= 0.90
        s.life -= 0.030
        if (s.life <= 0) { sparks.splice(i, 1); continue }
        const sa = s.life * s.life * alpha
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
        ctx.fillStyle = s.gold
          ? `rgba(245,168,0,${(sa * 0.88).toFixed(3)})`
          : `rgba(255,255,255,${(sa * 0.70).toFixed(3)})`
        ctx.fill()
      }

      /* ── Cabeça ──────────────────────────── */
      const x  = smooth.x
      const y  = smooth.y
      const ha = alpha

      /* Glow externo — raio cresce com velocidade */
      const gR = 11 + sN * 7
      const g  = ctx.createRadialGradient(x, y, 0, x, y, gR)
      g.addColorStop(0,    `rgba(255,255,255,${(0.88 * ha).toFixed(3)})`)
      g.addColorStop(0.28, `rgba(245,168,0,${(0.55 * ha).toFixed(3)})`)
      g.addColorStop(0.70, `rgba(245,168,0,${(0.10 * ha).toFixed(3)})`)
      g.addColorStop(1,    'rgba(245,168,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, gR, 0, Math.PI * 2)
      ctx.fill()

      /* Núcleo sólido */
      ctx.beginPath()
      ctx.arc(x, y, 1.7, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${ha.toFixed(3)})`
      ctx.fill()

      /* Cruz de flare */
      if (ha > 0.35) {
        const fl = 6 + sN * 5
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${(0.38 * ha).toFixed(3)})`
        ctx.lineWidth   = 0.5
        ctx.moveTo(x - fl, y); ctx.lineTo(x + fl, y)
        ctx.moveTo(x, y - fl); ctx.lineTo(x, y + fl)
        ctx.stroke()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (parent) {
        parent.removeEventListener('mousemove',  onMove)
        parent.removeEventListener('mouseenter', onEnter)
        parent.removeEventListener('mouseleave', onLeave)
        parent.style.removeProperty('cursor')
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        zIndex:        9999,
        pointerEvents: 'none',
        cursor:        'none',
      }}
    />
  )
}
