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
import { AlertTriangle, Search, Eye, Clock, AlertCircle, CheckCircle, MoreHorizontal, Loader2, RefreshCw, Wallet, Calendar, ArrowUpRight, FileText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CollectionDetailsModal } from "@/components/collections/collection-details-modal"
import { motion, AnimatePresence } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

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
    sale_date: string
    created_at: string
    company_id: string
  }
  deliveries: {
    id: string
    delivery_status: string
    actual_delivery_date: string
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  }
}

export default function CollectionsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCollection, setSelectedCollection] = useState<CollectionData | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>("2026")
  const isReadOnlyYear = selectedYear === "2025"


  const canAccessCollections =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    ["Contabilidad", "Administración", "Cobranzas", "Ventas"].includes(user?.departments?.name || "")

  useEffect(() => {
    if (canAccessCollections && selectedCompany?.id) {
      fetchCollections(false, selectedYear)
    } else {
      setLoading(false)
    }
  }, [selectedCompany, canAccessCollections, selectedYear])

  const fetchCollections = async (isRefresh = false, year = selectedYear) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

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
          sales!inner (
            id,
            sale_number,
            entity_name,
            entity_ruc,
            total_sale,
            sale_status,
            sale_date,
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
        .eq("sales.company_id", selectedCompany?.id)
        .gte("sales.sale_date", `${year}-01-01`)
        .lte("sales.sale_date", `${year}-12-31`)
        .order("status_start_date", { ascending: false })

      if (error) throw error
      setCollections(data || [])
    } catch (error: any) {
      console.error("Error fetching collections:", error)
      toast.error("Error al cargar cobranzas: " + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string, daysInStatus: number) => {
    switch (status) {
      case "pendiente":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <Clock className="w-3 h-3 mr-1.5" />
            A Espera <span className="ml-1 opacity-70">({daysInStatus}d)</span>
          </Badge>
        )
      case "verde":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
            En Plazo <span className="ml-1 opacity-70">({daysInStatus}d)</span>
          </Badge>
        )
      case "amarillo":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
            Atención <span className="ml-1 opacity-70">({daysInStatus}d)</span>
          </Badge>
        )
      case "rojo":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
            Vencido <span className="ml-1 opacity-70">({daysInStatus}d)</span>
          </Badge>
        )
      case "pagado":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Pagado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
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
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <div className="mx-auto p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 dark:text-slate-400">
              No tienes los permisos necesarios para acceder al módulo de cobranzas.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Wallet className="h-8 w-8 text-emerald-500" />
            Cobranzas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Seguimiento de flujo de caja y estado de pagos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => fetchCollections(true, selectedYear)}
            disabled={refreshing}
            className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "A Espera", status: "pendiente", color: "slate", icon: Clock },
          { label: "En Plazo", status: "verde", color: "emerald", icon: CheckCircle },
          { label: "Atención", status: "amarillo", color: "amber", icon: AlertCircle },
          { label: "Vencidos", status: "rojo", color: "red", icon: AlertTriangle }
        ].map((stat, i) => {
          const count = collections.filter((c) => c.collection_status === stat.status).length
          return (
            <Card key={i} className={`border-none shadow-sm hover:shadow-md transition-all duration-300 bg-${stat.color}-50/50 dark:bg-${stat.color}-900/10 backdrop-blur-md`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.label}</p>
                  <h3 className={`text-3xl font-bold text-${stat.color}-700 dark:text-${stat.color}-300 mt-1`}>{count}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/60 dark:bg-white/10 text-${stat.color}-500`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  placeholder="Buscar por cliente, RUC o N° venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full md:w-[200px] h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">A Espera</SelectItem>
                  <SelectItem value="verde">En Plazo (Verde)</SelectItem>
                  <SelectItem value="amarillo">Atención (Amarillo)</SelectItem>
                  <SelectItem value="rojo">Vencidos (Rojo)</SelectItem>
                  <SelectItem value="pagado">Pagados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No se encontraron registros</h3>
                <p className="text-slate-500 max-w-sm mt-1">
                  {searchTerm
                    ? "Intenta con otros términos de búsqueda o filtros."
                    : "No hay seguimientos de cobranza activos en este momento."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead className="pl-6 font-semibold">Venta</TableHead>
                        <TableHead className="font-semibold">Cliente</TableHead>
                        <TableHead className="text-right font-semibold">Monto Total</TableHead>
                        <TableHead className="text-center font-semibold">Estado Semáforo</TableHead>
                        <TableHead className="text-center font-semibold">Días</TableHead>
                        <TableHead className="text-right pr-6 font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredCollections.map((collection, index) => (
                          <motion.tr
                            key={collection.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700 dark:text-slate-200">{collection.sales?.sale_number || "S/N"}</p>
                                  <p className="text-xs text-slate-500">{new Date(collection.sales?.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{collection.sales?.entity_name}</span>
                                <span className="text-xs text-slate-500 font-mono">{collection.sales?.entity_ruc}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                S/ {(collection.sales?.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex justify-center">
                                {getStatusBadge(collection.collection_status, collection.days_in_current_status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                                {collection.days_in_current_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCollection(collection)
                                  setShowDetailsModal(true)
                                }}
                                className="rounded-full hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalles</span>
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden p-4 grid grid-cols-1 gap-4">
                  {filteredCollections.map((collection, index) => (
                    <motion.div
                      key={collection.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-transform"
                        onClick={() => {
                          setSelectedCollection(collection)
                          setShowDetailsModal(true)
                        }}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{collection.sales?.sale_number}</p>
                                <p className="text-xs text-slate-500">{collection.sales?.entity_name}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 text-slate-400">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              S/ {(collection.sales?.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-slate-500">
                              {collection.days_in_current_status} días en estado
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            {getStatusBadge(collection.collection_status, collection.days_in_current_status)}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {selectedCollection && (
        <CollectionDetailsModal
          collection={selectedCollection}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          onRefresh={() => fetchCollections(false, selectedYear)}
          readOnly={isReadOnlyYear}
        />
      )}
    </motion.div>
  )
}
