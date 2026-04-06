import React from 'react'
import { AlertCircle, CheckCircle2, X, Clock } from 'lucide-react'
import { Project } from '@/lib/types'

interface AlertCenterProps {
    projects: Project[]
    onViewProject: (id: string, clientName?: string) => void
}

export default function AlertCenter({ projects, onViewProject }: AlertCenterProps) {
    // Professional Alert Filter: Only flag if the CURRENT status is denied or pending action
    const alertProjects = projects.filter(p => {
        const latestUpdate = p.updates?.[0]
        return (
            p.preview_status === 'rejected' || 
            p.preview_status === 'pending' || 
            latestUpdate?.status === 'denied'
        )
    })

    if (alertProjects.length === 0) {
        return (
            <div className="bg-card border border-border rounded-2xl overflow-hidden p-5">
                <div className="p-5 border-b border-border mb-3 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                        <AlertCircle size={16} className="text-primary" /> Centro de Alertas
                    </h3>
                </div>
                <div className="text-[13px] text-muted-foreground text-center py-8 border border-dashed border-border/50 rounded-xl">
                    <CheckCircle2 size={28} className="mx-auto mb-2 opacity-20 text-green-500" />
                    Todos os projetos estão em fluxo normal.
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
                    <AlertCircle size={16} className="text-primary" /> Centro de Alertas
                </h3>
            </div>
            <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {/* 1. Projects with Reject Preview Status (Global Adjustments) */}
                {projects.filter(p => p.preview_status === 'rejected').map(p => (
                    <div key={`rej-${p.id}`} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-right-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertCircle size={16} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-foreground">{p.name} — Ajuste Solicitado</p>
                                <p className="text-[11px] text-muted-foreground">Cliente solicitou revisão na homologação principal.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onViewProject(p.id, p.client_name)} 
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-bold rounded-lg transition-colors"
                        >
                            Ver Detalhes
                        </button>
                    </div>
                ))}

                {/* 2. Projects with Denied Latest Update (Incremental Adjustments) */}
                {projects.filter(p => p.preview_status !== 'rejected' && p.updates?.[0]?.status === 'denied').map(p => (
                    <div key={`den-${p.id}`} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-right-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                                <X size={16} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-foreground">{p.name} — Entrega Recusada</p>
                                <p className="text-[11px] text-muted-foreground">O feedback mais recente requer ajustes imediatos.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onViewProject(p.id, p.client_name)} 
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg transition-colors"
                        >
                            Ver Feedback
                        </button>
                    </div>
                ))}

                {/* 3. Pending Projects (Waiting for Client decision or Team follow-up) */}
                {projects.filter(p => p.preview_status === 'pending').map(p => (
                    <div key={`pen-${p.id}`} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-right-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Clock size={16} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-foreground">{p.name} — Em Homologação</p>
                                <p className="text-[11px] text-muted-foreground">Aguardando decisão ou validação do cliente.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onViewProject(p.id, p.client_name)} 
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-bold rounded-lg transition-colors"
                        >
                            Acompanhar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
