"use client"

import type React from "react"

import { useState } from "react"
import { Search, CheckCircle2, XCircle, Clock, Package, Shield, Phone, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ValidationResult {
  isValid: boolean
  isDelivered?: boolean
  serialNumber?: string
  productName?: string
  productCode?: string
  brandName?: string
  deliveryDate?: string
  warrantyExpirationDate?: string
  isWarrantyActive?: boolean
  remainingDays?: number
  remainingMonths?: number
  message: string
}

export function SerialValidator() {
  const [serialNumber, setSerialNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const handleValidate = async () => {
    if (!serialNumber.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/validate-serial?serial=${encodeURIComponent(serialNumber.trim())}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        isValid: false,
        message: "Error al validar el número de serie",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleValidate()
    }
  }

  const getContactInfo = (brandName?: string) => {
    if (!brandName) return null

    const brand = brandName.toUpperCase()
    if (brand === "WORLDLIFE" || brand === "HOPE LIFE") {
      return {
        phone1: "01-748 3677 ANEXO 102",
        phone2: "940959514",
      }
    } else if (brand === "ZEUS" || brand === "VALHALLA") {
      return {
        phone1: "01-748 2242",
        phone2: "940930710",
      }
    }
    return null
  }

  const contactInfo = result?.brandName ? getContactInfo(result.brandName) : null

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Ingresa tu número de serie..."
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 h-12 text-base"
          />
        </div>
        <Button onClick={handleValidate} disabled={isLoading || !serialNumber.trim()} size="lg" className="px-8">
          {isLoading ? "Validando..." : "Validar"}
        </Button>
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          La información sobre garantía proporcionada es aproximada y no específica. Para información precisa sobre su
          garantía, por favor comuníquese con nosotros.
        </AlertDescription>
      </Alert>

      {result && (
        <Card
          className={`border-2 transition-all duration-300 ${
            result.isValid
              ? result.isWarrantyActive
                ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                : "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
              : "border-red-500 bg-red-50/50 dark:bg-red-950/20"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-full p-3 ${
                  result.isValid
                    ? result.isWarrantyActive
                      ? "bg-green-100 dark:bg-green-900/40"
                      : "bg-orange-100 dark:bg-orange-900/40"
                    : "bg-red-100 dark:bg-red-900/40"
                }`}
              >
                {result.isValid ? (
                  result.isWarrantyActive ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  )
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      result.isValid
                        ? result.isWarrantyActive
                          ? "text-green-900 dark:text-green-100"
                          : "text-orange-900 dark:text-orange-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {result.message}
                  </h3>
                  {result.isValid && result.serialNumber && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Número de serie: <span className="font-mono font-medium">{result.serialNumber}</span>
                    </p>
                  )}
                </div>

                {result.isValid && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-green-500 dark:border-green-600">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full">
                        <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          Producto Original Certificado
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Este número de serie está registrado en nuestro sistema oficial
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.isValid && result.productName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{result.productName}</span>
                    {result.productCode && <span className="text-muted-foreground">({result.productCode})</span>}
                  </div>
                )}

                {result.isDelivered && result.deliveryDate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t dark:border-gray-700">
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha de entrega</p>
                      <p className="text-sm font-medium">
                        {new Date(result.deliveryDate).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {result.isWarrantyActive ? "Garantía válida hasta" : "Garantía expiró el"}
                      </p>
                      <p className="text-sm font-medium">
                        {result.warrantyExpirationDate &&
                          new Date(result.warrantyExpirationDate).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                      </p>
                    </div>
                  </div>
                )}

                {result.isWarrantyActive && result.remainingMonths !== undefined && (
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border dark:border-gray-700">
                    <p className="text-sm">
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {result.remainingMonths} {result.remainingMonths === 1 ? "mes" : "meses"}
                      </span>{" "}
                      y{" "}
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {result.remainingDays! % 30} {result.remainingDays! % 30 === 1 ? "día" : "días"}
                      </span>{" "}
                      de garantía restante (aproximado)
                    </p>
                  </div>
                )}

                {result.isValid && contactInfo && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">
                          Para información precisa sobre garantía
                        </p>
                        <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                          <p>
                            📞 <span className="font-medium">{contactInfo.phone1}</span>
                          </p>
                          <p>
                            📱 <span className="font-medium">{contactInfo.phone2}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
