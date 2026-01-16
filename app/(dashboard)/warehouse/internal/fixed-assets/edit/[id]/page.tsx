"use client"

import type React from "react"
import { useState, useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Save, Building2, Info, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { motion } from "framer-motion"

interface FixedAssetAccount {
  id: string
  code: string
  name: string
  depreciation_rate: number
  useful_life_years: number
}

interface Department {
  id: string
  name: string
}

interface FixedAsset {
  id: string
  code: string
  name: string
  description: string | null
  account_id: string
  acquisition_date: string
  invoice_number: string | null
  supplier_ruc: string | null
  supplier_name: string | null
  acquisition_cost: number
  initial_balance: number
  purchases: number
  salvage_value: number
  depreciation_rate: number
  current_location: string | null
  assigned_department_id: string | null
  status: string
  accumulated_depreciation: number
  book_value: number
}

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "retired", label: "Retirado" },
  { value: "sold", label: "Vendido" },
  { value: "damaged", label: "Dañado" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function EditFixedAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [accounts, setAccounts] = useState<FixedAssetAccount[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<FixedAssetAccount | null>(null)
  const [originalAsset, setOriginalAsset] = useState<FixedAsset | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    account_id: "",
    acquisition_date: "",
    invoice_number: "",
    supplier_ruc: "",
    supplier_name: "",
    initial_balance: "",
    purchases: "",
    acquisition_cost: "",
    salvage_value: "0",
    depreciation_rate: "",
    current_location: "",
    assigned_department_id: "",
    status: "active",
  })

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  useEffect(() => {
    if (companyId) {
      fetchData()
    }
  }, [companyId, resolvedParams.id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch the asset details
      const assetResponse = await fetch(`/api/fixed-assets/${resolvedParams.id}`)
      if (!assetResponse.ok) {
        toast.error("Error al cargar el activo fijo")
        router.push("/warehouse/internal/fixed-assets")
        return
      }
      const assetData = await assetResponse.json()
      setOriginalAsset(assetData)

      // Populate form with asset data
      setFormData({
        name: assetData.name || "",
        description: assetData.description || "",
        account_id: assetData.account_id || "",
        acquisition_date: assetData.acquisition_date?.split("T")[0] || "",
        invoice_number: assetData.invoice_number || "",
        supplier_ruc: assetData.supplier_ruc || "",
        supplier_name: assetData.supplier_name || "",
        initial_balance: assetData.initial_balance?.toString() || "0",
        purchases: assetData.purchases?.toString() || "0",
        acquisition_cost: "", // This is calculated, not directly used
        salvage_value: assetData.salvage_value?.toString() || "0",
        depreciation_rate: assetData.depreciation_rate?.toString() || "",
        current_location: assetData.current_location || "",
        assigned_department_id: assetData.assigned_department_id || "",
        status: assetData.status || "active",
      })

      // Fetch accounts
      const accountsResponse = await fetch(`/api/fixed-assets/accounts?companyId=${companyId}`)
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData)

        // Set selected account
        const account = accountsData.find((a: FixedAssetAccount) => a.id === assetData.account_id)
        setSelectedAccount(account || null)
      }

      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name")

      if (!deptError) {
        setDepartments(deptData || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    setSelectedAccount(account || null)
    setFormData((prev) => ({
      ...prev,
      account_id: accountId,
      depreciation_rate: account?.depreciation_rate?.toString() || prev.depreciation_rate,
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  // Calcular el costo total de adquisición
  const totalCost = useMemo(() => {
    const initial = Number.parseFloat(formData.initial_balance) || 0
    const purchases = Number.parseFloat(formData.purchases) || 0
    return initial + purchases
  }, [formData.initial_balance, formData.purchases])

  // Calcular depreciación mensual estimada
  const estimatedMonthlyDep = useMemo(() => {
    const rate = Number.parseFloat(formData.depreciation_rate) || 0
    const salvage = Number.parseFloat(formData.salvage_value) || 0
    const depreciableBase = totalCost - salvage
    const annual = depreciableBase * (rate / 100)
    return annual / 12
  }, [totalCost, formData.depreciation_rate, formData.salvage_value])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.name.trim() || !formData.account_id || !formData.acquisition_date) {
      toast.error("Por favor, completa todos los campos requeridos")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/fixed-assets/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          account_id: formData.account_id,
          acquisition_date: formData.acquisition_date,
          invoice_number: formData.invoice_number || null,
          supplier_ruc: formData.supplier_ruc || null,
          supplier_name: formData.supplier_name || null,
          acquisition_cost: totalCost,
          initial_balance: Number.parseFloat(formData.initial_balance) || 0,
          purchases: Number.parseFloat(formData.purchases) || 0,
          salvage_value: Number.parseFloat(formData.salvage_value) || 0,
          depreciation_rate: Number.parseFloat(formData.depreciation_rate) || 0,
          current_location: formData.current_location || null,
          assigned_department_id: formData.assigned_department_id || null,
          status: formData.status,
          // Recalculate book value
          book_value: totalCost - (originalAsset?.accumulated_depreciation || 0),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar el activo fijo")
      }

      toast.success("Activo fijo actualizado exitosamente")
      router.push(`/warehouse/internal/fixed-assets/${resolvedParams.id}`)
    } catch (error: any) {
      console.error("Error updating fixed asset:", error)
      toast.error(error.message || "No se pudo actualizar el activo fijo")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Building2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400 mb-2">
            <Link href={`/warehouse/internal/fixed-assets/${resolvedParams.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Activo
            </Link>
          </Button>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Editar Activo Fijo
          </h1>
        </div>
      </motion.div>

      {originalAsset && (
        <motion.div variants={itemVariants}>
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Código del Activo: {originalAsset.code}</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400/90">
              Este activo tiene una depreciación acumulada de S/{" "}
              {originalAsset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}. Los cambios
              en los valores contables afectarán el valor en libros pero no la depreciación ya registrada.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información básica */}
          <Card className="lg:col-span-2 border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Información del Activo</CardTitle>
              <CardDescription>Datos básicos del activo fijo</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Activo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ej: Laptop HP ProBook 450 G9"
                    required
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_id">Cuenta Contable *</Label>
                  <Select value={formData.account_id} onValueChange={handleAccountChange} required>
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name} ({account.depreciation_rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descripción detallada del activo"
                    rows={3}
                    className="bg-white/50 dark:bg-slate-800/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_location">Ubicación</Label>
                  <Input
                    id="current_location"
                    value={formData.current_location}
                    onChange={handleChange}
                    placeholder="Ej: Oficina Principal, Piso 2"
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_department_id">Departamento Asignado</Label>
                  <Select
                    value={formData.assigned_department_id}
                    onValueChange={(value) => handleSelectChange("assigned_department_id", value)}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="acquisition_date">Fecha de Adquisición *</Label>
                  <Input
                    id="acquisition_date"
                    type="date"
                    value={formData.acquisition_date}
                    onChange={handleChange}
                    required
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Número de Factura</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    placeholder="Ej: F001-0944"
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_ruc">RUC Proveedor</Label>
                  <Input
                    id="supplier_ruc"
                    value={formData.supplier_ruc}
                    onChange={handleChange}
                    placeholder="Ej: 20123456789"
                    maxLength={11}
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Nombre Proveedor</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleChange}
                    placeholder="Ej: Tech Solutions S.A.C."
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado del Activo</Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de depreciación */}
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-fit">
            <CardHeader>
              <CardTitle>Resumen de Depreciación</CardTitle>
              <CardDescription>Cálculo estimado basado en los datos ingresados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAccount && (
                <Alert className="bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800">
                  <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <AlertDescription className="text-indigo-800 dark:text-indigo-300 text-xs">
                    <strong>{selectedAccount.code}</strong>
                    <br />
                    Tasa: {selectedAccount.depreciation_rate}% anual
                    <br />
                    Vida útil: {selectedAccount.useful_life_years} años
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground text-sm">Costo Total:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    S/ {totalCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground text-sm">Valor Residual:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    S/{" "}
                    {(Number.parseFloat(formData.salvage_value) || 0).toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground text-sm">Base Depreciable:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    S/{" "}
                    {(totalCost - (Number.parseFloat(formData.salvage_value) || 0)).toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground text-sm">Tasa Anual:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formData.depreciation_rate || 0}%</span>
                </div>
                {originalAsset && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-muted-foreground text-sm">Depre. Acumulada:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        S/{" "}
                        {originalAsset.accumulated_depreciation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2">
                      <span className="font-medium text-sm text-emerald-900 dark:text-emerald-100">Valor en Libros:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        S/{" "}
                        {(totalCost - originalAsset.accumulated_depreciation).toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-2 bg-slate-100 dark:bg-slate-800/50 rounded px-2">
                  <span className="text-muted-foreground text-sm">Depre. Mensual Est.:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    S/ {estimatedMonthlyDep.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Valores contables */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Valores Contables</CardTitle>
              <CardDescription>
                Ingresa los valores de adquisición del activo. El costo total se calculará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="initial_balance">Saldos Iniciales (S/)</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 dark:bg-slate-800/50"
                />
                <p className="text-xs text-muted-foreground">Valor de activos existentes</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchases">Compras del Período (S/)</Label>
                <Input
                  id="purchases"
                  type="number"
                  step="0.01"
                  value={formData.purchases}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 dark:bg-slate-800/50"
                />
                <p className="text-xs text-muted-foreground">Adquisiciones nuevas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salvage_value">Valor Residual (S/)</Label>
                <Input
                  id="salvage_value"
                  type="number"
                  step="0.01"
                  value={formData.salvage_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 dark:bg-slate-800/50"
                />
                <p className="text-xs text-muted-foreground">Valor al final de vida útil</p>
              </div>
              <div className="flex items-end">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-full border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground mb-1">Costo Total Calculado</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    S/ {totalCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuración de depreciación */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Configuración de Depreciación</CardTitle>
              <CardDescription>
                La tasa se establece automáticamente según la cuenta contable seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="depreciation_rate">Tasa de Depreciación Anual (%)</Label>
                <Input
                  id="depreciation_rate"
                  type="number"
                  step="0.01"
                  value={formData.depreciation_rate}
                  onChange={handleChange}
                  placeholder="10.00"
                  min="0"
                  max="100"
                  className="bg-white/50 dark:bg-slate-800/50"
                />
                <p className="text-xs text-muted-foreground">
                  Según normativa peruana de la Ley del Impuesto a la Renta
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">Tasas de Depreciación (Perú)</h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Edificios: 5% anual (desde 01-01-2010)</li>
                  <li>• Vehículos de transporte: 20%</li>
                  <li>• Maquinaria y equipo: 10%</li>
                  <li>• Equipos de cómputo: 25%</li>
                  <li>• Muebles y enseres: 10%</li>
                  <li>• Otros bienes: 10%</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end gap-4 pb-10">
          <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-200 dark:border-slate-700">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
