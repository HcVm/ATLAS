"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Terminal, CheckCircle2, AlertCircle, Database } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function TestAutomationPage() {
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<{ type: "info" | "success" | "error", msg: string }[]>([])
    const [entries, setEntries] = useState<any[]>([])
    const [stats, setStats] = useState({ count: 0, lastUpdate: "-" })

    const addLog = (type: "info" | "success" | "error", msg: string) => {
        setLogs(prev => [...prev, { type, msg }])
    }

    const fetchStats = async () => {
        try {
            // Get count
            const { count, error: countError } = await supabase
                .from("open_data_entries_test" as any)
                .select("*", { count: "exact", head: true })

            if (countError) throw countError

            // Get latest entries
            const { data, error: dataError } = await supabase
                .from("open_data_entries_test" as any)
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10)

            if (dataError) throw dataError

            setStats({
                count: count || 0,
                lastUpdate: data?.[0]?.created_at ? new Date(data[0].created_at).toLocaleString() : "-"
            })
            setEntries(data || [])

        } catch (err: any) {
            console.error("Error fetching stats:", err)
            addLog("error", `Error loading table stats: ${err.message}`)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const handleSync = async () => {
        if (!url) {
            addLog("error", "Por favor ingresa una URL válida (API o JSON Endpoint)")
            return
        }

        setLoading(true)
        addLog("info", `Iniciando sincronización desde: ${url}`)

        try {
            const res = await fetch("/api/open-data/test-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || "Error desconocido en el servidor")
            }

            addLog("success", `Sincronización Completada. Proceso Terminado.`)
            if (typeof result.found !== 'undefined') {
                addLog(result.inserted > 0 ? "success" : "info", `Encontrados en origen: ${result.found} | Importados (Catálogos): ${result.inserted}`)
            } else {
                addLog("error", "La respuesta del servidor no tiene el formato esperado (faltan campos found/inserted).")
            }

            if (result.errors && result.errors.length > 0) {
                result.errors.forEach((e: any) => {
                    addLog("error", `Error SQL: ${e.message || JSON.stringify(e)}`)
                    if (e.details) addLog("error", `Detalle: ${e.details}`)
                })
            }

            fetchStats()

        } catch (err: any) {
            addLog("error", `Falló la sincronización: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-12 space-y-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                        Laboratorio de Automatización OCDS
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Prueba de concepto para la ingestión automática de datos de Perú Compras.
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-2 bg-blue-50 text-blue-700 border-blue-200">
                    Tabla de Pruebas: open_data_entries_test
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Control Panel */}
                <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-900/5 overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <RefreshCw className="w-24 h-24" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-blue-500" />
                            Consola de Ejecución
                        </CardTitle>
                        <CardDescription>
                            Dispara el proceso de fetch manualmente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                                Endpoint URL (JSON)
                            </label>
                            <Input
                                placeholder="https://api.perucompras.../data.json"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="font-mono text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 focus:ring-blue-500"
                            />
                            <p className="text-[10px] text-slate-400">
                                Pega aquí el enlace directo al JSON de Perú Compras o de la API OCDS.
                            </p>
                        </div>

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-white font-medium transition-all hover:scale-[1.02]"
                            onClick={handleSync}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Ejecutar Sincronización
                                </>
                            )}
                        </Button>

                        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs h-64 overflow-y-auto border border-slate-800 shadow-inner">
                            <div className="flex items-center gap-2 text-slate-400 mb-2 border-b border-slate-800 pb-2">
                                <Terminal className="h-3 w-3" />
                                <span>Salida del Sistema</span>
                            </div>
                            <div className="space-y-1">
                                {logs.length === 0 && (
                                    <span className="text-slate-600 italic">Esperando comandos...</span>
                                )}
                                {logs.map((log, i) => (
                                    <div key={i} className={`flex items-start gap-2 ${log.type === "error" ? "text-red-400" :
                                        log.type === "success" ? "text-emerald-400" : "text-blue-300"
                                        }`}>
                                        <span>{">"}</span>
                                        <span>{log.msg}</span>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="text-slate-500 animate-pulse">{">"} ...</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Preview */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Total Registros (Test)</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.count.toLocaleString()}</h3>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Database className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Última Actualización</p>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.lastUpdate}</h3>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle>Vista Previa de Datos</CardTitle>
                            <CardDescription>Últimos 10 registros insertados en `open_data_entries_test`</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Orden</th>
                                                <th className="px-4 py-3">Publicación</th>
                                                <th className="px-4 py-3">Monto</th>
                                                <th className="px-4 py-3">Proveedor</th>
                                                <th className="px-4 py-3">Entidad</th>
                                                <th className="px-4 py-3">Producto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {entries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                                        No hay datos para mostrar aun. Ejecuta una sincronización.
                                                    </td>
                                                </tr>
                                            ) : (
                                                entries.map((entry) => (
                                                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                        <td className="px-4 py-3 font-mono text-xs">{entry.orden_electronica}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                            {format(new Date(entry.fecha_publicacion), "dd MMM yyyy", { locale: es })}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                                                            S/ {Number(entry.monto_total_entrega).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[200px] truncate" title={entry.razon_social_proveedor}>
                                                            <div className="flex flex-col">
                                                                <span className="truncate">{entry.razon_social_proveedor}</span>
                                                                <span className="text-[10px] text-slate-400">{entry.ruc_proveedor}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[200px] truncate" title={entry.razon_social_entidad}>
                                                            {entry.razon_social_entidad}
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[200px] truncate text-slate-500" title={entry.descripcion_ficha_producto}>
                                                            {entry.descripcion_ficha_producto}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
