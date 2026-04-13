'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Globe } from '@/components/ui/globe'
import { StarField } from '@/components/login/StarField'
import { TypewriterTitle } from '@/components/login/TypewriterTitle'
import { ShootingStarCursor } from '@/components/login/ShootingStarCursor'
import type { COBEOptions } from 'cobe'

/* ─── Config do globo — markers minimalistas ───────────────────── */
const GLOBE_CFG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => { },
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 1.1,
  mapSamples: 8000,
  mapBrightness: 5,
  baseColor: [0.25, 0.25, 0.25],
  markerColor: [0.96, 0.66, 0.0],
  glowColor: [0.96, 0.66, 0.0],
  markers: [
    // ── Nordeste (destaque — ponto único do HQ) ──────────────────
    { location: [-8.1728, -35.0831], size: 0.07 }, // ★ Nordex HQ — Moreno, PE
    { location: [-3.7172, -38.5433], size: 0.03 }, // Fortaleza, CE
    { location: [-12.9714, -38.5014], size: 0.03 }, // Salvador, BA
    // ── Brasil ──────────────────────────────────────────────────
    { location: [-23.5505, -46.6333], size: 0.03 }, // São Paulo
    // ── Global ──────────────────────────────────────────────────
    { location: [40.7128, -74.006], size: 0.03 }, // New York
    { location: [51.5074, -0.1278], size: 0.03 }, // London
    { location: [35.6762, 139.6503], size: 0.03 }, // Tokyo
    { location: [1.3521, 103.8198], size: 0.02 }, // Singapore
  ],
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(28px)'
    const id = setTimeout(() => {
      el.style.transition = 'opacity 0.75s cubic-bezier(0.22,1,0.36,1), transform 0.75s cubic-bezier(0.22,1,0.36,1)'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 80)
    return () => clearTimeout(id)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login')
      router.push(data.user.role === 'admin' ? '/admin' : '/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputBox = (field: 'email' | 'password'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${focused === field ? 'rgba(245,168,0,0.55)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '10px',
    padding: '0 16px',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
    boxShadow: focused === field
      ? '0 0 0 3px rgba(245,168,0,0.09), inset 0 1px 0 rgba(255,255,255,0.04)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
  })

  const inputEl: React.CSSProperties = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    padding: '14px 0', fontSize: '15px', color: '#f2f2f2', letterSpacing: '0.01em',
  }

  const iconColor = (f: 'email' | 'password') =>
    focused === f ? 'rgba(245,168,0,0.75)' : 'rgba(255,255,255,0.25)'

  return (
    <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════════════
          PAINEL ESQUERDO — display:flex via inline style (sempre!)
          Mobile oculto por <style> media query dentro do HTML.
          Isso garante que o CSS esteja disponível ANTES do JS rodar
          e o canvas.offsetWidth seja > 0 quando useEffect do Globe dispara.
          ═══════════════════════════════════════════════════════════ */}
      <div
        id="login-left-panel"
        style={{
          position: 'relative',
          width: '50%',
          flexShrink: 0,
          overflow: 'hidden',
          background: '#060606',
          borderRight: '1px solid rgba(245,168,0,0.07)',
          flexDirection: 'column',
          display: 'flex',   /* ← sempre flex; mobile oculta via style tag abaixo */
        }}
      >
        {/* Cursor interativo (estrela cadente) */}
        <ShootingStarCursor />
        
        {/* Estrelas interativas */}
        <StarField />

        {/* Globe — maior e centralizado */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', width: '88%' }}>
            <Globe config={GLOBE_CFG} className="relative inset-auto max-w-none" />
          </div>
        </div>

        {/* Layer 6a — Logo: posicionada no topo, sem animação */}
        <div style={{
          position: 'absolute',
          top: 0, 
          marginTop: '-4%', /* Reduzido para não cortar o topo do logo fora da tela */
          left: 0,
          right: 0,
          zIndex: 6,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
            alt="Nordex Tech"
            width={360}
            height={270}
            priority
            style={{
              width: 'clamp(240px, 30vw, 360px)', /* Um pouco menor para caber perfeitamente na tela */
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 40px rgba(245,168,0,0.28)) drop-shadow(0 8px 32px rgba(0,0,0,0.8))',
            }}
          />
        </div>

        {/* Layer 6b — Título typewriter: centralizado independentemente */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <TypewriterTitle />
        </div>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 78% 78% at 50% 50%, transparent 28%, #060606 100%)',
        }} />

        {/* Camada 4 — Gradiente inferior (mais agressivo para contrastar com o título) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '48%',
          zIndex: 4,
          pointerEvents: 'none',
          background: 'linear-gradient(to top, #060606 18%, rgba(6,6,6,0.85) 55%, transparent 100%)',
        }} />



        {/* Rodapé — stats minimalistas (sem título duplicado) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5, padding: '0 44px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { value: '100%', label: 'Transparência' },
              { value: '24h', label: 'Suporte' },
              { value: '99.9%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#F5A800', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.32)', marginTop: '4px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          PAINEL DIREITO — Formulário
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(245,168,0,0.032) 0%, transparent 70%)' }} />

        {/* Logo mobile */}
        <div id="login-mobile-logo" style={{ marginBottom: '36px', display: 'none' }}>
          <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
            alt="Nordex Tech" width={148} height={44} style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Card */}
        <div ref={cardRef} style={{
          width: '100%', maxWidth: '416px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.075)',
          borderRadius: '20px', padding: '44px 40px',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          boxShadow: '0 0 0 1px rgba(245,168,0,0.06), 0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
          position: 'relative', overflow: 'hidden', zIndex: 1,
        }}>
          <div style={{ position: 'absolute', top: 0, left: '18%', right: '18%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,168,0,0.55), transparent)' }} />

          <div style={{ marginBottom: '34px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.16)', borderRadius: '100px', padding: '5px 12px', marginBottom: '18px' }}>
              <ShieldCheck size={12} color="#F5A800" />
              <span style={{ fontSize: '11px', color: '#F5A800', fontWeight: 600, letterSpacing: '0.08em' }}>ACESSO SEGURO</span>
            </div>
            <h1 style={{ fontSize: '25px', fontWeight: 700, color: '#f2f2f2', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '7px' }}>Portal do Cliente</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>Acesse para visualizar o andamento do seu projeto.</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>E-mail</label>
              <div style={inputBox('email')}>
                <Mail size={15} style={{ color: iconColor('email'), flexShrink: 0 }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="seu@email.com" disabled={loading} style={inputEl} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Senha</label>
              <div style={inputBox('password')}>
                <Lock size={15} style={{ color: iconColor('password'), flexShrink: 0 }} />
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="••••••••" disabled={loading} style={inputEl} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'rgba(255,255,255,0.22)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,168,0,0.75)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(229,0,0,0.08)', border: '1px solid rgba(229,0,0,0.22)', borderRadius: '10px', padding: '11px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(229,0,0,0.18)', width: '19px', height: '19px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#ff5555', flexShrink: 0 }}>!</span>
                <span style={{ fontSize: '13px', color: '#ff6666' }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', border: 'none', borderRadius: '10px', padding: '14.5px',
              fontSize: '15px', fontWeight: 600, color: '#090909', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px',
              background: loading ? 'rgba(245,168,0,0.45)' : 'linear-gradient(135deg, #F5A800 0%, #de9100 100%)',
              boxShadow: '0 4px 20px rgba(245,168,0,0.28)', transition: 'all 0.2s ease', letterSpacing: '0.01em',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Entrar no Portal'}
            </button>
          </form>

          <div style={{ marginTop: '30px', paddingTop: '22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a href="https://technordex.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5A800')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
              <ArrowLeft size={13} /> Voltar para o site
            </a>
          </div>
        </div>

        <p style={{ marginTop: '26px', fontSize: '12px', color: 'rgba(255,255,255,0.16)', textAlign: 'center' }}>
          © 2025 Nordex Tech · Todos os direitos reservados
        </p>
      </div>

      {/* ─── Estilos globais + responsividade via <style> no HTML ─ */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::placeholder { color: rgba(255,255,255,0.18) !important; }
        input:-webkit-autofill, input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0e0e0e inset !important;
          -webkit-text-fill-color: #f2f2f2 !important;
          caret-color: #F5A800;
        }
        /* Mobile: oculta painel esquerdo, mostra logo */
        @media (max-width: 1023px) {
          #login-left-panel  { display: none !important; }
          #login-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  )
}
