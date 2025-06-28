"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, FileText, Calendar, DollarSign, Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QuotationData {
  quotationNumber: string
  clientRuc: string
  clientName: string
  total: number
  date: string
  companyRuc: string
  companyName: string
  isValid: boolean
}

export default function ValidateQuotationPage() {
  const searchParams = useSearchParams()
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateQuotation = () => {
      try {
        // Obtener parámetros de la URL
        const quotationNumber = searchParams.get("q")
        const clientRuc = searchParams.get("c")
        const total = searchParams.get("t")
        const date = searchParams.get("d")
        const companyRuc = searchParams.get("cr")

        if (!quotationNumber || !clientRuc || !total || !date || !companyRuc) {
          setError("Código QR inválido o incompleto")
          setLoading(false)
          return
        }

        // Simular validación (aquí podrías hacer una consulta a la base de datos)
        const mockData: QuotationData = {
          quotationNumber,
          clientRuc,
          clientName: "Cliente Validado", // En producción, obtener de la BD
          total: Number.parseFloat(total),
          date,
          companyRuc,
          companyName: "Tu Empresa", // En producción, obtener de la BD
          isValid: true,
        }

        setQuotationData(mockData)
      } catch (err) {
        setError("Error al validar la cotización")
      } finally {
        setLoading(false)
      }
    }

    validateQuotation()
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando cotización...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error de Validación</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El código QR no es válido o ha sido alterado. Por favor, verifique que esté escaneando el código
                correcto.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cotización Verificada</h1>
          <p className="text-gray-600">Este documento es auténtico y no ha sido alterado</p>
        </div>

        {quotationData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Cotización #{quotationData.quotationNumber}
                  </CardTitle>
                  <CardDescription>Información verificada del documento</CardDescription>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Válida
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Información del Cliente */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Información del Cliente
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RUC:</span>
                    <span className="font-medium">{quotationData.clientRuc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Razón Social:</span>
                    <span className="font-medium">{quotationData.clientName}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Información de la Cotización */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalles de la Cotización
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha de Emisión:
                    </span>
                    <span className="font-medium">{new Date(quotationData.date).toLocaleDateString("es-PE")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total:
                    </span>
                    <span className="font-medium text-lg">S/ {quotationData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Información de la Empresa */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa Emisora
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RUC:</span>
                    <span className="font-medium">{quotationData.companyRuc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Razón Social:</span>
                    <span className="font-medium">{quotationData.companyName}</span>
                  </div>
                </div>
              </div>

              {/* Información de Seguridad */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Documento Verificado:</strong> Esta cotización ha sido validada exitosamente. Los datos
                  mostrados corresponden al documento original emitido por la empresa.
                </AlertDescription>
              </Alert>

              {/* Timestamp de Verificación */}
              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                Verificado el {new Date().toLocaleString("es-PE")}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
