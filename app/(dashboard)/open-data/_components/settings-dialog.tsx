"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Settings, Plus, Archive, Trash2, Edit2, Check, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { OpenDataCatalog, SystemConfig, CATALOG_ICONS, CATALOG_COLORS } from "@/types/open-data"
import { useRouter } from "next/navigation"

interface SettingsDialogProps {
    initialConfig: {
        year: string
        catalogs: OpenDataCatalog[]
    }
}

export function SettingsDialog({ initialConfig }: SettingsDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [currentYear, setCurrentYear] = useState(initialConfig.year)
    const [catalogs, setCatalogs] = useState<OpenDataCatalog[]>(initialConfig.catalogs)
    const [isLoading, setIsLoading] = useState(false)

    // New Catalog Form State
    const [newCatalog, setNewCatalog] = useState<{
        id: string
        name: string
        description: string
        color: string
        icon: string
        full_name: string
    }>({
        id: "",
        name: "",
        description: "",
        color: CATALOG_COLORS[0].value,
        icon: CATALOG_ICONS[0].icon,
        full_name: "",
    })

    // Refresh data when dialog opens
    useEffect(() => {
        if (open) {
            refreshData()
        }
    }, [open])

    const refreshData = async () => {
        // Re-fetch catalogs
        const { data: catData } = await supabase
            .from("open_data_catalogs")
            .select("*")
            .order("created_at", { ascending: false })

        if (catData) setCatalogs(catData as OpenDataCatalog[])

        // Re-fetch Year
        const { data: confData } = await supabase
            .from("system_config")
            .select("value")
            .eq("key", "current_fiscal_year")
            .single()

        if (confData) setCurrentYear(confData.value)
    }

    const handleUpdateYear = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from("system_config")
                .upsert({ key: "current_fiscal_year", value: currentYear })

            if (error) throw error
            toast.success("Año fiscal actualizado correctamente")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al actualizar año fiscal")
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
        try {
            const { error } = await supabase
                .from("open_data_catalogs")
                .update({ status: newStatus })
                .eq("id", id)

            if (error) throw error

            setCatalogs(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
            toast.success(`Catálogo ${newStatus === 'active' ? 'activado' : 'archivado'}`)
            router.refresh()
        } catch (error) {
            toast.error("Error al cambiar estado")
        }
    }

    const handleCreateCatalog = async () => {
        if (!newCatalog.id || !newCatalog.name || !newCatalog.full_name) {
            toast.error("Por favor complete los campos obligatorios")
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from("open_data_catalogs")
                .insert([{ ...newCatalog, status: 'active' }])

            if (error) throw error

            toast.success("Catálogo creado exitosamente")

            // Reset form
            setNewCatalog({
                id: "",
                name: "",
                description: "",
                color: CATALOG_COLORS[0].value,
                icon: CATALOG_ICONS[0].icon,
                full_name: "",
            })

            refreshData()
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al crear catálogo")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 ml-2 border-slate-200 dark:border-slate-800 bg-white/50 backdrop-blur-sm shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950">
                <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-slate-500" />
                        Configuración de Datos Abiertos
                    </DialogTitle>
                    <DialogDescription>
                        Administre catálogos, vigencia y parámetros del sistema
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="catalogs" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="catalogs">Catálogos Electrónicos</TabsTrigger>
                            <TabsTrigger value="general">Configuración General</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="catalogs" className="flex-1 flex flex-col p-0 m-0 overflow-hidden data-[state=active]:flex">
                        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                            {/* List Section */}
                            <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-medium text-slate-500 font-mono tracking-tight uppercase">Catálogos Existentes ({catalogs.length})</span>
                                    <Button variant="ghost" size="sm" onClick={refreshData} disabled={isLoading} className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                                        <RefreshCw className={`h-3 w-3 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {catalogs.map((catalog) => (
                                            <div key={catalog.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex gap-3">
                                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${catalog.color} flex items-center justify-center text-lg select-none shrink-0 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                                                            {catalog.icon}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                                    {catalog.name}
                                                                </h4>
                                                                {catalog.status === 'inactive' && (
                                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-100 dark:bg-slate-800 text-slate-500">Histórico</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-mono mt-0.5">{catalog.id}</p>
                                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{catalog.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant={catalog.status === 'active' ? "ghost" : "outline"}
                                                            size="sm"
                                                            className={`h-7 px-2 text-xs ${catalog.status === 'active' ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/30' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-500 dark:border-emerald-800 dark:hover:bg-emerald-950/30'}`}
                                                            onClick={() => handleToggleStatus(catalog.id, catalog.status)}
                                                        >
                                                            {catalog.status === 'active' ? (
                                                                <><Archive className="h-3 w-3 mr-1" /> Archivar</>
                                                            ) : (
                                                                <><Check className="h-3 w-3 mr-1" /> Activar</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Create Section */}
                            <div className="w-full lg:w-[320px] shrink-0 bg-slate-50 dark:bg-slate-950/50 overflow-y-auto border-l border-slate-200 dark:border-slate-800 shadow-inner">
                                <div className="p-6 space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                                            <Plus className="h-4 w-4" /> Nuevo Catálogo
                                        </h3>
                                        <p className="text-xs text-slate-500">Agregue un nuevo Acuerdo Marco al sistema.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-600 dark:text-slate-400">ID Acuerdo (Ej: EXT-CE-2026-1)</Label>
                                            <Input
                                                value={newCatalog.id}
                                                onChange={(e) => setNewCatalog(prev => ({ ...prev, id: e.target.value }))}
                                                className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800"
                                                placeholder="EXT-CE-YYYY-X"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-600 dark:text-slate-400">Nombre Corto</Label>
                                            <Input
                                                value={newCatalog.name}
                                                onChange={(e) => setNewCatalog(prev => ({ ...prev, name: e.target.value }))}
                                                className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800"
                                                placeholder="Ej: Materiales de Aseo"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-600 dark:text-slate-400">Nombre Completo (Oficial)</Label>
                                            <Input
                                                value={newCatalog.full_name}
                                                onChange={(e) => setNewCatalog(prev => ({ ...prev, full_name: e.target.value }))}
                                                className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800"
                                                placeholder="Nombre completo del acuerdo..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-600 dark:text-slate-400">Descripción</Label>
                                            <Input
                                                value={newCatalog.description}
                                                onChange={(e) => setNewCatalog(prev => ({ ...prev, description: e.target.value }))}
                                                className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800"
                                                placeholder="Breve descripción..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-600 dark:text-slate-400">Icono</Label>
                                                <Select value={newCatalog.icon} onValueChange={(val) => setNewCatalog(prev => ({ ...prev, icon: val }))}>
                                                    <SelectTrigger className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CATALOG_ICONS.map((item) => (
                                                            <SelectItem key={item.icon} value={item.icon}>
                                                                <span className="mr-2">{item.icon}</span> {item.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-slate-600 dark:text-slate-400">Color</Label>
                                                <Select value={newCatalog.color} onValueChange={(val) => setNewCatalog(prev => ({ ...prev, color: val }))}>
                                                    <SelectTrigger className="h-8 bg-white dark:bg-slate-900 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CATALOG_COLORS.map((item) => (
                                                            <SelectItem key={item.value} value={item.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${item.value}`} />
                                                                    {item.label}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button className="w-full mt-4 bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700" disabled={isLoading} onClick={handleCreateCatalog}>
                                            {isLoading ? "Creando..." : "Crear Catálogo"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="general" className="p-6 space-y-6 h-full overflow-y-auto data-[state=active]:block">
                        <div className="max-w-md space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Año Fiscal Vigente</h3>
                                <p className="text-sm text-slate-500">
                                    Este valor determina qué año se muestra como "Año Vigente" en el dashboard principal y se utiliza para cálculos de tendencias.
                                </p>
                                <div className="flex items-center gap-4">
                                    <Input
                                        value={currentYear}
                                        onChange={(e) => setCurrentYear(e.target.value)}
                                        className="w-32 text-lg font-mono bg-white dark:bg-slate-900 dark:border-slate-800"
                                        type="number"
                                    />
                                    <Button onClick={handleUpdateYear} disabled={isLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </div>

                            <Separator />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
