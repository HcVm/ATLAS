"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, FilterIcon, RotateCcw } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface FilterOption {
  value: string
  label: string
  count: number
}

export function RankingsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [acuerdos, setAcuerdos] = useState<FilterOption[]>([])
  const [categorias, setCategorias] = useState<FilterOption[]>([])
  const [catalogos, setCatalogos] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    acuerdo: searchParams.get("acuerdo") || "all",
    categoria: searchParams.get("categoria") || "all",
    catalogo: searchParams.get("catalogo") || "all",
    fecha_desde: searchParams.get("fecha_desde") || "",
    fecha_hasta: searchParams.get("fecha_hasta") || "",
    limit: searchParams.get("limit") || "50",
  })

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.fecha_desde ? new Date(filters.fecha_desde) : undefined,
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.fecha_hasta ? new Date(filters.fecha_hasta) : undefined,
  )

  // Cargar opciones de filtros
  useEffect(() => {
    const loadFilters = async () => {
      setLoading(true)
      try {
        const [acuerdosRes, categoriasRes, catalogosRes] = await Promise.all([
          fetch("/api/open-data/filters?type=acuerdos"),
          fetch("/api/open-data/filters?type=categorias"),
          fetch("/api/open-data/filters?type=catalogos"),
        ])

        const [acuerdosData, categoriasData, catalogosData] = await Promise.all([
          acuerdosRes.json(),
          categoriasRes.json(),
          catalogosRes.json(),
        ])

        if (acuerdosData.success) setAcuerdos(acuerdosData.data)
        if (categoriasData.success) setCategorias(categoriasData.data)
        if (catalogosData.success) setCatalogos(catalogosData.data)
      } catch (error) {
        console.error("Error loading filters:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFilters()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleDateChange = (type: "from" | "to", date: Date | undefined) => {
    if (type === "from") {
      setDateFrom(date)
      setFilters((prev) => ({
        ...prev,
        fecha_desde: date ? format(date, "yyyy-MM-dd") : "",
      }))
    } else {
      setDateTo(date)
      setFilters((prev) => ({
        ...prev,
        fecha_hasta: date ? format(date, "yyyy-MM-dd") : "",
      }))
    }
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/open-data/rankings?${params.toString()}`)
  }

  const clearFilters = () => {
    setFilters({
      acuerdo: "all",
      categoria: "all",
      catalogo: "all",
      fecha_desde: "",
      fecha_hasta: "",
      limit: "50",
    })
    setDateFrom(undefined)
    setDateTo(undefined)

    const params = new URLSearchParams(searchParams.toString())
    const type = params.get("type") || "productos"
    router.push(`/open-data/rankings?type=${type}`)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Acuerdo Marco */}
        <div className="space-y-2">
          <Label htmlFor="acuerdo">Acuerdo Marco</Label>
          <Select value={filters.acuerdo} onValueChange={(value) => handleFilterChange("acuerdo", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar acuerdo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los acuerdos</SelectItem>
              {acuerdos.map((acuerdo) => (
                <SelectItem key={acuerdo.value} value={acuerdo.value}>
                  {acuerdo.label} ({acuerdo.count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoría</Label>
          <Select value={filters.categoria} onValueChange={(value) => handleFilterChange("categoria", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.slice(0, 20).map((categoria) => (
                <SelectItem key={categoria.value} value={categoria.value}>
                  {categoria.label} ({categoria.count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Catálogo */}
        <div className="space-y-2">
          <Label htmlFor="catalogo">Catálogo</Label>
          <Select value={filters.catalogo} onValueChange={(value) => handleFilterChange("catalogo", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar catálogo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los catálogos</SelectItem>
              {catalogos.slice(0, 20).map((catalogo) => (
                <SelectItem key={catalogo.value} value={catalogo.value}>
                  {catalogo.label} ({catalogo.count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Límite */}
        <div className="space-y-2">
          <Label htmlFor="limit">Mostrar</Label>
          <Select value={filters.limit} onValueChange={(value) => handleFilterChange("limit", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">Top 25</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
              <SelectItem value="100">Top 100</SelectItem>
              <SelectItem value="200">Top 200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha Desde</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => handleDateChange("from", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Fecha Hasta</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => handleDateChange("to", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1">
          <FilterIcon className="mr-2 h-4 w-4" />
          Aplicar Filtros
        </Button>
        <Button variant="outline" onClick={clearFilters}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      </div>
    </div>
  )
}
