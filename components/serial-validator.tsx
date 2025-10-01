"use client"

import type React from "react"

import { useState } from "react"
import { Search, CheckCircle2, XCircle, Clock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface ValidationResult {
  isValid: boolean
  isDelivered?: boolean
  serialNumber?: string
  productName?: string
  productCode?: string
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

      {result && (
        <Card
          className={`border-2 transition-all duration-300 ${
            result.isValid
              ? result.isWarrantyActive
                ? "border-green-500 bg-green-50/50"
                : "border-orange-500 bg-orange-50/50"
              : "border-red-500 bg-red-50/50"
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div
                className={`rounded-full p-3 ${
                  result.isValid ? (result.isWarrantyActive ? "bg-green-100" : "bg-orange-100") : "bg-red-100"
                }`}
              >
                {result.isValid ? (
                  result.isWarrantyActive ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-orange-600" />
                  )
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3
                    className={`text-lg font-semibold ${
                      result.isValid ? (result.isWarrantyActive ? "text-green-900" : "text-orange-900") : "text-red-900"
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

                {result.isValid && result.productName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{result.productName}</span>
                    {result.productCode && <span className="text-muted-foreground">({result.productCode})</span>}
                  </div>
                )}

                {result.isDelivered && result.deliveryDate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
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
                  <div className="bg-white/50 rounded-lg p-3 border">
                    <p className="text-sm">
                      <span className="font-semibold text-green-700">
                        {result.remainingMonths} {result.remainingMonths === 1 ? "mes" : "meses"}
                      </span>{" "}
                      y{" "}
                      <span className="font-semibold text-green-700">
                        {result.remainingDays! % 30} {result.remainingDays! % 30 === 1 ? "día" : "días"}
                      </span>{" "}
                      de garantía restante
                    </p>
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
