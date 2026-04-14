"use client"

import { useEffect, useRef } from "react"
import createGlobe, { type COBEOptions } from "cobe"
import { useMotionValue, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400

const GLOBE_CONFIG: any = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  baseColor: [0.3, 0.3, 0.3],
  markerColor: [0.98, 0.74, 0.14],
  glowColor: [0.98, 0.74, 0.14],
  markers: [
    { location: [-8.1728, -35.0831], size: 0.1 }, // Moreno, PE (Nordex HQ)
    { location: [-23.5505, -46.6333], size: 0.05 }, // São Paulo
    { location: [40.7128, -74.006], size: 0.05 }, // New York
    { location: [51.5074, -0.1278], size: 0.05 }, // London
    { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: any
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef    = useRef(0)
  const widthRef  = useRef(0)
  const pointerInteracting = useRef<number | null>(null)

  const r  = useMotionValue(0)
  const rs = useSpring(r, { mass: 1, damping: 30, stiffness: 100 })

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      r.set(r.get() + delta / MOVEMENT_DAMPING)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onResize = () => {
      widthRef.current = canvas.offsetWidth
    }
    window.addEventListener("resize", onResize)
    onResize()

    // ─── cobe v2 API ─────────────────────────────────────────────────
    // v2 retorna { update, destroy }.
    // O callback "onRender" do v1 NÃO existe em v2 — a animação deve ser
    // conduzida manualmente via globe.update({ phi }) + requestAnimationFrame.
    const size = widthRef.current || 500
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globe = createGlobe(canvas, {
      ...config,
      width:  size * 2,
      height: size * 2,
    }) as unknown as { update: (s: Partial<COBEOptions>) => void; destroy: () => void }

    // Atualiza dimensões só no resize — nunca no loop de animação
    const handleResize = () => {
      const w = canvas.offsetWidth
      if (w > 0) {
        widthRef.current = w
        globe.update({ width: w * 2, height: w * 2 })
      }
    }
    window.addEventListener("resize", handleResize)

    // Loop de animação — só atualiza phi para máxima performance (60 fps)
    let rafId: number
    const loop = () => {
      if (!pointerInteracting.current) phiRef.current += 0.005
      globe.update({ phi: phiRef.current + rs.get() })
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    setTimeout(() => { canvas.style.opacity = "1" }, 0)

    return () => {
      globe.destroy()
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("resize", handleResize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rs, config])

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-square w-full max-w-150",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 contain-[layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX
          updatePointerInteraction(e.clientX)
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}
