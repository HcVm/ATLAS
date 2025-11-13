"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface SeriesFilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalSeries: number
  onApplyFilter: (filteredSerials: string[]) => void
  allSerials: string[]
}

export function SeriesFilterModal({
  open,
  onOpenChange,
  totalSeries,
  onApplyFilter,
  allSerials,
}: SeriesFilterModalProps) {
  const [filterMode, setFilterMode] = useState<"all" | "range" | "specific">("all")
  const [startSeries, setStartSeries] = useState("")
  const [endSeries, setEndSeries] = useState("")
  const [specificSeriesInput, setSpecificSeriesInput] = useState("")
  const [selectedCount, setSelectedCount] = useState(totalSeries)

  const getFilteredSerials = (mode: string) => {
    let filtered: string[] = []

    if (mode === "all") {
      filtered = allSerials
    } else if (mode === "range") {
      const start = startSeries.trim()
      const end = endSeries.trim()

      if (!start || !end) return []

      const startNumeric = start.match(/(\d+)$/) ? Number.parseInt(start.match(/(\d+)$/)![1], 10) : Number.NaN
      const endNumeric = end.match(/(\d+)$/) ? Number.parseInt(end.match(/(\d+)$/)![1], 10) : Number.NaN

      if (isNaN(startNumeric) || isNaN(endNumeric)) return []

      filtered = allSerials.filter((serial) => {
        const numericSuffix = serial.match(/(\d+)$/) ? Number.parseInt(serial.match(/(\d+)$/)![1], 10) : Number.NaN
        if (isNaN(numericSuffix)) return false
        return numericSuffix >= startNumeric && numericSuffix <= endNumeric
      })
    } else if (mode === "specific") {
      const specificList = specificSeriesInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (specificList.length === 0) return []

      const specificNumerics = new Set<number>()
      specificList.forEach((spec) => {
        if (spec.match(/^\d+$/)) {
          specificNumerics.add(Number.parseInt(spec, 10))
        } else {
          const numeric = spec.match(/(\d+)$/) ? Number.parseInt(spec.match(/(\d+)$/)![1], 10) : Number.NaN
          if (!isNaN(numeric)) specificNumerics.add(numeric)
        }
      })

      filtered = allSerials.filter((serial) => {
        const serialNumeric = serial.match(/(\d+)$/) ? Number.parseInt(serial.match(/(\d+)$/)![1], 10) : Number.NaN
        return !isNaN(serialNumeric) && specificNumerics.has(serialNumeric)
      })
    }

    return filtered
  }

  const handleFilterModeChange = (mode: string) => {
    setFilterMode(mode as any)
    if (mode === "all") {
      setSelectedCount(totalSeries)
    } else if (mode === "range") {
      setSelectedCount(0)
    } else if (mode === "specific") {
      setSelectedCount(0)
    }
  }

  const handleSpecificSeriesChange = (value: string) => {
    setSpecificSeriesInput(value)
    const filtered = getFilteredSerials("specific")
    setSelectedCount(filtered.length)
  }

  const handleStartSeriesChange = (value: string) => {
    setStartSeries(value)
    if (filterMode === "range") {
      const filtered = getFilteredSerials("range")
      setSelectedCount(filtered.length)
    }
  }

  const handleEndSeriesChange = (value: string) => {
    setEndSeries(value)
    if (filterMode === "range") {
      const filtered = getFilteredSerials("range")
      setSelectedCount(filtered.length)
    }
  }

  const handleApplyFilter = () => {
    const filtered = getFilteredSerials(filterMode)
    onApplyFilter(filtered)
    onOpenChange(false)
  }

  const handleSelectAll = () => {
    handleFilterModeChange("all")
  }

  const handleClear = () => {
    setStartSeries("")
    setEndSeries("")
    setSpecificSeriesInput("")
    setFilterMode("all")
    setSelectedCount(totalSeries)
  }

  const previewMatches = getFilteredSerials(filterMode)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtrar Series</DialogTitle>
          <DialogDescription>
            Total de series disponibles: <span className="font-bold">{totalSeries}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={filterMode} onValueChange={handleFilterModeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="range">Rango</TabsTrigger>
              <TabsTrigger value="specific">Específicas</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Generar todas las series</p>
                  <p className="text-sm text-blue-700 mt-1">Se generarán {totalSeries} etiquetas</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="range" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Serie de inicio (ej: 0001 o ARMHCAL-047-251113-1-1)</label>
                  <Input
                    placeholder="0001"
                    value={startSeries}
                    onChange={(e) => handleStartSeriesChange(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Serie final (ej: 0100 o ARMHCAL-047-251113-1-100)</label>
                  <Input
                    placeholder="0100"
                    value={endSeries}
                    onChange={(e) => handleEndSeriesChange(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
                {startSeries && endSeries && selectedCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900">Se generarán {selectedCount} etiquetas</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="specific" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Series específicas (separadas por comas)</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ej: 0001, 0050, ARMHCAL-047-251113-1-100, ARMHCAL-047-251113-1-6210
                </p>
                <textarea
                  placeholder="0001, 0050, 0100, 6210"
                  value={specificSeriesInput}
                  onChange={(e) => handleSpecificSeriesChange(e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-xs font-mono"
                />
                {specificSeriesInput.trim().length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">Series encontradas: {previewMatches.length}</p>
                      {previewMatches.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {previewMatches.length} coincidencias
                        </Badge>
                      )}
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-muted/50 rounded-md p-2 space-y-1">
                      {previewMatches.length > 0 ? (
                        previewMatches.slice(0, 10).map((match, idx) => (
                          <div key={idx} className="text-xs font-mono bg-background rounded px-2 py-1 truncate">
                            {match}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground p-2">
                          No se encontraron coincidencias. Revisa el formato de entrada.
                        </p>
                      )}
                      {previewMatches.length > 10 && (
                        <p className="text-xs text-muted-foreground p-2">... y {previewMatches.length - 10} más</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Etiquetas a generar</p>
              <p className="text-2xl font-bold text-primary">{selectedCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">de {totalSeries} disponibles</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Limpiar
          </Button>
          <Button variant="outline" onClick={handleSelectAll}>
            Todas
          </Button>
          <Button onClick={handleApplyFilter} disabled={selectedCount === 0}>
            {selectedCount === 0 ? "Selecciona series" : `Aplicar Filtro (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
