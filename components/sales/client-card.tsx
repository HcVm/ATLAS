"use client"

import type { SalesEntity } from "@/types/sales"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, MessageSquare, Mail, User, MapPin, FileText } from "lucide-react"

interface ClientCardProps {
  client: SalesEntity
  lastFollowUpStatus?: string
  onEdit: (client: SalesEntity) => void
  onDelete: (client: SalesEntity) => void
  onFollowUp: (client: SalesEntity) => void
}

const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
  por_contactar: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  },
  contactado: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  },
  negociando: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
  },
  inactivo: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    text: "text-gray-700 dark:text-gray-300",
    badge: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
  },
  descartado: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  },
}

const statusLabels: Record<string, string> = {
  por_contactar: "Por Contactar",
  contactado: "Contactado",
  negociando: "Negociando",
  inactivo: "Inactivo",
  descartado: "Descartado",
}

export function ClientCard({
  client,
  lastFollowUpStatus = "por_contactar",
  onEdit,
  onDelete,
  onFollowUp,
  onGenerateLetter,
}: ClientCardProps) {
  const colors = statusColors[lastFollowUpStatus] || statusColors.por_contactar
  const statusLabel = statusLabels[lastFollowUpStatus] || "Sin estado"

  return (
    <Card className={`${colors.bg} border border-slate-200 dark:border-slate-700/50 hover:shadow-lg transition-all`}>
      <CardContent className="pt-6 space-y-4">
        {/* Header con nombre y estado */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-lg font-semibold ${colors.text} line-clamp-2`}>{client.name}</h3>
            <Badge className={colors.badge} variant="outline">
              {statusLabel}
            </Badge>
          </div>
          {client.client_type && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tipo: {client.client_type === "private" ? "Privado" : "Gubernamental"}
            </p>
          )}
        </div>

        {/* RUC */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">RUC</p>
          <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{client.ruc}</p>
        </div>

        {/* Información de contacto */}
        <div className="space-y-2 text-sm">
          {client.contact_person && (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <User className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="truncate">{client.contact_person}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              <a
                href={`mailto:${client.email}`}
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate"
              >
                {client.email}
              </a>
            </div>
          )}
          {client.fiscal_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400 mt-0.5" />
              <span className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{client.fiscal_address}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => onFollowUp(client)} className="flex-1 text-xs h-8">
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Seguimiento
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onGenerateLetter(client)}
            className="h-8 w-8 p-0"
            title="Generar Carta de Presentación"
          >
            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="sr-only">Carta</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(client)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(client)} className="h-8 w-8 p-0">
            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
