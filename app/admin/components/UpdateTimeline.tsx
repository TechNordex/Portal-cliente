import React, { useState } from 'react'
import { CheckCircle2, Clock, ThumbsUp, ThumbsDown, AlertCircle, MessageSquareText, RefreshCw, Users, Edit, Check, Link as LinkIcon, Timer, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Project, ProjectUpdate } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

// Professional interface extension for admin-specific view data
interface UpdateWithCreator extends ProjectUpdate {
    creator_name?: string
}

interface UpdateTimelineProps {
    project: Project
    onUpdateSaved: () => void
}

export default function UpdateTimeline({ project, onUpdateSaved }: UpdateTimelineProps) {
    const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({
        title: '',
        message: '',
        previewUrl: '',
        hours: '',
        minutes: '',
        loading: false
    })

    const openEdit = (upd: ProjectUpdate) => {
        setEditingUpdateId(upd.id)
        const h = Math.floor(upd.hours_spent || 0)
        const m = Math.round(((upd.hours_spent || 0) - h) * 60)
        setEditForm({
            title: upd.title,
            message: upd.message || '',
            previewUrl: upd.preview_url || '',
            hours: h > 0 ? h.toString() : '',
            minutes: m > 0 ? m.toString() : '',
            loading: false
        })
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUpdateId) return
        setEditForm(prev => ({ ...prev, loading: true }))
        
        try {
            const h = editForm.hours ? Number(editForm.hours) : 0
            const m = editForm.minutes ? Number(editForm.minutes) : 0
            const totalHours = h + m / 60

            const res = await fetch('/api/admin/updates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingUpdateId,
                    title: editForm.title,
                    message: editForm.message,
                    preview_url: editForm.previewUrl,
                    hours_spent: totalHours > 0 ? totalHours : undefined
                })
            })

            if (!res.ok) throw new Error('Failed to update')
            
            setEditingUpdateId(null)
            onUpdateSaved()
        } catch (err) {
            alert('Erro ao salvar alteração')
        } finally {
            setEditForm(prev => ({ ...prev, loading: false }))
        }
    }

    if (!project.updates || project.updates.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground text-center py-10 italic">
                Nenhuma atualização registrada nesta pipeline.
            </p>
        )
    }

    return (
        <div className="relative border-l-2 border-border/40 ml-3 space-y-12 pb-6">
            {(project.updates as UpdateWithCreator[]).map((upd) => {
                const isCorrection = Boolean(upd.revision_of)
                const isSuperseded = project.updates?.some(u => u.revision_of === upd.id)
                const originalUpdate = isCorrection ? project.updates?.find(u => u.id === upd.revision_of) : null
                const isEditing = editingUpdateId === upd.id

                return (
                    <div key={upd.id} className="relative pl-8 group">
                        {/* Timeline Node */}
                        <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full bg-background border-[3px] z-10 transition-shadow duration-300 ${
                            isCorrection ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 
                            upd.status === 'denied' ? 'border-red-500 shadow-[0_0_12px_rgba(239,44,44,0.4)]' :
                            'border-primary shadow-[0_0_12px_rgba(245,168,0,0.3)]'
                        }`} />

                        <AnimatePresence mode="wait">
                            {isEditing ? (
                                <motion.form 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onSubmit={handleSave}
                                    className="bg-secondary/40 backdrop-blur-md border border-primary/20 rounded-2xl p-5 shadow-2xl space-y-4"
                                >
                                    <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-2">
                                        <h5 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Edit size={14} /> Editando Update Etapa {upd.stage}
                                        </h5>
                                        <button type="button" onClick={() => setEditingUpdateId(null)} className="text-muted-foreground hover:text-foreground">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Título da Entrega</label>
                                            <input 
                                                value={editForm.title}
                                                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-primary transition-all shadow-inner"
                                                placeholder="Ex: Refatoração do Header..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">URL de Preview</label>
                                            <input 
                                                value={editForm.previewUrl}
                                                onChange={e => setEditForm(prev => ({ ...prev, previewUrl: e.target.value }))}
                                                className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-[12px] outline-none transition-all"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Horas</label>
                                                <input 
                                                    type="number"
                                                    value={editForm.hours}
                                                    onChange={e => setEditForm(prev => ({ ...prev, hours: e.target.value }))}
                                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-[12px] outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Min</label>
                                                <input 
                                                    type="number"
                                                    value={editForm.minutes}
                                                    onChange={e => setEditForm(prev => ({ ...prev, minutes: e.target.value }))}
                                                    className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-[12px] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Mensagem Técnica</label>
                                        <textarea 
                                            value={editForm.message}
                                            onChange={e => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-[13px] outline-none min-h-[100px] transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setEditingUpdateId(null)} className="px-4 py-2 text-[12px] font-bold text-muted-foreground hover:text-foreground transition-all">Descartar</button>
                                        <button 
                                            type="submit" 
                                            disabled={editForm.loading}
                                            className="px-6 py-2 bg-primary text-black rounded-xl text-[12px] font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {editForm.loading ? 'Salvando...' : <><Check size={16}/> Salvar Alterações</>}
                                        </button>
                                    </div>
                                </motion.form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="relative"
                                >
                                    {/* Action Trigger */}
                                    <button 
                                        onClick={() => openEdit(upd)}
                                        className="absolute -top-1 -right-1 h-8 px-3 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 text-[10px] font-black uppercase tracking-widest backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 z-20 shadow-xl"
                                    >
                                        <Edit size={12} /> Editar Registro
                                    </button>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-black text-primary tracking-tighter uppercase bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                                                Etapa {upd.stage}
                                            </span>
                                            {isSuperseded && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase">
                                                    <Check size={11} /> Resolvido
                                                </span>
                                            )}
                                        </div>
                                        <time className="text-[11px] font-medium text-muted-foreground/70">
                                            {format(new Date(upd.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                        </time>
                                    </div>

                                    <h4 className="text-[17px] font-bold text-foreground mb-1.5 tracking-tight">{upd.title}</h4>
                                    
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 mb-4">
                                        <Users size={12} />
                                        <span>Autor: <b className="text-foreground/80">{upd.creator_name || 'Sistema'}</b></span>
                                        {upd.hours_spent ? upd.hours_spent > 0 && (
                                            <span className="flex items-center gap-1.5 ml-2 text-primary font-bold">
                                                <Timer size={12}/> {upd.hours_spent.toFixed(1)}h
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Contextual Banners */}
                                    {isCorrection && originalUpdate && (
                                        <div className="mb-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                <RefreshCw size={14} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">Correção Administrativa</p>
                                                <p className="text-[13px] text-foreground/80 leading-relaxed font-medium">
                                                    Esta versão retifica o registro anterior: <span className="text-blue-300">"{originalUpdate.title}"</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {upd.message && (
                                        <div className="text-[14px] text-muted-foreground/90 leading-relaxed bg-secondary/20 p-4 rounded-2xl border border-border/40 font-medium">
                                            {upd.message}
                                        </div>
                                    )}

                                    {/* Badges & Feedback */}
                                    <div className="mt-5 pt-5 border-t border-border/20 space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {upd.viewed_at ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 text-[11px] font-bold border border-green-500/20">
                                                    <CheckCircle2 size={13}/> Visto em {format(new Date(upd.viewed_at), "dd/MM, HH:mm")}
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/10 text-muted-foreground text-[11px] font-bold border border-border/50">
                                                    <Clock size={13}/> Pendente de Leitura
                                                </div>
                                            )}

                                            <StatusBadge status={upd.status} />
                                        </div>

                                        {upd.status === 'denied' && upd.feedback && (
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 relative mt-2 group-hover:bg-red-500/10 transition-colors">
                                                <div className="absolute -top-2.5 left-5 bg-background border border-red-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                                                    <AlertCircle size={10}/> Restrição do Cliente
                                                </div>
                                                <p className="text-[14px] text-foreground font-semibold italic leading-relaxed">
                                                    "{upd.feedback}"
                                                </p>
                                            </div>
                                        )}

                                        {upd.client_note && (
                                            <div className="bg-card border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl pointer-events-none" />
                                                <div className="absolute -top-3 left-5 bg-background border border-primary/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <MessageSquareText size={12}/> Anotação do Cliente
                                                </div>
                                                <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap mt-2 font-medium">
                                                    {upd.client_note}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )
            })}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'authorized') return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 animate-pulse-subtle">
            <ThumbsUp size={13}/> Entrega Aprovada
        </div>
    )
    if (status === 'denied') return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-[11px] font-bold border border-red-500/20">
            <ThumbsDown size={13}/> Ajuste Solicitado
        </div>
    )
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 text-[11px] font-bold border border-amber-500/20">
            <Clock size={13}/> Aguardando Feedback
        </div>
    )
}
