"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertCircle, Clock, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ValidationData {
  quotationNumber: string
  clientName: string
  clientRuc: string
  companyName: string
  companyRuc: string
  totalAmount: number
  quotationDate: string
  createdBy: string
  validatedCount: number
  lastValidatedAt?: string
  createdAt: string
}

export default function ValidateQuotationPage() {
  const params = useParams()
  const hash = params.hash as string
  const [validation, setValidation] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const validateQuotation = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Validando hash:", hash?.substring(0, 16) + "...")

      const response = await fetch(`/api/validate-quotation/${hash}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al validar la cotización")
      }

      if (data.success) {
        setValidation(data.validation)
        console.log("✅ Validación exitosa, contador:", data.validation.validatedCount)
      } else {
        throw new Error("Respuesta inválida del servidor")
      }
    } catch (err) {
      console.error("❌ Error validando:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hash) {
      validateQuotation()
    }
  }, [hash])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Validando cotización...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Validación Fallida</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={validateQuotation}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
            >
              Intentar Nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!validation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontró información de validación</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-green-200 shadow-lg">
        <CardHeader className="text-center bg-green-50 rounded-t-lg">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Cotización Válida</CardTitle>
          <CardDescription className="text-green-600">La cotización ha sido verificada exitosamente</CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Información de la Cotización */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Información de la Cotización</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                #{validation.quotationNumber}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Cliente</label>
                <p className="text-gray-900 font-medium">{validation.clientName}</p>
                <p className="text-sm text-gray-600">RUC: {validation.clientRuc}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Empresa</label>
                <p className="text-gray-900 font-medium">{validation.companyName}</p>
                <p className="text-sm text-gray-600">RUC: {validation.companyRuc}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Monto Total</label>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(validation.totalAmount)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Fecha de Cotización</label>
                <p className="text-gray-900 font-medium">{formatDate(validation.quotationDate)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información de Validación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Información de Validación</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Validaciones</p>
                  <p className="text-lg font-bold text-blue-600">{validation.validatedCount}</p>
                </div>
              </div>

              {validation.lastValidatedAt && (
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Última Validación</p>
                    <p className="text-sm text-purple-600">{formatDateTime(validation.lastValidatedAt)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Creada</p>
                  <p className="text-sm text-gray-600">{formatDateTime(validation.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Botón para validar nuevamente */}
          <div className="text-center">
            <Button onClick={validateQuotation} className="bg-green-600 hover:bg-green-700 text-white">
              Validar Nuevamente
            </Button>
            <p className="text-xs text-gray-500 mt-2">Cada validación incrementa el contador</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
