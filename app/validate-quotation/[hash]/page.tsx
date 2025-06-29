"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, Shield, FileText, Building, User, Calendar } from "lucide-react"

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
  createdAt: string
}

export default function ValidateQuotationPage() {
  const params = useParams()
  const hash = params.hash as string
  const [validation, setValidation] = useState<ValidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hash) return

    const validateQuotation = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/validate-quotation/${hash}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Error al validar cotización")
        }

        setValidation(data.validation)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    validateQuotation()
  }, [hash])

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Validando cotización...</span>
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Validación Fallida</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              La cotización no pudo ser validada. Verifique que el código QR sea válido y no haya expirado.
            </p>
            <Badge variant="destructive" className="text-xs">
              Hash: {hash?.substring(0, 16)}...
            </Badge>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!validation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No se encontró la validación</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header de validación exitosa */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800 flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              Cotización Validada Exitosamente
            </CardTitle>
            <CardDescription className="text-green-700 text-lg">
              Esta cotización es auténtica y ha sido verificada oficialmente
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Información de la cotización */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Datos de la cotización */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Información de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Número:</span>
                <Badge variant="outline" className="text-lg font-bold">
                  {validation.quotationNumber}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Monto Total:</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(validation.totalAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Fecha:</span>
                <span className="font-semibold">{formatDate(validation.quotationDate)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Creado por:</span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{validation.createdBy}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos del cliente y empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-purple-600" />
                Información de Partes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Cliente:</h4>
                <p className="font-medium">{validation.clientName}</p>
                <p className="text-sm text-gray-600">RUC: {validation.clientRuc}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Empresa:</h4>
                <p className="font-medium">{validation.companyName}</p>
                <p className="text-sm text-gray-600">RUC: {validation.companyRuc}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información de validación */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Detalles de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Fecha de Creación</p>
                <p className="text-lg font-bold text-blue-800">{formatDate(validation.createdAt)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Veces Validada</p>
                <p className="text-lg font-bold text-green-800">{validation.validatedCount}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Hash de Validación</p>
                <p className="text-xs font-mono text-purple-800 break-all">{hash.substring(0, 16)}...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer informativo */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="text-center p-6">
            <p className="text-sm text-gray-600 mb-2">
              Esta validación utiliza tecnología de hash criptográfico SHA-256 para garantizar la autenticidad del
              documento.
            </p>
            <p className="text-xs text-gray-500">Sistema de validación AGPC - Todos los derechos reservados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
