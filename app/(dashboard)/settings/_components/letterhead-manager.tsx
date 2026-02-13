"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { FileText, Upload, RefreshCw, AlertCircle, CheckCircle2, ImageIcon, Building2, Tag } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

type EntityType = 'company' | 'brand'

interface LetterheadEntity {
    id: string
    name: string
    type: EntityType
    letterhead_url: string | null
    description?: string
}

export function LetterheadManager() {
    const [entities, setEntities] = useState<LetterheadEntity[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
        loadEntities()
    }, [])

    const loadEntities = async () => {
        try {
            setLoading(true)

            // Fetch companies
            const { data: companiesData, error: companiesError } = await supabase
                .from('companies')
                .select('*')
                .order('name')

            if (companiesError) throw companiesError

            // Fetch brands
            const { data: brandsData, error: brandsError } = await supabase
                .from('brands')
                .select('*')
                .order('name')

            if (brandsError) throw brandsError

            const mappedCompanies: LetterheadEntity[] = ((companiesData as any[]) || []).map(c => ({
                id: c.id,
                name: c.name,
                type: 'company',
                letterhead_url: c.letterhead_url,
                description: c.description || 'Compañía Registrada'
            }))

            const mappedBrands: LetterheadEntity[] = ((brandsData as any[]) || []).map(b => ({
                id: b.id,
                name: b.name,
                type: 'brand',
                letterhead_url: b.letterhead_url,
                description: b.description || 'Marca Registrada'
            }))

            setEntities([...mappedCompanies, ...mappedBrands])
        } catch (error) {
            console.error("Error loading entities:", error)
            toast.error("Error al cargar empresas y marcas")
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, item: LetterheadEntity) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validar tipo
        if (!file.type.includes('png') && !file.type.includes('jpeg')) {
            toast.error("El archivo debe ser una imagen PNG o JPG")
            return
        }

        setUploading(item.id)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `letterhead-${item.type}-${item.id}-${Date.now()}.${fileExt}`
            const filePath = `membretes/${fileName}`

            // 1. Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath)

            // 3. Update Database
            const table = item.type === 'company' ? 'companies' : 'brands'
            const { error: updateError } = await supabase
                .from(table)
                .update({ letterhead_url: publicUrl } as any)
                .eq('id', item.id)

            if (updateError) throw updateError

            toast.success(`Membrete de ${item.name} actualizado`)

            // Refresh local state
            setEntities(prev => prev.map(e =>
                e.id === item.id ? { ...e, letterhead_url: publicUrl } : e
            ))

            // Clear error state for this image if it existed
            if (item.letterhead_url) {
                // Determine old key if possible, or just clear all for this ID conceptually. 
                // Since we use URL as key mostly, we might not need complex error clearing.
            }

        } catch (error) {
            console.error(error)
            toast.error("Error al subir la imagen")
        } finally {
            setUploading(null)
            // Reset input
            event.target.value = ''
        }
    }

    if (loading) {
        return (
            <Card className="border-slate-200/50 dark:border-slate-800/50">
                <CardContent className="p-6 flex justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Gestión de Membretes
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                    Administra las hojas membretadas vinculadas a empresas y marcas.
                    <br />
                    <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Las imágenes se utilizarán en la generación de documentos PDF. Se recomienda PNG de alta resolución.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {entities.map((item) => (
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

                                {item.letterhead_url && !imageErrors[item.id] ? (
                                    <img
                                        src={`${item.letterhead_url}?t=${Date.now()}`} // Simple cache bust for updates
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                                    />
                                ) : (
                                    <div className="text-center p-4 text-slate-400">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">Sin membrete asignado</p>
                                    </div>
                                )}

                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className={`text-[10px] backdrop-blur-md ${item.type === 'company' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'}`}>
                                        {item.type === 'company' ? <Building2 className="h-3 w-3 mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
                                        {item.type === 'company' ? 'Empresa' : 'Marca'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Info Footer */}
                            <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate pr-2">
                                        {item.name}
                                    </h4>
                                    {uploading === item.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                                    ) : item.letterhead_url ? (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {item.description}
                                </p>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => handleFileUpload(e, item)}
                                            disabled={!!uploading}
                                        />
                                        <Button variant="outline" size="sm" className="w-full text-xs" disabled={!!uploading}>
                                            <Upload className="h-3 w-3 mr-2" />
                                            {uploading === item.id ? 'Subiendo...' : 'Actualizar'}
                                        </Button>
                                    </div>

                                    {item.letterhead_url && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                            onClick={() => window.open(item.letterhead_url!, '_blank')}
                                        >
                                            <ImageIcon className="h-3 w-3 mr-2" />
                                            Ver
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {entities.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No se encontraron empresas ni marcas registradas.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
