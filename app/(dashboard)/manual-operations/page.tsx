"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, Plus } from "lucide-react"
import ManualCCILetterForm from "@/components/manual-operations/manual-cci-letter-form"

export default function ManualOperationsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [showNewCCIDialog, setShowNewCCIDialog] = useState(false)

  const hasSalesAccess =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Ventas" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Jefatura de Ventas" ||
    user?.departments?.name === "Contabilidad" ||
    user?.departments?.name === "Acuerdos Marco" ||
    user?.departments?.name === "acuerdos marco"

  if (!hasSalesAccess || !selectedCompany) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="w-full max-w-md text-center p-6">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4 text-2xl">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {!hasSalesAccess
                ? "No tienes los permisos necesarios para acceder a esta página."
                : "Por favor, selecciona una empresa para continuar."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
            Operaciones Manuales
          </h1>
          <p className="text-muted-foreground">
            Gestión manual de documentos para:{" "}
            <span className="font-semibold text-foreground">{selectedCompany?.name || "N/A"}</span>
          </p>
        </div>
        <Dialog open={showNewCCIDialog} onOpenChange={setShowNewCCIDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white shadow-md">
              <Plus className="h-4 w-4 mr-2" /> Crear Carta CCI Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">Crear Carta CCI Manual</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Completa todos los campos para generar una carta CCI de forma manual
              </DialogDescription>
            </DialogHeader>
            <ManualCCILetterForm
              onSuccess={() => {
                setShowNewCCIDialog(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100">Cartas CCI Manuales</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Genera cartas de autorización CCI de forma manual con datos personalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Esta funcionalidad te permite crear cartas CCI sin necesidad de una venta registrada. Puedes:
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Ingresar datos del cliente manualmente (nombre, RUC, dirección)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Elegir entre OCAM u OC con su número correspondiente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Seleccionar qué campos mostrar (Orden Física, SIAF, ambos o ninguno)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                <span>Generar la carta con el mismo formato que las cartas automáticas</span>
              </li>
            </ul>
            <Button
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white"
              onClick={() => setShowNewCCIDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Crear Nueva Carta CCI
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100">Información</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Detalles sobre las operaciones manuales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                ¿Cuándo usar esta funcionalidad?
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Utiliza las operaciones manuales cuando necesites generar cartas CCI para clientes que no tienen una
                venta registrada en el sistema, o cuando requieras crear cartas con datos específicos diferentes a los
                de una venta existente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Datos Requeridos</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <li>• Nombre del cliente</li>
                <li>• RUC del cliente</li>
                <li>• Dirección del cliente</li>
                <li>• Tipo de orden (OCAM u OC)</li>
                <li>• Número de orden</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
