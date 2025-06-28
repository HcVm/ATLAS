"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, Calendar, Building, User, Hash } from "lucide-react"

interface QuotationData {
  quotation_number: string
  client_ruc: string
  client_name: string
  company_ruc: string
  company_name: string
  total_amount: number
  quotation_date: string
  validated_count: number
  last_validated_at: string
}

interface ValidationResponse {
  success: boolean
  quotation?: QuotationData
  error?: string
}

export default function ValidateQuotationPage() {
  const params = useParams()
  const hash = params.hash as string

  const [validation, setValidation] = useState<ValidationResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hash) return

    const validateQuotation = async () => {
      try {
        const response = await fetch(`/api/validate-quotation/${hash}`)
        const data: ValidationResponse = await response.json()
        setValidation(data)
      } catch (error) {
        console.error("Error validating quotation:", error)
        setValidation({
          success: false,
          error: "Error de conexión. Intente nuevamente.",
        })
      } finally {
        setLoading(false)
      }
    }

    validateQuotation()
  }, [hash])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Validando cotización...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!validation?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Cotización No Válida</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{validation?.error || "La cotización no pudo ser validada."}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                <strong>Posibles causas:</strong>
              </p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• El código QR ha sido alterado</li>
                <li>• La cotización ha expirado</li>
                <li>• El documento no es auténtico</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quotation = validation.quotation!

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header de validación exitosa */}
        <Card className="border-green-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">✅ Cotización Válida y Auténtica</CardTitle>
            <p className="text-gray-600 mt-2">
              Este documento ha sido verificado exitosamente contra nuestra base de datos oficial.
            </p>
          </CardHeader>
        </Card>

        {/* Información principal */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Datos de la cotización */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-blue-600" />
                Información de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Número:</span>
                <Badge variant="outline" className="font-mono">
                  {quotation.quotation_number}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Fecha:</span>
                <span className="text-sm">
                  {new Date(quotation.quotation_date).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Monto Total:</span>
                <span className="text-lg font-bold text-green-600">
                  S/ {quotation.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Datos de la empresa */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Empresa Emisora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Razón Social:</span>
                <p className="font-semibold">{quotation.company_name}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">RUC:</span>
                <p className="font-mono">{quotation.company_ruc}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Datos del cliente */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Cliente:</span>
              <p className="font-semibold">{quotation.client_name}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600">RUC:</span>
              <p className="font-mono">{quotation.client_ruc}</p>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas de validación */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Estadísticas de Validación
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Veces Validada</p>
                <p className="text-2xl font-bold text-blue-600">{quotation.validated_count}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Última Validación</p>
                <p className="text-sm font-medium text-green-600">
                  {new Date(quotation.last_validated_at).toLocaleString("es-PE")}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Información de seguridad */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">🔒 Verificación de Seguridad Completada</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Esta cotización ha sido verificada mediante hash criptográfico SHA-256 contra nuestra base de datos
                  oficial. La autenticidad está garantizada.
                </p>
                <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium mb-1">Hash de Validación:</p>
                  <p className="text-xs font-mono text-blue-800 break-all">{hash}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Sistema de Validación de Cotizaciones - Verificación Criptográfica</p>
          <p className="mt-1">© {new Date().getFullYear()} - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
