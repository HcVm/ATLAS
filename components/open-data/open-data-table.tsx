"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { formatDateForDisplay } from "@/lib/date-utils"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Building2, Store, Calendar, CreditCard, Box, Tag } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"

interface OpenDataTableProps {
  data: any[]
  currentPage: number
  totalPages: number
  totalRecords: number
}

export function OpenDataTable({ data, currentPage, totalPages, totalRecords }: OpenDataTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedRow, setSelectedRow] = useState<any>(null)

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return

    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())

    const newUrl = `${pathname}?${params.toString()}`
    router.push(newUrl)
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "2000-01-01") return "Sin fecha"
    try {
      return formatDateForDisplay(dateString)
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return "S/ 0.00"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const formatNumber = (num: any) => {
    if (!num || isNaN(num)) return "0"
    return Number(num).toLocaleString()
  }

  if (data.length === 0) {
    return (
      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">No se encontraron datos</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Intenta ajustar los filtros de búsqueda o selecciona otro rango de fechas.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabla */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-950 pb-2">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
              <TableHead className="w-[120px] font-semibold text-slate-600 dark:text-slate-300">Fecha</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Entidad</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Proveedor</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Descripción</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Cantidad</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Monto Total</TableHead>
              <TableHead className="text-center font-semibold text-slate-600 dark:text-slate-300">Estado</TableHead>
              <TableHead className="w-[80px] text-center font-semibold text-slate-600 dark:text-slate-300">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                key={row.id || `row-${index}`}
                className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors border-slate-100 dark:border-slate-800 ${
                  index === data.length - 1 ? "border-b-0" : ""
                }`}
              >
                <TableCell className="align-top py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                      {formatDate(row.fecha_aceptacion)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      Pub: {formatDate(row.fecha_publicacion)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[200px] space-y-1">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200 line-clamp-2" title={row.razon_social_entidad}>
                      {row.razon_social_entidad || "Sin especificar"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.5 rounded">
                      <Building2 className="h-3 w-3" />
                      {row.ruc_entidad || "N/A"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[200px] space-y-1">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200 line-clamp-2" title={row.razon_social_proveedor}>
                      {row.razon_social_proveedor || "Sin especificar"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.5 rounded">
                      <Store className="h-3 w-3" />
                      {row.ruc_proveedor || "N/A"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top py-4">
                  <div className="max-w-[280px] space-y-1.5">
                    <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={row.descripcion_ficha_producto}>
                      {row.descripcion_ficha_producto || "Sin descripción"}
                    </div>
                    {row.marca_ficha_producto && (
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-200 dark:border-slate-700 text-slate-500 font-normal">
                        {row.marca_ficha_producto}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top py-4 font-mono text-sm text-slate-600 dark:text-slate-400">
                  {formatNumber(row.cantidad_entrega)}
                </TableCell>
                <TableCell className="text-right align-top py-4">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(row.monto_total_entrega)}
                  </span>
                </TableCell>
                <TableCell className="text-center align-top py-4">
                  <Badge
                    className={`text-[10px] font-medium border-0 px-2 py-0.5 ${
                      row.estado_orden_electronica === "ACEPTADA" 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {row.estado_orden_electronica || "PENDIENTE"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center align-top py-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={() => setSelectedRow(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden border-0 shadow-2xl">
                      <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <DialogTitle className="text-xl flex items-center gap-2">
                          <Box className="h-5 w-5 text-indigo-500" />
                          Detalle de la Contratación
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[calc(85vh-80px)]">
                        {selectedRow && (
                          <div className="p-6 space-y-8">
                            {/* Entidad y Proveedor */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <Building2 className="h-5 w-5 text-blue-500" />
                                  <h4 className="font-semibold text-slate-900 dark:text-white">Entidad Compradora</h4>
                                </div>
                                <div className="space-y-3 pl-1">
                                  <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Razón Social</p>
                                    <p className="text-sm font-medium">{selectedRow.razon_social_entidad}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">RUC</p>
                                      <p className="text-sm font-mono bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded w-fit">{selectedRow.ruc_entidad}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unidad Ejecutora</p>
                                      <p className="text-sm font-mono">{selectedRow.unidad_ejecutora}</p>
                                    </div>
                                  </div>
                                  {selectedRow.direccion_entrega && (
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dirección de Entrega</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRow.direccion_entrega}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <Store className="h-5 w-5 text-purple-500" />
                                  <h4 className="font-semibold text-slate-900 dark:text-white">Proveedor Adjudicado</h4>
                                </div>
                                <div className="space-y-3 pl-1">
                                  <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Razón Social</p>
                                    <p className="text-sm font-medium">{selectedRow.razon_social_proveedor}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">RUC</p>
                                      <p className="text-sm font-mono bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded w-fit">{selectedRow.ruc_proveedor}</p>
                                    </div>
                                  </div>
                                  {selectedRow.direccion_proveedor && (
                                    <div>
                                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dirección Fiscal</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedRow.direccion_proveedor}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Producto */}
                            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 mb-4">
                                <Tag className="h-5 w-5 text-orange-500" />
                                <h4 className="font-semibold text-slate-900 dark:text-white">Detalle del Item</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-3">
                                  <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                                    <p className="text-sm leading-relaxed">{selectedRow.descripcion_ficha_producto}</p>
                                  </div>
                                  <div className="flex gap-4">
                                    {selectedRow.marca_ficha_producto && (
                                      <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Marca</p>
                                        <Badge variant="outline" className="bg-white dark:bg-slate-950">{selectedRow.marca_ficha_producto}</Badge>
                                      </div>
                                    )}
                                    {selectedRow.nro_parte && (
                                      <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nro. Parte</p>
                                        <span className="text-sm font-mono text-slate-600">{selectedRow.nro_parte}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categoría</p>
                                    <p className="text-sm text-slate-600">{selectedRow.categoria}</p>
                                  </div>
                                  {selectedRow.link_ficha_producto && (
                                    <Button asChild variant="outline" size="sm" className="w-full text-xs">
                                      <a href={selectedRow.link_ficha_producto} target="_blank" rel="noopener noreferrer">
                                        Ver Ficha Técnica Oficial
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Económico */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <CreditCard className="h-5 w-5 text-emerald-500" />
                                  <h4 className="font-semibold text-slate-900 dark:text-white">Información Económica</h4>
                                </div>
                                <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-lg p-4 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Cantidad</span>
                                    <span className="font-mono font-medium">{formatNumber(selectedRow.cantidad_entrega)} unid.</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Precio Unitario</span>
                                    <span className="font-mono">{formatCurrency(selectedRow.precio_unitario)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Sub Total</span>
                                    <span className="font-mono">{formatCurrency(selectedRow.sub_total)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-emerald-100 dark:border-emerald-900/30">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Monto Total</span>
                                    <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-400">{formatCurrency(selectedRow.monto_total_entrega)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                  <Calendar className="h-5 w-5 text-blue-500" />
                                  <h4 className="font-semibold text-slate-900 dark:text-white">Plazos de Entrega</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Fecha Inicio</p>
                                    <p className="font-medium text-sm">{formatDate(selectedRow.fecha_inicio_entrega)}</p>
                                  </div>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">Fecha Fin</p>
                                    <p className="font-medium text-sm">{formatDate(selectedRow.fecha_fin_entrega)}</p>
                                  </div>
                                  <div className="col-span-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                                    <span className="text-sm text-blue-700 dark:text-blue-300">Plazo Total</span>
                                    <span className="font-bold text-blue-800 dark:text-blue-200">{selectedRow.plazo_entrega || 0} días</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Mostrando <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * 50 + 1}</span> a <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * 50, totalRecords)}</span> de{" "}
          <span className="font-medium text-slate-900 dark:text-white">{totalRecords.toLocaleString()}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500"}`}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
