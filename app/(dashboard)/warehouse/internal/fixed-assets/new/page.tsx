"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, Save, Building2, Info, Package, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InternalCategoryCreatorDialog } from "@/components/ui/internal-category-creator-dialog"

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

interface Category {
  id: string
  name: string
  color: string
}

export default function NewFixedAssetPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [accounts, setAccounts] = useState<FixedAssetAccount[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<FixedAssetAccount | null>(null)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    account_id: "",
    acquisition_date: new Date().toISOString().split("T")[0],
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
    quantity: "1",
    create_inventory_product: true,
    category_id: "",
    unit_of_measure: "unidad",
  })

  const companyId = useMemo(() => {
    return user?.role === "admin" ? selectedCompany?.id : user?.company_id
  }, [user, selectedCompany])

  useEffect(() => {
    if (companyId) {
      fetchData()
    }
  }, [companyId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch accounts
      const accountsResponse = await fetch(`/api/fixed-assets/accounts?companyId=${companyId}`)
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setAccounts(accountsData)
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

      const { data: catData, error: catError } = await supabase
        .from("internal_product_categories")
        .select("id, name, color")
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order("name")

      if (!catError) {
        setCategories(catData || [])
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
      depreciation_rate: account?.depreciation_rate?.toString() || "",
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
    setFormData((prev) => ({ ...prev, category_id: newCategory.id }))
    setCategorySelectOpen(false)
  }

  // Calcular el costo total de adquisición
  const totalCost = useMemo(() => {
    const initial = Number.parseFloat(formData.initial_balance) || 0
    const purchases = Number.parseFloat(formData.purchases) || 0
    const direct = Number.parseFloat(formData.acquisition_cost) || 0
    return initial + purchases + direct
  }, [formData.initial_balance, formData.purchases, formData.acquisition_cost])

  const unitCost = useMemo(() => {
    const qty = Number.parseInt(formData.quantity) || 1
    return totalCost / qty
  }, [totalCost, formData.quantity])

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

    if (!companyId) {
      toast.error("No hay empresa seleccionada")
      setIsSubmitting(false)
      return
    }

    if (!formData.name.trim() || !formData.account_id || !formData.acquisition_date) {
      toast.error("Por favor, completa todos los campos requeridos")
      setIsSubmitting(false)
      return
    }

    if (formData.create_inventory_product && !formData.category_id) {
      toast.error("Selecciona una categoría de producto para el inventario")
      setIsSubmitting(false)
      return
    }

    const quantity = Number.parseInt(formData.quantity) || 1
    if (quantity < 1) {
      toast.error("La cantidad debe ser al menos 1")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/fixed-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          quantity,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear el activo fijo")
      }

      if (result.serials && result.serials.length > 0) {
        toast.success(
          `Activo fijo creado exitosamente. Se generaron ${result.serials.length} unidades en el inventario interno.`,
          { duration: 5000 },
        )
      } else {
        toast.success("Activo fijo creado exitosamente")
      }

      router.push("/warehouse/internal/fixed-assets")
    } catch (error: any) {
      console.error("Error creating fixed asset:", error)
      toast.error(error.message || "No se pudo crear el activo fijo")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Building2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/warehouse/internal/fixed-assets">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Activos Fijos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Activo Fijo</h1>
        <div />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información básica */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información del Activo</CardTitle>
              <CardDescription>Datos básicos del activo fijo</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Activo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ej: Laptop HP ProBook 450 G9"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account_id">Cuenta Contable *</Label>
                  <Select value={formData.account_id} onValueChange={handleAccountChange} required>
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descripción detallada del activo"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="current_location">Ubicación</Label>
                  <Input
                    id="current_location"
                    value={formData.current_location}
                    onChange={handleChange}
                    placeholder="Ej: Oficina Principal, Piso 2"
                  />
                </div>
                <div>
                  <Label htmlFor="assigned_department_id">Departamento Asignado</Label>
                  <Select
                    value={formData.assigned_department_id}
                    onValueChange={(value) => handleSelectChange("assigned_department_id", value)}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="acquisition_date">Fecha de Adquisición *</Label>
                  <Input
                    id="acquisition_date"
                    type="date"
                    value={formData.acquisition_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">Número de Factura</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    placeholder="Ej: F001-0944"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_ruc">RUC Proveedor</Label>
                  <Input
                    id="supplier_ruc"
                    value={formData.supplier_ruc}
                    onChange={handleChange}
                    placeholder="Ej: 20123456789"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_name">Nombre Proveedor</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleChange}
                    placeholder="Ej: Tech Solutions S.A.C."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de depreciación */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Depreciación</CardTitle>
              <CardDescription>Cálculo estimado basado en los datos ingresados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAccount && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{selectedAccount.code}</strong>
                    <br />
                    Tasa: {selectedAccount.depreciation_rate}% anual
                    <br />
                    Vida útil: {selectedAccount.useful_life_years} años
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Costo Total:</span>
                  <span className="font-semibold">
                    S/ {totalCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Costo Unitario:</span>
                  <span className="font-semibold">
                    S/ {unitCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Cantidad:</span>
                  <span className="font-semibold">{formData.quantity} unidad(es)</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Valor Residual:</span>
                  <span className="font-semibold">
                    S/{" "}
                    {(Number.parseFloat(formData.salvage_value) || 0).toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Base Depreciable:</span>
                  <span className="font-semibold">
                    S/{" "}
                    {(totalCost - (Number.parseFloat(formData.salvage_value) || 0)).toLocaleString("es-PE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tasa Anual:</span>
                  <span className="font-semibold">{formData.depreciation_rate || 0}%</span>
                </div>
                <div className="flex justify-between py-2 bg-muted/50 rounded px-2">
                  <span className="text-muted-foreground">Depre. Mensual Est.:</span>
                  <span className="font-bold text-orange-600">
                    S/ {estimatedMonthlyDep.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>Integración con Inventario Interno</CardTitle>
                  <CardDescription>
                    Registra automáticamente el activo en el inventario interno con números de serie únicos
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="create_inventory_product" className="text-sm">
                  Crear en inventario
                </Label>
                <Switch
                  id="create_inventory_product"
                  checked={formData.create_inventory_product}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, create_inventory_product: checked }))}
                />
              </div>
            </div>
          </CardHeader>
          {formData.create_inventory_product && (
            <CardContent className="pt-6">
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Vinculación Automática</AlertTitle>
                <AlertDescription>
                  Al crear el activo fijo, se generará automáticamente un producto en el inventario interno con{" "}
                  <strong>{formData.quantity}</strong> número(s) de serie. Cada serial contendrá una referencia al
                  código del activo fijo para su trazabilidad.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="quantity">Cantidad de Unidades *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="1"
                    required={formData.create_inventory_product}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Número de unidades según factura</p>
                </div>
                <div>
                  <Label htmlFor="category_id">Categoría de Producto *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => handleSelectChange("category_id", value)}
                    open={categorySelectOpen}
                    onOpenChange={setCategorySelectOpen}
                    required={formData.create_inventory_product}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                      {companyId && (
                        <div className="p-1">
                          <InternalCategoryCreatorDialog
                            companyId={companyId}
                            onCategoryCreated={handleCategoryCreated}
                          />
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Categoría para organizar en inventario</p>
                </div>
                <div>
                  <Label htmlFor="unit_of_measure">Unidad de Medida</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => handleSelectChange("unit_of_measure", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {["unidad", "caja", "juego", "set", "kit"].map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit.charAt(0).toUpperCase() + unit.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Formato de Series Generadas:</h4>
                <code className="text-sm bg-background px-2 py-1 rounded">
                  [CÓDIGO_PRODUCTO]-AF[AÑO][CORR_ACTIVO]-S[CORR_SERIE]
                </code>
                <p className="text-xs text-muted-foreground mt-2">Ejemplo: ARMTEC2025001-AF20250001-S0001</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Valores contables */}
        <Card>
          <CardHeader>
            <CardTitle>Valores Contables</CardTitle>
            <CardDescription>
              Ingresa los valores de adquisición del activo. El costo total se calculará automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label htmlFor="initial_balance">Saldos Iniciales (S/)</Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                value={formData.initial_balance}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Valor de activos existentes</p>
            </div>
            <div>
              <Label htmlFor="purchases">Compras del Período (S/)</Label>
              <Input
                id="purchases"
                type="number"
                step="0.01"
                value={formData.purchases}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Adquisiciones nuevas</p>
            </div>
            <div>
              <Label htmlFor="acquisition_cost">Costo Directo (S/)</Label>
              <Input
                id="acquisition_cost"
                type="number"
                step="0.01"
                value={formData.acquisition_cost}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Otros costos directos</p>
            </div>
            <div>
              <Label htmlFor="salvage_value">Valor Residual (S/)</Label>
              <Input
                id="salvage_value"
                type="number"
                step="0.01"
                value={formData.salvage_value}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Valor al final de vida útil</p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de depreciación */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Depreciación</CardTitle>
            <CardDescription>
              La tasa se establece automáticamente según la cuenta contable seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
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
              />
              <p className="text-xs text-muted-foreground mt-1">
                Según normativa peruana de la Ley del Impuesto a la Renta
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Tasas de Depreciación (Perú)</h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear Activo Fijo"}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  )
}
