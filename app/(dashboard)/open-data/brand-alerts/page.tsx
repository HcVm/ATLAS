"use client"

import { Suspense, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { BrandAlertsStats } from "@/components/open-data/brand-alerts-stats"
import { BrandAlertsTable } from "@/components/open-data/brand-alerts-table"
import { BrandAlertsRepairButton } from "@/components/open-data/brand-alerts-repair-button"

export default function BrandAlertsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleAlertsUpdated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/open-data">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Datos Abiertos
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white text-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Alertas de Marca</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Monitoreo de ventas de WORLDLIFE, HOPE LIFE, ZEUS y VALHALLA
              </p>
            </div>
          </div>
          <BrandAlertsRepairButton onRepairComplete={handleAlertsUpdated} />
        </div>
      </div>

      {/* Stats */}
      <BrandAlertsStats refreshTrigger={refreshTrigger} />

      {/* Alertas por estado */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gestión de Alertas</span>
          </CardTitle>
          <CardDescription>
            Revisa y gestiona las alertas de marca detectadas automáticamente en los datos abiertos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="attended">Atendidas</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <Suspense fallback={<div>Cargando alertas...</div>}>
                <BrandAlertsTable onAlertsUpdated={handleAlertsUpdated} />
              </Suspense>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Suspense fallback={<div>Cargando alertas pendientes...</div>}>
                <BrandAlertsTable status="pending" onAlertsUpdated={handleAlertsUpdated} />
              </Suspense>
            </TabsContent>

            <TabsContent value="attended" className="space-y-4">
              <Suspense fallback={<div>Cargando alertas atendidas...</div>}>
                <BrandAlertsTable status="attended" onAlertsUpdated={handleAlertsUpdated} />
              </Suspense>
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              <Suspense fallback={<div>Cargando alertas rechazadas...</div>}>
                <BrandAlertsTable status="rejected" onAlertsUpdated={handleAlertsUpdated} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
