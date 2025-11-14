"use client"

import { useState, useEffect } from "react"
import { Search, FileText, MapPin, Calendar, User, Download, Eye, Lock } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from 'next/navigation'
import { useToast } from "@/hooks/use-toast"

interface DocumentSearchResult {
  id: string
  document_number: string
  title: string
  status: string
  current_department_id: string
  departments: {
    id: string
    name: string
    color?: string
  } | null
  created_at: string
  created_by: string
  company_id: string
  profiles?: {
    full_name: string
  } | null
  document_movements?: Array<{
    to_department_id: string
    from_department_id: string
  }>
}

interface DocumentSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-sm">
          Pendiente
        </Badge>
      )
    case "in_progress":
      return (
        <Badge className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm">
          En Progreso
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-sm">
          Completado
        </Badge>
      )
    case "cancelled":
      return (
        <Badge className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shadow-sm">
          Cancelado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function DocumentSearchDialog({ open, onOpenChange }: DocumentSearchDialogProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<DocumentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const searchDocuments = async (query: string) => {
    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)

      let searchQuery = supabase
        .from("documents")
        .select(
          `
          id,
          document_number,
          title,
          status,
          current_department_id,
          departments:current_department_id (
            id,
            name,
            color
          ),
          created_at,
          created_by,
          company_id,
          profiles!documents_created_by_fkey (full_name),
          document_movements!document_movements_document_id_fkey (
            to_department_id,
            from_department_id
          )
        `,
        )
        .ilike("document_number", `%${query}%`)

      if (user?.role === "admin") {
        // Admins can see all documents
      } else if (user?.role === "supervisor") {
        // Supervisors see all documents from their company
        searchQuery = searchQuery.eq("company_id", user.company_id)
      } else {
        // Regular users: see only their company's documents
        searchQuery = searchQuery.eq("company_id", user?.company_id)
      }

      const { data, error } = await searchQuery.limit(20)

      if (error) {
        console.error("Search error:", error)
        toast({
          title: "Error en búsqueda",
          description: "No se pudieron buscar los documentos",
          variant: "destructive",
        })
        setResults([])
        return
      }

      let filteredResults = data || []

      if (user?.role !== "admin" && user?.role !== "supervisor" && user?.department_id) {
        // Regular users: filter to only show documents they can access
        filteredResults = (data || []).filter((doc) => {
          // Can see if created by them
          if (doc.created_by === user.id) return true

          // Can see if currently in their department
          if (doc.current_department_id === user.department_id) return true

          // Can see if it passed through their department
          if (doc.document_movements && doc.document_movements.length > 0) {
            const hasPassedThrough = doc.document_movements.some(
              (movement: any) =>
                movement.to_department_id === user.department_id || movement.from_department_id === user.department_id,
            )
            if (hasPassedThrough) return true
          }

          return false
        })
      }

      setResults(filteredResults)
    } catch (error: any) {
      console.error("Unexpected search error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al buscar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchDocuments(searchTerm)
      } else {
        setResults([])
        setHasSearched(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const canDownloadDocument = (document: DocumentSearchResult): boolean => {
    if (user?.role === "admin" || user?.role === "supervisor") {
      return true
    }

    // Regular users can only download if document is in their department
    return document.current_department_id === user?.department_id
  }

  const handleViewDocument = (docId: string) => {
    onOpenChange(false)
    router.push(`/documents/${docId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <DialogTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Documento
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {user?.role === "admin"
              ? "Busca cualquier documento en el sistema"
              : user?.role === "supervisor"
                ? "Busca documentos de tu empresa"
                : "Busca documentos que hayas visto o creado"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* Search Input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
            <Input
              placeholder="Ingrese número de documento (ej: DOC-001)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-300" />
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="h-12 w-12 mx-auto opacity-40 mb-3" />
                <p className="text-sm">Ingresa un número de documento para buscar</p>
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="h-12 w-12 mx-auto opacity-40 mb-3" />
                <p className="text-sm">No se encontraron documentos</p>
              </div>
            )}

            {results.map((doc) => {
              const canDownload = canDownloadDocument(doc)

              return (
                <Card
                  key={doc.id}
                  className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-700/50 dark:to-slate-600/50 border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer group"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                            {doc.title || "Sin título"}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {doc.document_number}
                          </p>
                        </div>
                        <div>{getStatusBadge(doc.status)}</div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Location */}
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            {doc.departments?.name || "Sin departamento"}
                          </span>
                        </div>

                        {/* Creator */}
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <User className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <span className="truncate">{doc.profiles?.full_name || "Usuario"}</span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>

                        {/* Permission Status */}
                        <div className="flex items-center gap-2">
                          {canDownload ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 text-xs"
                            >
                              Acceso completo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-xs"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Solo lectura
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(doc.id)}
                          className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        {canDownload && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              handleViewDocument(doc.id)
                            }}
                            className="flex-1"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </Button>
                        )}
                      </div>

                      {/* Warning for read-only access */}
                      {!canDownload && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2 text-xs text-amber-700 dark:text-amber-300">
                          Este documento está en otro departamento. Solo puedes ver la información, no descargar
                          archivos.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
