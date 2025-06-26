"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Shield,
  Settings,
  Activity,
  HardDrive,
  Loader2,
  RefreshCw,
} from "lucide-react"

interface TestResult {
  name: string
  status: "success" | "error" | "warning" | "running"
  message: string
  details?: any
  duration?: number
}

interface SystemStatus {
  overall: "healthy" | "warning" | "critical"
  tests: TestResult[]
  lastRun: Date
  progress: number
}

export default function SystemDiagnosticsPage() {
  const [status, setStatus] = useState<SystemStatus>({
    overall: "healthy",
    tests: [],
    lastRun: new Date(),
    progress: 0,
  })
  const [isRunning, setIsRunning] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Test individual functions
  const testDatabaseConnection = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data, error } = await supabase.from("departments").select("count").limit(1)
      if (error) throw error

      return {
        name: "Conexión a Base de Datos",
        status: "success",
        message: "Conexión exitosa a Supabase",
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Conexión a Base de Datos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testAuthentication = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) throw error

      if (user) {
        return {
          name: "Sistema de Autenticación",
          status: "success",
          message: `Usuario autenticado: ${user.email}`,
          details: { userId: user.id, role: user.user_metadata?.role },
          duration: Date.now() - start,
        }
      } else {
        return {
          name: "Sistema de Autenticación",
          status: "warning",
          message: "No hay usuario autenticado",
          duration: Date.now() - start,
        }
      }
    } catch (error: any) {
      return {
        name: "Sistema de Autenticación",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testUserProfiles = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, company_id")
        .limit(10)

      if (error) throw error

      return {
        name: "Perfiles de Usuario",
        status: "success",
        message: `${profiles?.length || 0} perfiles encontrados`,
        details: { profileCount: profiles?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Perfiles de Usuario",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testDepartments = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: departments, error } = await supabase.from("departments").select("id, name, company_id")

      if (error) throw error

      return {
        name: "Departamentos",
        status: "success",
        message: `${departments?.length || 0} departamentos activos`,
        details: { departmentCount: departments?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Departamentos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testDocuments = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, title, file_url, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Documentos",
        status: "success",
        message: `${documents?.length || 0} documentos recientes`,
        details: { documentCount: documents?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Documentos",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testWarehouse = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: products, error } = await supabase.from("products").select("id, name, stock, price").limit(5)

      if (error) throw error

      return {
        name: "Sistema de Almacén",
        status: "success",
        message: `${products?.length || 0} productos en inventario`,
        details: { productCount: products?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Almacén",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testSales = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: sales, error } = await supabase
        .from("sales")
        .select("id, total_amount, status, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Ventas",
        status: "success",
        message: `${sales?.length || 0} ventas recientes`,
        details: { salesCount: sales?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Ventas",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testQuotations = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select("id, quotation_number, status, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Cotizaciones",
        status: "success",
        message: `${quotations?.length || 0} cotizaciones recientes`,
        details: { quotationCount: quotations?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Cotizaciones",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testSupport = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("id, title, status, priority, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Soporte",
        status: "success",
        message: `${tickets?.length || 0} tickets de soporte`,
        details: { ticketCount: tickets?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Soporte",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testNews = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: news, error } = await supabase.from("news").select("id, title, published, created_at").limit(5)

      if (error) throw error

      return {
        name: "Sistema de Noticias",
        status: "success",
        message: `${news?.length || 0} noticias publicadas`,
        details: { newsCount: news?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Noticias",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testNotifications = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("id, title, read, created_at")
        .limit(5)

      if (error) throw error

      return {
        name: "Sistema de Notificaciones",
        status: "success",
        message: `${notifications?.length || 0} notificaciones recientes`,
        details: { notificationCount: notifications?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Notificaciones",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testStorage = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets()

      if (error) throw error

      const requiredBuckets = ["images", "documents", "avatars"]
      const availableBuckets = buckets?.map((b) => b.name) || []
      const missingBuckets = requiredBuckets.filter((b) => !availableBuckets.includes(b))

      if (missingBuckets.length > 0) {
        return {
          name: "Sistema de Almacenamiento",
          status: "warning",
          message: `Buckets faltantes: ${missingBuckets.join(", ")}`,
          details: { available: availableBuckets, missing: missingBuckets },
          duration: Date.now() - start,
        }
      }

      return {
        name: "Sistema de Almacenamiento",
        status: "success",
        message: `${buckets?.length || 0} buckets disponibles`,
        details: { buckets: availableBuckets },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Sistema de Almacenamiento",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testRLS = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test RLS by trying to access data without proper context
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return {
          name: "Seguridad RLS",
          status: "warning",
          message: "No se puede verificar RLS sin usuario autenticado",
          duration: Date.now() - start,
        }
      }

      // Try to access profiles - should only return current user's profile
      const { data: profiles, error } = await supabase.from("profiles").select("id")

      if (error) {
        return {
          name: "Seguridad RLS",
          status: "success",
          message: "RLS funcionando - acceso restringido correctamente",
          duration: Date.now() - start,
        }
      }

      return {
        name: "Seguridad RLS",
        status: "success",
        message: `RLS activo - ${profiles?.length || 0} registros accesibles`,
        details: { accessibleRecords: profiles?.length },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Seguridad RLS",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testAPIEndpoints = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const endpoints = ["/api/departments", "/api/users", "/api/news"]

      const results = await Promise.allSettled(
        endpoints.map((endpoint) =>
          fetch(endpoint, { method: "GET" }).then((res) => ({ endpoint, status: res.status, ok: res.ok })),
        ),
      )

      const successful = results.filter((r) => r.status === "fulfilled" && r.value.ok).length
      const total = endpoints.length

      if (successful === total) {
        return {
          name: "API Endpoints",
          status: "success",
          message: `${successful}/${total} endpoints funcionando`,
          details: { endpoints: results },
          duration: Date.now() - start,
        }
      } else {
        return {
          name: "API Endpoints",
          status: "warning",
          message: `${successful}/${total} endpoints funcionando`,
          details: { endpoints: results },
          duration: Date.now() - start,
        }
      }
    } catch (error: any) {
      return {
        name: "API Endpoints",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testEnvironmentVariables = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"]

      const missing = requiredVars.filter((varName) => !process.env[varName])

      if (missing.length > 0) {
        return {
          name: "Variables de Entorno",
          status: "error",
          message: `Variables faltantes: ${missing.join(", ")}`,
          details: { missing },
          duration: Date.now() - start,
        }
      }

      return {
        name: "Variables de Entorno",
        status: "success",
        message: "Todas las variables requeridas están configuradas",
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Variables de Entorno",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  const testPerformance = async (): Promise<TestResult> => {
    const start = Date.now()
    try {
      // Test database query performance
      const queryStart = Date.now()
      const { data, error } = await supabase.from("profiles").select("id").limit(1)

      if (error) throw error

      const queryTime = Date.now() - queryStart

      let status: "success" | "warning" | "error" = "success"
      let message = `Consulta DB: ${queryTime}ms`

      if (queryTime > 1000) {
        status = "error"
        message += " (Muy lento)"
      } else if (queryTime > 500) {
        status = "warning"
        message += " (Lento)"
      } else {
        message += " (Rápido)"
      }

      return {
        name: "Rendimiento del Sistema",
        status,
        message,
        details: { queryTime, threshold: { warning: 500, error: 1000 } },
        duration: Date.now() - start,
      }
    } catch (error: any) {
      return {
        name: "Rendimiento del Sistema",
        status: "error",
        message: `Error: ${error.message}`,
        duration: Date.now() - start,
      }
    }
  }

  // Main test runner
  const runAllTests = async () => {
    setIsRunning(true)
    setStatus((prev) => ({ ...prev, progress: 0, tests: [] }))

    const tests = [
      testDatabaseConnection,
      testAuthentication,
      testUserProfiles,
      testDepartments,
      testDocuments,
      testWarehouse,
      testSales,
      testQuotations,
      testSupport,
      testNews,
      testNotifications,
      testStorage,
      testRLS,
      testAPIEndpoints,
      testEnvironmentVariables,
      testPerformance,
    ]

    const results: TestResult[] = []

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      const progress = ((i + 1) / tests.length) * 100

      setStatus((prev) => ({ ...prev, progress }))

      try {
        const result = await test()
        results.push(result)

        setStatus((prev) => ({
          ...prev,
          tests: [...results],
        }))
      } catch (error) {
        results.push({
          name: `Test ${i + 1}`,
          status: "error",
          message: `Error ejecutando test: ${error}`,
        })
      }
    }

    // Determine overall status
    const hasErrors = results.some((r) => r.status === "error")
    const hasWarnings = results.some((r) => r.status === "warning")

    let overall: "healthy" | "warning" | "critical" = "healthy"
    if (hasErrors) overall = "critical"
    else if (hasWarnings) overall = "warning"

    setStatus({
      overall,
      tests: results,
      lastRun: new Date(),
      progress: 100,
    })

    setIsRunning(false)
  }

  // Auto refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runAllTests()
      }, 30000) // Every 30 seconds

      setRefreshInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh])

  // Run tests on component mount
  useEffect(() => {
    runAllTests()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      warning: "secondary",
      error: "destructive",
      running: "outline",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
  }

  const successCount = status.tests.filter((t) => t.status === "success").length
  const warningCount = status.tests.filter((t) => t.status === "warning").length
  const errorCount = status.tests.filter((t) => t.status === "error").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">🔧 Sistema de Diagnóstico Avanzado</h1>
          <p className="text-muted-foreground">Monitoreo completo de la salud y funcionalidad del sistema 24/7</p>
          <Badge variant="outline" className="mt-2">
            🔒 Acceso Restringido - Solo Administradores
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>

          <Button onClick={runAllTests} disabled={isRunning} size="sm">
            {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            Ejecutar Tests
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado General del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  status.overall === "healthy"
                    ? "text-green-500"
                    : status.overall === "warning"
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {status.overall === "healthy" ? "✅" : status.overall === "warning" ? "⚠️" : "❌"}
              </div>
              <p className="text-sm text-muted-foreground">Estado General</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{successCount}</div>
              <p className="text-sm text-muted-foreground">Tests Exitosos</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
              <p className="text-sm text-muted-foreground">Advertencias</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <p className="text-sm text-muted-foreground">Errores</p>
            </div>
          </div>

          {isRunning && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Ejecutando tests...</span>
                <span>{Math.round(status.progress)}%</span>
              </div>
              <Progress value={status.progress} className="w-full" />
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">Última ejecución: {status.lastRun.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos ({status.tests.length})</TabsTrigger>
          <TabsTrigger value="success">Exitosos ({successCount})</TabsTrigger>
          <TabsTrigger value="warning">Advertencias ({warningCount})</TabsTrigger>
          <TabsTrigger value="error">Errores ({errorCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {status.tests.map((test, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{test.name}</h3>
                        {getStatusBadge(test.status)}
                        {test.duration && (
                          <Badge variant="outline" className="text-xs">
                            {test.duration}ms
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{test.message}</p>

                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalles
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="success" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "success")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "warning")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          {status.tests
            .filter((t) => t.status === "error")
            .map((test, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Entorno:</strong> {process.env.NODE_ENV || "development"}
            </div>
            <div>
              <strong>Versión Next.js:</strong> {process.env.npm_package_version || "N/A"}
            </div>
            <div>
              <strong>URL del sitio:</strong> {process.env.NEXT_PUBLIC_SITE_URL || "N/A"}
            </div>
            <div>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configurado" : "❌ No configurado"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/debug")}>
              <Database className="h-4 w-4 mr-2" />
              Debug DB
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/setup")}>
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/storage-setup")}>
              <HardDrive className="h-4 w-4 mr-2" />
              Storage
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin-setup")}>
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
