"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"

interface OpenDataFiltersProps {
  searchParams: any
}

export function OpenDataFilters({ searchParams }: OpenDataFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentSearchParams = useSearchParams()

  const [filters, setFilters] = useState({
    search: searchParams.search || "",
    entidad: searchParams.entidad || "",
    proveedor: searchParams.proveedor || "",
    fecha_desde: searchParams.fecha_desde || "",
    fecha_hasta: searchParams.fecha_hasta || "",
  })

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
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h3 className="font-medium">Filtros de búsqueda</h3>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="ml-auto bg-transparent">
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Búsqueda general</Label>
              <Input
                id="search"
                placeholder="Buscar en descripción, entidad o proveedor..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entidad">Entidad</Label>
              <Input
                id="entidad"
                placeholder="Nombre de la entidad..."
                value={filters.entidad}
                onChange={(e) => handleFilterChange("entidad", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                placeholder="Nombre del proveedor..."
                value={filters.proveedor}
                onChange={(e) => handleFilterChange("proveedor", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_desde">Fecha desde</Label>
              <Input
                id="fecha_desde"
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => handleFilterChange("fecha_desde", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_hasta">Fecha hasta</Label>
              <Input
                id="fecha_hasta"
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => handleFilterChange("fecha_hasta", e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={applyFilters} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
