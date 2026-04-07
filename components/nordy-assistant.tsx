'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NordyAssistant({ 
    context = '', 
    project, 
    tourCompleted, 
    tourEnabled 
}: { 
    context?: string, 
    project?: any, 
    tourCompleted?: boolean, 
    tourEnabled?: boolean 
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<{ role: 'model' | 'user'; content: string }[]>([
        { role: 'model', content: 'Olá! Sou o Nordy, seu assistente virtual da Nordex Tech. Como posso te ajudar hoje?' }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg = input.trim()
        setInput('')
        const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
        setMessages(newMessages)
        setIsLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, context }),
            })
            
            const data = await response.json()
            if (response.ok) {
                setMessages(prev => [...prev, { role: 'model', content: data.reply }])
            } else {
                setMessages(prev => [...prev, { role: 'model', content: 'Ops! Tive um probleminha para responder agora. Tente novamente em instantes.' }])
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: 'Parece que estamos sem conexão no momento. Tente novamente mais tarde.' }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col bg-[#111111] overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-primary/20 backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10 bg-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 border border-primary/30">
                                    <Bot size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">Nordy AI</h3>
                                    <p className="text-[10px] text-green-400 font-medium tracking-widest uppercase">Online Agora</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-white/50 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-gradient-to-b from-[#111] to-[#0a0a0a]">
                            {messages.map((msg, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i} 
                                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-1 border border-white/10"
                                            style={{ background: msg.role === 'user' ? '#1a1a1a' : 'rgba(245,168,0,0.1)' }}>
                                            {msg.role === 'user' ? <User size={12} className="text-white/70" /> : <Bot size={12} className="text-primary" />}
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed relative ${
                                            msg.role === 'user' 
                                                ? 'bg-[#222] text-white border border-white/5 rounded-tr-sm' 
                                                : 'bg-primary/5 text-white/90 border border-primary/20 rounded-tl-sm'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex w-full justify-start">
                                    <div className="flex gap-3 max-w-[85%] flex-row">
                                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-1 bg-primary/10 border border-primary/20">
                                            <Bot size={12} className="text-primary" />
                                        </div>
                                        <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-primary/5 border border-primary/20 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#1a1a1a] border-t border-white/5">
                            <form onSubmit={handleSend} className="flex items-end gap-2">
                                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
                                    <textarea 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Digite sua dúvida..."
                                        className="w-full max-h-[120px] min-h-[50px] bg-transparent border-none text-white text-[13px] px-4 py-3 focus:ring-0 resize-none placeholder:text-white/30"
                                        rows={1}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="h-[50px] w-[50px] rounded-xl flex items-center justify-center bg-primary text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all shrink-0"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />}
                                </button>
                            </form>
                            <p className="text-[9px] text-center text-white/30 font-medium uppercase tracking-widest mt-3">
                                IA Baseada na Base de Dados Nordex
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,168,0,0.4)] hover:scale-105 active:scale-95 transition-all z-10 overflow-hidden relative group"
            >
                <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 rounded-full transition-transform duration-300 origin-center" />
                <AnimatePresence mode="popLayout">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X size={24} strokeWidth={2.5} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="bot"
                            initial={{ scale: 0, rotate: 90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -90 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MessageSquare size={24} strokeWidth={2.5} fill="black" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
        </div>
    )
}
