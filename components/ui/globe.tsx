"use client"

import { useEffect, useRef } from "react"
import createGlobe from "cobe"
import { type COBEOptions } from "cobe"
import { useMotionValue, useSpring } from "motion/react"
import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400

/**
 * Projeção EXATA do Cobe (extraída do código fonte cobe@2.0.1).
 *
 * Cobe U(location):
 *   t0 =  cos(lat) * cos(lon)
 *   t1 =  sin(lat)
 *   t2 = -cos(lat) * sin(lon)
 *
 * Cobe O(t, phi, theta, width, height):
 *   c = cos(φ)·t0 + sin(φ)·t2                                          → screen X
 *   s = sin(φ)·sin(θ)·t0 + cos(θ)·t1 − cos(φ)·sin(θ)·t2              → screen Y (inv)
 *   depth = −sin(φ)·cos(θ)·t0 + sin(θ)·t1 + cos(φ)·cos(θ)·t2 ≥ 0
 *   || c² + s² ≥ 0.64  → limb visible
 *
 *   screenX (0–1) = (c / aspectRatio + 1) / 2
 *   screenY (0–1) = (−s + 1) / 2
 *
 * rad = 0.80  → marcadores exatamente sobre a superfície do globo
 * (o limbo do globo em espaço de tela está em raio=0.8; rad>0.8 flutuaria fora)
 */
function project(
  lat: number,
  lon: number,
  phi: number,
  theta: number,
  aspect = 1,        // width/height (1 para canvas quadrado)
): { px01: number; py01: number; depth: number; visible: boolean } {
  const D   = Math.PI / 180
  const la  = lat * D
  const lo  = lon * D

  // Cobe U — convertido para unit vector
  const t0_orig =  Math.cos(la) * Math.cos(lo)
  const t1_orig =  Math.sin(la)
  const t2_orig = -Math.cos(la) * Math.sin(lo)

  // rad = 0.80: o limbo (borda) do globo em tela corresponde a raio 0.8
  // usar 0.80 coloca os marcadores exatamente SOBRE a superfície do globo
  const rad = 0.80
  const t0 = t0_orig * rad
  const t1 = t1_orig * rad
  const t2 = t2_orig * rad

  // trig
  const a = Math.cos(phi)    // cos φ
  const i = Math.sin(phi)    // sin φ
  const r = Math.cos(theta)  // cos θ
  const o = Math.sin(theta)  // sin θ

  // Cobe O
  const c     = a * t0 + i * t2
  const s     = i * o * t0 + r * t1 - a * o * t2
  const depth = -i * r * t0 + o * t1 + a * r * t2

  return {
    px01:    (c / aspect + 1) / 2,   // 0…1
    py01:    (-s + 1) / 2,           // 0…1
    depth,
    visible: depth >= 0 || c * c + s * s >= 0.64,
  }
}

// Pill arredondada
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const rad = h / 2
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y,     x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x,     y + h, rad)
  ctx.arcTo(x,     y + h, x,     y,     rad)
  ctx.arcTo(x,     y,     x + w, y,     rad)
  ctx.closePath()
}

export function Globe({
  className,
  config = {},
}: {
  className?: string
  config?: any
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const boxRef     = useRef<HTMLDivElement>(null)

  const r  = useMotionValue(0)
  const rs = useSpring(r, { mass: 1, damping: 30, stiffness: 100 })

  useEffect(() => {
    const canvas  = canvasRef.current
    const overlay = overlayRef.current
    const box     = boxRef.current
    if (!canvas || !overlay || !box) return

    const theta   = (config.theta  as number) ?? 0.3
    const markers = (config.markers as any[])  ?? []

    let phi      = (config.phi as number) ?? 0
    let velocity = 0.004
    const ptr: { x: number | null } = { x: null }

    /* ── Eventos ─────────────────────────────────────── */
    const onDown = (e: PointerEvent) => { ptr.x = e.clientX }
    const onUp   = ()               => { ptr.x = null       }
    const onMove = (e: PointerEvent) => {
      if (ptr.x === null) return
      r.set(r.get() + (e.clientX - ptr.x) / MOVEMENT_DAMPING)
      ptr.x = e.clientX
    }
    canvas.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup",   onUp)
    window.addEventListener("pointermove", onMove)

    /* ── Canvas 2D (overlay) ─────────────────────────── */
    const dpr = window.devicePixelRatio || 1
    const ctx  = overlay.getContext("2d")!
    const getW = () => box.offsetWidth || 600

    const syncOverlay = () => {
      const s = getW()
      overlay.width  = Math.round(s * dpr)
      overlay.height = Math.round(s * dpr)
      overlay.style.width  = s + "px"
      overlay.style.height = s + "px"
    }
    syncOverlay()
    const ro = new ResizeObserver(syncOverlay)
    ro.observe(box)

    // offset de fase para anéis não ficarem 100% idênticos
    const phaseOff: Record<string, number> = {}
    markers.forEach((m, i) => { if (m.id) phaseOff[m.id] = (i / Math.max(markers.length, 1)) * Math.PI * 2 })

    /* ── Desenha o overlay usando o phi EXATO do Cobe ── */
    function drawOverlay(cobePhiNow: number) {
      const sz  = getW()
      const now = performance.now() / 1000

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, overlay!.width, overlay!.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      markers.forEach((m) => {
        if (!m.id || !m.label) return

        const { px01, py01, depth, visible } = project(
          m.location[0], m.location[1],
          cobePhiNow, theta, 1
        )

        if (!visible || depth < 0) return

        const px  = px01 * sz
        const py  = py01 * sz
        const op  = Math.min(1, depth / 0.2 + 0.1)
        const hq  = !!m.isHQ
        const pr  = hq ? 5 : 3.5    // raio do núcleo

        ctx.globalAlpha = op

        /* ─── Anéis pulsantes ─────────────────────────── */
        const base = now + (phaseOff[m.id] ?? 0)
        for (let k = 0; k < 2; k++) {
          const wave = ((base * 0.65) + k * 0.5) % 1
          const rr   = pr + wave * (hq ? 20 : 14)
          const aa   = (1 - wave) * (hq ? 0.55 : 0.38)
          ctx.beginPath()
          ctx.arc(px, py, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(245,168,0,${(aa * op).toFixed(3)})`
          ctx.lineWidth   = hq ? 1.5 : 1
          ctx.stroke()
        }

        /* ─── Glow radial ─────────────────────────────── */
        const grd = ctx.createRadialGradient(px, py, 0, px, py, pr * 4)
        grd.addColorStop(0,    `rgba(255,255,220,${0.9  * op})`)
        grd.addColorStop(0.35, `rgba(245,168,  0,${0.60 * op})`)
        grd.addColorStop(1,    "rgba(245,168,  0,0)")
        ctx.beginPath()
        ctx.arc(px, py, pr * 4, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        /* ─── Núcleo sólido ───────────────────────────── */
        ctx.beginPath()
        ctx.arc(px, py, pr, 0, Math.PI * 2)
        ctx.fillStyle = hq ? "#FFFFFF" : "#F5A800"
        ctx.fill()

        /* ─── Linha conectora ─────────────────────────── */
        const lx0 = px + pr + 3
        const lx1 = px + pr + 14
        const lg  = ctx.createLinearGradient(lx0, 0, lx1, 0)
        lg.addColorStop(0, `rgba(245,168,0,${0.8 * op})`)
        lg.addColorStop(1, "rgba(245,168,0,0)")
        ctx.beginPath()
        ctx.moveTo(lx0, py)
        ctx.lineTo(lx1, py)
        ctx.strokeStyle = lg
        ctx.lineWidth   = 1
        ctx.stroke()

        /* ─── Pill label ──────────────────────────────── */
        const fz  = hq ? 10 : 9
        ctx.font         = `${hq ? 700 : 600} ${fz}px Inter,system-ui,sans-serif`
        ctx.textBaseline = "middle"
        const txt = m.label.toUpperCase()
        const tw  = ctx.measureText(txt).width
        const ph2 = 8, pv2 = 3
        const bx  = lx1 + 2
        const bw  = tw + ph2 * 2
        const bh  = fz + pv2 * 2

        // fundo
        ctx.shadowColor   = "rgba(0,0,0,0.8)"
        ctx.shadowBlur    = 8
        ctx.shadowOffsetY = 2
        pill(ctx, bx, py - bh / 2, bw, bh)
        ctx.fillStyle = "rgba(5,5,15,0.85)"
        ctx.fill()

        // borda
        ctx.shadowColor = "transparent"
        ctx.shadowBlur  = 0
        ctx.shadowOffsetY = 0
        pill(ctx, bx, py - bh / 2, bw, bh)
        ctx.strokeStyle = hq ? "rgba(245,168,0,0.6)" : "rgba(255,255,255,0.22)"
        ctx.lineWidth   = 0.75
        ctx.stroke()

        // texto
        ctx.fillStyle    = hq ? "#F5A800" : "rgba(255,255,255,0.92)"
        ctx.globalAlpha  = op
        ctx.fillText(txt, bx + ph2, py)

        ctx.globalAlpha = 1
      })
    }

    /* ── Crie o globo ────────────────────────────────────────────
     *  Cobe v2: update() renderiza imediatamente, onRender não é chamado.
     *  O overlay é desenhado no RAF loop com o MESMO phi.              */
    const globe = createGlobe(canvas, {
      ...config,
      width:    getW() * 2,
      height:   getW() * 2,
      phi, theta,
      onRender: (_state: any) => { /* cobe v2: não chamado automaticamente */ },
    }) as { update: (s: Partial<COBEOptions>) => void; destroy: () => void }

    /* ── RAF externo: rotação + overlay ─────────────────────────── */
    let raf: number
    const loop = () => {
      if (ptr.x === null) velocity += (0.004 - velocity) * 0.025
      else                velocity *= 0.92
      phi += velocity
      const sz     = getW()
      const phiNow = phi + rs.get()

      // 1. Atualiza o globo WebGL com o phi calculado
      globe.update({ phi: phiNow, width: sz * 2, height: sz * 2 })

      // 2. Desenha overlay com EXATAMENTE o mesmo phiNow — mesmo frame
      drawOverlay(phiNow)

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    setTimeout(() => { canvas.style.opacity = "1" }, 100)

    return () => {
      globe.destroy()
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup",   onUp)
      window.removeEventListener("pointermove", onMove)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rs, config])

  return (
    <div
      ref={boxRef}
      className={cn(
        "absolute inset-0 mx-auto aspect-square w-full max-w-[600px]",
        className
      )}
      style={{ overflow: "visible" }}
    >
      {/* Globo WebGL */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-1000"
        style={{ contain: "layout paint size", cursor: "none" }}
      />
      {/* Overlay 2D — anéis + labels sincronizados via phiNow do RAF */}
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 10 }}
      />
    </div>
  )
}
