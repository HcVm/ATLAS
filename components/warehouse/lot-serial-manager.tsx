"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package, Barcode, CheckCircle, Clock, Truck, Eye, AlertCircle, Play, RefreshCw } from "lucide-react"
import { getLotsForSale, getSerialsForLot, updateLotStatus, generateLotsForSale } from "@/lib/lot-serial-generator"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"

interface LotSerialManagerProps {
  saleId: string
  onStatusChange?: () => void
}

export function LotSerialManager({ saleId, onStatusChange }: LotSerialManagerProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [lots, setLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLot, setSelectedLot] = useState<any | null>(null)
  const [showSerialsDialog, setShowSerialsDialog] = useState(false)
  const [serials, setSerials] = useState<any[]>([])
  const [loadingSerials, setLoadingSerials] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (saleId) {
      fetchLots()
    }
  }, [saleId])

  const fetchLots = async () => {
    try {
      setLoading(true)
      const data = await getLotsForSale(saleId)
      setLots(data)
    } catch (error: any) {
      toast.error("Error al cargar los lotes: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLots = async () => {
    const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

    if (!user || !companyId) {
      toast.error("No se pudo identificar la empresa o el usuario")
      return
    }

    setIsGenerating(true)
    try {
      toast.info("Generando lotes y asignando series...")
      await generateLotsForSale(saleId, companyId, user.id)

      toast.success("Lotes generados y asignados correctamente")
      await fetchLots()

      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      console.error("Error generating lots:", error)
      toast.error("Error al generar lotes: " + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewSerials = async (lot: any) => {
    try {
      setSelectedLot(lot)
      setShowSerialsDialog(true)
      setLoadingSerials(true)

      const data = await getSerialsForLot(lot.id)
      setSerials(data)
    } catch (error: any) {
      toast.error("Error al cargar los números de serie: " + error.message)
    } finally {
      setLoadingSerials(false)
    }
  }

  const handleUpdateStatus = async (lotId: string, newStatus: "pending" | "in_inventory" | "delivered") => {
    try {
      await updateLotStatus(lotId, newStatus)
      toast.success("Estado actualizado correctamente")
      await fetchLots()
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error: any) {
      toast.error("Error al actualizar el estado: " + error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "in_inventory":
        return (
          <Badge variant="default" className="text-green-600 bg-green-50 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            En Inventario
          </Badge>
        )
      case "sold":
        return (
          <Badge variant="default" className="text-blue-600 bg-blue-50 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Asignado
          </Badge>
        )
      case "delivered":
        return (
          <Badge variant="secondary">
            <Truck className="h-3 w-3 mr-1" />
            Entregado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const hasAllocatedSerials = lots.some((lot) =>
    lot.product_serials?.some((serial: any) => serial.status === "sold" && serial.sale_id === saleId),
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (lots.length === 0 && !hasAllocatedSerials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lotes y Números de Serie
          </CardTitle>
          <CardDescription>No se han generado lotes para esta venta aún</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="p-3 bg-slate-100 rounded-full">
            <Barcode className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-center max-w-md">
            Puedes generar automáticamente los lotes y series para los productos de esta venta.
            Si hay stock disponible, se asignarán las series existentes. De lo contrario, se generarán nuevos lotes.
          </p>
          <Button onClick={handleGenerateLots} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generar Lotes y Series
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lotes y Números de Serie
            </CardTitle>
            <CardDescription>Gestión de trazabilidad de productos</CardDescription>
          </div>
          <Button onClick={handleGenerateLots} disabled={isGenerating} size="sm" variant="outline">
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Regenerar / Completar
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {hasAllocatedSerials && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta venta incluye productos asignados desde stock existente. Los lotes mostrados pueden incluir tanto
                stock existente como nuevos lotes generados.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Lote</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Generación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-sm">{lot.lot_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lot.product_name}</p>
                        <p className="text-xs text-muted-foreground">{lot.product_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{lot.quantity}</TableCell>
                    <TableCell>{getStatusBadge(lot.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lot.generated_date).toLocaleDateString("es-PE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewSerials(lot)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Series
                        </Button>
                        {lot.status === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus(lot.id, "in_inventory")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ingresar
                          </Button>
                        )}
                        {lot.status === "in_inventory" && (
                          <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(lot.id, "delivered")}>
                            <Truck className="h-4 w-4 mr-1" />
                            Entregar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSerialsDialog} onOpenChange={setShowSerialsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Números de Serie - Lote {selectedLot?.lot_number}
            </DialogTitle>
            <DialogDescription>
              {selectedLot?.product_name} ({selectedLot?.product_code})
            </DialogDescription>
          </DialogHeader>

          {loadingSerials ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Series</p>
                  <p className="text-2xl font-bold">{serials.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado del Lote</p>
                  <div className="mt-1">{getStatusBadge(selectedLot?.status)}</div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Número de Serie</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Creación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serials.map((serial, index) => (
                      <TableRow key={serial.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{serial.serial_number}</TableCell>
                        <TableCell>{getStatusBadge(serial.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(serial.created_at).toLocaleDateString("es-PE")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
