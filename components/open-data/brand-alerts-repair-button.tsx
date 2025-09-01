"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface RepairResult {
  alertId: string
  ordenElectronica: string
  status: "repaired" | "failed" | "skipped"
  reason?: string
  updates?: string[]
}

interface RepairResponse {
  message: string
  total: number
  repaired: number
  failed: number
  results: RepairResult[]
}

interface BrandAlertsRepairButtonProps {
  onRepairComplete?: () => void
}

export function BrandAlertsRepairButton({ onRepairComplete }: BrandAlertsRepairButtonProps) {
  const [isRepairing, setIsRepairing] = useState(false)

  const handleRepair = async () => {
    try {
      setIsRepairing(true)

      const response = await fetch("/api/brand-alerts/repair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to repair alerts")
      }

      const result: RepairResponse = await response.json()

      if (result.repaired > 0) {
        toast({
          title: "Reparación completada",
          description: `Se repararon ${result.repaired} alertas de ${result.total} procesadas.`,
        })
      } else {
        toast({
          title: "Sin reparaciones necesarias",
          description: result.message,
          variant: "default",
        })
      }

      if (result.failed > 0) {
        toast({
          title: "Algunas alertas no se pudieron reparar",
          description: `${result.failed} alertas no se pudieron reparar. Revisa los logs para más detalles.`,
          variant: "destructive",
        })
      }

      // Llamar callback para refrescar la tabla
      if (onRepairComplete) {
        onRepairComplete()
      }
    } catch (error) {
      console.error("Error repairing alerts:", error)
      toast({
        title: "Error",
        description: "No se pudieron reparar las alertas. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsRepairing(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Reparar Alertas N/A
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Reparar Alertas con N/A
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Esta acción buscará todas las alertas que tienen valores "N/A" o vacíos en los campos de proveedor y
              estado, y intentará completarlos con los datos correctos desde la base de datos de open data.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Solo se actualizarán las alertas que tengan datos correspondientes en
              open_data_entries. Las alertas sin datos de origen no se modificarán.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRepair} disabled={isRepairing}>
            {isRepairing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reparando...
              </>
            ) : (
              "Reparar Alertas"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
