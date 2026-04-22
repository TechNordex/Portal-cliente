'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, ShieldCheck, RefreshCw, ExternalLink, MessageSquareText } from 'lucide-react'

const STAGE_MAP: Record<number, string> = {
    1: 'Briefing (Requisitos levantados)',
    2: 'Design (Protótipos e wireframes)',
    3: 'Desenvolvimento (Codificação em andamento)',
    4: 'Testes (QA e correções)',
    5: 'Revisão (Aguardando aprovação)',
    6: 'Entregue (Projeto finalizado)',
};

function TypewriterLine({ log, isLast, onComplete, onScroll }: { log: any, isLast: boolean, onComplete: () => void, onScroll: () => void }) {
    const [displayedText, setDisplayedText] = useState('');
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        let i = 0;
        setDisplayedText('');
        setIsDone(false);
        let timeoutId: NodeJS.Timeout;

        const typeNextChar = () => {
            if (i < log.msg.length) {
                setDisplayedText(log.msg.slice(0, i + 1));
                i++;
                if (i % 6 === 0) onScroll(); // Trigger scroll during long lines
                
                // Human-like typing delay: slower typing for professional aesthetic (30ms to 70ms)
                const delay = Math.random() * 40 + 30; 
                timeoutId = setTimeout(typeNextChar, delay);
            } else {
                setIsDone(true);
                onScroll();
                timeoutId = setTimeout(onComplete, 400); // 400ms pause before jumping to next line
            }
        };

        timeoutId = setTimeout(typeNextChar, 100); // initial slight delay
        return () => clearTimeout(timeoutId);
    }, [log.msg]);

    const showCursor = (!isDone) || isLast; 

    return (
        <div className="mb-2.5 flex items-start gap-2.5 animate-fade-in pl-1 pr-3 w-full">
            <span className="text-[#555] shrink-0 font-semibold tracking-wider whitespace-nowrap mt-[1px]">[{log.time}]</span>
            <span className={`
                leading-relaxed break-words flex-1 min-w-0
                ${log.type === 'success' ? 'text-green-400' : ''}
                ${log.type === 'info' ? 'text-blue-200' : ''}
                ${log.type === 'process' ? 'text-[#F5A800]' : ''}
                ${log.type === 'warning' ? 'text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded' : ''}
                ${log.type === 'error' ? 'text-red-400 opacity-80' : ''}
            `}>
                {log.type === 'success' && '✓ '}
                {log.type === 'process' && '↻ '}
                {log.type === 'info' && '› '}
                {log.type === 'warning' && '⚠ '}
                {log.type === 'error' && '✖ '}
                {displayedText}
                
                {/* Inline cursor blocks seamlessly with text */}
                {showCursor && (
                    <motion.div 
                        animate={{ opacity: [1, 0, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                        className="inline-block w-2.5 h-[1.1em] bg-[#F5A800] ml-1 align-baseline translate-y-[2px]"
                    />
                )}
                
                {isDone && log.actionUrl && (
                    <a href={log.actionUrl} target="_blank" rel="noreferrer" 
                       className="text-[#F5A800] hover:text-[#fff] transition-all ml-2 font-bold inline-flex items-center gap-1 bg-[#F5A800]/10 hover:bg-[#F5A800]/30 px-2 py-0.5 rounded cursor-pointer whitespace-nowrap animate-fade-in align-middle shadow-[0_0_8px_rgba(245,168,0,0.15)] mb-1">
                        {log.actionLabel} <ExternalLink size={10} />
                    </a>
                )}
                {isDone && log.actionClick && (
                    <button onClick={log.triggerChat} 
                        className="text-[#F5A800] hover:text-[#fff] transition-all ml-2 font-bold inline-flex items-center gap-1 bg-[#F5A800]/10 hover:bg-[#F5A800]/30 px-2 py-0.5 rounded cursor-pointer whitespace-nowrap animate-fade-in align-middle shadow-[0_0_8px_rgba(245,168,0,0.15)] mb-1">
                        {log.actionLabel} <MessageSquareText size={10} />
                    </button>
                )}
            </span>
        </div>
    )
}

export function LiveConsole({ project, updates, dbTelemetry }: { project?: any, updates?: any[], dbTelemetry?: any[] }) {
    const [sequence, setSequence] = useState<any[]>([])
    const [visibleIndex, setVisibleIndex] = useState(-1)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const triggerChat = () => {
        const btn = document.getElementById('btn-mensagem-squad')
        if (btn) btn.click()
    }

    const generateRealLogs = () => {
        if (!project) return [ { type: 'error', msg: 'Aguardando sincronização com servidor central...' } ];
        
        const seq: any[] = [
            { type: 'process', msg: `Estabelecendo ponte segura com infraestrutura Nordex... Conectado.` },
            { type: 'info', msg: `Compilando telemetria do projeto: ${project.name}` }
        ];

        if (project.stage_url) {
            seq.push({ 
              type: 'success', 
              msg: `Ambiente de Homologação (Stage): Online e operante. `, 
              actionLabel: '[Acesso Restrito]',
              actionUrl: project.stage_url
            });
        } else {
            seq.push({ type: 'process', msg: `Ambiente de Homologação (Stage): Sem link público disponível no momento.` });
        }

        if (project.prod_url) {
            seq.push({ 
              type: 'success', 
              msg: `Ambiente de Produção (Prod): Alta disponibilidade alcançada. `, 
              actionLabel: '[Acesso Livre]',
              actionUrl: project.prod_url
            });
        } else {
            seq.push({ type: 'process', msg: `Ambiente de Produção (Prod): Sem link público disponível no momento.` });
        }

        const currentStageName = STAGE_MAP[project.current_stage || 1] || 'Não Identificada';
        seq.push({ type: 'info', msg: `Fase do Ciclo de Vida: ${currentStageName}` });

        if (updates && updates.length > 0) {
            seq.push({ type: 'success', msg: `Localizado histórico contendo ${updates.length} atualizações efetivadas.` });
            seq.push({ type: 'info', msg: `Abertura do último pacote: "${updates[0].title}" em ${new Date(updates[0].created_at).toLocaleDateString('pt-BR')}.` });
            
            const pendingCount = updates.filter((u: any) => u.status === 'pending').length;
            if (pendingCount > 0) {
                seq.push({ 
                    type: 'warning', 
                    msg: `Existem ${pendingCount} atualizações sinalizadas como PENDENTES aguardando sua revisão no painel lateral.` 
                });
            }
        } else {
            seq.push({ type: 'info', msg: `Consultando... Banco de dados ainda não relata rastros de entregas oficiais.` });
        }

        if (project.squad && project.squad.length > 0) {
            seq.push({ type: 'success', msg: `Força Tarefa alocada: ${project.squad.length} especialista(s) autenticado(s) e monitorando infraestrutura.` });
        } else {
            seq.push({ type: 'info', msg: `Equipe remota pendente de apontamento inicial.` });
        }
        
        if (dbTelemetry && dbTelemetry.length > 0) {
            seq.push({ type: 'process', msg: `--- INICIANDO LEITURA DE DIÁRIO DE BORDO ---` });
            
            // Revert sort to show chronologically if desired, or just map them directly. They are DESC in SQL.
            // It makes sense to sort them ASC so the oldest is typed first, and the newest is at the bottom.
            const sortedTelemetry = [...dbTelemetry].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            sortedTelemetry.forEach((tLog: any) => {
                const rType = tLog.log_type || 'info'; 
                // e.g. success, info, warning, process, error
                seq.push({
                    type: rType,
                    timeOrig: new Date(tLog.created_at).toLocaleTimeString('pt-BR', { hour12: false }), // we format locally
                    msg: tLog.message,
                    actionLabel: tLog.action_label,
                    actionUrl: tLog.action_url
                });
            });
        }
        
        seq.push({ 
            type: 'info', 
            msg: `Canal de comunicação direta com suporte e engenharia: ✓ `,
            actionLabel: '[Iniciar Transmissão]',
            actionClick: true,
            triggerChat
        });
        
        return seq;
    }

    const startSequence = () => {
        setIsRefreshing(true);
        setSequence([]);
        setVisibleIndex(-1);
        
        const newSeq = generateRealLogs().map((log: any) => ({ 
            ...log, 
            time: log.timeOrig || new Date().toLocaleTimeString('pt-BR', { hour12: false }), 
            id: Math.random().toString(36).substr(2, 9) 
        }));
        
        setTimeout(() => {
            setSequence(newSeq);
            setVisibleIndex(0);
        }, 100);
    }

    useEffect(() => {
        startSequence();
    }, [project?.id])

    const handleScroll = () => {
        if (containerRef.current) {
            const el = containerRef.current
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        }
    }

    const handleLineComplete = (index: number) => {
        if (index < sequence.length - 1) {
            setVisibleIndex(index + 1);
        } else {
            setIsRefreshing(false);
            // End of logs! No heartbeat loops anymore.
        }
    }

    return (
        <div className="w-full flex-1 min-h-[340px] rounded-xl overflow-hidden relative group my-4"
             style={{ 
                 background: 'rgba(6,6,6,0.95)', 
                 backdropFilter: 'blur(20px)',
                 border: '1px solid rgba(245,168,0,0.18)',
                 boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
             }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b"
                 style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,10,10,0.9)' }}>
                <div className="flex items-center gap-2">
                    <Terminal size={12} style={{ color: '#F5A800' }} />
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#888]">
                        {project ? `NORDEX TELEMETRY // ${project.name.substring(0, 15).toUpperCase()}${project.name.length > 15 ? '...' : ''}` : 'Console'}
                    </span>
                    <button 
                        onClick={startSequence}
                        disabled={isRefreshing}
                        className="ml-2 hover:bg-white/10 p-1.5 rounded-md transition-colors"
                        title="Reiniciar Monitoramento"
                    >
                        <RefreshCw size={11} className={`text-stone-400 ${isRefreshing ? 'animate-spin opacity-50' : ''}`} />
                    </button>
                </div>
                
                {/* Health Status Widgets */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 opacity-60">
                        <ShieldCheck size={11} className="text-blue-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${project ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]' : 'bg-stone-500'}`} />
                        <span className={`text-[9px] uppercase font-black tracking-widest ${project ? 'text-green-400' : 'text-stone-500'}`}>
                            {project ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Terminal Body */}
            <div ref={containerRef} className="p-4 pr-1 h-[300px] overflow-x-hidden overflow-y-auto font-mono text-[10px] sm:text-[11px] custom-scrollbar relative">
                {sequence.slice(0, visibleIndex + 1).map((log, i) => (
                    <TypewriterLine 
                        key={log.id} 
                        log={log} 
                        isLast={i === visibleIndex}
                        onScroll={handleScroll} 
                        onComplete={() => handleLineComplete(i)} 
                    />
                ))}
            </div>
            
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                 style={{ background: 'radial-gradient(circle at 50% 120%, rgba(245,168,0,0.06) 0%, transparent 60%)' }} />
        </div>
    )
}
