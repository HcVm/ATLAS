"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Search, Eye, Clock, AlertCircle, CheckCircle, MoreHorizontal, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CollectionDetailsModal } from "@/components/collections/collection-details-modal"

interface CollectionData {
  id: string
  delivery_id: string
  sale_id: string
  collection_status: "pendiente" | "verde" | "amarillo" | "rojo" | "pagado"
  days_in_current_status: number
  status_start_date: string
  created_at: string
  sales: {
    id: string
    sale_number: string
    entity_name: string
    entity_ruc: string
    total_sale: number
    sale_status: string
    created_at: string
  }
  deliveries: {
    id: string
    delivery_status: string
    actual_delivery_date: string
  }
}

export default function CollectionsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCollection, setSelectedCollection] = useState<CollectionData | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const canAccessCollections =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Contabilidad" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Cobranzas" ||
    user?.departments?.name === "Ventas"

  useEffect(() => {
    if (canAccessCollections && selectedCompany?.id) {
      fetchCollections()
    } else {
      setLoading(false)
    }
  }, [selectedCompany, canAccessCollections])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("collection_tracking")
        .select(
          `
          id,
          delivery_id,
          sale_id,
          collection_status,
          days_in_current_status,
          status_start_date,
          created_at,
          sales (
            id,
            sale_number,
            entity_name,
            entity_ruc,
            total_sale,
            sale_status,
            created_at,
            company_id
          ),
          deliveries (
            id,
            delivery_status,
            actual_delivery_date
          )
        `,
        )
        .order("status_start_date", { ascending: false })

      if (error) throw error
      setCollections(data || [])
    } catch (error: any) {
      console.error("Error fetching collections:", error)
      toast.error("Error al cargar cobranzas: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, daysInStatus: number) => {
    switch (status) {
      case "pendiente":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300 border">
            <Clock className="w-3 h-3 mr-1" />A Espera ({daysInStatus} días)
          </Badge>
        )
      case "verde":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300 border">
            <div className="w-2 h-2 rounded-full bg-green-600 mr-2"></div>
            Verde ({daysInStatus} días)
          </Badge>
        )
      case "amarillo":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300 border">
            <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
            Amarillo ({daysInStatus} días)
          </Badge>
        )
      case "rojo":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300 border">
            <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
            Rojo ({daysInStatus} días)
          </Badge>
        )
      case "pagado":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300 border">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
    }
  }

  const filteredCollections = collections.filter((collection) => {
    const matchesSearch =
      collection.sales?.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.sales?.entity_ruc?.includes(searchTerm) ||
      collection.sales?.sale_number?.includes(searchTerm)

    const matchesFilter = statusFilter === "all" || collection.collection_status === statusFilter

    return matchesSearch && matchesFilter
  })

  if (!canAccessCollections) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4 text-2xl">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No tienes los permisos necesarios para acceder a este módulo.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            Módulo de Cobranzas
          </h1>
          <p className="text-muted-foreground">Seguimiento de cobros y entregas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">A Espera</CardTitle>
            <Clock className="w-5 h-5 text-gray-600"></Clock>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collections.filter((c) => c.collection_status === "pendiente").length}
            </div>
            <p className="text-xs text-slate-500">Aguardando conformidad</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">En Verde</CardTitle>
            <div className="w-2 h-2 rounded-full bg-green-600"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collections.filter((c) => c.collection_status === "verde").length}
            </div>
            <p className="text-xs text-slate-500">Dentro del plazo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">En Amarillo</CardTitle>
            <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collections.filter((c) => c.collection_status === "amarillo").length}
            </div>
            <p className="text-xs text-slate-500">Requieren atención</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">En Rojo</CardTitle>
            <div className="w-2 h-2 rounded-full bg-red-600"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collections.filter((c) => c.collection_status === "rojo").length}</div>
            <p className="text-xs text-slate-500">Vencidos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Registros de Cobranza</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Gestiona el seguimiento de cobros y entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, RUC o número de venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">A Espera</option>
                <option value="verde">Verde</option>
                <option value="amarillo">Amarillo</option>
                <option value="rojo">Rojo</option>
                <option value="pagado">Pagados</option>
              </select>
            </div>

            {filteredCollections.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No se encontraron registros" : "No hay registros de cobranza"}
                </p>
              </div>
            ) : (
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-foreground">N° Venta</TableHead>
                      <TableHead className="text-foreground">Cliente</TableHead>
                      <TableHead className="text-foreground">Monto</TableHead>
                      <TableHead className="text-foreground">Estado Semáforo</TableHead>
                      <TableHead className="text-foreground">Estado Venta</TableHead>
                      <TableHead className="text-foreground">Días en Estado</TableHead>
                      <TableHead className="text-foreground">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((collection) => (
                      <TableRow key={collection.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{collection.sales?.sale_number || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{collection.sales?.entity_name}</span>
                            <span className="text-xs text-muted-foreground">{collection.sales?.entity_ruc}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          S/ {(collection.sales?.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(collection.collection_status, collection.days_in_current_status)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{collection.sales?.sale_status?.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{collection.days_in_current_status}</span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCollection(collection)
                                  setShowDetailsModal(true)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mobile view */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              {filteredCollections.map((collection) => (
                <Card
                  key={collection.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedCollection(collection)
                    setShowDetailsModal(true)
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold truncate">{collection.sales?.entity_name}</p>
                        <p className="text-xs text-muted-foreground">#{collection.sales?.sale_number}</p>
                      </div>
                      {getStatusBadge(collection.collection_status, collection.days_in_current_status)}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">
                        S/ {(collection.sales?.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCollection(collection)
                          setShowDetailsModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCollection && (
        <CollectionDetailsModal
          collection={selectedCollection}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          onRefresh={fetchCollections}
        />
      )}
    </div>
  )
}
