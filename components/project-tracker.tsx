'use client'

import React from 'react'
import { ClipboardList, Palette, Code2, FlaskConical, Eye, Rocket, Check } from 'lucide-react'
import { STAGES } from '@/lib/types'

export function ProjectTracker({ currentStageId }: { currentStageId: number }) {
    return (
        <div className="w-full flex flex-col relative mt-2">
            {/* Background Line (Vertical) */}
            <div className="absolute top-5 bottom-5 left-[21px] w-[2px] bg-white/5 z-0" />
            
            {/* Active Line (Vertical) */}
            <div 
                className="absolute top-5 left-[21px] w-[2px] z-0 transition-all duration-1000 ease-in-out"
                style={{
                    height: `${Math.max(0, Math.min(100, ((currentStageId - 1) / (STAGES.length - 1)) * 100))}%`,
                    background: 'linear-gradient(180deg, #F5A800, #ffce00)'
                }}
            />

            <div className="relative z-10 flex flex-col w-full gap-7">
                {STAGES.map((stage, idx) => {
                    const isCompleted = stage.id < currentStageId;
                    const isActive = stage.id === currentStageId;
                    const isPending = stage.id > currentStageId;

                    return (
                        <div key={stage.id} className="flex items-center group relative w-full gap-4">
                            {/* Step Indicator */}
                            <div
                                className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full border-2 transition-all duration-500 z-10 ${isActive
                                        ? 'bg-[#1a1a1a] border-primary text-primary shadow-[0_0_15px_rgba(245,168,0,0.4)] scale-105'
                                        : isCompleted
                                            ? 'bg-primary border-primary text-[black] shadow-[0_0_10px_rgba(245,168,0,0.2)]'
                                            : 'bg-[#111] border-white/10 text-white/30'
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check size={20} strokeWidth={3} />
                                ) : (
                                    stage.icon === 'ClipboardList' ? <ClipboardList size={20} /> :
                                        stage.icon === 'Palette' ? <Palette size={20} /> :
                                            stage.icon === 'Code2' ? <Code2 size={20} /> :
                                                stage.icon === 'FlaskConical' ? <FlaskConical size={20} /> :
                                                    stage.icon === 'Eye' ? <Eye size={20} /> :
                                                        <Rocket size={20} />
                                )}
                            </div>

                            {/* Label & Description */}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3
                                        className={`text-[13px] font-bold tracking-wide transition-colors duration-300 ${isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/30'
                                            }`}
                                    >
                                        {stage.label}
                                    </h3>
                                    {isActive && (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(245,168,0,0.15)', color: '#F5A800' }}>
                                            + Atual
                                        </span>
                                    )}
                                </div>
                                <p
                                    className={`text-[11px] mt-0.5 transition-colors duration-300 ${isActive || isCompleted ? 'text-[#888]' : 'text-white/20'
                                        }`}
                                >
                                    {stage.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
