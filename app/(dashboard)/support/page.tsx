"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Ticket, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

interface SupportTicket {
  id: string
  ticket_number: string
  title: string
  description: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  category: "hardware" | "software" | "network" | "email" | "system" | "other"
  created_by: string
  assigned_to?: string
  company_id: string
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
  }
  assigned_profile?: {
    full_name: string
  }
}

const statusConfig = {
  open: { label: "Abierto", color: "bg-blue-500", icon: Ticket },
  in_progress: { label: "En Progreso", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "Resuelto", color: "bg-green-500", icon: CheckCircle },
  closed: { label: "Cerrado", color: "bg-gray-500", icon: XCircle },
}

const priorityConfig = {
  low: { label: "Baja", color: "bg-slate-500" },
  medium: { label: "Media", color: "bg-blue-500" },
  high: { label: "Alta", color: "bg-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500" },
}

const categoryConfig = {
  hardware: { label: "Hardware" },
  software: { label: "Software" },
  network: { label: "Red" },
  email: { label: "Email" },
  system: { label: "Sistema" },
  other: { label: "Otro" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function SupportPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("all")

  // Verificar si el usuario puede ver todos los tickets (admin o departamento de Tecnología)
  const canViewAllTickets = user?.role === "admin" || user?.departments?.name === "Tecnología"

  useEffect(() => {
    if (user) {
      fetchTickets()
    }
  }, [user, selectedCompany])

  const fetchTickets = async () => {
    try {
      setLoading(true)

      const companyId = selectedCompany?.id || user?.company_id
      if (!companyId) {
        console.log("No company ID available")
        setTickets([])
        return
      }

      console.log("Fetching tickets for company:", companyId)
      console.log("User can view all:", canViewAllTickets)

      // Consulta directa simple - sin RPC complicadas
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          profiles!support_tickets_created_by_fkey (
            full_name
          ),
          assigned_profile:profiles!support_tickets_assigned_to_fkey (
            full_name
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      // Si no puede ver todos, filtrar solo los suyos
      if (!canViewAllTickets) {
        query = query.or(`created_by.eq.${user?.id},assigned_to.eq.${user?.id}`)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching tickets:", error)
        toast.error("Error al cargar los tickets")
        return
      }

      console.log("Tickets fetched:", data?.length || 0)
      setTickets(data || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar los tickets")
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter

    let matchesTab = true
    if (activeTab === "my") {
      matchesTab = ticket.created_by === user?.id
    } else if (activeTab === "assigned" && canViewAllTickets) {
      matchesTab = ticket.assigned_to === user?.id
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesTab
  })

  const getTicketStats = () => {
    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      my_tickets: tickets.filter((t) => t.created_by === user?.id).length,
    }
    return stats
  }

  const stats = getTicketStats()

  if (loading) {
    return (
      <div className="container mx-auto p-6 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando tickets...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-600" />
            Soporte Técnico
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {canViewAllTickets ? "Gestiona todos los tickets de soporte" : "Gestiona tus tickets de soporte"}
            {selectedCompany && <span className="ml-2 text-primary font-medium">- {selectedCompany.name}</span>}
          </p>
        </div>
        <Link href="/support/new">
          <Button className="shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white border-none">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ticket
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden hover:scale-[1.02] transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</CardTitle>
            <Ticket className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden hover:scale-[1.02] transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Abiertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden hover:scale-[1.02] transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden hover:scale-[1.02] transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Resueltos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="network">Red</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Todos</TabsTrigger>
            <TabsTrigger value="my" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Mis Tickets</TabsTrigger>
            {canViewAllTickets && <TabsTrigger value="assigned" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Asignados a mí</TabsTrigger>}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredTickets.length === 0 ? (
              <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">No hay tickets</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all"
                      ? "No se encontraron tickets con los filtros aplicados."
                      : selectedCompany
                        ? `No hay tickets de soporte para ${selectedCompany.name}.`
                        : "No tienes tickets de soporte aún."}
                  </p>
                  <Link href="/support/new">
                    <Button className="shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white border-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer ticket
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredTickets.map((ticket) => {
                  const StatusIcon = statusConfig[ticket.status].icon
                  return (
                    <Card key={ticket.id} className="hover:shadow-xl transition-all duration-300 border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">
                                <Link href={`/support/${ticket.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                  {ticket.title}
                                </Link>
                              </CardTitle>
                              <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800/50">
                                {ticket.ticket_number}
                              </Badge>
                            </div>
                            <CardDescription className="line-clamp-2">{ticket.description}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${priorityConfig[ticket.priority].color} text-white border-none shadow-sm`}>
                                {priorityConfig[ticket.priority].label}
                              </Badge>
                              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {categoryConfig[ticket.category].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50">
                              <StatusIcon className={`h-3.5 w-3.5 ${
                                ticket.status === 'open' ? 'text-blue-500' :
                                ticket.status === 'in_progress' ? 'text-yellow-500' :
                                ticket.status === 'resolved' ? 'text-green-500' : 'text-slate-500'
                              }`} />
                              <span className="font-medium text-slate-700 dark:text-slate-300">{statusConfig[ticket.status].label}</span>
                            </div>
                            <span>Por: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.profiles?.full_name || "Usuario"}</span></span>
                            {ticket.assigned_profile && <span>Asignado a: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.assigned_profile.full_name}</span></span>}
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            {formatDistanceToNow(new Date(ticket.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
