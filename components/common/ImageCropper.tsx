"use client"

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Plus, X, Upload, Loader2, CheckCircle2 } from 'lucide-react'

// Helper to get cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Force square high-quality output size (400x400)
    const targetSize = 400
    canvas.width = targetSize
    canvas.height = targetSize

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        targetSize,
        targetSize
    )

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
    })
}

// Modal Component
export default function ImageCropperModal({ 
    open, 
    onClose, 
    onCropComplete 
}: { 
    open: boolean, 
    onClose: () => void, 
    onCropComplete: (fileBlob: Blob, previewUrl: string) => void 
}) {
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
    const [processing, setProcessing] = useState(false)

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            let imageDataUrl = await readFile(file)
            setImageSrc(imageDataUrl as string)
        }
    }

    const onCropChangeLocal = (cropData: any) => setCrop(cropData)
    const onZoomChangeLocal = (zoomData: number) => setZoom(zoomData)

    const handleCropComplete = useCallback(
        (_croppedArea: any, croppedPixels: any) => {
            setCroppedAreaPixels(croppedPixels)
        }, []
    )

    const triggerCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return
        setProcessing(true)
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0)
            if (croppedImageBlob) {
                const previewUrl = URL.createObjectURL(croppedImageBlob)
                onCropComplete(croppedImageBlob, previewUrl)
                setImageSrc(null) // cleanup
                onClose()
            }
        } catch (e) {
            console.error(e)
            alert("Erro ao recortar imagem.")
        } finally {
            setProcessing(false)
        }
    }

    const resetSelection = () => setImageSrc(null)

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-card border border-border rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col h-[650px] max-h-[95vh]">
                <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-[18px] font-black uppercase tracking-tight text-foreground">Ajuste de Imagem</h3>
                        <p className="text-[12px] text-muted-foreground font-medium">Posicione e recorte sua foto de perfil</p>
                    </div>
                    <button onClick={() => { setImageSrc(null); onClose() }} className="text-muted-foreground hover:text-foreground bg-background p-2 rounded-xl border border-border shadow-sm transition-all hover:rotate-90">
                        <X size={16} />
                    </button>
                </div>

                <div className="relative flex-1 bg-background overflow-hidden flex flex-col">
                    {!imageSrc ? (
                        <div className="p-8 flex flex-col h-full justify-center">
                            <label className="w-full flex flex-col items-center justify-center flex-1 border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all rounded-[1.5rem] cursor-pointer group p-10">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-4">
                                    <Upload size={28} />
                                </div>
                                <span className="text-[15px] font-black text-primary uppercase tracking-widest">Selecionar Imagem</span>
                                <span className="text-[12px] text-muted-foreground mt-2 font-medium">JPG, PNG ou WEBP (Max 5MB)</span>
                                <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                            </label>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 relative">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1} 
                                    cropShape="round" 
                                    showGrid={false}
                                    onCropChange={onCropChangeLocal}
                                    onCropComplete={handleCropComplete}
                                    onZoomChange={onZoomChangeLocal}
                                />
                            </div>
                            
                            <div className="p-6 shrink-0 z-10">
                                <div className="bg-card/95 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-xl flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Zoom</span>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-secondary/5 flex gap-4 shrink-0">
                    {imageSrc ? (
                        <>
                            <button onClick={resetSelection} disabled={processing} className="flex-1 h-12 bg-background border border-border hover:bg-white/5 rounded-2xl text-[13px] font-bold transition-all text-muted-foreground hover:text-foreground">
                                Trocar
                            </button>
                            <button onClick={triggerCrop} disabled={processing} className="flex-[2] h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-[14px] font-black transition-all flex justify-center items-center gap-2 shadow-xl shadow-primary/30 uppercase tracking-[0.1em]">
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />}
                                {processing ? 'PROCESSANDO...' : 'CONFIRMAR E SALVAR'}
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="w-full h-12 bg-secondary hover:bg-white/5 rounded-2xl text-[13px] font-bold transition-all border border-border text-foreground">
                            FECHAR
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function readFile(file: File) {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(reader.result), false)
        reader.readAsDataURL(file)
    })
}
