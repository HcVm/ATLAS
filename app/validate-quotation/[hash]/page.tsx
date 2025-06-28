"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, Shield, FileText, Building, User, Calendar } from "lucide-react"

interface ValidationData {
  isValid: boolean
  quotationNumber: string
  clientRuc: string
  clientName: string
  companyRuc: string
  companyName: string
  totalAmount: number
  quotationDate: string
  createdAt: string
  validatedCount: number
  lastValidatedAt: string
  createdBy: string
}

export default function ValidateQuotationPage() {
  const params = useParams()
  const hash = params.hash as string
  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateQuotation = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/validate-quotation/${hash}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Error al validar la cotización")
        }

        setValidationData(data)
      } catch (err) {
        console.error("Validation error:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    if (hash) {
      validateQuotation()
    }
  }, [hash])

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Clock className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validando Cotización</h2>
            <p className="text-gray-600 text-center">Verificando la autenticidad del documento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validación Fallida</h2>
            <p className="text-red-600 text-center mb-4">{error}</p>
            <Badge variant="destructive" className="text-sm">
              Documento Inválido
            </Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!validationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin Datos</h2>
            <p className="text-gray-600 text-center">No se encontraron datos de validación.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header de Validación */}
        <Card className="mb-6 border-green-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Shield className="h-6 w-6 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-800 flex items-center justify-center gap-2">
              <span>Cotización Válida</span>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                Verificada
              </Badge>
            </CardTitle>
            <CardDescription className="text-green-700">
              Este documento ha sido verificado como auténtico y original
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Información de la Cotización */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Datos del Documento */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                Información del Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Número de Cotización:</span>
                <Badge variant="outline" className="font-mono">
                  {validationData.quotationNumber}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Fecha de Emisión:</span>
                <span className="text-sm font-semibold">{formatDate(validationData.quotationDate)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Monto Total:</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(validationData.totalAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Creado por:</span>
                <span className="text-sm font-semibold">{validationData.createdBy}</span>
              </div>
            </CardContent>
          </Card>

          {/* Datos de las Empresas */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-purple-600" />
                Información de Empresas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600">Empresa Emisora:</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="font-semibold text-purple-900">{validationData.companyName}</p>
                  <p className="text-sm text-purple-700">RUC: {validationData.companyRuc}</p>
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Cliente:</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-semibold text-blue-900">{validationData.clientName}</p>
                  <p className="text-sm text-blue-700">RUC: {validationData.clientRuc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas de Validación */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-green-600" />
              Estadísticas de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-800">{validationData.validatedCount}</p>
                <p className="text-sm text-green-600">Veces Validada</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-blue-800">Creada el</p>
                <p className="text-sm text-blue-600">{formatDate(validationData.createdAt)}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-purple-800">Última Validación</p>
                <p className="text-sm text-purple-600">{formatDate(validationData.lastValidatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer de Seguridad */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-green-200">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Documento verificado mediante sistema criptográfico seguro
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
