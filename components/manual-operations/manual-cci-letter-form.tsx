"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Calendar } from "lucide-react"
import { generateCCILetter } from "@/lib/cci-letter-generator"

interface ManualCCILetterFormProps {
  onSuccess?: () => void
}

export default function ManualCCILetterForm({ onSuccess }: ManualCCILetterFormProps) {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    clientName: "",
    clientRuc: "",
    clientAddress: "",
    orderType: "OCAM", // OCAM o OC
    orderNumber: "",
    showPhysicalOrder: false,
    showSIAF: false,
    documentDate: new Date().toISOString().split("T")[0], // Initialize with today's date
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.clientName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente")
      return
    }

    if (!formData.clientRuc.trim()) {
      toast.error("Por favor ingresa el RUC del cliente")
      return
    }

    if (!formData.clientAddress.trim()) {
      toast.error("Por favor ingresa la dirección del cliente")
      return
    }

    if (!formData.orderNumber.trim()) {
      toast.error(`Por favor ingresa el número de ${formData.orderType}`)
      return
    }

    if (!selectedCompany) {
      toast.error("No se pudo obtener la información de la empresa")
      return
    }

    try {
      setLoading(true)
      toast.info("Generando carta CCI manual...")

      const [year, month, day] = formData.documentDate.split("-").map(Number)
      const selectedDate = new Date(year, month - 1, day)

      // Generar la carta CCI
      await generateCCILetter({
        companyName: selectedCompany.name,
        companyRuc: selectedCompany.ruc || "",
        companyCode: selectedCompany.code || "",
        letterNumber: `${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`,
        clientName: formData.clientName,
        clientRuc: formData.clientRuc,
        clientAddress: formData.clientAddress,
        ocam: formData.orderType === "OCAM" ? formData.orderNumber : null,
        oc: formData.orderType === "OC" ? formData.orderNumber : null,
        siaf: formData.showSIAF ? "N/A" : null,
        physical_order: formData.showPhysicalOrder ? "N/A" : null,
        createdBy: user?.full_name || "Usuario",
        customDate: selectedDate, // Pass the selected date to the generator
      })

      toast.success("Carta CCI generada exitosamente")
      onSuccess?.()

      // Limpiar formulario
      setFormData({
        clientName: "",
        clientRuc: "",
        clientAddress: "",
        orderType: "OCAM",
        orderNumber: "",
        showPhysicalOrder: false,
        showSIAF: false,
        documentDate: new Date().toISOString().split("T")[0],
      })
    } catch (error: any) {
      console.error("Error generating CCI letter:", error)
      toast.error("Error al generar la carta CCI: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del Cliente */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Información del Cliente</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Ingresa los datos del cliente para la carta CCI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clientName" className="text-slate-700 dark:text-slate-200 font-medium">
              Nombre del Cliente *
            </Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="Ej: CORTE SUPERIOR DE JUSTICIA DE LA LIBERTAD"
              value={formData.clientName}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="clientRuc" className="text-slate-700 dark:text-slate-200 font-medium">
              RUC del Cliente *
            </Label>
            <Input
              id="clientRuc"
              name="clientRuc"
              placeholder="Ej: 20477550420"
              value={formData.clientRuc}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="clientAddress" className="text-slate-700 dark:text-slate-200 font-medium">
              Dirección del Cliente *
            </Label>
            <Input
              id="clientAddress"
              name="clientAddress"
              placeholder="Ej: JR. BOLÍVAR NRO. 547 CENTRO DE TRUJILLO LA LIBERTAD - TRUJILLO"
              value={formData.clientAddress}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Tipo de Orden */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Tipo de Orden</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Selecciona el tipo de orden y proporciona su número
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formData.orderType}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, orderType: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OCAM" id="ocam" />
              <Label htmlFor="ocam" className="text-slate-700 dark:text-slate-200 font-medium cursor-pointer">
                OCAM (Orden de Compra Acuerdo Marco)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OC" id="oc" />
              <Label htmlFor="oc" className="text-slate-700 dark:text-slate-200 font-medium cursor-pointer">
                OC (Orden de Compra)
              </Label>
            </div>
          </RadioGroup>

          <div>
            <Label htmlFor="orderNumber" className="text-slate-700 dark:text-slate-200 font-medium">
              Número de {formData.orderType} *
            </Label>
            <Input
              id="orderNumber"
              name="orderNumber"
              placeholder={`Ej: ${formData.orderType === "OCAM" ? "SRG-0284-2025" : "OC-001-2025"}`}
              value={formData.orderNumber}
              onChange={handleInputChange}
              className="mt-2"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Fecha del Documento</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Selecciona la fecha que aparecerá en la carta CCI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="documentDate" className="text-slate-700 dark:text-slate-200 font-medium">
              Fecha del Documento *
            </Label>
            <div className="relative mt-2">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="documentDate"
                name="documentDate"
                type="date"
                value={formData.documentDate}
                onChange={handleInputChange}
                className="pl-10"
                required
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Esta fecha aparecerá en el documento PDF generado. Puedes seleccionar cualquier fecha según tus
              necesidades.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campos Opcionales */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">Campos Opcionales</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Selecciona qué campos adicionales deseas que aparezcan en la carta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showPhysicalOrder"
              checked={formData.showPhysicalOrder}
              onCheckedChange={(checked) => handleCheckboxChange("showPhysicalOrder", checked as boolean)}
            />
            <Label
              htmlFor="showPhysicalOrder"
              className="text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              Mostrar campo "Orden Física"
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showSIAF"
              checked={formData.showSIAF}
              onCheckedChange={(checked) => handleCheckboxChange("showSIAF", checked as boolean)}
            />
            <Label htmlFor="showSIAF" className="text-slate-700 dark:text-slate-200 font-medium cursor-pointer">
              Mostrar campo "SIAF"
            </Label>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">
            Si no seleccionas estos campos, no aparecerán en la carta. Si los seleccionas, aparecerán con el valor
            "N/A".
          </p>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="bg-slate-800 hover:bg-slate-700 text-white">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            "Generar Carta CCI"
          )}
        </Button>
      </div>
    </form>
  )
}
