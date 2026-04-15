'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Globe } from '@/components/ui/globe'
import { StarField } from '@/components/login/StarField'
import { TypewriterTitle } from '@/components/login/TypewriterTitle'
import { ShootingStarCursor } from '@/components/login/ShootingStarCursor'
import { IntroOverlay } from '@/components/login/IntroOverlay'
import { OrbitalStar } from '@/components/login/OrbitalStar'

/* ─── Config do globo — NÃO ALTERAR ──────────────────────────── */
const GLOBE_CFG: any = {
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
    { location: [-8.0506, -34.8781], size: 0, id: 'rec', label: 'Recife', isHQ: true },
    { location: [-22.9068, -43.1729], size: 0, id: 'rio', label: 'Rio de Janeiro' },
  ],
}

/* ─── Floating Label Input ────────────────────────────────────── */
function FloatField({
  id, label, type = 'text', value, onChange, disabled,
  suffix,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  suffix?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div style={{ position: 'relative', paddingTop: '20px' }}>
      {/* Label flutuante */}
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          left: 0,
          top: lifted ? '0px' : '32px',
          fontSize: lifted ? '10px' : '14px',
          fontWeight: lifted ? 600 : 400,
          color: focused
            ? 'rgba(245,168,0,0.75)'
            : lifted
              ? 'rgba(255,255,255,0.32)'
              : 'rgba(255,255,255,0.28)',
          letterSpacing: lifted ? '0.12em' : '0.02em',
          textTransform: lifted ? 'uppercase' : 'none',
          transition: 'top 0.22s cubic-bezier(0.22,1,0.36,1), font-size 0.22s, color 0.22s, letter-spacing 0.22s',
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        {label}
      </label>

      {/* Linha + input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          autoComplete={id}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '10px 0',
            fontSize: '15px',
            color: '#f2f2f2',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.01em',
            caretColor: '#F5A800',
          }}
        />
        {suffix}
      </div>

      {/* Linha de fundo */}
      <div style={{
        height: '1px',
        background: focused
          ? 'linear-gradient(90deg, rgba(245,168,0,0.7) 0%, rgba(245,168,0,0.2) 100%)'
          : 'rgba(255,255,255,0.1)',
        transition: 'background 0.25s ease',
      }} />
    </div>
  )
}

/* ─── Página ──────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  /** true quando o IntroOverlay chama onReveal → painéis ficam visíveis */
  const [sysRevealed, setSysRevealed] = useState(false)
  /** true quando a OrbitalStar completou a sua animação */
  const [orbitDone, setOrbitDone] = useState(false)

  /** Ref que o IntroOverlay usa para medir a posição real da logo */
  const realLogoWrapRef = useRef<HTMLDivElement>(null)

  const handleReveal = useCallback(() => setSysRevealed(true), [])
  const handleDone = useCallback(() => {/* handled */ }, [])

  /* Entrada do formulário — só anima após o sistema revelar */
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!sysRevealed) return
    const el = formRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(18px)'
    const id = setTimeout(() => {
      el.style.transition = 'opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1)'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 200)
    return () => clearTimeout(id)
  }, [sysRevealed])

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

  /* Estilos de transição compartilhados dos painéis */
  const panelTransition = sysRevealed
    ? 'opacity 0.7s cubic-bezier(0.22,1,0.36,1)'
    : 'none'

  return (
    <>
      {/* ════════════════════════════════════════════════
          INTRO CINEMATOGRÁFICO
          ════════════════════════════════════════════════ */}
      <IntroOverlay
        realLogoWrapRef={realLogoWrapRef}
        onReveal={handleReveal}
        onDone={handleDone}
      />

      <div style={{
        minHeight: '100vh',
        background: '#060606',
        display: 'flex',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}>

        {/* ════════════════════════════════════════════════
            PAINEL ESQUERDO — NÃO ALTERAR (lógica interna)
            ════════════════════════════════════════════════ */}
        <div
          id="login-left-panel"
          style={{
            position: 'relative',
            width: '55%',
            flexShrink: 0,
            overflow: 'hidden',
            background: '#060606',
            borderRight: '1px solid rgba(245,168,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            /* Revela com o sistema */
            opacity: sysRevealed ? 1 : 0,
            transition: panelTransition,
          }}
        >
          <ShootingStarCursor active={sysRevealed && orbitDone} />
          <StarField />

          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '88%' }}>
              <Globe config={GLOBE_CFG} className="relative inset-auto max-w-none" />
            </div>
          </div>

          {/* Logo real — o IntroOverlay mede este wrapper para o FLIP */}
          <div style={{ position: 'absolute', top: 0, marginTop: '-4%', left: 0, right: 0, zIndex: 6, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div ref={realLogoWrapRef} style={{ display: 'inline-block' }}>
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
                alt="Nordex Tech" width={360} height={270} priority
                style={{ width: 'clamp(240px, 30vw, 360px)', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 0 40px rgba(245,168,0,0.28)) drop-shadow(0 8px 32px rgba(0,0,0,0.8))' }}
              />
            </div>
          </div>

          {/* Título typewriter */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <TypewriterTitle />
          </div>

          {/* ── Estrela cadente orbital ao redor do título ── */}
          <OrbitalStar visible={sysRevealed} onComplete={useCallback(() => setOrbitDone(true), [])} />

          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', background: 'radial-gradient(ellipse 78% 78% at 50% 50%, transparent 28%, #060606 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 4, pointerEvents: 'none', background: 'linear-gradient(to top, #060606 18%, rgba(6,6,6,0.85) 55%, transparent 100%)' }} />

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

        {/* ════════════════════════════════════════════════
            PAINEL DIREITO — Formulário clean
            ════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          background: '#060606',
          /* Revela 180ms após o painel esquerdo */
          opacity: sysRevealed ? 1 : 0,
          transition: sysRevealed
            ? 'opacity 0.7s cubic-bezier(0.22,1,0.36,1) 0.18s'
            : 'none',
        }}>
          {/* Brilho ambiente */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse 75% 55% at 50% 42%, rgba(245,168,0,0.025) 0%, transparent 70%)',
          }} />

          {/* Logo mobile only */}
          <div id="login-mobile-logo" style={{ display: 'none', position: 'absolute', top: '32px', left: '32px' }}>
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
              alt="Nordex Tech" width={160} height={42}
              style={{ height: '36px', width: 'auto', objectFit: 'contain', opacity: 0.9 }}
            />
          </div>

          {/* Minimalist Globe para Mobile na parte inferior */}
          <div id="mobile-globe-wrap" style={{
            display: 'none',
            position: 'absolute',
            bottom: '-45%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '180vw',
            opacity: 0.25,
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            <Globe config={GLOBE_CFG} className="relative inset-auto max-w-none" />
          </div>

          <div ref={formRef} style={{ width: '100%', maxWidth: '360px', position: 'relative', zIndex: 1 }}>

            {/* ── Cabeçalho ── */}
            <div style={{ marginBottom: '52px' }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(245,168,0,0.45)',
                marginBottom: '16px',
              }}>
                Nordex Tech
              </p>

              <h1 style={{
                fontSize: 'clamp(30px, 3.2vw, 42px)',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.035em',
                lineHeight: 1.08,
                margin: '0 0 14px',
              }}>
                Portal do{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #F5A800 0%, #ffd966 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Cliente.</span>
              </h1>

              <p style={{
                fontSize: '13.5px',
                color: 'rgba(255,255,255,0.28)',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}>
                Acompanhe seu projeto em tempo real.
              </p>
            </div>

            {/* ── Formulário ── */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              <FloatField
                id="email"
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={loading}
              />

              <FloatField
                id="password"
                label="Senha"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                disabled={loading}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      color: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      transition: 'color 0.2s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,168,0,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {/* Erro inline */}
              {error && (
                <p style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'rgba(255,88,88,0.85)',
                  margin: '-8px 0 0',
                  lineHeight: 1.5,
                }}>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#ff5858', flexShrink: 0, display: 'inline-block' }} />
                  {error}
                </p>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '15px 28px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#080808',
                  letterSpacing: '0.01em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: loading ? 'rgba(245,168,0,0.38)' : '#F5A800',
                  boxShadow: loading ? 'none' : '0 0 36px rgba(245,168,0,0.18)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 40px rgba(245,168,0,0.30)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 0 36px rgba(245,168,0,0.18)'
                }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <><span>Entrar</span> <ArrowRight size={14} strokeWidth={2.5} /></>
                }
              </button>
            </form>

            {/* ── Rodapé ── */}
            <div style={{
              marginTop: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <a
                href="https://nordex.tech"
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.18)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,168,0,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
              >
                ← Voltar
              </a>
            </div>

          </div>
        </div>

        {/* ── Estilos globais ── */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          ::placeholder { color: transparent !important; }
          input:-webkit-autofill,
          input:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px #060606 inset !important;
            -webkit-text-fill-color: #f2f2f2 !important;
            caret-color: #F5A800;
          }
          @media (max-width: 1023px) {
            #login-left-panel  { display: none !important; }
            #login-mobile-logo { display: block !important; }
            #mobile-globe-wrap { display: block !important; }
          }
        `}</style>
      </div>
    </>
  )
}
