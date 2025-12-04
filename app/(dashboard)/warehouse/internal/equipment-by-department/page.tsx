"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Package, MoreHorizontal, Move, Zap, Building2 } from "lucide-react"
import Link from "next/link"

interface Department {
  id: string
  name: string
  color?: string
}

interface Equipment {
  id: string
  name: string
  code: string
  serial_number?: string
  current_location: string | null
  cost_price: number | null
  condition?: string
  is_serialized: boolean
  internal_product_categories?: {
    name: string
    color: string
  }
}

interface EquipmentWithDept extends Equipment {
  departmentId?: string
  departmentName?: string
}

interface DepartmentStats {
  id: string
  name: string
  color?: string
  count: number
  furnitureCount: number
  equipmentCount: number
  value: number
}

// Office Fill Visualization Component
function OfficeVisualization({
  department,
  count,
  maxCount = 12,
}: { department: Department; count: number; maxCount?: number }) {
  const fillPercentage = Math.min((count / maxCount) * 100, 100)
  const itemsToShow = Math.ceil((fillPercentage / 100) * maxCount)

  // Predefined irregular shapes (SVG paths) - like tetris pieces
  const shapes = [
    "M0,0 L2,0 L2,2 L0,2 Z", // square
    "M0,0 L3,0 L3,1 L0,1 Z", // rect horizontal
    "M0,0 L1,0 L1,3 L0,3 Z", // rect vertical
    "M0,0 L2,0 L2,1 L1,1 L1,2 L0,2 Z", // L shape
    "M1,0 L2,0 L2,2 L0,2 L0,1 L1,1 Z", // Z shape
    "M0,0 L2,0 L1,0 L1,2 L0,2 Z", // T shape
  ]

  // Create a packed layout with irregular items
  const shapeAssignment = Array.from({ length: maxCount }).map((_, idx) => shapes[idx % shapes.length])

  return (
    <div className="flex flex-col gap-2">
      {/* Compact visualization container */}
      <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 min-h-[120px] max-w-[300px]">
        {/* SVG grid with irregular shapes */}
        <svg viewBox="0 0 12 8" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Background grid (optional, subtle) */}
          <defs>
            <pattern id={`grid-${department.id}`} width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.02" />
            </pattern>
          </defs>
          <rect width="12" height="8" fill={`url(#grid-${department.id})`} />

          {/* Packed irregular shapes */}
          {Array.from({ length: maxCount }).map((_, idx) => {
            // Simple packing algorithm
            const col = idx % 4
            const row = Math.floor(idx / 4)
            const x = col * 3
            const y = row * 2.5

            return idx < itemsToShow ? (
              <g key={idx} transform={`translate(${x}, ${y})`}>
                <rect
                  width="2.8"
                  height="2.3"
                  rx="0.3"
                  fill={department.color || "#3b82f6"}
                  opacity="0.8"
                  stroke={department.color || "#3b82f6"}
                  strokeWidth="0.1"
                  className="transition-all duration-300"
                  style={{
                    filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.1))`,
                  }}
                />
                <text
                  x="1.4"
                  y="1.4"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[0.6px] fill-white font-bold pointer-events-none"
                  style={{ fontSize: "0.6px" }}
                >
                  ✓
                </text>
              </g>
            ) : (
              <g key={idx} transform={`translate(${x}, ${y})`} opacity="0.3">
                <rect
                  width="2.8"
                  height="2.3"
                  rx="0.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.08"
                  strokeDasharray="0.2,0.2"
                  className="text-slate-300 dark:text-slate-600"
                />
              </g>
            )
          })}
        </svg>

        {/* Percentage indicator */}
        <div className="absolute top-2 right-3 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded">
          {Math.round(fillPercentage)}%
        </div>
      </div>

      {/* Stats row */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{count} equipos</span>
          <span className="text-slate-500 dark:text-slate-400">{maxCount} máx</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${fillPercentage}%`,
              backgroundColor: department.color || "#3b82f6",
            }}
          />
        </div>
      </div>
    </div>
  )
}

function EquipmentCounter({
  department,
  furnitureCount,
  equipmentCount,
}: {
  department: Department
  furnitureCount: number
  equipmentCount: number
}) {
  return (
    <div className="flex gap-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Furniture Counter */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${department.color || "#3b82f6"}20` }}>
          <svg
            className="w-6 h-6"
            style={{ color: department.color || "#3b82f6" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {/* Chair/Furniture Icon */}
            <path d="M5 3h14v4H5V3zm0 6h14v8H5V9zm2 2v4h10v-4H7zm-2 6h14v2H5v-2z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mobiliario</span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{furnitureCount}</span>
        </div>
      </div>

      {/* Equipment Counter */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${department.color || "#3b82f6"}20` }}>
          <svg
            className="w-6 h-6"
            style={{ color: department.color || "#3b82f6" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {/* Desktop/Equipment Icon */}
            <path d="M4 3h16v12H4V3zm0 13h16v2H4v-2zm2 3h12v1H6v-1z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Equipos</span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{equipmentCount}</span>
        </div>
      </div>
    </div>
  )
}

export default function EquipmentByDepartmentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [equipment, setEquipment] = useState<EquipmentWithDept[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithDept | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [targetDept, setTargetDept] = useState<string>("")

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

      // Obtener departamentos
      const { data: deptsData, error: deptsError } = await supabase
        .from("departments")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (deptsError) throw deptsError

      // Obtener equipos - filtramos por categoría "Mobiliario y Equipos"
      const { data: productsData, error: productsError } = await supabase
        .from("internal_products")
        .select(
          `
          *,
          internal_product_categories (
            name,
            color
          )
        `,
        )
        .eq("company_id", companyId)
        .eq("is_active", true)
        .ilike("internal_product_categories.name", "%Mobiliario%")
        .order("name")

      if (productsError) throw productsError

      // Obtener seriales para equipos
      const equipmentWithSerials = await Promise.all(
        (productsData || []).map(async (product) => {
          if (product.is_serialized) {
            const { data: serialsData } = await supabase
              .from("internal_product_serials")
              .select("id, serial_number, status, current_location, condition")
              .eq("product_id", product.id)
              .eq("status", "in_stock")
              .eq("company_id", companyId)
              .order("created_at")

            return (serialsData || []).map((serial) => ({
              id: serial.id,
              name: product.name,
              code: product.code,
              serial_number: serial.serial_number,
              current_location: serial.current_location,
              cost_price: product.cost_price,
              condition: serial.condition,
              is_serialized: true,
              internal_product_categories: product.internal_product_categories,
            }))
          }
          return []
        }),
      )

      const flatEquipment = equipmentWithSerials.flat()

      // Enriquecer con información de departamento
      const enrichedEquipment = flatEquipment.map((eq) => {
        const dept = deptsData?.find((d) => d.id === eq.current_location)
        return {
          ...eq,
          departmentId: eq.current_location,
          departmentName: dept?.name || eq.current_location || "Sin asignar",
        }
      })

      setEquipment(enrichedEquipment)
      setDepartments(deptsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      const matchesSearch =
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eq.serial_number && eq.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesDept = selectedDept === "all" || eq.departmentId === selectedDept

      return matchesSearch && matchesDept
    })
  }, [equipment, searchTerm, selectedDept])

  const handleMoveEquipment = async () => {
    if (!selectedEquipment || !targetDept) {
      toast.error("Selecciona un departamento de destino")
      return
    }

    try {
      const { error } = await supabase
        .from("internal_product_serials")
        .update({ current_location: targetDept })
        .eq("id", selectedEquipment.id)

      if (error) throw error

      toast.success(`Equipo movido a ${departments.find((d) => d.id === targetDept)?.name}`)
      setShowMoveDialog(false)
      setSelectedEquipment(null)
      setTargetDept("")
      fetchData()
    } catch (error) {
      console.error("Error moving equipment:", error)
      toast.error("Error al mover el equipo")
    }
  }

  const departmentStats = useMemo(() => {
    return departments.map((dept) => {
      const deptEquipment = equipment.filter((eq) => eq.current_location === dept.id)
      const furnitureCount = deptEquipment.filter(
        (eq) =>
          eq.internal_product_categories?.name?.toLowerCase().includes("mobiliario") ||
          eq.internal_product_categories?.name?.toLowerCase().includes("furniture") ||
          eq.internal_product_categories?.name?.toLowerCase().includes("muebles"),
      ).length
      const equipmentCount = deptEquipment.length - furnitureCount
      const value = deptEquipment.reduce((sum, eq) => sum + (eq.cost_price || 0), 0)

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        count: deptEquipment.length,
        furnitureCount,
        equipmentCount,
        value,
      }
    })
  }, [departments, equipment])

  const unassignedCount = equipment.filter((eq) => !eq.departmentId).length

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold">Selecciona una Empresa</h2>
        <p className="text-muted-foreground mt-2">Por favor, selecciona una empresa para ver equipos.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Mobiliario y Equipos por Departamento
          </h1>
          <p className="text-muted-foreground mt-1">Visualiza y gestiona los equipos asignados a cada departamento</p>
        </div>
        <Button asChild>
          <Link href="/warehouse/internal/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Equipo
          </Link>
        </Button>
      </div>

      {/* Department Visualization Grid - More compact */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {departmentStats.map((dept) => (
          <Card
            key={dept.id}
            className="hover:shadow-lg transition-shadow cursor-pointer h-fit"
            onClick={() => setSelectedDept(dept.id)}
          >
            <CardHeader className="pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" style={{ color: dept.color || "#3b82f6" }} />
                  <span className="truncate">{dept.name}</span>
                </CardTitle>
                <CardDescription className="text-xs">S/ {dept.value.toFixed(2)}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <OfficeVisualization department={dept} count={dept.count} maxCount={12} />
              <EquipmentCounter
                department={dept}
                furnitureCount={dept.furnitureCount}
                equipmentCount={dept.equipmentCount}
              />
            </CardContent>
          </Card>
        ))}

        {/* Unassigned Equipment Card */}
        {unassignedCount > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-shadow h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">Sin Asignar</CardTitle>
              <CardDescription className="text-xs text-amber-800 dark:text-amber-200">
                {unassignedCount} pendientes
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800"
                onClick={() => setSelectedDept("unassigned")}
              >
                Ver Equipos
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar</CardTitle>
          <CardDescription>Encuentra equipos específicos por nombre, código o serial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código o serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {unassignedCount > 0 && <SelectItem value="unassigned">Sin asignar</SelectItem>}
                {departmentStats.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || "#3b82f6" }} />
                      {dept.name} ({dept.count})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Equipos</CardTitle>
          <CardDescription>{filteredEquipment.length} equipos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2" />
                        <p>No se encontraron equipos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono text-sm">{eq.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{eq.name}</div>
                          {eq.internal_product_categories && (
                            <div className="text-xs text-muted-foreground">{eq.internal_product_categories.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{eq.serial_number || "-"}</TableCell>
                      <TableCell>
                        {eq.departmentName && eq.departmentId ? (
                          <Badge variant="outline">
                            <div
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: eq.internal_product_categories?.color || "#6B7280" }}
                            />
                            {eq.departmentName}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sin asignar</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            eq.condition === "bueno"
                              ? "default"
                              : eq.condition === "regular"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {eq.condition || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>S/ {eq.cost_price ? eq.cost_price.toFixed(2) : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={showMoveDialog && selectedEquipment?.id === eq.id}
                          onOpenChange={setShowMoveDialog}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEquipment(eq)
                                    setTargetDept(eq.departmentId || "")
                                  }}
                                >
                                  <Move className="mr-2 h-4 w-4" /> Reasignar Departamento
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/warehouse/internal/products/${eq.id}`}>
                                  <Zap className="mr-2 h-4 w-4" /> Ver Detalles
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reasignar Equipo a Departamento</DialogTitle>
                              <DialogDescription>
                                {selectedEquipment?.name} ({selectedEquipment?.code})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select value={targetDept} onValueChange={setTargetDept}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowMoveDialog(false)
                                    setSelectedEquipment(null)
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={handleMoveEquipment}>Confirmar Reasignación</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
