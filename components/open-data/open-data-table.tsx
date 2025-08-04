"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

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

    console.log(`Navigating to page ${page}`)

    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())

    const newUrl = `${pathname}?${params.toString()}`
    console.log("New URL:", newUrl)

    // Usar push para navegación normal
    router.push(newUrl)
  }

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return "S/ 0.00"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "2000-01-01") return "Sin fecha"
    try {
      return new Date(dateString).toLocaleDateString("es-PE")
    } catch {
      return dateString
    }
  }

  const formatNumber = (num: any) => {
    if (!num || isNaN(num)) return "0"
    return Number(num).toLocaleString()
  }

  console.log(`Rendering table with ${data.length} records, page ${currentPage} of ${totalPages}`)

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-slate-400 mb-4">
            <Eye className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No se encontraron datos</h3>
          <p className="text-slate-500 dark:text-slate-400">
            No hay registros que coincidan con los filtros aplicados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha Aceptación</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto Total</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.id || `row-${index}`}>
                <TableCell className="font-mono text-xs">
                  <div>
                    <div className="font-medium">{formatDate(row.fecha_aceptacion)}</div>
                    <div className="text-xs text-slate-500">Pub: {formatDate(row.fecha_publicacion)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <p className="font-medium text-sm truncate" title={row.razon_social_entidad}>
                      {row.razon_social_entidad || "Sin especificar"}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">RUC: {row.ruc_entidad || "Sin RUC"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <p className="font-medium text-sm truncate" title={row.razon_social_proveedor}>
                      {row.razon_social_proveedor || "Sin especificar"}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">RUC: {row.ruc_proveedor || "Sin RUC"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="text-sm truncate" title={row.descripcion_ficha_producto}>
                      {row.descripcion_ficha_producto || "Sin descripción"}
                    </p>
                    {row.marca_ficha_producto && (
                      <p className="text-xs text-slate-500">Marca: {row.marca_ficha_producto}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatNumber(row.cantidad_entrega)}</TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatCurrency(row.monto_total_entrega)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={row.estado_orden_electronica === "ACEPTADA" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {row.estado_orden_electronica || "Sin estado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Detalle de la Contratación</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh]">
                        {selectedRow && (
                          <div className="space-y-6 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Información de la Entidad</h4>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <strong>Razón Social:</strong>{" "}
                                    {selectedRow.razon_social_entidad || "Sin especificar"}
                                  </p>
                                  <p>
                                    <strong>RUC:</strong> {selectedRow.ruc_entidad || "Sin RUC"}
                                  </p>
                                  <p>
                                    <strong>Unidad Ejecutora:</strong>{" "}
                                    {selectedRow.unidad_ejecutora || "Sin especificar"}
                                  </p>
                                  {selectedRow.direccion_entrega && (
                                    <p>
                                      <strong>Dirección de Entrega:</strong> {selectedRow.direccion_entrega}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-3">Información del Proveedor</h4>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <strong>Razón Social:</strong>{" "}
                                    {selectedRow.razon_social_proveedor || "Sin especificar"}
                                  </p>
                                  <p>
                                    <strong>RUC:</strong> {selectedRow.ruc_proveedor || "Sin RUC"}
                                  </p>
                                  {selectedRow.direccion_proveedor && (
                                    <p>
                                      <strong>Dirección:</strong> {selectedRow.direccion_proveedor}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3">Información del Producto/Servicio</h4>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <strong>Descripción:</strong>{" "}
                                  {selectedRow.descripcion_ficha_producto || "Sin descripción"}
                                </p>
                                <p>
                                  <strong>Categoría:</strong> {selectedRow.categoria || "Sin categoría"}
                                </p>
                                <p>
                                  <strong>Catálogo:</strong> {selectedRow.catalogo || "Sin catálogo"}
                                </p>
                                {selectedRow.marca_ficha_producto && (
                                  <p>
                                    <strong>Marca:</strong> {selectedRow.marca_ficha_producto}
                                  </p>
                                )}
                                {selectedRow.nro_parte && (
                                  <p>
                                    <strong>Número de Parte:</strong> {selectedRow.nro_parte}
                                  </p>
                                )}
                                {selectedRow.link_ficha_producto && (
                                  <p>
                                    <strong>Ficha Técnica:</strong>{" "}
                                    <a
                                      href={selectedRow.link_ficha_producto}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline"
                                    >
                                      Ver ficha
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Información Comercial</h4>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <strong>Cantidad:</strong> {formatNumber(selectedRow.cantidad_entrega)}
                                  </p>
                                  <p>
                                    <strong>Precio Unitario:</strong> {formatCurrency(selectedRow.precio_unitario)}
                                  </p>
                                  <p>
                                    <strong>Sub Total:</strong> {formatCurrency(selectedRow.sub_total)}
                                  </p>
                                  <p>
                                    <strong>IGV:</strong> {formatCurrency(selectedRow.igv_entrega)}
                                  </p>
                                  <p>
                                    <strong>Monto Total:</strong> {formatCurrency(selectedRow.monto_total_entrega)}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-3">Información de Entrega</h4>
                                <div className="space-y-2 text-sm">
                                  <p>
                                    <strong>Fecha Inicio:</strong> {formatDate(selectedRow.fecha_inicio_entrega)}
                                  </p>
                                  <p>
                                    <strong>Fecha Fin:</strong> {formatDate(selectedRow.fecha_fin_entrega)}
                                  </p>
                                  <p>
                                    <strong>Plazo de Entrega:</strong> {selectedRow.plazo_entrega || 0} días
                                  </p>
                                  <p>
                                    <strong>Estado:</strong> {selectedRow.estado_orden_electronica || "Sin estado"}
                                  </p>
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Mostrando {(currentPage - 1) * 50 + 1} a {Math.min(currentPage * 50, totalRecords)} de{" "}
          {totalRecords.toLocaleString()} registros
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
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
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
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
