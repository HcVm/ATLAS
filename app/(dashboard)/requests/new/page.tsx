"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, UserX, Plus, Calendar, Wrench, MessageSquare, ArrowLeft, AlertCircle, Info } from "lucide-react"

const REQUEST_TYPES = [
  {
    id: "late_justification",
    title: "Justificación de Tardanza",
    description: "Justificar llegadas tardías al trabajo",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe presentarse dentro de las 24 horas posteriores a la tardanza.",
  },
  {
    id: "absence_justification",
    title: "Justificación de Ausencia",
    description: "Justificar ausencias al trabajo",
    icon: UserX,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe presentarse dentro de las 24 horas posteriores a la ausencia.",
  },
  {
    id: "overtime_request",
    title: "Registro de Horas Extras",
    description: "Registrar horas extras trabajadas",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    timeLimit: "24 horas",
    urgent: true,
    details: "Debe registrarse dentro de las 24 horas posteriores al trabajo extra.",
  },
  {
    id: "permission_request",
    title: "Solicitud de Permiso",
    description: "Solicitar permisos y vacaciones",
    icon: Calendar,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    timeLimit: "3 días",
    urgent: false,
    details: "Debe solicitarse con al menos 3 días de anticipación.",
  },
  {
    id: "equipment_request",
    title: "Solicitud de Equipos/Materiales",
    description: "Solicitar equipos o materiales para tu departamento",
    icon: Wrench,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    timeLimit: "Sin límite",
    urgent: false,
    details: "Solicita equipos, herramientas o materiales necesarios para tu trabajo.",
  },
  {
    id: "general_request",
    title: "Solicitud General",
    description: "Comentarios, sugerencias y solicitudes generales",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nueva Solicitud</h1>
          <p className="text-muted-foreground mt-1">Selecciona el tipo de solicitud que deseas crear</p>
        </div>
      </div>

      {/* Info Alert */}
      <Card className="glass-card border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Información Importante</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Algunas solicitudes tienen límites de tiempo específicos. Asegúrate de revisar los detalles de cada tipo
                antes de proceder.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REQUEST_TYPES.map((type) => {
          const Icon = type.icon

          return (
            <Card
              key={type.id}
              className="glass-card hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => handleSelectType(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-3 rounded-lg ${type.color} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {type.urgent && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Urgente
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {type.timeLimit}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{type.details}</p>
                  <Button
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors bg-transparent"
                    variant="outline"
                  >
                    Crear Solicitud
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">¿Necesitas Ayuda?</CardTitle>
          <CardDescription>
            Si no estás seguro de qué tipo de solicitud crear o tienes preguntas específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" asChild>
              <Link href="/documentation">Ver Documentación</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Contactar Soporte</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
