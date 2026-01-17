"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, CheckCircle, XCircle, ExternalLink, Download, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { exportToExcel, exportToCSV } from "@/lib/export-utils"

interface BrandAlert {
  id: string
  orden_electronica: string
  acuerdo_marco: string
  brand_name: string
  status: "pending" | "attended" | "observed"
  notes?: string
  ruc_proveedor?: string
  razon_social_proveedor?: string
  estado_orden_electronica?: string
  created_at: string
  updated_at: string
}

interface BrandAlertsTableProps {
  status?: "pending" | "attended" | "observed"
  onAlertsUpdated?: () => void
  refreshTrigger?: number
}

export function BrandAlertsTable({ status, onAlertsUpdated, refreshTrigger }: BrandAlertsTableProps) {
  const [alerts, setAlerts] = useState<BrandAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingAlert, setEditingAlert] = useState<BrandAlert | null>(null)
  const [editStatus, setEditStatus] = useState<string>("")
  const [editNotes, setEditNotes] = useState("")
  const [observingAlert, setObservingAlert] = useState<BrandAlert | null>(null)
  const [observationNotes, setObservationNotes] = useState("")
  const [viewingNotesAlert, setViewingNotesAlert] = useState<BrandAlert | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [status, refreshTrigger])

  const handleOpenPeruCompras = (orden: string) => {
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "https://www.catalogos.perucompras.gob.pe/ConsultaOrdenesPub"
    form.target = "_blank"

    // Campo principal
    const inputOrden = document.createElement("input")
    inputOrden.type = "hidden"
    inputOrden.name = "consultaOrdenes"   // este nombre debe ser EXACTO
    inputOrden.value = orden
    form.appendChild(inputOrden)

    // Otros campos obligatorios (aunque vacíos)
    const otrosCampos = ["acuerdoMarco", "proveedor", "fechaInicio", "fechaFin"]
    otrosCampos.forEach((name) => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = name
      input.value = ""
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }



  const fetchAlerts = async () => {
    try {
      setLoading(true)
      let query = supabase.from("brand_alerts").select("*").order("created_at", { ascending: false })

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query

      if (error) throw error

      setAlerts((data as unknown as BrandAlert[]) || [])
    } catch (error) {
      console.error("Error fetching brand alerts:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas de marca",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateAlertStatus = async (alertId: string, newStatus: string, notes?: string) => {
    try {
      if (newStatus === "observed" && (!notes || notes.trim() === "")) {
        toast({
          title: "Error",
          description: "Las notas son obligatorias cuando se marca una alerta como observada",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("brand_alerts")
        .update({
          status: newStatus,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alertId)

      if (error) throw error

      await fetchAlerts()
      if (onAlertsUpdated) {
        onAlertsUpdated()
      }
      toast({
        title: "Éxito",
        description: "Estado de la alerta actualizado correctamente",
      })
    } catch (error) {
      console.error("Error updating alert status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la alerta",
        variant: "destructive",
      })
    }
  }

  const handleQuickAction = async (alertId: string, action: "attended" | "observed") => {
    if (action === "observed") {
      const alert = alerts.find((a) => a.id === alertId)
      if (alert) {
        setObservingAlert(alert)
        setObservationNotes("")
      }
    } else {
      await updateAlertStatus(alertId, action)
    }
  }

  const handleEditSubmit = async () => {
    if (!editingAlert) return

    await updateAlertStatus(editingAlert.id, editStatus, editNotes)
    setEditingAlert(null)
    setEditStatus("")
    setEditNotes("")
  }

  const openEditDialog = (alert: BrandAlert) => {
    setEditingAlert(alert)
    setEditStatus(alert.status)
    setEditNotes(alert.notes || "")
  }

  const handleObservationSubmit = async () => {
    if (!observingAlert) return

    if (!observationNotes.trim()) {
      toast({
        title: "Error",
        description: "Debe proporcionar una nota explicando por qué se observa esta alerta",
        variant: "destructive",
      })
      return
    }

    await updateAlertStatus(observingAlert.id, "observed", observationNotes)
    setObservingAlert(null)
    setObservationNotes("")
  }

  const filteredAlerts = alerts.filter(
    (alert) =>
      alert.orden_electronica.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.acuerdo_marco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.brand_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getBrandBadge = (brandName: string) => {
    const colors = {
      WORLDLIFE: "bg-blue-500 text-white",
      HOPELIFE: "bg-green-500 text-white",
      ZEUS: "bg-purple-500 text-white",
      VALHALLA: "bg-orange-500 text-white",
    }

    return <Badge className={colors[brandName as keyof typeof colors] || "bg-gray-500 text-white"}>{brandName}</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pendiente
          </Badge>
        )
      case "attended":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Atendida
          </Badge>
        )
      case "observed":
        return (
          <Badge
            variant="destructive"
            className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
          >
            Observada
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleExportToExcel = () => {
    const exportData = filteredAlerts.map((alert) => ({
      orden_electronica: alert.orden_electronica,
      acuerdo_marco: alert.acuerdo_marco,
      brand_name: alert.brand_name,
      status: alert.status === "pending" ? "Pendiente" : alert.status === "attended" ? "Atendida" : "Observada",
      ruc_proveedor: alert.ruc_proveedor || "N/A",
      razon_social_proveedor: alert.razon_social_proveedor || "N/A",
      estado_orden_electronica: alert.estado_orden_electronica || "N/A",
      notes: alert.notes || "",
      created_at: new Date(alert.created_at).toLocaleDateString("es-PE"),
      updated_at: new Date(alert.updated_at).toLocaleDateString("es-PE"),
    }))

    const headers = {
      orden_electronica: "Orden Electrónica",
      acuerdo_marco: "Acuerdo Marco",
      brand_name: "Marca",
      status: "Estado Alerta",
      ruc_proveedor: "RUC Proveedor",
      razon_social_proveedor: "Razón Social Proveedor",
      estado_orden_electronica: "Estado Orden",
      notes: "Notas",
      created_at: "Fecha Creación",
      updated_at: "Fecha Actualización",
    }

    const filename = `alertas-marca-${status || "todas"}-${new Date().toISOString().split("T")[0]}`

    const success = exportToExcel(exportData, {
      filename,
      sheetName: "Alertas de Marca",
      headers,
    })

    if (success) {
      toast({
        title: "Éxito",
        description: "Alertas exportadas a Excel correctamente",
      })
    } else {
      toast({
        title: "Error",
        description: "No se pudo exportar a Excel",
        variant: "destructive",
      })
    }
  }

  const handleExportToCSV = () => {
    const exportData = filteredAlerts.map((alert) => ({
      orden_electronica: alert.orden_electronica,
      acuerdo_marco: alert.acuerdo_marco,
      brand_name: alert.brand_name,
      status: alert.status === "pending" ? "Pendiente" : alert.status === "attended" ? "Atendida" : "Observada",
      ruc_proveedor: alert.ruc_proveedor || "N/A",
      razon_social_proveedor: alert.razon_social_proveedor || "N/A",
      estado_orden_electronica: alert.estado_orden_electronica || "N/A",
      notes: alert.notes || "",
      created_at: new Date(alert.created_at).toLocaleDateString("es-PE"),
      updated_at: new Date(alert.updated_at).toLocaleDateString("es-PE"),
    }))

    const headers = {
      orden_electronica: "Orden Electrónica",
      acuerdo_marco: "Acuerdo Marco",
      brand_name: "Marca",
      status: "Estado Alerta",
      ruc_proveedor: "RUC Proveedor",
      razon_social_proveedor: "Razón Social Proveedor",
      estado_orden_electronica: "Estado Orden",
      notes: "Notas",
      created_at: "Fecha Creación",
      updated_at: "Fecha Actualización",
    }

    const filename = `alertas-marca-${status || "todas"}-${new Date().toISOString().split("T")[0]}`

    const success = exportToCSV(exportData, {
      filename,
      headers,
    })

    if (success) {
      toast({
        title: "Éxito",
        description: "Alertas exportadas a CSV correctamente",
      })
    } else {
      toast({
        title: "Error",
        description: "No se pudo exportar a CSV",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando alertas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por orden electrónica, acuerdo marco o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredAlerts.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              className="flex items-center gap-2 bg-transparent"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToCSV}
              className="flex items-center gap-2 bg-transparent"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        )}
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No se encontraron alertas que coincidan con la búsqueda" : "No hay alertas disponibles"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden Electrónica</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado Orden</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Estado Alerta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-mono text-sm">{alert.orden_electronica}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{alert.razon_social_proveedor || "N/A"}</div>
                      <div className="text-xs text-muted-foreground font-mono">RUC: {alert.ruc_proveedor || "N/A"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        alert.estado_orden_electronica === "ACEPTADA"
                          ? "default"
                          : alert.estado_orden_electronica === "PENDIENTE"
                            ? "secondary"
                            : alert.estado_orden_electronica === "RECHAZADA"
                              ? "destructive"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {alert.estado_orden_electronica || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getBrandBadge(alert.brand_name)}</TableCell>
                  <TableCell>{getStatusBadge(alert.status)}</TableCell>
                  <TableCell>{new Date(alert.created_at).toLocaleDateString("es-PE")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {alert.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction(alert.id, "attended")}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction(alert.id, "observed")}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {alert.status === "observed" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Notas de la Observación</DialogTitle>
                              <DialogDescription>
                                Detalles de por qué esta alerta fue observada
                              </DialogDescription>
                            </DialogHeader>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm whitespace-pre-line space-y-2">
                              {alert.notes ? (
                                alert.notes.split(/\s+/).map((word, index) =>
                                  word.startsWith("http") ? (
                                    <Button
                                      key={index}
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mx-1"
                                    >
                                      <a href={word} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                        Ver documento
                                      </a>
                                    </Button>
                                  ) : (
                                    <span key={index} className="mx-1">
                                      {word}
                                    </span>
                                  )
                                )
                              ) : (
                                <span>No se registraron notas para esta observación.</span>
                              )}
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cerrar</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(alert)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Editar Alerta</DialogTitle>
                            <DialogDescription>Actualiza el estado y notas de la alerta de marca</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Orden Electrónica</label>
                                <div className="font-mono text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  {editingAlert?.orden_electronica}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Marca</label>
                                <div className="p-2">{editingAlert && getBrandBadge(editingAlert.brand_name)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Proveedor</label>
                                <div className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  {editingAlert?.razon_social_proveedor || "N/A"}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">RUC</label>
                                <div className="font-mono text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  {editingAlert?.ruc_proveedor || "N/A"}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Estado de la Orden</label>
                              <div className="p-2">
                                <Badge
                                  variant={
                                    editingAlert?.estado_orden_electronica === "ACEPTADA"
                                      ? "default"
                                      : editingAlert?.estado_orden_electronica === "PENDIENTE"
                                        ? "secondary"
                                        : editingAlert?.estado_orden_electronica === "RECHAZADA"
                                          ? "destructive"
                                          : "outline"
                                  }
                                >
                                  {editingAlert?.estado_orden_electronica || "N/A"}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Estado de la Alerta</label>
                              <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendiente</SelectItem>
                                  <SelectItem value="attended">Atendida</SelectItem>
                                  <SelectItem value="observed">Observada</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Notas</label>
                              <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Agregar notas sobre esta alerta..."
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline" onClick={() => setEditingAlert(null)}>
                                Cancelar
                              </Button>
                            </DialogClose>
                            <Button onClick={handleEditSubmit}>Guardar Cambios</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPeruCompras(alert.orden_electronica)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={!!observingAlert} onOpenChange={() => setObservingAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Marcar como Observada</DialogTitle>
            <DialogDescription>
              Proporcione una nota explicando por qué esta alerta debe ser observada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Orden Electrónica</label>
                <div className="font-mono text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  {observingAlert?.orden_electronica}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Marca</label>
                <div className="p-2">{observingAlert && getBrandBadge(observingAlert.brand_name)}</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Motivo de la observación *</label>
              <Textarea
                value={observationNotes}
                onChange={(e) => setObservationNotes(e.target.value)}
                placeholder="Explique por qué esta alerta debe ser marcada como observada..."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                * Este campo es obligatorio para marcar la alerta como observada
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservingAlert(null)}>
              Cancelar
            </Button>
            <Button onClick={handleObservationSubmit} className="bg-orange-600 hover:bg-orange-700">
              Marcar como Observada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
