'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Maximize, Loader2, Image as ImageIcon } from 'lucide-react'

// Util: check if URL is an image
function isImageUrl(url: string) {
    return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url.split('?')[0])
}

// Util: transform figma links to embed if needed
function getSafeIframeUrl(url: string) {
    if (url.includes('figma.com/file') && !url.includes('/embed')) {
        return `https://www.figma.com/embed?embed_host=nordex&url=${encodeURIComponent(url)}`
    }
    return url
}

interface MediaLightboxProps {
    isOpen: boolean
    url: string | null
    title?: string
    onClose: () => void
}

export function MediaLightbox({ isOpen, url, title, onClose }: MediaLightboxProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [isImage, setIsImage] = useState(false)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        if (isOpen && url) {
            setIsLoading(true)
            setHasError(false)
            setIsImage(isImageUrl(url))
        }
    }, [isOpen, url])

    // Fechar ao apertar ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen || !url) return null

    const displayUrl = getSafeIframeUrl(url)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
                style={{ background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(12px)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 15, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-6xl h-full max-h-[85vh] rounded-2xl flex flex-col overflow-hidden bg-[#0a0a0a]"
                    style={{ border: '1px solid rgba(245,168,0,0.15)', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Bar */}
                    <div className="h-14 flex items-center justify-between px-5 shrink-0 bg-[#0f0f0f] border-b border-[#1f1f1f]">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
                                {isImage ? <ImageIcon size={12} className="text-primary" /> : <Maximize size={12} className="text-primary" />}
                            </div>
                            <h3 className="text-sm font-bold text-white truncate max-w-[300px]">{title || 'Pré-visualização do Projeto'}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#888] hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <ExternalLink size={12} />
                                <span className="hidden sm:inline">Abrir Guia</span>
                            </a>
                            <div className="w-px h-4 bg-[#222] mx-1" />
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-md text-[#888] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative bg-black/50 w-full h-full flex items-center justify-center overflow-hidden">
                        {isLoading && !hasError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-primary">
                                <Loader2 size={32} className="animate-spin mb-3 opacity-80" />
                                <span className="text-xs font-black uppercase tracking-widest opacity-60">Carregando Mídia...</span>
                            </div>
                        )}

                        {isImage ? (
                            <img
                                src={url}
                                alt={title || 'Preview'}
                                className="max-w-full max-h-full object-contain"
                                onLoad={() => setIsLoading(false)}
                                onError={() => { setIsLoading(false); setHasError(true) }}
                            />
                        ) : (
                            // Use iframe for standard sites
                            <div className="w-full h-full bg-white relative">
                                {!hasError ? (
                                    <iframe
                                        src={displayUrl}
                                        className="w-full h-full border-0 absolute inset-0"
                                        title={title || 'Preview'}
                                        onLoad={() => setIsLoading(false)}
                                        onError={() => { setIsLoading(false); setHasError(true) }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : null}
                            </div>
                        )}

                        {hasError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-center px-4 z-20">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/10 mb-4 border border-red-500/20">
                                    <ExternalLink size={20} className="text-red-500" />
                                </div>
                                <h3 className="text-white font-bold mb-2">Este link bloqueia visualizações embutidas.</h3>
                                <p className="text-sm text-[#777] mb-6 max-w-sm">
                                    Por questões de segurança corporativa do destino, este link deve ser aberto em uma aba separada.
                                </p>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-6 py-2.5 bg-primary text-black font-bold uppercase text-xs tracking-wider rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
                                >
                                    Abrir em Nova Aba <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
