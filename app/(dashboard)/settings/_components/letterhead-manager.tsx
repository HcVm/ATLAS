"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { FileText, Upload, RefreshCw, AlertCircle, CheckCircle2, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

// Official filenames as required by the backend generators
const LETTERHEADS = [
    { id: 'AGLE', name: 'AGLEFIX (Corporativo)', filename: 'HOJA MEMBRETADA AGLEFIX.png', description: 'Usado para garantías y cartas AGLE' },
    { id: 'AMCO', name: 'AMCO', filename: 'HOJA MEMBRETADA AMCO.png', description: 'Uso general AMCO' },
    { id: 'ARM', name: 'ARMFIX (Corporativo)', filename: 'HOJA MEMBRETADA ARMFIX.png', description: 'Usado para garantías y cartas ARM' },
    { id: 'GALUR', name: 'GALUR BC', filename: 'HOJA MEMBRETADA GALUR BC.png', description: 'Usado para documentos GALUR' },
    { id: 'GMC', name: 'GMC', filename: 'HOJA MEMBRETADA GMC.png', description: 'Uso general GMC' },
    { id: 'HOPE_LIFE', name: 'HOPE LIFE', filename: 'HOJA MEMBRETADA HOPE LIFE.png', description: 'Marca HOPE LIFE' },
    { id: 'VALHALLA', name: 'VALHALLA', filename: 'HOJA MEMBRETADA VALHALLA.png', description: 'Marca VALHALLA' },
    { id: 'WORLDLIFE', name: 'WORLDLIFE', filename: 'HOJA MEMBRETADA WORLDLIFE.png', description: 'Marca WORLDLIFE' },
    { id: 'ZEUS', name: 'ZEUSFIX', filename: 'HOJA MEMBRETADA ZEUSFIX.png', description: 'Marca ZEUS' },
]

export function LetterheadManager() {
    const [uploading, setUploading] = useState<string | null>(null)
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const getPublicUrl = (filename: string) => {
        // Add cache buster
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/membretes/${filename}?t=${refreshTrigger}`
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, item: typeof LETTERHEADS[0]) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validar tipo
        if (!file.type.includes('png')) {
            toast.error("El archivo debe ser una imagen PNG")
            return
        }

        setUploading(item.id)
        try {
            // 1. Upload to Supabase (Overwrite)
            const { error } = await supabase.storage
                .from('images')
                .upload(`membretes/${item.filename}`, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (error) throw error

            toast.success(`Membrete de ${item.name} actualizado`)

            // Force refresh of images
            setRefreshTrigger(prev => prev + 1)

            // Clear error state for this image if it existed
            setImageErrors(prev => ({ ...prev, [item.filename]: false }))

        } catch (error) {
            console.error(error)
            toast.error("Error al subir la imagen")
        } finally {
            setUploading(null)
            // Reset input
            event.target.value = ''
        }
    }

    return (
        <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Gestión de Membretes
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                    Administra las hojas membretadas utilizadas en la generación de documentos PDF.
                    <br />
                    <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Las imágenes deben ser archivos PNG de alta resolución. El nombre del archivo se ajustará automáticamente.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {LETTERHEADS.map((item) => (
                        <div
                            key={item.id}
                            className="group relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
                        >
                            {/* Preview Area */}
                            <div className="aspect-[210/297] bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-5"
                                    style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                                </div>

                                {imageErrors[item.filename] ? (
                                    <div className="text-center p-4 text-slate-400">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">Imagen no disponible</p>
                                    </div>
                                ) : (
                                    <img
                                        src={getPublicUrl(item.filename)}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={() => setImageErrors(prev => ({ ...prev, [item.filename]: true }))}
                                        key={`${item.filename}-${refreshTrigger}`} // Force re-mount on refresh
                                    />
                                )}
                            </div>

                            {/* Info Footer */}
                            <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate pr-2">
                                        {item.name}
                                    </h4>
                                    {uploading === item.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                                    ) : (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {item.description}
                                </p>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/png"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => handleFileUpload(e, item)}
                                            disabled={!!uploading}
                                        />
                                        <Button variant="outline" size="sm" className="w-full text-xs" disabled={!!uploading}>
                                            <Upload className="h-3 w-3 mr-2" />
                                            {uploading === item.id ? '...' : 'Actualizar'}
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                        onClick={() => window.open(getPublicUrl(item.filename), '_blank')}
                                    >
                                        <ImageIcon className="h-3 w-3 mr-2" />
                                        Original
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
