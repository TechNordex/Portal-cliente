'use client'

import { useEffect, useRef } from 'react'

export function ShootingStarCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let mouse = { x: -100, y: -100 }
    let particles: { x: number; y: number; age: number; maxAge: number; size: number; baseSpeedX: number; baseSpeedY: number }[] = []
    let lastMouse = { x: -100, y: -100 }

    const setSize = () => {
      const parent = canvas.parentElement
      if (parent) {
        width = parent.clientWidth
        height = parent.clientHeight
        canvas.width = width
        canvas.height = height
      }
    }
    setSize()
    window.addEventListener('resize', setSize)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      lastMouse.x = mouse.x
      lastMouse.y = mouse.y
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top

      // Calculate velocity of mouse
      const vx = mouse.x - lastMouse.x
      const vy = mouse.y - lastMouse.y
      const speed = Math.sqrt(vx * vx + vy * vy)

      // Spawn particles when mouse moves
      // More particles if moving faster
      const spawnCount = Math.min(Math.floor(speed / 2), 10) + 1
      for (let i = 0; i < spawnCount; i++) {
        // Interpolate position along the path for smoother trails
        const t = Math.random()
        const px = lastMouse.x + vx * t
        const py = lastMouse.y + vy * t
        
        particles.push({
          x: px + (Math.random() - 0.5) * 4,
          y: py + (Math.random() - 0.5) * 4,
          age: 0,
          maxAge: 20 + Math.random() * 25, // 20-45 frames
          size: 0.5 + Math.random() * 2.5,
          baseSpeedX: (Math.random() - 0.5) * 0.5,
          baseSpeedY: (Math.random() - 0.5) * 0.5 + 0.2 // slight drift down
        })
      }
    }

    const parent = canvas.parentElement
    if (parent) {
      parent.addEventListener('mousemove', onMouseMove)
      // Oculta o cursor nativo apenas quando o mouse se move sobre o painel
      parent.style.cursor = 'none' 
    }

    const onMouseLeave = () => {
      mouse.x = -100
      mouse.y = -100
    }
    if (parent) {
      parent.addEventListener('mouseleave', onMouseLeave)
    }

    let raf: number
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw trail particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age++
        
        p.x += p.baseSpeedX
        p.y += p.baseSpeedY

        if (p.age > p.maxAge) {
          particles.splice(i, 1)
          continue
        }

        const opacity = Math.max(0, 1 - (p.age / p.maxAge))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * opacity, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 168, 0, ${opacity * 0.9})`
        ctx.shadowBlur = 6 * opacity
        ctx.shadowColor = '#F5A800'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw the "Star" cursor head
      if (mouse.x >= 0 && mouse.y >= 0) {
         // Glow
         ctx.beginPath()
         ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2)
         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
         ctx.shadowBlur = 15
         ctx.shadowColor = '#F5A800'
         ctx.fill()
         
         // Core
         ctx.beginPath()
         ctx.arc(mouse.x, mouse.y, 1.5, 0, Math.PI * 2)
         ctx.fillStyle = '#fff'
         ctx.shadowBlur = 0
         ctx.fill()
      }

      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', setSize)
      if (parent) {
        parent.removeEventListener('mousemove', onMouseMove)
        parent.removeEventListener('mouseleave', onMouseLeave)
        parent.style.cursor = ''
      }
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999, // Fica sobre tudo no painel esquerdo
        pointerEvents: 'none', // Permite que os cliques passem (ex: arrastar o globo)
      }}
    />
  )
}
