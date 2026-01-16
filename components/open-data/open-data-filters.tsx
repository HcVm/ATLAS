"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Filter, X, Building2, Store, Calendar, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface OpenDataFiltersProps {
  searchParams: any
}

export function OpenDataFilters({ searchParams }: OpenDataFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [filters, setFilters] = useState({
    search: searchParams.search || "",
    entidad: searchParams.entidad || "",
    proveedor: searchParams.proveedor || "",
    fecha_desde: searchParams.fecha_desde || "",
    fecha_hasta: searchParams.fecha_hasta || "",
  })

  const [isExpanded, setIsExpanded] = useState(true)

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const applyFilters = () => {
    const params = new URLSearchParams()

    // Agregar filtros no vacíos
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value.trim())
      }
    })

    // Resetear a la página 1 cuando se aplican filtros
    params.set("page", "1")

    const newUrl = `${pathname}?${params.toString()}`
    router.push(newUrl)
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      entidad: "",
      proveedor: "",
      fecha_desde: "",
      fecha_hasta: "",
    })

    // Navegar solo con la página 1
    router.push(`${pathname}?page=1`)
  }

  const hasActiveFilters = Object.values(filters).some((value) => value && value.trim())

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Filtros de Búsqueda</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Refina los resultados para encontrar datos específicos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex"
          >
            {isExpanded ? "Contraer" : "Expandir"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                
                {/* Búsqueda General - Reducido para dar espacio */}
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="search" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Búsqueda General</Label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                      id="search"
                      placeholder="Descripción..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Entidad */}
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="entidad" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entidad</Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      id="entidad"
                      placeholder="Nombre de la entidad..."
                      value={filters.entidad}
                      onChange={(e) => handleFilterChange("entidad", e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Proveedor */}
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="proveedor" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</Label>
                  <div className="relative group">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                    <Input
                      id="proveedor"
                      placeholder="Nombre del proveedor..."
                      value={filters.proveedor}
                      onChange={(e) => handleFilterChange("proveedor", e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Fechas - Aumentado el espacio */}
                <div className="lg:col-span-3 space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rango de Fechas</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 group min-w-0">
                      <Input
                        id="fecha_desde"
                        type="date"
                        value={filters.fecha_desde}
                        onChange={(e) => handleFilterChange("fecha_desde", e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs px-2 h-9 w-full"
                      />
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <div className="relative flex-1 group min-w-0">
                      <Input
                        id="fecha_hasta"
                        type="date"
                        value={filters.fecha_hasta}
                        onChange={(e) => handleFilterChange("fecha_hasta", e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs px-2 h-9 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <Button 
                  onClick={applyFilters} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-8 transition-all hover:scale-105"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Resultados
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
