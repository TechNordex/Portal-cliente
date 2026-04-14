'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'

// Tamanho fixo de renderização — CSS escala visualmente
const SIZE = 500

export function LoginGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let phi = 0

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width:  SIZE * 2,
      height: SIZE * 2,
      phi:    0,
      theta:  0.3,
      dark:   1,
      diffuse: 1.2,
      mapSamples:    16000,
      mapBrightness: 6,
      baseColor:   [0.3,  0.3,  0.3 ],
      markerColor: [0.96, 0.66, 0.0 ],
      glowColor:   [0.96, 0.66, 0.0 ],
      markers: [
        { location: [-8.1728,  -35.0831] as [number,number], size: 0.14 }, // ★ Nordex HQ
        { location: [-8.0506,  -34.8781] as [number,number], size: 0.07 }, // Recife
        { location: [-3.7172,  -38.5433] as [number,number], size: 0.06 }, // Fortaleza
        { location: [-12.9714, -38.5014] as [number,number], size: 0.06 }, // Salvador
        { location: [-5.7945,  -35.2110] as [number,number], size: 0.05 }, // Natal
        { location: [-23.5505, -46.6333] as [number,number], size: 0.05 }, // São Paulo
        { location: [-22.9068, -43.1729] as [number,number], size: 0.04 }, // Rio
        { location: [40.7128,  -74.006 ] as [number,number], size: 0.04 }, // New York
        { location: [51.5074,  -0.1278 ] as [number,number], size: 0.04 }, // London
        { location: [35.6762,  139.6503] as [number,number], size: 0.04 }, // Tokyo
      ],
      // @ts-expect-error onRender doesn't exist in TS type but works
      onRender: (state: any) => {
        state.phi = phi
        phi += 0.005
      },
    })

    setTimeout(() => { canvas.style.opacity = '1' })

    return () => globe.destroy()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width:      SIZE,
        height:     SIZE,
        maxWidth:   '90%',
        maxHeight:  '90%',
        opacity:    0,
        transition: 'opacity 1s ease',
        cursor:     'grab',
      }}
    />
  )
}
