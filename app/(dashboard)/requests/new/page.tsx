"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, UserX, Plus, Calendar, Wrench, MessageSquare, AlertCircle, Info, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"

const REQUEST_TYPES = [
  {
    id: "late_justification",
    title: "Justificación de Tardanza",
    description: "Justificar llegadas tardías al trabajo",
    icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    gradient: "from-orange-500 to-amber-500",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe presentarse dentro de las 24 horas posteriores a la tardanza.",
  },
  {
    id: "absence_justification",
    title: "Justificación de Ausencia",
    description: "Justificar ausencias al trabajo",
    icon: UserX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    gradient: "from-red-500 to-rose-500",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe presentarse dentro de las 24 horas posteriores a la ausencia.",
  },
  {
    id: "overtime_request",
    title: "Registro de Horas Extras",
    description: "Registrar horas extras trabajadas",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    gradient: "from-blue-500 to-cyan-500",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe registrarse dentro de las 24 horas posteriores al trabajo extra.",
  },
  {
    id: "permission_request",
    title: "Solicitud de Permiso",
    description: "Solicitar permisos y vacaciones",
    icon: Calendar,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    gradient: "from-green-500 to-emerald-500",
    timeLimit: "3 días",
    urgent: false,
    details: "Debe solicitarse con al menos 3 días de anticipación.",
  },
  {
    id: "equipment_request",
    title: "Solicitud de Equipos/Materiales",
    description: "Solicitar equipos o materiales para tu departamento",
    icon: Wrench,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    gradient: "from-purple-500 to-violet-500",
    timeLimit: "Sin límite",
    urgent: false,
    details: "Solicita equipos, herramientas o materiales necesarios para tu trabajo.",
  },
  {
    id: "general_request",
    title: "Solicitud General",
    description: "Comentarios, sugerencias y solicitudes generales",
    icon: MessageSquare,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    gradient: "from-slate-500 to-gray-500",
    timeLimit: "Sin límite",
    urgent: false,
    details: "Para cualquier otro tipo de solicitud, comentario o sugerencia.",
  },
]

export default function NewRequestPage() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSelectType = (typeId: string) => {
    router.push(`/requests/new/${typeId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-full space-y-8 p-6 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Link href="/requests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Mis Solicitudes
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Nueva Solicitud
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">
            Selecciona el tipo de trámite que deseas realizar
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200/50 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Información Importante</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              Algunas solicitudes tienen plazos estrictos de presentación. Por favor revisa los indicadores de tiempo antes de continuar.
              Las solicitudes urgentes marcadas con alerta deben procesarse de inmediato.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Request Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REQUEST_TYPES.map((type, index) => {
          const Icon = type.icon

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelectType(type.id)}
            >
              <Card className="h-full cursor-pointer group hover:shadow-xl transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden relative">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${type.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-3.5 rounded-2xl ${type.bg} ${type.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {type.urgent && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 shadow-sm bg-red-500 hover:bg-red-600 border-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgente
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <Clock className="h-3 w-3 mr-1 text-slate-400" />
                        {type.timeLimit}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {type.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {type.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {type.details}
                    </p>
                    <Button
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-slate-200 border-0 shadow-lg shadow-slate-900/10 group-hover:shadow-blue-500/20 transition-all duration-300"
                    >
                      Iniciar Solicitud
                      <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Help Section */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">¿No encuentras lo que buscas?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">
              Si tienes dudas sobre qué tipo de solicitud elegir o necesitas asistencia personalizada, nuestro equipo de soporte está disponible.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild className="bg-white dark:bg-slate-900">
              <Link href="/documentation">Ver Guías</Link>
            </Button>
            <Button variant="outline" asChild className="bg-white dark:bg-slate-900">
              <Link href="/support">Contactar Soporte</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
