"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as Popover from '@radix-ui/react-popover'
import { Smile, Clock, MessageCircle, User, Loader2, Send, ArrowLeft, Search, CheckCheck, X, Reply, Edit3, Trash2 } from 'lucide-react'
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Conversation = {
    id: string
    project_id: string | null
    title: string
    avatar: string | null
    type: 'direct' | 'group'
    updated_at: string
    unread_count: number
    last_message?: { content: string; created_at: string; sender_id: string }
}

type Message = {
    id: string
    sender_id: string
    content: string
    type: string
    created_at: string
    is_edited?: boolean
    reply_to_id?: string | null
    reply_to?: { content: string; sender_name: string } | null
    sender: { name: string; avatar_url: string | null; role: string }
}

interface ChatTeamProps {
    currentUser: {
        id: string
        name: string
        avatar_url?: string
        role: string
    }
    projectId?: string
    defaultConversationId?: string | null
    onClose?: () => void
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('err')
    return res.json()
})

// Reactive isMobile hook
function useIsMobile(bp = 768) {
    const [m, setM] = useState(false)
    useEffect(() => {
        const fn = () => setM(window.innerWidth < bp)
        fn()
        window.addEventListener('resize', fn)
        return () => window.removeEventListener('resize', fn)
    }, [bp])
    return m
}

// Initials avatar
function Avi({ src, name, size = 9 }: { src?: string | null; name?: string; size?: number }) {
    const s = `w-${size} h-${size}`
    if (src) return <img src={src} alt="" className={`${s} rounded-full object-cover shrink-0 ring-1 ring-border/30`} />
    return (
        <div className={`${s} rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center shrink-0 text-primary font-bold text-xs`}>
            {name?.charAt(0).toUpperCase() ?? '?'}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatTeam({ currentUser, projectId, defaultConversationId, onClose }: ChatTeamProps) {
    const isMobile = useIsMobile()

    const { data: convData, isLoading: convLoading } = useSWR('/api/chat/conversations', fetcher, { refreshInterval: 10000 })
    const conversations: Conversation[] = convData?.conversations ?? []

    const [activeConvId, setActiveConvId] = useState<string | null>(null)
    const [input, setInput] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingMsg, setEditingMsg] = useState<Message | null>(null)
    const [replyingTo, setReplyingTo] = useState<Message | null>(null)
    const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, string>>>({})
    const [showSearch, setShowSearch] = useState(false)

    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    // Set default conversation
    useEffect(() => {
        if (defaultConversationId) setActiveConvId(defaultConversationId)
    }, [defaultConversationId])

    // Messages with 5s polling fallback
    const { data: msgsData, isLoading: msgsLoading } = useSWR(
        activeConvId ? `/api/chat/messages?conversationId=${activeConvId}` : null,
        fetcher,
        { refreshInterval: 5000 }
    )
    const messages: Message[] = msgsData?.messages ?? []

    // Select conversation → mark as read
    const selectConv = useCallback((id: string) => {
        setActiveConvId(id)
        fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: id })
        }).then(() => mutate('/api/chat/conversations'))
    }, [])

    // Realtime events listener
    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const { event, data } = e.detail
            if (event === 'NEW_MESSAGE' && data) {
                const { conversationId, message } = data
                mutate('/api/chat/conversations')
                if (conversationId === activeConvId) {
                    mutate(`/api/chat/messages?conversationId=${activeConvId}`, (cur: any) => {
                        const prev = Array.isArray(cur?.messages) ? cur.messages : []
                        const clean = prev.filter((m: Message) => !m.id.startsWith('temp-'))
                        if (clean.some((m: Message) => m.id === message.id)) return cur
                        return { ...cur, messages: [...clean, message] }
                    }, false)
                    fetch('/api/chat/read', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversationId })
                    }).then(() => mutate('/api/chat/conversations'))
                }
            }
            if (event === 'MESSAGE_EDITED' && data.conversationId === activeConvId) {
                mutate(`/api/chat/messages?conversationId=${activeConvId}`, (cur: any) => {
                    const prev = Array.isArray(cur?.messages) ? cur.messages : []
                    return { ...cur, messages: prev.map((m: Message) => m.id === data.messageId ? { ...m, content: data.newContent, is_edited: true } : m) }
                }, false)
            }
            if (event === 'USER_TYPING' && data.conversationId === activeConvId && data.userId !== currentUser.id) {
                setTypingUsers(prev => {
                    const ct = { ...(prev[data.conversationId] ?? {}) }
                    if (data.isTyping) { ct[data.userId] = data.userName } else { delete ct[data.userId] }
                    return { ...prev, [data.conversationId]: ct }
                })
                if (data.isTyping) {
                    const k = `${data.conversationId}-${data.userId}`
                    if (typingTimers.current[k]) clearTimeout(typingTimers.current[k])
                    typingTimers.current[k] = setTimeout(() => {
                        setTypingUsers(prev => {
                            const ct = { ...(prev[data.conversationId] ?? {}) }
                            delete ct[data.userId]
                            return { ...prev, [data.conversationId]: ct }
                        })
                    }, 4000)
                }
            }
            if (event === 'CONVERSATION_DELETED') {
                if (data.conversationId === activeConvId) setActiveConvId(null)
                mutate('/api/chat/conversations')
            }
        }
        window.addEventListener('realtime-event', handler as EventListener)
        return () => window.removeEventListener('realtime-event', handler as EventListener)
    }, [activeConvId, currentUser.id])

    // Auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendTyping = useCallback((typing: boolean) => {
        if (!activeConvId) return
        fetch('/api/chat/typing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: activeConvId, isTyping: typing })
        }).catch(() => {})
    }, [activeConvId])

    const handleSend = async () => {
        if (!input.trim() || !activeConvId || isSending) return
        const text = input.trim()
        const isEdit = !!editingMsg
        const replyId = replyingTo?.id

        setInput('')
        setEditingMsg(null)
        setReplyingTo(null)
        setIsSending(true)
        inputRef.current?.focus()

        if (!isEdit) {
            const tempId = `temp-${Date.now()}`
            mutate(`/api/chat/messages?conversationId=${activeConvId}`, (cur: any) => {
                const prev = Array.isArray(cur?.messages) ? cur.messages : []
                return {
                    ...cur,
                    messages: [...prev, {
                        id: tempId,
                        sender_id: currentUser.id,
                        content: text,
                        type: 'text',
                        created_at: new Date().toISOString(),
                        reply_to_id: replyId,
                        reply_to: replyingTo ? { content: replyingTo.content, sender_name: replyingTo.sender.name } : null,
                        sender: { name: currentUser.name, avatar_url: currentUser.avatar_url ?? null, role: currentUser.role }
                    }]
                }
            }, false)
        }

        try {
            let res
            if (isEdit) {
                res = await fetch('/api/chat/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId: editingMsg!.id, content: text })
                })
            } else {
                res = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId: activeConvId, content: text, replyToId: replyId })
                })
            }
            
            if (!res.ok) {
                const errText = await res.text()
                console.error("Chat Action Error:", errText)
                alert(`Erro ao enviar: ${errText}`)
                throw new Error('Falha na API: ' + res.status)
            }

            await mutate(`/api/chat/messages?conversationId=${activeConvId}`)
            mutate('/api/chat/conversations')
            sendTyping(false)
        } catch (err: any) {
            console.error(err)
            await mutate(`/api/chat/messages?conversationId=${activeConvId}`)
        } finally {
            setIsSending(false)
        }
    }

    const handleDeleteConv = async () => {
        if (!activeConvId) return
        const conv = conversations.find(c => c.id === activeConvId)
        if (!confirm(`Apagar este ${conv?.type === 'group' ? 'grupo' : 'chat'}?`)) return
        await fetch('/api/chat/delete-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: activeConvId })
        })
        setActiveConvId(null)
        mutate('/api/chat/conversations')
    }

    const filtered = conversations.filter(c => c.type === 'group' && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    const activeConv = conversations.find(c => c.id === activeConvId)
    const typingInConv = activeConvId ? Object.values(typingUsers[activeConvId] ?? {}) : []


    // ── Layout ──
    // On mobile, show either conversation list OR chat
    // On desktop, always show both
    const showList = !isMobile || !activeConvId
    const showChat = !isMobile || !!activeConvId

    return (
        <div className="flex w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0e0e0e]">

            {/* ══════════════ LEFT: CONVERSATION LIST ══════════════ */}
            {showList && (
                <div className={`flex flex-col bg-[#111111] border-r border-white/8 ${isMobile ? 'w-full' : 'w-[300px] shrink-0'}`}>

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/8">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-bold text-white">{currentUser.name || 'Mensagens'}</h2>
                        </div>
                        <button
                            onClick={() => setShowSearch(s => !s)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${showSearch ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        >
                            <Search size={16} />
                        </button>
                    </div>

                    {/* Search bar */}
                    <AnimatePresence>
                        {showSearch && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden px-3 pt-2"
                            >
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        autoFocus
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full bg-white/5 border border-white/10 text-[13px] text-white rounded-xl pl-9 pr-3 py-2 outline-none placeholder:text-white/30 focus:border-primary/50"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto py-2">
                        {convLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 size={20} className="animate-spin text-primary/60" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/30">
                                <MessageCircle size={24} />
                                <span className="text-[12px]">{searchQuery ? 'Nenhum resultado' : 'Nenhuma conversa'}</span>
                            </div>
                        ) : (
                            filtered.map(conv => {
                                const isActive = conv.id === activeConvId
                                const hasUnread = conv.unread_count > 0
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => selectConv(conv.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            {conv.type === 'group' ? (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/30 flex items-center justify-center">
                                                    <span className="text-[8px] font-black text-primary tracking-widest">SQUAD</span>
                                                </div>
                                            ) : conv.avatar ? (
                                                <img src={conv.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                                    <User size={18} className="text-white/40" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-[13.5px] truncate ${hasUnread ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                                                    {conv.title}
                                                </span>
                                                {conv.last_message && (
                                                    <span className="text-[11px] text-white/30 shrink-0 ml-2">
                                                        {format(new Date(conv.last_message.created_at), 'HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[12px] text-white/40 truncate flex-1">
                                                    {typingUsers[conv.id] && Object.keys(typingUsers[conv.id]).length > 0 ? (
                                                        <span className="text-primary italic">digitando...</span>
                                                    ) : (
                                                        conv.last_message?.content || <span className="opacity-40 italic">Diga olá ✨</span>
                                                    )}
                                                </span>
                                                {hasUnread && (
                                                    <span className="bg-primary text-black text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shrink-0">
                                                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════ RIGHT: CHAT PANEL ══════════════ */}
            {showChat && (
                <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e]">
                    {!activeConvId ? (
                        /* Empty state */
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                            {onClose && !isMobile && (
                                <div className="absolute top-4 right-4">
                                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <MessageCircle size={34} className="text-primary" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-[18px] font-bold text-white mb-2">Suas Mensagens</h3>
                                <p className="text-[13px] text-white/40 max-w-xs leading-relaxed">
                                    Clique no botão abaixo para acessar o canal de comunicação exclusivo da sua Squad.
                                </p>
                            </div>
                            {projectId && (
                                <button
                                    disabled={isSending}
                                    onClick={async () => {
                                        setIsSending(true)
                                        try {
                                            const res = await fetch('/api/chat/init', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ isGroup: true, projectId })
                                            })
                                            const d = await res.json()
                                            if (d.conversationId) selectConv(d.conversationId)
                                        } catch { } finally { setIsSending(false) }
                                    }}
                                    className="flex items-center gap-2 bg-primary text-black font-bold text-[13px] px-5 py-2.5 rounded-full hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                    Abrir Chat da Squad
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* ── Chat Header ── */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0 bg-[#111111]">
                                <div className="flex items-center gap-3 min-w-0">
                                    {isMobile && (
                                        <button onClick={() => setActiveConvId(null)} className="text-white/40 hover:text-white transition-colors mr-1">
                                            <ArrowLeft size={18} />
                                        </button>
                                    )}
                                    {activeConv?.type === 'group' ? (
                                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                            <span className="text-[7px] font-black text-primary tracking-widest">SQUAD</span>
                                        </div>
                                    ) : activeConv?.avatar ? (
                                        <img src={activeConv.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <User size={15} className="text-white/40" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-bold text-white leading-none truncate">{activeConv?.title}</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">
                                            Canal de Comunicação — Equipe Nordex
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {(activeConv?.type === 'group' || currentUser.role === 'admin') && (
                                        <button
                                            onClick={handleDeleteConv}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Apagar conversa"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                    {onClose && (
                                        <button
                                            onClick={onClose}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Messages ── */}
                            <div
                                className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
                            >
                                {msgsLoading ? (
                                    <div className="flex justify-center items-center h-full gap-2 text-white/30">
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                                            <MessageCircle size={22} className="text-white/20" />
                                        </div>
                                        <p className="text-[13px] text-white/30 text-center">
                                            Nenhuma mensagem ainda.<br />
                                            <span className="text-primary/80">Diga olá! 👋</span>
                                        </p>
                                    </div>
                                ) : (
                                    (() => {
                                        const groups: Record<string, Message[]> = {}
                                        messages.forEach(m => {
                                            const k = format(new Date(m.created_at), "dd 'de' MMMM", { locale: ptBR })
                                            if (!groups[k]) groups[k] = []
                                            groups[k].push(m)
                                        })
                                        return Object.entries(groups).map(([date, msgs]) => (
                                            <div key={date}>
                                                {/* Date separator */}
                                                <div className="flex items-center gap-3 my-5">
                                                    <div className="flex-1 h-px bg-white/8" />
                                                    <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest px-2">{date}</span>
                                                    <div className="flex-1 h-px bg-white/8" />
                                                </div>

                                                {msgs.map((msg, i) => {
                                                    const isMe = msg.sender_id === currentUser.id
                                                    const isTemp = msg.id.startsWith('temp-')
                                                    const prevSame = i > 0 && msgs[i - 1].sender_id === msg.sender_id
                                                    const nextSame = i < msgs.length - 1 && msgs[i + 1].sender_id === msg.sender_id
                                                    const isFirst = !prevSame
                                                    const isLast = !nextSame

                                                    return (
                                                        <motion.div
                                                            key={msg.id}
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.12 }}
                                                            className={`flex group ${isMe ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
                                                        >
                                                            {/* Other's spacer / avatar */}
                                                            {!isMe && (
                                                                <div className="w-8 mr-2 flex items-end shrink-0">
                                                                    {isLast ? <Avi src={msg.sender.avatar_url} name={msg.sender.name} size={8} /> : null}
                                                                </div>
                                                            )}

                                                            <div className={`flex flex-col max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                                {/* Sender name (group, others, first) */}
                                                                {activeConv?.type === 'group' && !isMe && isFirst && (
                                                                    <span className="text-[10px] font-bold text-primary/80 mb-1 ml-1 uppercase tracking-wide">
                                                                        {msg.sender.name.split(' ')[0]}
                                                                    </span>
                                                                )}

                                                                {/* Reply preview */}
                                                                {msg.reply_to && (
                                                                    <div className={`
                                                                        mb-1 px-3 py-1.5 rounded-xl border-l-2 border-primary/60
                                                                        bg-white/5 max-w-full text-[11px]
                                                                    `}>
                                                                        <span className="block text-[9px] font-bold text-primary/70 uppercase mb-0.5">{msg.reply_to.sender_name}</span>
                                                                        <span className="text-white/50 truncate block max-w-[200px]">{msg.reply_to.content}</span>
                                                                    </div>
                                                                )}

                                                                {/* Bubble row */}
                                                                <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                                    {/* Action buttons on hover */}
                                                                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                                        <button
                                                                            onClick={() => { setReplyingTo(msg); inputRef.current?.focus() }}
                                                                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                                                            title="Responder"
                                                                        >
                                                                            <Reply size={12} />
                                                                        </button>
                                                                        {isMe && !isTemp && (
                                                                            <button
                                                                                onClick={() => { setEditingMsg(msg); setInput(msg.content); inputRef.current?.focus() }}
                                                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                                                                title="Editar"
                                                                            >
                                                                                <Edit3 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Bubble */}
                                                                    <div className={`
                                                                        px-4 py-2.5 text-[13.5px] leading-relaxed break-words
                                                                        ${isMe
                                                                            ? `bg-primary text-black font-medium
                                                                               ${isFirst ? 'rounded-t-2xl' : 'rounded-xl'}
                                                                               ${isLast ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-2xl'}`
                                                                            : `bg-[#1e1e1e] text-white border border-white/8
                                                                               ${isFirst ? 'rounded-t-2xl' : 'rounded-xl'}
                                                                               ${isLast ? 'rounded-br-2xl rounded-bl-sm' : 'rounded-2xl'}`
                                                                        }
                                                                        ${isTemp ? 'opacity-60' : ''}
                                                                    `}>
                                                                        <span className="whitespace-pre-wrap">{msg.content}</span>
                                                                        <div className={`flex items-center gap-1 mt-1.5 justify-end ${isMe ? 'opacity-50' : 'opacity-35'}`}>
                                                                            {msg.is_edited && <span className="text-[9px] italic">editada</span>}
                                                                            <span className="text-[10px]">{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                                            {isMe && <CheckCheck size={11} className={isTemp ? 'opacity-50' : ''} />}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* My side spacer */}
                                                            {isMe && <div className="w-8 ml-2 shrink-0" />}
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        ))
                                    })()
                                )}

                                {/* Typing indicator */}
                                <AnimatePresence>
                                    {typingInConv.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                            className="flex items-center gap-2 pl-10 mt-2"
                                        >
                                            <div className="flex gap-1 bg-[#1e1e1e] border border-white/8 px-3 py-2 rounded-2xl rounded-bl-sm items-center">
                                                {[0, 150, 300].map(d => (
                                                    <span key={d} className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-white/30 italic">{typingInConv[0]} está digitando...</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div ref={bottomRef} />
                            </div>

                            {/* ── Input Area ── */}
                            <div className="px-4 pb-4 pt-3 shrink-0 border-t border-white/8 bg-[#0e0e0e]">
                                {/* Reply/Edit preview */}
                                <AnimatePresence>
                                    {(replyingTo || editingMsg) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="mb-2 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border-l-2 border-primary/70"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                    {editingMsg ? 'Editando' : `Respondendo a ${replyingTo?.sender.name}`}
                                                </p>
                                                <p className="text-[12px] text-white/40 truncate">
                                                    {editingMsg ? editingMsg.content : replyingTo?.content}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => { setEditingMsg(null); setReplyingTo(null); setInput('') }}
                                                className="w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white transition-colors shrink-0"
                                            >
                                                <X size={13} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Professional Emoji Picker Integration */}
                                <div className="flex items-center gap-2 mb-2">
                                    <Popover.Root>
                                        <Popover.Trigger asChild>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-primary hover:bg-primary/10 transition-all shadow-lg shadow-black/20"
                                            >
                                                <Smile size={20} />
                                            </motion.button>
                                        </Popover.Trigger>
                                        <Popover.Portal>
                                            <Popover.Content 
                                                className="z-[9999] bg-transparent border-none shadow-none p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                                sideOffset={12}
                                                align="start"
                                            >
                                                <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                                                    <EmojiPicker
                                                        theme={Theme.DARK}
                                                        emojiStyle={EmojiStyle.NATIVE}
                                                        onEmojiClick={(emojiData) => {
                                                            setInput(prev => prev + emojiData.emoji)
                                                            inputRef.current?.focus()
                                                        }}
                                                        width={320}
                                                        height={400}
                                                        searchPlaceHolder="Buscar emoji..."
                                                        previewConfig={{ showPreview: false }}
                                                        skinTonesDisabled
                                                        searchDisabled={false}
                                                    />
                                                </div>
                                            </Popover.Content>
                                        </Popover.Portal>
                                    </Popover.Root>

                                    {/* Quick Elegant Shortcuts */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar flex-1">
                                        {['👍', '❤️', '🔥', '👏', '✨', '🚀', '✅', '😂'].map(e => (
                                            <button
                                                key={e}
                                                onClick={() => { setInput(p => p + e); inputRef.current?.focus() }}
                                                className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-[14px] transition-all active:scale-90 shrink-0 border border-white/[0.05] hover:border-primary/20 hover:text-primary"
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Textarea input */}
                                <div className="flex items-end gap-2">
                                    <div className="flex-1 relative">
                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => {
                                                setInput(e.target.value)
                                                sendTyping(e.target.value.length > 0)
                                                const k = activeConvId || 'g'
                                                if (typingTimers.current[k]) clearTimeout(typingTimers.current[k])
                                                typingTimers.current[k] = setTimeout(() => sendTyping(false), 3000)
                                                e.target.style.height = 'auto'
                                                e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                                            }}
                                            placeholder="Escreva uma mensagem..."
                                            rows={1}
                                            style={{ minHeight: '44px', maxHeight: '112px' }}
                                            className="w-full bg-white/6 border border-white/10 text-white text-[13.5px] placeholder:text-white/25 rounded-2xl px-4 py-2.5 outline-none focus:border-primary/50 focus:bg-white/8 transition-all resize-none overflow-hidden"
                                        />
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSend}
                                        disabled={!input.trim() || isSending}
                                        className="w-10 h-10 rounded-2xl bg-primary text-black flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 shrink-0"
                                    >
                                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
                                    </motion.button>
                                </div>
                                <p className="text-center mt-2 text-[10px] text-white/20 hidden sm:block">
                                    Enter para enviar · Shift+Enter para nova linha
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
