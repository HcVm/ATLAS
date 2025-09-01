"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToExcel, exportToCSV } from "@/lib/export-utils"
import { useState } from "react"

interface ExportButtonsProps {
  data: any[]
  acuerdoMarco: string
  searchParams?: any
  acuerdoMarcoFullString?: string
}

export function ExportButtons({ data, acuerdoMarco, searchParams, acuerdoMarcoFullString }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const fetchAllFilteredData = async () => {
    if (!acuerdoMarcoFullString) return data

    try {
      const params = new URLSearchParams()
      params.append("acuerdo", acuerdoMarcoFullString)
      params.append("export", "all")

      if (searchParams?.search) params.append("search", searchParams.search)
      if (searchParams?.entidad) params.append("entidad", searchParams.entidad)
      if (searchParams?.proveedor) params.append("proveedor", searchParams.proveedor)
      if (searchParams?.fecha_desde) params.append("fecha_desde", searchParams.fecha_desde)
      if (searchParams?.fecha_hasta) params.append("fecha_hasta", searchParams.fecha_hasta)

      const response = await fetch(`/api/open-data-export?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch data")

      const allData = await response.json()
      return allData
    } catch (error) {
      console.error("Error fetching all data:", error)
      return data // Fallback to current page data
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const exportData = await fetchAllFilteredData()

      const headers = [
        "Orden Electrónica",
        "Entidad",
        "Proveedor",
        "Descripción Producto",
        "Monto Total",
        "Fecha Publicación",
        "Fecha Aceptación",
        "Estado",
      ]

      const formattedData = exportData.map((item: any) => [
        item.orden_electronica || "",
        item.razon_social_entidad || "",
        item.razon_social_proveedor || "",
        item.descripcion_ficha_producto || "",
        item.monto_total_entrega || 0,
        item.fecha_publicacion || "",
        item.fecha_aceptacion || "",
        item.estado_orden || "",
      ])

      exportToExcel(formattedData, headers, `${acuerdoMarco}_datos_completos`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const exportData = await fetchAllFilteredData()

      const headers = [
        "Orden Electrónica",
        "Entidad",
        "Proveedor",
        "Descripción Producto",
        "Monto Total",
        "Fecha Publicación",
        "Fecha Aceptación",
        "Estado",
      ]

      const formattedData = exportData.map((item: any) => [
        item.orden_electronica || "",
        item.razon_social_entidad || "",
        item.razon_social_proveedor || "",
        item.descripcion_ficha_producto || "",
        item.monto_total_entrega || 0,
        item.fecha_publicacion || "",
        item.fecha_aceptacion || "",
        item.estado_orden || "",
      ])

      exportToCSV(formattedData, headers, `${acuerdoMarco}_datos_completos`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Exportando..." : "Exportar CSV"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting}>
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Exportando..." : "Exportar Excel"}
      </Button>
    </div>
  )
}
