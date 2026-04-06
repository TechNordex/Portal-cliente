/**
 * Client Portal (Dashboard) - V3.1
 * Dynamic Per-Update Notes, Mandatory Rejection Feedback, Friendly Terminology
 */
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { useRealtime } from '@/hooks/use-realtime'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LogOut, ExternalLink, Loader2, Link as LinkIcon,
    FileText, Activity, Info, MessageSquareText,
    Save, Check, X, ThumbsUp, ThumbsDown, Clock, AlertCircle, Users, Menu,
    CheckCircle2, RefreshCw, Timer, MessageCircle
} from 'lucide-react'
import { ProjectTracker } from '@/components/project-tracker'
import type { Project, ProjectUpdate } from '@/lib/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NordyAssistant from '@/components/nordy-assistant'
import ChatTeam from '@/components/chat-team'
import confetti from 'canvas-confetti'

function useTypewriter(target: string, { speed = 70, startDelay = 300 } = {}) {
    const [text, setText] = useState("")
    const [isDone, setIsDone] = useState(false)

    useEffect(() => {
        setText("")
        setIsDone(false)
        if (!target) return;

        const timers: ReturnType<typeof setTimeout>[] = []
        const startId = setTimeout(() => {
            let i = 0
            const intervalId = setInterval(() => {
                i++
                setText(target.slice(0, i))
                if (i >= target.length) {
                    clearInterval(intervalId)
                    const doneId = setTimeout(() => setIsDone(true), 800)
                    timers.push(doneId)
                }
            }, speed)
            timers.push(intervalId as unknown as ReturnType<typeof setTimeout>)
        }, startDelay)

        timers.push(startId)
        return () => timers.forEach(clearTimeout)
    }, [target, speed, startDelay])

    return { text, isDone }
}

const formatHours = (totalMinutes: number | undefined) => {
    if (!totalMinutes || isNaN(totalMinutes) || totalMinutes === 0) return null;
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

function TypewriterTitle({ text, description }: { text: string; description?: string | null }) {
    const { text: typed, isDone } = useTypewriter(text, { speed: 60, startDelay: 200 })
    return (
        <div className="mb-10 flex flex-col items-center justify-center text-center animate-fade-in w-full">
            {/* Eyebrow label */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70">Portal do Cliente</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
            <h1 id="tour-welcome"
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-2"
                style={{ fontFamily: "var(--font-space-grotesk)", lineHeight: 1.08 }}
            >
                <span className="gold-gradient-text whitespace-pre-wrap">
                    {typed}
                    <span
                        aria-hidden="true"
                        className="inline-block w-[4px] h-[0.8em] bg-primary align-middle ml-[3px] rounded-[2px]"
                        style={{
                            animationName: isDone ? "none" : "cursorBlink",
                            animationDuration: "0.75s",
                            animationTimingFunction: "step-end",
                            animationIterationCount: "infinite",
                            opacity: isDone ? 0 : 1,
                            transition: "opacity 0.6s ease",
                            boxShadow: "0 0 12px rgba(245,168,0,0.6)"
                        }}
                    />
                </span>
            </h1>
            {/* Gold accent line */}
            <div className="flex items-center gap-3 my-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
                <div className="h-[2px] w-24 rounded-full" style={{ background: "linear-gradient(90deg, #F5A800, #ffce00, #F5A800)" }} />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
            </div>
            {description && (
                <p className="text-[14px] sm:text-[15px] text-muted-foreground/80 max-w-xl leading-relaxed tracking-wide">
                    {description}
                </p>
            )}
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const fetcher = (url: string) => fetch(url).then((res) => {
        if (!res.ok) throw new Error('Unauthorized')
        return res.json()
    })

    const { data: convData } = useSWR('/api/chat/conversations', fetcher)
    const totalUnread = useMemo(() => {
        if (!convData?.conversations) return 0
        return convData.conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0)
    }, [convData])

    const { data: jsonData, error, isLoading } = useSWR('/api/dashboard/project', fetcher, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    })

    const data = jsonData || null
    const loading = isLoading && !data

    const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Per-update note editing
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
    const [tempNoteValue, setTempNoteValue] = useState('')
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

    // Welcome popup
    const [showWelcome, setShowWelcome] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    // Per-update authorization
    const [approvingUpdateId, setApprovingUpdateId] = useState<string | null>(null)
    const [showUpdateRejectionFormId, setShowUpdateRejectionFormId] = useState<string | null>(null)
    const [updateRejectionFeedback, setUpdateRejectionFeedback] = useState('')

    // Squad Hover state (Dynamic rect positioning to escape overflow)
    const [hoverSquadRect, setHoverSquadRect] = useState<{ top: number, left: number, member: any } | null>(null)
    const [showChatPopup, setShowChatPopup] = useState(false)
    const [chatConvId, setChatConvId] = useState<string | null>(null)
    const [initiatingChatId, setInitiatingChatId] = useState<string | null>(null)

    // Real-time listener
    useRealtime()

    useEffect(() => {
        if (jsonData) {
            if (jsonData.projects && jsonData.projects.length > 0 && !activeProjectId) {
                setActiveProjectId(jsonData.projects[0].id)
            }
            // Server-side check — termsAccepted is per-user, not per-browser
            if (!jsonData.termsAccepted) {
                setShowWelcome(true)
                triggerConfetti()
            }
        }
    }, [jsonData, activeProjectId])

    const handleStartChat = async (isGroup: boolean = true) => {
        if (!activeProjectId) return
        try {
            setInitiatingChatId(isGroup ? 'squad-group' : 'individual')
            setHoverSquadRect(null)
            const res = await fetch('/api/chat/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isGroup: true, projectId: activeProjectId })
            })
            const data = await res.json()
            if (data.conversationId) {
                setChatConvId(data.conversationId)
                setShowChatPopup(true)
                setSidebarOpen(false)
            }
        } catch (error) {
            console.error('Error starting chat:', error)
        } finally {
            setInitiatingChatId(null)
        }
    }

    useEffect(() => {
        if (error) router.push('/login')
    }, [error, router])

    useEffect(() => {
        const handleTourStep = (e: any) => {
            const { targetId } = e.detail;
            if (targetId === 'tour-env-links' || targetId === 'tour-squad') {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('tour-step-changed', handleTourStep);
        return () => window.removeEventListener('tour-step-changed', handleTourStep);
    }, []);

    const triggerConfetti = () => {
        const end = Date.now() + 3000
        const frame = () => {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f5a800', '#ffffff', '#1a1a1a'] })
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f5a800', '#ffffff', '#1a1a1a'] })
            if (Date.now() < end) requestAnimationFrame(frame)
        }
        frame()
    }

    const closeWelcome = async () => {
        setShowWelcome(false)
        // Persist acceptance server-side (per-user, not per-browser)
        try {
            await fetch('/api/dashboard/accept-terms', { method: 'POST' })
        } catch {
            // Non-critical ‚¬€  popup is hidden client-side already
        }
    }

    const startEditingNote = (updateId: string, currentNote: string | null) => {
        setEditingNoteId(updateId)
        setTempNoteValue(currentNote || '')
    }

    const cancelEditingNote = () => {
        setEditingNoteId(null)
        setTempNoteValue('')
    }

    const saveNote = async (updateId: string) => {
        if (!data) return
        setSavingNoteId(updateId)
        const previousUpdates = [...data.allUpdates]
        mutate('/api/dashboard/project', {
            ...data,
            allUpdates: data.allUpdates.map((u: ProjectUpdate) => u.id === updateId ? { ...u, client_note: tempNoteValue } : u)
        }, false)

        try {
            const res = await fetch('/api/dashboard/project-notes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ update_id: updateId, note: tempNoteValue })
            })
            if (!res.ok) throw new Error()
            setEditingNoteId(null)
        } catch {
            mutate('/api/dashboard/project')
            alert('Erro ao salvar nota')
        } finally {
            setSavingNoteId(null)
        }
    }

    const handleUpdateStatus = async (updateId: string, status: 'authorized' | 'denied', feedback?: string) => {
        if (!data) return
        setApprovingUpdateId(updateId)
        const previousUpdates = [...data.allUpdates]

        // Optimistic update
        mutate('/api/dashboard/project', {
            ...data,
            allUpdates: data.allUpdates.map((u: ProjectUpdate) => u.id === updateId ? { ...u, status, feedback: feedback || null } : u)
        }, false)

        try {
            const res = await fetch('/api/dashboard/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ update_id: updateId, status, feedback })
            })
            if (!res.ok) throw new Error()
            setShowUpdateRejectionFormId(null)
            setUpdateRejectionFeedback('')
        } catch {
            mutate('/api/dashboard/project')
            alert('Erro ao processar sua decisão')
        } finally {
            setApprovingUpdateId(null)
        }
    }

    const markAsViewed = async (updateId: string) => {
        try {
            await fetch('/api/dashboard/update-viewed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ update_id: updateId })
            })
        } catch {
            // Silently fail for audit trail
        }
    }

    const markAllAsViewed = async () => {
        const unviewedIds = (updates as any[]).filter((u: any) => u.preview_url && !u.viewed_at).map((u: any) => u.id)
        if (unviewedIds.length === 0) return

        // Optimistic local update
        mutate('/api/dashboard/project', {
            ...data,
            allUpdates: data.allUpdates.map((u: ProjectUpdate) =>
                unviewedIds.includes(u.id) ? { ...u, viewed_at: new Date().toISOString() } : u
            )
        }, false)

        try {
            await Promise.all(unviewedIds.map((id: any) =>
                fetch('/api/dashboard/update-viewed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ update_id: id })
                })
            ))
        } catch {
            // Silently fail or rollback if needed, but viewed_at is an audit trail
        }
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    const { projects, allUpdates, user } = data || {}
    const project = projects?.find((p: any) => p.id === activeProjectId) || null
    const updates = allUpdates?.filter((u: any) =>
        String(u.project_id).trim().toLowerCase() === String(activeProjectId).trim().toLowerCase()
    ) || []

    const hasUnviewedUpdates = updates.some((u: any) => u.preview_url && !u.viewed_at)

    // --- Mini-Dashboard Metrics ---
    const totalUpdates = updates.length;

    // Days Active
    const daysActive = useMemo(() => {
        if (!project || !project.created_at) return 0;
        const start = new Date(typeof project.created_at === 'number' ? project.created_at : project.created_at || '').getTime();
        const now = new Date().getTime();
        const diffDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    }, [project]);

    // Last Update Date
    const lastUpdateDate = useMemo(() => {
        if (updates.length === 0) return 'Nenhuma';
        const sorted = [...updates].sort((a, b) => {
            const dateA = new Date(typeof a.created_at === 'number' ? a.created_at : a.created_at || '').getTime();
            const dateB = new Date(typeof b.created_at === 'number' ? b.created_at : b.created_at || '').getTime();
            return dateB - dateA;
        });

        const latestDate = new Date(typeof sorted[0].created_at === 'number' ? sorted[0].created_at : sorted[0].created_at || '');
        return format(Number.isNaN(latestDate.getTime()) ? new Date() : latestDate, "dd 'de' MMM", { locale: ptBR });
    }, [updates]);

    // Stage Progress estimate (simple visual metric)
    const stageProgress = useMemo(() => {
        if (!project || typeof project.current_stage !== 'number') return 0;
        const totalStages = 6;
        return Math.round((Math.min(project.current_stage, totalStages) / totalStages) * 100);
    }, [project]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex selection:bg-primary/30">

            {/* ---------- SIDEBAR ---------- */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}
            <aside className={`fixed lg:static top-0 left-0 h-full lg:h-auto z-40 w-64 flex-shrink-0 sidebar-premium flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-[#1a1a1a] flex items-center gap-3 relative overflow-hidden">
                    {/* Subtle gold accent line top */}
                    <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,168,0,0.4), transparent)' }} />
                    <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
                        alt="Nordex" width={130} height={36} className="h-9 w-auto" priority
                    />
                    <span className="text-[9px] font-black px-2 py-1 uppercase tracking-[0.18em] rounded-md whitespace-nowrap border"
                        style={{ background: 'rgba(245,168,0,0.07)', color: '#F5A800', borderColor: 'rgba(245,168,0,0.2)' }}>
                        Portal
                    </span>
                </div>

                {/* Project Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1 custom-scrollbar">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] px-3 mb-3" style={{ color: 'rgba(245,168,0,0.4)' }}>Meus Projetos</p>
                    {projects && projects.length > 0 ? projects.map((p: any) => (
                        <button
                            key={p.id}
                            onClick={() => { setActiveProjectId(p.id); setSidebarOpen(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 text-left relative group ${activeProjectId === p.id
                                ? 'sidebar-item-active text-[#F5A800]'
                                : 'text-[#555] hover:text-[#aaa] hover:bg-white/[0.03]'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${activeProjectId === p.id ? 'bg-primary shadow-[0_0_8px_rgba(245,168,0,0.8)] animate-pulse' : 'bg-[#333]'}`} />
                            <span className="truncate">{p.name}</span>
                            {p.preview_status === 'pending' && (
                                <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Aguardando aprovação" />
                            )}
                            {p.preview_status === 'rejected' && (
                                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Ajuste solicitado" />
                            )}
                        </button>
                    )) : (
                        <p className="text-[12px] text-[#444] px-3 py-2">Nenhum projeto ativo.</p>
                    )}

                    {/* Project Specific Info (Contextual) */}
                    {project && (
                        <div className="mt-8 px-1 space-y-5">
                            {/* Environment Links */}
                            <div id="tour-env-links" className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] px-2 mb-2" style={{ color: 'rgba(245,168,0,0.4)' }}>Ambientes</p>
                                <a
                                    href={project.stage_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`w-full py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${project.stage_url
                                        ? 'text-amber-400 hover:bg-amber-500/10'
                                        : 'text-[#333] cursor-not-allowed opacity-40'
                                        }`}
                                    style={{ border: '1px solid', borderColor: project.stage_url ? 'rgba(245,168,0,0.15)' : '#222' }}
                                    onClick={(e) => !project.stage_url && e.preventDefault()}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${project.stage_url ? 'bg-amber-400 animate-pulse' : 'bg-[#333]'}`} />
                                    <span className="truncate">Stage</span>
                                    {project.stage_url && <ExternalLink size={11} className="ml-auto opacity-60" />}
                                </a>

                                <a
                                    href={project.prod_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`w-full py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${project.prod_url
                                        ? 'text-primary hover:bg-primary/10'
                                        : 'text-[#333] cursor-not-allowed opacity-40'
                                        }`}
                                    style={{ border: '1px solid', borderColor: project.prod_url ? 'rgba(245,168,0,0.25)' : '#222' }}
                                    onClick={(e) => !project.prod_url && e.preventDefault()}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${project.prod_url ? 'bg-primary animate-pulse shadow-[0_0_6px_rgba(245,168,0,0.8)]' : 'bg-[#333]'}`} />
                                    <span className="truncate">Produção</span>
                                    {project.prod_url && <ExternalLink size={11} className="ml-auto opacity-60" />}
                                </a>
                            </div>

                            {/* Squad Info */}
                            {project.squad && project.squad.length > 0 && (
                                <div id="tour-squad" className="space-y-3 pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 shrink-0" style={{ color: '#F5A800' }}>
                                            <Users size={11} className="shrink-0" /> Squad
                                        </span>
                                        <button
                                            id="btn-mensagem-squad"
                                            onClick={async () => {
                                                if (initiatingChatId === 'squad-group') return
                                                setInitiatingChatId('squad-group')
                                                try {
                                                    const res = await fetch('/api/chat/init', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ isGroup: true, projectId: activeProjectId })
                                                    })
                                                    const data = await res.json()
                                                    if (data.conversationId) {
                                                        setChatConvId(data.conversationId)
                                                        setShowChatPopup(true)
                                                    }
                                                } catch (err) { } finally { setInitiatingChatId(null) }
                                            }}
                                            className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
                                            style={{
                                                background: initiatingChatId === 'squad-group' ? 'rgba(245,168,0,0.1)' : '#F5A800',
                                                color: initiatingChatId === 'squad-group' ? '#F5A800' : '#000',
                                                border: '1px solid rgba(245,168,0,0.3)',
                                                boxShadow: '0 0 12px rgba(245,168,0,0.2)'
                                            }}
                                        >
                                            {initiatingChatId === 'squad-group' ? <Loader2 size={10} className="animate-spin" /> : <MessageSquareText size={10} />}
                                            Mensagem
                                        </button>
                                    </div>
                                    <div className="flex items-center px-1 -space-x-2.5 overflow-hidden">
                                        {project.squad.map((member: any, i: number) => (
                                            <div
                                                key={i}
                                                className="inline-block h-9 w-9 rounded-full bg-[#1a1a1a] overflow-hidden cursor-help transition-all duration-200 hover:scale-110 hover:z-20 relative"
                                                style={{ border: '2px solid #0a0a0a', boxShadow: '0 0 0 1px rgba(245,168,0,0.15)' }}
                                                title={`${member.name} — ${member.position || 'Especialista'}`}
                                            >
                                                {member.avatar_url ? (
                                                    <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-primary">{member.name.charAt(0)}</div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-center h-9 w-9 rounded-full overflow-hidden text-[9px] font-black"
                                            style={{ background: 'rgba(245,168,0,0.1)', color: '#F5A800', border: '2px solid #0a0a0a', boxShadow: '0 0 0 1px rgba(245,168,0,0.2)' }}>
                                            +{project.squad.length}
                                        </div>
                                    </div>
                                    <p className="px-1 text-[11px] leading-relaxed" style={{ color: '#444' }}>
                                        Seu Squad dedicado trabalhando em tempo real.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* User + Logout */}
                <div className="border-t border-[#181818] p-4 space-y-3">
                    {user && (
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 aspect-square"
                                style={{ border: '2px solid rgba(245,168,0,0.3)', boxShadow: '0 0 8px rgba(245,168,0,0.15)' }}>
                                {(user as any).avatar_url ? (
                                    <img src={(user as any).avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary font-black text-[13px]" style={{ background: 'rgba(245,168,0,0.1)' }}>{user.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-white truncate">{user.name}</p>
                                <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(245,168,0,0.5)' }}>Cliente Nordex</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-[#444] hover:text-red-400 hover:bg-red-500/5"
                    >
                        <LogOut size={13} />
                        Sair da conta
                    </button>
                </div>
            </aside>



            {/* ---------- CONTENT ---------- */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Mobile topbar */}
                <div className="lg:hidden flex items-center gap-4 px-5 py-3 sticky top-0 z-20"
                    style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #181818' }}>
                    <button onClick={() => setSidebarOpen(true)} className="transition-colors" style={{ color: '#555' }}>
                        <Menu size={20} />
                    </button>
                    <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
                        alt="Nordex" width={100} height={28} className="h-6 w-auto"
                    />
                    
                    {/* Mobile Chat Squad Action */}
                    <div className="ml-auto flex items-center">
                        <button
                            onClick={() => handleStartChat(true)}
                            className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95"
                            style={{ background: 'rgba(245,168,0,0.1)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.2)' }}
                        >
                            {initiatingChatId === 'squad-group' ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareText size={14} />}
                            {totalUnread > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full text-[9px] font-black border border-[#111]"
                                    style={{ background: '#ef4444', color: '#fff' }}>
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 lg:p-8 custom-scrollbar">
                    {!project ? (
                        <div className="max-w-xl mx-auto mt-24 text-center">
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
                                style={{ background: 'rgba(245,168,0,0.06)', border: '1px solid rgba(245,168,0,0.15)', boxShadow: '0 0 40px rgba(245,168,0,0.05)' }}>
                                <Activity size={32} style={{ color: '#F5A800' }} />
                            </div>
                            <h1 className="text-3xl font-black mb-4" style={{ fontFamily: 'var(--font-space-grotesk)' }}>Bem-vindo à <span className="gold-gradient-text">Nordex</span></h1>
                            <p className="text-[15px] leading-relaxed" style={{ color: '#555' }}>
                                Seu projeto está sendo preparado. Em breve você poderá acompanhar cada etapa do desenvolvimento aqui neste painel.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Top Header Block */}
                            <TypewriterTitle text={project.name} description={project.description} />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in items-start" style={{ animationDelay: '100ms' }}>

                                {/* Left Column: Pipeline + Metrics */}
                                <div className="lg:col-span-1 flex flex-col gap-5">
                                    {/* Pipeline Card */}
                                    <div id="tour-pipeline" className="content-card p-6 flex flex-col relative w-full">
                                        {/* Gold top accent */}
                                        <div className="absolute top-0 left-6 right-6 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,168,0,0.35), transparent)' }} />
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary"
                                                style={{ background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.2)' }}>
                                                <Activity size={15} />
                                            </div>
                                            <div>
                                                <h2 className="text-[13px] font-black text-white leading-none uppercase tracking-wide">Pipeline</h2>
                                                <p className="text-[10px] mt-0.5" style={{ color: '#444' }}>Etapas de desenvolvimento</p>
                                            </div>
                                        </div>
                                        <ProjectTracker currentStageId={project.current_stage} />
                                    </div>

                                    {/* Metrics Bento Grid */}
                                    <div id="tour-metrics" className="w-full">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(245,168,0,0.5)' }}>Métricas</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Metric 1 — Atualizações */}
                                            <div className="metric-card p-4 flex flex-col justify-between min-h-[100px]">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: '#444' }}>Atualizações</p>
                                                <p className="text-3xl font-black gold-gradient-text mt-2">{totalUpdates}</p>
                                            </div>

                                            {/* Metric 2 — Dias Ativo */}
                                            <div className="metric-card p-4 flex flex-col justify-between min-h-[100px]">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: '#444' }}>Dias Ativo</p>
                                                <p className="text-3xl font-black text-white mt-2">{daysActive}</p>
                                            </div>

                                            {/* Metric 3 — Última Entrega */}
                                            <div className="metric-card p-4 flex flex-col justify-between min-h-[100px]">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: '#444' }}>Última Entrega</p>
                                                <p className="text-xl font-black text-primary mt-2 truncate">{lastUpdateDate}</p>
                                            </div>

                                            {/* Metric 4 — Progresso */}
                                            <div className="metric-card p-4 flex flex-col justify-between min-h-[100px] overflow-hidden">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] relative z-10" style={{ color: '#444' }}>Progresso</p>
                                                <p className="text-3xl font-black gold-gradient-text mt-2 relative z-10">{stageProgress}%</p>
                                                <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: '#1a1a1a' }} />
                                                <div className="absolute bottom-0 left-0 h-[3px] transition-all duration-1000"
                                                    style={{ width: `${stageProgress}%`, background: 'linear-gradient(90deg, #F5A800, #ffce00)' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feed de Atualizações */}
                                <div id="tour-updates" tabIndex={0} className="lg:col-span-2 content-card h-[770px] overflow-hidden focus:outline-none flex flex-col">
                                    <div className="sticky top-0 z-20 px-5 sm:px-8 py-4 sm:py-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        style={{ background: 'rgba(14,14,14,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1c1c1c' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.2)' }}>
                                                <Activity size={13} style={{ color: '#F5A800' }} />
                                            </div>
                                            <h2 className="text-[14px] font-black tracking-tight text-white">Histórico e Atualizações</h2>
                                            {hasUnviewedUpdates && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse"
                                                    style={{ background: 'rgba(245,168,0,0.12)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.25)' }}>
                                                    NOVO
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Feed Content */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-8 py-8 overscroll-contain">
                                        {updates?.length === 0 ? (
                                            <div className="h-[400px] flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shimmer-bg"
                                                    style={{ border: '1px solid rgba(245,168,0,0.1)' }}>
                                                    <Info size={22} style={{ color: 'rgba(245,168,0,0.4)' }} />
                                                </div>
                                                <p className="text-[15px] font-bold text-white mb-2">Nenhuma atualização ainda.</p>
                                                <p className="text-[12px] max-w-[240px] leading-relaxed" style={{ color: '#444' }}>Conforme o projeto avança, as novidades serão registradas aqui.</p>
                                            </div>
                                        ) : (
                                            <div className="relative ml-4 space-y-8 pb-6"
                                                style={{ borderLeft: '1px solid rgba(245,168,0,0.12)' }}>
                                                {updates?.map((upd: ProjectUpdate) => {
                                                            const isEditing = editingNoteId === upd.id
                                                            const hasNote = Boolean(upd.client_note)

                                                            const isCorrection = Boolean(upd.revision_of)
                                                            const originalUpdate = isCorrection
                                                                ? updates.find((u: ProjectUpdate) => u.id === upd.revision_of)
                                                                : null
                                                            const correctionUpdate = updates.find((u: ProjectUpdate) => u.revision_of === upd.id)
                                                            const isSuperseded = Boolean(correctionUpdate)

                                                            return (
                                                                <div key={upd.id} className="relative pl-8 animate-fade-in">
                                                                    {/* Timeline Dot */}
                                                                    <div className={`absolute -left-[7px] top-2 w-3.5 h-3.5 rounded-full ${
                                                                        isCorrection
                                                                            ? 'bg-blue-500 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                                                                            : 'timeline-dot-active shadow-[0_0_10px_rgba(245,168,0,0.5)]'
                                                                    }`}
                                                                        style={isCorrection ? {} : { background: '#F5A800' }}
                                                                    />

                                                                    {/* Update Content */}
                                                                    <div
                                                                        className="feed-card p-5 mb-4 group/card"
                                                                        onMouseEnter={() => !upd.viewed_at && markAsViewed(upd.id)}
                                                                    >
                                                                        {upd.preview_url && project.preview_url !== upd.preview_url && (
                                                                            <div className="absolute top-0 right-0 px-3 py-1.5 rounded-bl-lg flex items-center gap-1.5"
                                                                                style={{ background: 'rgba(245,168,0,0.08)', borderLeft: '1px solid rgba(245,168,0,0.2)', borderBottom: '1px solid rgba(245,168,0,0.2)' }}>
                                                                                <AlertCircle size={10} style={{ color: '#F5A800' }} />
                                                                                <span className="text-[9px] font-bold uppercase tracking-tight" style={{ color: '#F5A800' }}>Build Desatualizada</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md"
                                                                                    style={{ background: 'rgba(245,168,0,0.1)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.2)' }}>
                                                                                    Etapa {upd.stage}
                                                                                </span>
                                                                                {upd.status === 'authorized' && (
                                                                                    <span className="text-[9px] font-bold uppercase flex items-center gap-1 px-2 py-0.5 rounded-md"
                                                                                        style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                                                        <Check size={9} /> Aprovado
                                                                                    </span>
                                                                                )}
                                                                                {upd.status === 'denied' && (
                                                                                    <span className="text-[9px] font-bold uppercase flex items-center gap-1 px-2 py-0.5 rounded-md"
                                                                                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                                                        <X size={9} /> Ajuste Solicitado
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[11px]" style={{ color: '#444' }}>
                                                                                {format(new Date(upd.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-start justify-between gap-4 mb-3">
                                                                            <h4 className="text-[15px] font-bold text-white leading-snug flex items-center gap-2">
                                                                                {upd.title}
                                                                                {isSuperseded && (
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                                                                                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                                                                                        <CheckCircle2 size={9} /> Resolvido
                                                                                    </span>
                                                                                )}
                                                                            </h4>
                                                                            {upd.hours_spent && upd.hours_spent > 0 && (
                                                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
                                                                                    style={{ background: 'rgba(245,168,0,0.06)', border: '1px solid rgba(245,168,0,0.15)' }}>
                                                                                    <Timer size={11} style={{ color: '#F5A800' }} />
                                                                                    <span className="text-[12px] font-black" style={{ color: '#F5A800' }}>{formatHours(upd.hours_spent)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Revision Banner */}
                                                                        {isCorrection && originalUpdate && (
                                                                            <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-start gap-3 animate-in slide-in-from-left-2 duration-500">
                                                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                    <RefreshCw size={12} className="text-blue-400" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Atualização Corretiva</p>
                                                                                    <p className="text-[12px] text-foreground/80 leading-snug">
                                                                                        Esta versão é uma correção direta da atualização: <span className="font-bold text-blue-300">"{originalUpdate.title}"</span>.
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Superseded Banner */}
                                                                        {isSuperseded && (
                                                                            <div className="mb-4 p-3 bg-green-500/5 border border-green-500/10 rounded-lg flex items-start gap-3">
                                                                                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                                                                    <CheckCircle2 size={12} className="text-green-400" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[11px] font-bold text-green-400 uppercase tracking-wider mb-0.5">Versão Endereçada</p>
                                                                                    <p className="text-[12px] text-foreground/80 leading-snug">
                                                                                        Os pontos desta versão foram corrigidos na atualização mais recente.
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {upd.message && (
                                                                            <div className="text-[13px] leading-relaxed p-3 rounded-xl mb-4"
                                                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#888' }}>
                                                                                {upd.message}
                                                                            </div>
                                                                        )}

                                                                        {/* Authorization Buttons */}
                                                                        {upd.status === 'pending' && (
                                                                            <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                <button
                                                                                    disabled={approvingUpdateId === upd.id}
                                                                                    onClick={() => handleUpdateStatus(upd.id, 'authorized')}
                                                                                    className="h-8 px-4 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all"
                                                                                    style={{ background: '#22c55e', color: '#000', boxShadow: '0 0 16px rgba(34,197,94,0.3)' }}
                                                                                >
                                                                                    {approvingUpdateId === upd.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                                                                                    Aprovar Etapa
                                                                                </button>
                                                                                <button
                                                                                    disabled={approvingUpdateId === upd.id}
                                                                                    onClick={() => setShowUpdateRejectionFormId(upd.id)}
                                                                                    className="h-8 px-4 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all"
                                                                                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                                                                                >
                                                                                    <ThumbsDown size={12} />
                                                                                    Solicitar Ajuste
                                                                                </button>
                                                                                {upd.preview_url && (
                                                                                    <a
                                                                                        href={upd.preview_url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        onClick={() => {
                                                                                            if (!upd.viewed_at) {
                                                                                                markAsViewed(upd.id);
                                                                                                mutate('/api/dashboard/project', (prev: any) => prev ? {
                                                                                                    ...prev,
                                                                                                    allUpdates: prev.allUpdates.map((u: ProjectUpdate) => u.id === upd.id ? { ...u, viewed_at: new Date().toISOString() } : u)
                                                                                                } : prev, false);
                                                                                            }
                                                                                        }}
                                                                                        className="h-8 px-3 rounded-lg flex items-center gap-1.5 transition-all ml-auto text-[11px] font-black"
                                                                                        style={!upd.viewed_at
                                                                                            ? { background: '#F5A800', color: '#000', boxShadow: '0 0 16px rgba(245,168,0,0.35)' }
                                                                                            : { background: 'rgba(255,255,255,0.04)', color: '#666', border: '1px solid rgba(255,255,255,0.08)' }
                                                                                        }
                                                                                    >
                                                                                        <LinkIcon size={12} /> Visualizar Build
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {upd.status === 'denied' && upd.feedback && (
                                                                            <div className="mt-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3 animate-in slide-in-from-left-2">
                                                                                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[9px] uppercase tracking-wider mb-1"><AlertCircle size={10} /> Sua restrição:</div>
                                                                                <p className="text-[12px] text-foreground font-medium leading-relaxed italic">"{upd.feedback}"</p>
                                                                            </div>
                                                                        )}

                                                                        {showUpdateRejectionFormId === upd.id && (
                                                                            <div className="mt-4 bg-background border border-red-500/30 rounded-xl p-4 shadow-xl animate-in zoom-in-95">
                                                                                <label className="text-[11px] font-bold text-red-500 uppercase mb-2 block">O que precisa ser ajustado?</label>
                                                                                <textarea
                                                                                    autoFocus
                                                                                    rows={3}
                                                                                    value={updateRejectionFeedback}
                                                                                    onChange={e => setUpdateRejectionFeedback(e.target.value)}
                                                                                    placeholder="Descreva detalhadamente o que você gostaria de alterar nesta build..."
                                                                                    className="w-full bg-secondary/20 border border-border rounded-lg p-3 text-[13px] text-foreground focus:border-red-500/50 outline-none resize-none"
                                                                                />
                                                                                <div className="flex justify-end gap-2 mt-4">
                                                                                    <button
                                                                                        onClick={() => setShowUpdateRejectionFormId(null)}
                                                                                        className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                                                                                    >
                                                                                        Cancelar
                                                                                    </button>
                                                                                    <button
                                                                                        disabled={!updateRejectionFeedback.trim() || approvingUpdateId === upd.id}
                                                                                        onClick={() => handleUpdateStatus(upd.id, 'denied', updateRejectionFeedback)}
                                                                                        className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-[11px] font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-1.5"
                                                                                    >
                                                                                        {approvingUpdateId === upd.id && <Loader2 size={12} className="animate-spin" />}
                                                                                        Confirmar Restrição
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Note Interaction Block */}
                                                                    <div className="pl-4 border-l-2 border-border/30 hover:border-primary/30 transition-colors ml-4 relative">
                                                                        <div className="absolute -left-[18px] top-4 w-4 h-px bg-border/40" />

                                                                        {isEditing ? (
                                                                            <div className="bg-background rounded-xl border border-primary/50 p-4 shadow-lg">
                                                                                <div className="flex items-center gap-2 text-primary font-medium text-[12px] mb-2 uppercase tracking-wide">
                                                                                    <MessageSquareText size={14} /> Sua Observação
                                                                                </div>
                                                                                <textarea
                                                                                    autoFocus
                                                                                    value={tempNoteValue}
                                                                                    onChange={e => setTempNoteValue(e.target.value)}
                                                                                    placeholder="Descreva dúvidas, feedback, links de referência ou qualquer observação importante..."
                                                                                    className="w-full h-24 bg-transparent border-0 text-[14px] text-foreground focus:ring-0 resize-none placeholder:text-muted-foreground/40 p-0"
                                                                                />
                                                                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/50">
                                                                                    <button onClick={cancelEditingNote} className="px-3 py-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors text-[12px] font-medium inline-flex items-center gap-1.5">
                                                                                        <X size={14} /> Cancelar
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => saveNote(upd.id)}
                                                                                        disabled={savingNoteId === upd.id}
                                                                                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-[12px] font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                                                                                    >
                                                                                        {savingNoteId === upd.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save size={14} /> Salvar</>}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : hasNote ? (
                                                                            <div className="bg-card border border-border hover:border-border/80 rounded-xl p-4 group/note relative transition-colors">
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <div className="flex items-center gap-2 text-primary font-medium text-[12px] uppercase tracking-wide">
                                                                                        <Check size={14} className="text-green-500" /> Sua observação
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => startEditingNote(upd.id, upd.client_note || null)}
                                                                                        className="text-[11px] font-medium text-muted-foreground opacity-0 group-hover/note:opacity-100 hover:text-foreground hover:underline transition-all"
                                                                                    >
                                                                                        Editar / Apagar
                                                                                    </button>
                                                                                </div>
                                                                                <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                                                                    {upd.client_note}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => startEditingNote(upd.id, null)}
                                                                                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-9 px-4 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-[13px] font-medium"
                                                                            >
                                                                                <MessageSquareText size={15} /> Deixar uma observação
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>


            {/* Chat Modal Overlay — opens only via squad member click or MENSAGEM SQUAD */}
            <AnimatePresence>
                {showChatPopup && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="chat-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowChatPopup(false); setChatConvId(null) }}
                            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
                        />
                        {/* Panel */}
                        <motion.div
                            key="chat-panel"
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            className="fixed z-[120] inset-4 sm:inset-8 md:inset-12 lg:inset-16 xl:inset-20 2xl:inset-24 flex"
                        >
                            <ChatTeam
                                currentUser={{
                                    id: user?.id || '',
                                    name: user?.name || '',
                                    avatar_url: user?.avatar_url,
                                    role: user?.role || 'client'
                                }}
                                projectId={activeProjectId || undefined}
                                defaultConversationId={chatConvId}
                                onClose={() => { setShowChatPopup(false); setChatConvId(null) }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            {/* Special Modal Popups */}
            <AnimatePresence>
                {/* Welcome Popup */}
                {showWelcome && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.92, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                            className="max-w-xl w-full p-8 relative overflow-hidden"
                            style={{
                                background: '#0d0d0d',
                                border: '1px solid rgba(245,168,0,0.2)',
                                borderRadius: '24px',
                                boxShadow: '0 0 80px rgba(245,168,0,0.06), 0 40px 80px rgba(0,0,0,0.6)'
                            }}
                        >
                            {/* Top line */}
                            <div className="absolute top-0 left-8 right-8 h-[1px]"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(245,168,0,0.5), transparent)' }} />
                            {/* Gold glow orb top-right */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
                                style={{ background: 'radial-gradient(circle, rgba(245,168,0,0.07) 0%, transparent 70%)' }} />
                            
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                                    style={{ background: 'rgba(245,168,0,0.08)', border: '1px solid rgba(245,168,0,0.25)', boxShadow: '0 0 24px rgba(245,168,0,0.1)' }}>
                                    <FileText size={28} style={{ color: '#F5A800' }} />
                                </div>
                                
                                <h2 className="text-2xl font-black mb-2 tracking-tight text-white">Acordo de Confidencialidade</h2>
                                <p className="text-[12px] uppercase tracking-[0.2em] mb-6" style={{ color: 'rgba(245,168,0,0.5)' }}>Nordex — NDA</p>
                                
                                <div className="w-full rounded-xl p-5 text-left mb-6 max-h-60 overflow-y-auto custom-scrollbar"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#666' }}>
                                        Para garantir a segurança e a integridade de todos os projetos na plataforma Nordex, solicitamos que você aceite os nossos termos de confidencialidade antes de prosseguir.
                                    </p>
                                    <ul className="text-[12px] space-y-2.5" style={{ color: '#555' }}>
                                        {['Não compartilhar credenciais ou links de acesso','Manter sigilo sobre as estratégias e tecnologias discutidas','Proteger os dados de terceiros acessados no portal','Reportar imediatamente qualquer atividade suspeita'].map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#F5A800' }} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex items-center gap-3 mb-7 w-full">
                                    <button 
                                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0"
                                        style={agreedToTerms
                                            ? { background: '#F5A800', border: '1px solid rgba(245,168,0,0.5)', boxShadow: '0 0 12px rgba(245,168,0,0.3)' }
                                            : { background: '#111', border: '1px solid #333' }
                                        }
                                    >
                                        {agreedToTerms && <Check size={13} color="#000" />}
                                    </button>
                                    <p className="text-[13px] text-left" style={{ color: '#666' }}>Li e concordo com os termos de confidencialidade.</p>
                                </div>

                                <button 
                                    onClick={closeWelcome}
                                    disabled={!agreedToTerms}
                                    className="w-full h-12 rounded-xl font-black flex items-center justify-center gap-2 transition-all text-[14px]"
                                    style={agreedToTerms
                                        ? { background: '#F5A800', color: '#000', boxShadow: '0 0 32px rgba(245,168,0,0.35)' }
                                        : { background: 'rgba(255,255,255,0.04)', color: '#444', cursor: 'not-allowed', border: '1px solid rgba(255,255,255,0.06)' }
                                    }
                                >
                                    <CheckCircle2 size={17} />
                                    Iniciar meu projeto agora
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}


                {/* Global Squad Hover Popover */}
                {hoverSquadRect?.member?.bio && !showChatPopup && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -10 }}
                        className="fixed z-[200] w-[280px] sm:w-[320px] pointer-events-none"
                        style={{
                            top: Math.max(10, (hoverSquadRect?.top || 0) - 20),
                            left: (hoverSquadRect?.left || 0) + 16
                        }}
                    >
                        <div className="bg-card/95 backdrop-blur-xl border border-primary/20 p-5 rounded-2xl shadow-2xl overflow-hidden relative border-l-primary border-l-4">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-8 -mt-8" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                        {hoverSquadRect.member.position || 'Especialista'}
                                    </span>
                                </div>
                                <p className="text-[14px] font-bold text-foreground mb-2">{hoverSquadRect.member.name}</p>
                                <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed font-medium">
                                    {hoverSquadRect.member.bio}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Virtual Assistant */}
            <NordyAssistant project={project} tourCompleted={data?.tourCompleted} tourEnabled={!showWelcome} />
        </div>
    )
}
