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
import { Plus, Search, Package, MoreHorizontal, Move, Zap, Building2, Monitor, Armchair, Laptop, Printer, LibraryBig } from "lucide-react"
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

// Definición de tipos de espacios en el plano
type LayoutItemType = 'desk' | 'shelf' | 'printer';

interface LayoutItem {
  type: LayoutItemType;
  x: number;
  y: number;
  rotation: number;
}

function FloorPlanVisualization({
  department,
  furnitureCount,
  equipmentCount,
  maxCount = 50,
}: {
  department: Department
  furnitureCount: number
  equipmentCount: number
  maxCount?: number
}) {
  // Calculamos el porcentaje basado en la mayor cantidad de items (no la suma)
  // para que la barra de progreso tenga sentido con la superposición.
  const maxItems = Math.max(furnitureCount, equipmentCount);
  const fillPercentage = Math.min((maxItems / maxCount) * 100, 100);
  
  const deptColor = department.color || "#3b82f6";
  const wallColor = "currentColor"; 
  const machineColor = "#334155"; 

  // LAYOUT (Mismas coordenadas)
  const officeLayout: LayoutItem[] = [
    // Isleta Izquierda
    { type: 'desk', x: 20, y: 25, rotation: 0 }, { type: 'desk', x: 50, y: 25, rotation: 0 },
    { type: 'desk', x: 20, y: 75, rotation: 0 }, { type: 'desk', x: 50, y: 75, rotation: 0 },
    // Estantería superior (Solo mobiliario)
    { type: 'shelf', x: 90, y: 15, rotation: 0 }, 
    { type: 'shelf', x: 125, y: 15, rotation: 0 },
    // Isleta Derecha
    { type: 'desk', x: 100, y: 60, rotation: -90 },
    { type: 'desk', x: 100, y: 90, rotation: -90 },
    { type: 'desk', x: 160, y: 70, rotation: 90 },
    // Impresora
    { type: 'printer', x: 160, y: 105, rotation: 0 },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative bg-white dark:bg-slate-950 rounded-lg border-2 border-slate-200 dark:border-slate-800 p-2 aspect-[4/3] w-full overflow-hidden">
        
        <svg viewBox="0 0 190 150" className="w-full h-full text-slate-400 dark:text-slate-600">
          
          {/* ARQUITECTURA */}
          <g fill="none" stroke={wallColor} strokeWidth="2" strokeLinecap="square">
            <path d="M 10 10 L 180 10 L 180 40" /> 
            <path d="M 180 60 L 180 140 L 10 140 L 10 10" /> 
            <path d="M 180 40 Q 160 40 160 60 L 180 60" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
            <line x1="180" y1="40" x2="180" y2="60" strokeWidth="1" opacity="0.3" />
            <text x="185" y="50" fontSize="5" stroke="none" fill="currentColor" opacity="0.5" transform="rotate(90 185 50)">ENTRADA</text>
          </g>

          {/* RENDERIZADO DE ÍTEMS */}
          {officeLayout.map((item, index) => {
            // --- NUEVA LÓGICA DE SUPERPOSICIÓN ---
            
            // 1. ¿Tiene silla/mueble este puesto?
            // Comparamos el índice actual directamente con la cantidad de mobiliario
            const hasFurniture = index < furnitureCount;

            // 2. ¿Tiene equipo este puesto?
            // Comparamos el índice actual directamente con la cantidad de equipos
            // (Nota: Los equipos se asignan primero a escritorios, ignorando estantes si se prefiere, 
            // pero para simplificar visualmente usamos el índice general)
            let hasEquipment = false;
            
            if (item.type === 'printer') {
               // La impresora es el último ítem (índice 11). Solo se enciende si tenemos muchos equipos
               // O podemos hacer que se encienda si hay AL MENOS 1 equipo en la sala.
               // Vamos a hacer que se encienda si el equipmentCount llega hasta su índice.
               hasEquipment = index < equipmentCount;
            } else if (item.type === 'desk') {
               hasEquipment = index < equipmentCount;
            }

            // ¿El puesto está activo (tiene algo)?
            const isActive = hasFurniture || hasEquipment;

            // Estilos
            const baseOpacity = isActive ? 1 : 0.3;
            const highlightStroke = isActive ? deptColor : wallColor;

            return (
              <g 
                key={index} 
                transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation})`}
                className="transition-all duration-500"
                opacity={baseOpacity}
              >
                {/* === ESCRITORIO === */}
                {item.type === 'desk' && (
                  <>
                    {/* Mesa */}
                    <rect x="0" y="0" width="24" height="14" rx="1" 
                          fill="white" className="dark:fill-slate-900" 
                          stroke={highlightStroke} strokeWidth="1" />
                    
                    {/* Silla (Solo si hasFurniture es true) */}
                    <path d="M 6 16 L 18 16 Q 18 20 12 20 Q 6 20 6 16" 
                          fill={hasFurniture ? deptColor : "none"} 
                          opacity={hasFurniture ? 0.5 : 0} 
                          stroke={hasFurniture ? highlightStroke : "none"} 
                          strokeWidth="1" />
                    
                    {/* Monitor (Solo si hasEquipment es true) - SE DIBUJA ENCIMA */}
                    {hasEquipment && (
                      <g transform="translate(5, 1)">
                        <line x1="7" y1="9" x2="7" y2="11" stroke={machineColor} strokeWidth="2" />
                        <line x1="4" y1="11" x2="10" y2="11" stroke={machineColor} strokeWidth="2" />
                        <rect x="0" y="0" width="14" height="9" rx="0.5" fill={machineColor} stroke={machineColor} strokeWidth="0.5" />
                        <rect x="1" y="1" width="12" height="7" rx="0" fill={deptColor} stroke="none" />
                      </g>
                    )}
                  </>
                )}

                {/* === ESTANTERÍA === */}
                {item.type === 'shelf' && (
                  <>
                    <rect x="0" y="0" width="30" height="8" fill="none" stroke={highlightStroke} strokeWidth="1.5" />
                    {/* Los estantes solo reaccionan a Mobiliario */}
                    {hasFurniture && (
                        <g stroke={deptColor} strokeWidth="1" fill={deptColor}>
                            <line x1="2" y1="4" x2="28" y2="4" opacity="0.5" />
                            <rect x="4" y="1" width="4" height="3" />
                            <rect x="10" y="1" width="6" height="3" />
                            <rect x="22" y="5" width="5" height="3" />
                        </g>
                    )}
                  </>
                )}

                {/* === IMPRESORA === */}
                {item.type === 'printer' && (
                  <g transform="translate(-2, -2)">
                    <rect x="0" y="4" width="20" height="12" rx="1" fill={machineColor} stroke={machineColor} strokeWidth="1" />
                    <rect x="2" y="0" width="16" height="4" rx="0.5" fill={machineColor} opacity="0.8" />
                    {/* Solo se ilumina si le toca turno por conteo de equipos */}
                    {hasEquipment && (
                      <>
                        <line x1="5" y1="16" x2="15" y2="16" stroke="white" strokeWidth="2" />
                        <circle cx="17" cy="7" r="1.5" fill={deptColor} stroke="white" strokeWidth="0.5" />
                      </>
                    )}
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* Etiqueta de Porcentaje */}
        <div className="absolute bottom-2 left-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded shadow-sm font-mono flex items-center gap-1 z-10">
          <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: deptColor }}/>
          {Math.round(fillPercentage)}% cap.
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="flex items-center text-slate-500"><Armchair className="w-3 h-3 mr-0.5 inline"/> {furnitureCount}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center text-slate-700 dark:text-slate-200 font-bold"><Monitor className="w-3 h-3 mr-0.5 inline"/> {equipmentCount}</span>
          </span>
          <span className="text-slate-400 text-[10px]">{maxCount} total</span>
        </div>
        
        {/* Barra Visual: Ahora usamos superposición visual también */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
          {/* Fondo para Mobiliario (Opacidad baja) */}
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ width: `${(furnitureCount / maxCount) * 100}%`, backgroundColor: deptColor, opacity: 0.3 }} 
          />
          {/* Barra para Equipos (Color sólido, se dibuja encima) */}
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ width: `${(equipmentCount / maxCount) * 100}%`, backgroundColor: deptColor, opacity: 1 }} 
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
              <FloorPlanVisualization 
                department={dept} 
                furnitureCount={dept.furnitureCount} 
                equipmentCount={dept.equipmentCount}
                maxCount={12} 
              />
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
