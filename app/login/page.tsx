'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

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

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao fazer login')
            }

            router.push(data.user.role === 'admin' ? '/admin' : '/dashboard')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex">

            {/* Left Side: Image & Branding (Hidden on small screens) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center p-16 overflow-hidden bg-black">
                {/* Background Image Setup */}
                <Image
                    src="/login-background.jpg"
                    alt="Nordex Client Portal"
                    fill
                    className="object-cover opacity-60 mix-blend-luminosity"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />



                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-heading font-bold text-white mb-6 leading-tight">
                        Construindo o futuro digital do seu <span className="text-primary font-bold">negócio</span>.
                    </h2>
                    <p className="text-white/70 text-lg leading-relaxed text-pretty">
                        Acompanhe cada etapa do seu projeto em tempo real. Nossa plataforma oferece total transparência, do planejamento ao lançamento final, garantindo que suas ideias se tornem realidade no prazo correto.
                    </p>


                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative">
                {/* Mobile Background (Subtle Glow) */}
                <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                </div>

                <div className="w-full max-w-md relative z-10">

                    {/* Mobile Logo Logo */}
                    <div className="flex lg:hidden justify-center mb-12">
                        <Image
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
                            alt="Nordex Tech"
                            width={180}
                            height={60}
                            className="h-10 w-auto object-contain"
                        />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-heading font-bold mb-3 tracking-tight">Portal do Cliente</h1>
                        <p className="text-muted-foreground text-sm lg:text-base">
                            Acesse a central para visualizar o andamento do seu projeto.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-foreground/80">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                                disabled={loading}
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-foreground/80">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                                disabled={loading}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex items-center gap-2">
                                <span className="bg-destructive/20 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0">!</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-lg hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Portal'}
                        </button>
                    </form>

                    <div className="mt-12 text-center lg:text-left">
                        <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <span className="text-lg">←</span> Voltar para a página inicial
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
