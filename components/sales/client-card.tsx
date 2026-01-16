"use client"

import type { SalesEntity } from "@/types/sales"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Edit, 
  Trash2, 
  MessageSquare, 
  Mail, 
  User, 
  MapPin, 
  FileText, 
  Building2, 
  Phone,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClientCardProps {
  client: SalesEntity
  lastFollowUpStatus?: string
  onEdit: (client: SalesEntity) => void
  onDelete: (client: SalesEntity) => void
  onFollowUp: (client: SalesEntity) => void
  onGenerateLetter: (client: SalesEntity) => void
}

const statusConfig: Record<string, { 
  color: string; 
  label: string;
  gradient: string;
}> = {
  por_contactar: {
    color: "text-blue-600 dark:text-blue-400",
    label: "Por Contactar",
    gradient: "from-blue-500/20 to-indigo-500/20",
  },
  contactado: {
    color: "text-emerald-600 dark:text-emerald-400",
    label: "Contactado",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  negociando: {
    color: "text-amber-600 dark:text-amber-400",
    label: "Negociando",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  inactivo: {
    color: "text-slate-600 dark:text-slate-400",
    label: "Inactivo",
    gradient: "from-slate-500/20 to-gray-500/20",
  },
  descartado: {
    color: "text-red-600 dark:text-red-400",
    label: "Descartado",
    gradient: "from-red-500/20 to-rose-500/20",
  },
}

export function ClientCard({
  client,
  lastFollowUpStatus = "por_contactar",
  onEdit,
  onDelete,
  onFollowUp,
  onGenerateLetter,
}: ClientCardProps) {
  const status = statusConfig[lastFollowUpStatus] || statusConfig.por_contactar

  return (
    <Card className="group relative overflow-hidden border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1">
      {/* Decorative Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${status.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${status.gradient} shadow-inner`}>
              <Building2 className={`h-6 w-6 ${status.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-tight">
                {client.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-[10px] px-2 h-5 ${status.color} bg-white/50 dark:bg-slate-900/50 border-current/20`}>
                  {status.label}
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {client.ruc}
                </span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onGenerateLetter(client)}>
                <FileText className="h-4 w-4 mr-2" /> Generar Carta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(client)} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

          <div className="space-y-2.5">
            {client.contact_person ? (
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 group/item">
                <User className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-500 transition-colors flex-shrink-0" />
                <span className="truncate font-medium">{client.contact_person}</span>
              </div>
            ) : (
               <div className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500 italic">
                 <User className="h-4 w-4 flex-shrink-0" />
                 <span>Sin contacto registrado</span>
               </div>
            )}
  
            {client.email && (
              <div className="flex items-center gap-3 text-sm group/item">
                 <Mail className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-500 transition-colors flex-shrink-0" />
                <a href={`mailto:${client.email}`} className="truncate text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {client.email}
                </a>
              </div>
            )}
  
            {client.fiscal_address && (
              <div className="flex items-start gap-3 text-sm group/item">
                 <MapPin className="h-4 w-4 text-slate-400 group-hover/item:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300 line-clamp-2 text-xs leading-relaxed">
                  {client.fiscal_address}
                </span>
              </div>
            )}
          </div>
      </CardContent>

      <CardFooter className="relative p-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <Button 
          variant="ghost" 
          className="w-full h-10 rounded-none hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"
          onClick={() => onFollowUp(client)}
        >
          <MessageSquare className="h-4 w-4" />
          Registrar Seguimiento
        </Button>
      </CardFooter>
    </Card>
  )
}
