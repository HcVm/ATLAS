"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
import { ChevronLeft, Save, Building2, Info, Package, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InternalCategoryCreatorDialog } from "@/components/ui/internal-category-creator-dialog"
import { ProductSimilarityDialog } from "@/components/product-similarity-dialog"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
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

  const [similarProducts, setSimilarProducts] = useState<any[]>([])
  const [showSimilarityDialog, setShowSimilarityDialog] = useState(false)
  const [selectedExistingProductId, setSelectedExistingProductId] = useState<string | null>(null)

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

  const checkSimilarProducts = async () => {
    if (!formData.name.trim() || !formData.category_id || !companyId) {
      return false
    }

    try {
      const response = await fetch("/api/internal-products/find-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category_id: formData.category_id,
          company_id: companyId,
        }),
      })

      if (!response.ok) {
        console.error("Error checking similar products")
        return false
      }

      const data = await response.json()

      if (data.similar_products && data.similar_products.length > 0) {
        setSimilarProducts(data.similar_products)
        setShowSimilarityDialog(true)
        return true
      }

      return false
    } catch (error) {
      console.error("Error checking similar products:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyId) {
      toast.error("No hay empresa seleccionada")
      return
    }

    if (!formData.name.trim() || !formData.account_id || !formData.acquisition_date) {
      toast.error("Por favor, completa todos los campos requeridos")
      return
    }

    if (formData.create_inventory_product && !formData.category_id) {
      toast.error("Selecciona una categoría de producto para el inventario")
      return
    }

    const quantity = Number.parseInt(formData.quantity) || 1
    if (quantity < 1) {
      toast.error("La cantidad debe ser al menos 1")
      return
    }

    if (formData.create_inventory_product && !selectedExistingProductId) {
      const foundSimilar = await checkSimilarProducts()
      if (foundSimilar) {
        // Dialog will handle the rest
        return
      }
    }

    // Proceed with creation
    await createFixedAsset()
  }

  const createFixedAsset = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/fixed-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          quantity: Number.parseInt(formData.quantity) || 1,
          use_existing_product_id: selectedExistingProductId,
          master_product_name: formData.name, // Use asset name as master product name
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear el activo fijo")
      }

      if (result.product_updated) {
        toast.success(
          `Activo fijo creado exitosamente. Stock agregado al producto existente. Costo promedio actualizado de S/ ${result.old_cost.toFixed(2)} a S/ ${result.new_cost.toFixed(2)}.`,
          { duration: 6000 },
        )
      } else if (result.serials && result.serials.length > 0) {
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

  const handleCreateNewProduct = () => {
    setShowSimilarityDialog(false)
    setSelectedExistingProductId(null)
    createFixedAsset()
  }

  const handleUseExistingProduct = (productId: string) => {
    setShowSimilarityDialog(false)
    setSelectedExistingProductId(productId)
    setTimeout(() => {
      createFixedAsset()
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 mt-10 w-full max-w-[95%] mx-auto"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <Button variant="outline" asChild className="bg-white/50 backdrop-blur-sm border-gray-200">
          <Link href="/warehouse/internal/fixed-assets">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Activos Fijos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Nuevo Activo Fijo
        </h1>
        <div className="w-[100px]" /> {/* Spacer for centering */}
      </motion.div>

      <ProductSimilarityDialog
        open={showSimilarityDialog}
        onOpenChange={setShowSimilarityDialog}
        similarProducts={similarProducts}
        newProductName={formData.name}
        newProductPrice={unitCost}
        onCreateNew={handleCreateNewProduct}
        onUseExisting={handleUseExistingProduct}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información básica */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-800">Información del Activo</CardTitle>
                <CardDescription>Datos básicos del activo fijo</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Nombre del Activo *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ej: Laptop HP ProBook 450 G9"
                      required
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_id" className="text-sm font-medium text-gray-700">
                      Cuenta Contable *
                    </Label>
                    <Select value={formData.account_id} onValueChange={handleAccountChange} required>
                      <SelectTrigger className="bg-white/50 border-gray-200 focus:ring-blue-500/20">
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
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descripción detallada del activo"
                      rows={3}
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="current_location" className="text-sm font-medium text-gray-700">
                      Ubicación
                    </Label>
                    <Input
                      id="current_location"
                      value={formData.current_location}
                      onChange={handleChange}
                      placeholder="Ej: Oficina Principal, Piso 2"
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_department_id" className="text-sm font-medium text-gray-700">
                      Departamento Asignado
                    </Label>
                    <Select
                      value={formData.assigned_department_id}
                      onValueChange={(value) => handleSelectChange("assigned_department_id", value)}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200 focus:ring-blue-500/20">
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
                    <Label htmlFor="acquisition_date" className="text-sm font-medium text-gray-700">
                      Fecha de Adquisición *
                    </Label>
                    <Input
                      id="acquisition_date"
                      type="date"
                      value={formData.acquisition_date}
                      onChange={handleChange}
                      required
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice_number" className="text-sm font-medium text-gray-700">
                      Número de Factura
                    </Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      placeholder="Ej: F001-0944"
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_ruc" className="text-sm font-medium text-gray-700">
                      RUC Proveedor
                    </Label>
                    <Input
                      id="supplier_ruc"
                      value={formData.supplier_ruc}
                      onChange={handleChange}
                      placeholder="Ej: 20123456789"
                      maxLength={11}
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_name" className="text-sm font-medium text-gray-700">
                      Nombre Proveedor
                    </Label>
                    <Input
                      id="supplier_name"
                      value={formData.supplier_name}
                      onChange={handleChange}
                      placeholder="Ej: Tech Solutions S.A.C."
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resumen de depreciación */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm h-full">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-800">Resumen de Depreciación</CardTitle>
                <CardDescription>Cálculo estimado basado en los datos ingresados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {selectedAccount && (
                  <Alert className="bg-blue-50 border-blue-100">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>{selectedAccount.code}</strong>
                      <br />
                      Tasa: {selectedAccount.depreciation_rate}% anual
                      <br />
                      Vida útil: {selectedAccount.useful_life_years} años
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Costo Total:</span>
                    <span className="font-semibold text-gray-900">
                      S/ {totalCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Costo Unitario:</span>
                    <span className="font-semibold text-gray-900">
                      S/ {unitCost.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Cantidad:</span>
                    <span className="font-semibold text-gray-900">{formData.quantity} unidad(es)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Valor Residual:</span>
                    <span className="font-semibold text-gray-900">
                      S/{" "}
                      {(Number.parseFloat(formData.salvage_value) || 0).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Base Depreciable:</span>
                    <span className="font-semibold text-gray-900">
                      S/{" "}
                      {(totalCost - (Number.parseFloat(formData.salvage_value) || 0)).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">Tasa Anual:</span>
                    <span className="font-semibold text-gray-900">{formData.depreciation_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between py-2 bg-orange-50 rounded-lg px-3 border border-orange-100">
                    <span className="text-orange-700 font-medium">Depre. Mensual Est.:</span>
                    <span className="font-bold text-orange-600">
                      S/ {estimatedMonthlyDep.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm border-blue-200">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-800">Integración con Inventario Interno</CardTitle>
                    <CardDescription>
                      Registra automáticamente el activo en el inventario interno con números de serie únicos
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-blue-100">
                  <Label htmlFor="create_inventory_product" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Crear en inventario
                  </Label>
                  <Switch
                    id="create_inventory_product"
                    checked={formData.create_inventory_product}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, create_inventory_product: checked }))
                    }
                  />
                </div>
              </div>
            </CardHeader>
            {formData.create_inventory_product && (
              <CardContent className="pt-6">
                <Alert className="mb-6 bg-blue-50 border-blue-100 text-blue-800">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="font-semibold">Detección Inteligente de Duplicados</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    El sistema verificará si existe un producto similar antes de crear uno nuevo. Podrás elegir agregar
                    stock al producto existente o crear uno independiente.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                      Cantidad de Unidades *
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="1"
                      required={formData.create_inventory_product}
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Número de unidades según factura</p>
                  </div>
                  <div>
                    <Label htmlFor="category_id" className="text-sm font-medium text-gray-700">
                      Categoría de Producto *
                    </Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleSelectChange("category_id", value)}
                      open={categorySelectOpen}
                      onOpenChange={setCategorySelectOpen}
                      required={formData.create_inventory_product}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5">
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
                              trigger={
                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                  + Crear Nueva Categoría
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Categoría para organizar en inventario</p>
                  </div>
                  <div>
                    <Label htmlFor="unit_of_measure" className="text-sm font-medium text-gray-700">
                      Unidad de Medida
                    </Label>
                    <Input
                      id="unit_of_measure"
                      value={formData.unit_of_measure}
                      onChange={handleChange}
                      placeholder="unidad"
                      className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">Formato de Series Generadas:</h4>
                  <code className="text-sm bg-white px-3 py-1.5 rounded border border-gray-200 font-mono text-gray-600 block w-fit">
                    [CÓDIGO_PRODUCTO]-AF[AÑO][CORR_ACTIVO]-S[CORR_SERIE]
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">Ejemplo: ARMTEC2025001-AF20250001-S0001</p>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Valores contables */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-800">Valores Contables</CardTitle>
              <CardDescription>
                Ingresa los valores de adquisición del activo. El costo total se calculará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
              <div>
                <Label htmlFor="initial_balance" className="text-sm font-medium text-gray-700">
                  Saldos Iniciales (S/)
                </Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor de activos existentes</p>
              </div>
              <div>
                <Label htmlFor="purchases" className="text-sm font-medium text-gray-700">
                  Compras del Período (S/)
                </Label>
                <Input
                  id="purchases"
                  type="number"
                  step="0.01"
                  value={formData.purchases}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Adquisiciones nuevas</p>
              </div>
              <div>
                <Label htmlFor="acquisition_cost" className="text-sm font-medium text-gray-700">
                  Costo Directo (S/)
                </Label>
                <Input
                  id="acquisition_cost"
                  type="number"
                  step="0.01"
                  value={formData.acquisition_cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Otros costos directos</p>
              </div>
              <div>
                <Label htmlFor="salvage_value" className="text-sm font-medium text-gray-700">
                  Valor Residual (S/)
                </Label>
                <Input
                  id="salvage_value"
                  type="number"
                  step="0.01"
                  value={formData.salvage_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor al final de vida útil</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Configuración de depreciación */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-sm">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-800">Configuración de Depreciación</CardTitle>
              <CardDescription>
                La tasa se establece automáticamente según la cuenta contable seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div>
                <Label htmlFor="depreciation_rate" className="text-sm font-medium text-gray-700">
                  Tasa de Depreciación Anual (%)
                </Label>
                <Input
                  id="depreciation_rate"
                  type="number"
                  step="0.01"
                  value={formData.depreciation_rate}
                  onChange={handleChange}
                  placeholder="10.00"
                  min="0"
                  max="100"
                  className="bg-white/50 border-gray-200 focus:ring-blue-500/20 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Según normativa peruana de la Ley del Impuesto a la Renta
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Tasas de Depreciación (Perú)</h4>
                <ul className="text-xs text-blue-800 space-y-1">
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

        <motion.div variants={itemVariants} className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="bg-white hover:bg-gray-50 border-gray-200"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear Activo Fijo
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
