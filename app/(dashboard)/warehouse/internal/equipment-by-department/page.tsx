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
import { Plus, Search, Package, MoreHorizontal, Move, Zap, Building2, Monitor, Armchair, Printer } from "lucide-react"
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
  equipmentType?: EquipmentType
  status?: string
  assignedTo?: string
}

type EquipmentType =
  | "escritorio"
  | "silla"
  | "cpu"
  | "monitor"
  | "mouse"
  | "teclado"
  | "telefono"
  | "porta_cpu"
  | "ventilador"
  | "lector_dni"
  | "impresora"
  | "estante"
  | "laptop"
  | "otro"

interface EquipmentDetail {
  id: string
  name: string
  serial?: string
  assignedTo?: string
}

interface Workstation {
  id: string
  hasDesk: boolean
  hasChair: boolean
  hasCpu: boolean
  hasMonitor: boolean
  hasMouse: boolean
  hasKeyboard: boolean
  phones: number
  hasCpuHolder: boolean
  hasFan: boolean
  hasDniReader: boolean
  hasLaptop: boolean
  deskSerial?: string
  chairSerial?: string
  cpuSerial?: string
  monitorSerial?: string
  mouseSerial?: string
  keyboardSerial?: string
  phoneSerial?: string
  cpuHolderSerial?: string
  fanSerial?: string
  dniReaderSerial?: string
  laptopSerial?: string
}

interface DepartmentStats {
  id: string
  name: string
  color?: string
  count: number
  furnitureCount: number
  equipmentCount: number
  value: number
  desks: number
  chairs: number
  cpus: number
  monitors: number
  mice: number
  keyboards: number
  phones: number
  cpuHolders: number
  fans: number
  dniReaders: number
  printers: number
  shelves: number
  laptops: number
  workstations: Workstation[]
  printerDetails: EquipmentDetail[]
  shelfDetails: EquipmentDetail[]
}

function detectEquipmentType(name: string): EquipmentType {
  const lowerName = name.toLowerCase()

  if (lowerName.includes("escritorio") || lowerName.includes("mesa") || lowerName.includes("desk")) {
    return "escritorio"
  }
  if (lowerName.includes("silla") || lowerName.includes("chair") || lowerName.includes("asiento")) {
    return "silla"
  }
  if (
    (lowerName.includes("cpu") ||
      lowerName.includes("computador") ||
      lowerName.includes("pc") ||
      lowerName.includes("torre")) &&
    !lowerName.includes("porta") &&
    !lowerName.includes("soporte")
  ) {
    return "cpu"
  }
  if (lowerName.includes("monitor") || lowerName.includes("pantalla") || lowerName.includes("display")) {
    return "monitor"
  }
  if (lowerName.includes("mouse") || lowerName.includes("ratón") || lowerName.includes("raton")) {
    return "mouse"
  }
  if (lowerName.includes("teclado") || lowerName.includes("keyboard")) {
    return "teclado"
  }
  if (
    lowerName.includes("teléfono") ||
    lowerName.includes("telefono") ||
    lowerName.includes("phone") ||
    lowerName.includes("anexo")
  ) {
    return "telefono"
  }
  if (
    lowerName.includes("porta cpu") ||
    lowerName.includes("portacpu") ||
    lowerName.includes("soporte cpu") ||
    lowerName.includes("cpu holder")
  ) {
    return "porta_cpu"
  }
  if (lowerName.includes("ventilador") || lowerName.includes("fan") || lowerName.includes("cooler")) {
    return "ventilador"
  }
  if (
    lowerName.includes("lector") &&
    (lowerName.includes("dni") || lowerName.includes("tarjeta") || lowerName.includes("card"))
  ) {
    return "lector_dni"
  }
  if (lowerName.includes("impresora") || lowerName.includes("printer") || lowerName.includes("multifuncional")) {
    return "impresora"
  }
  if (
    lowerName.includes("estante") ||
    lowerName.includes("anaquel") ||
    lowerName.includes("shelf") ||
    lowerName.includes("repisa") ||
    lowerName.includes("archivador")
  ) {
    return "estante"
  }
  if (
    lowerName.includes("laptop") ||
    lowerName.includes("notebook") ||
    lowerName.includes("portatil") ||
    lowerName.includes("portátil")
  ) {
    return "laptop"
  }

  return "otro"
}

function shortenSerial(serial?: string, maxLength = 8): string {
  if (!serial) return ""
  if (serial.length <= maxLength) return serial
  return serial.slice(-maxLength)
}

function FloorPlanVisualization({
  department,
  stats,
  maxCount = 50,
}: {
  department: Department
  stats: DepartmentStats
  maxCount?: number
}) {
  const deptColor = department.color || "#3b82f6"
  const wallColor = "currentColor"
  const machineColor = "#334155"

  const desksPerRow = 6
  const numDesks = stats.desks
  const numRows = Math.ceil(numDesks / desksPerRow)

  const deskWidth = 28
  const deskHeight = 22
  const deskSpacingX = 32
  const deskSpacingY = 40 // Aumentado para dar espacio a los seriales
  const startX = 15
  const startY = 20

  const printerAreaX = startX + Math.min(desksPerRow, numDesks) * deskSpacingX + 20
  const printerWidth = 20
  const printerSpacing = 30 // Aumentado para seriales

  const shelfAreaY = 8
  const shelfWidth = 35
  const shelfSpacing = 40

  const viewBoxWidth = Math.max(200, printerAreaX + (stats.printers > 0 ? 50 : 10))
  const viewBoxHeight = Math.max(120, startY + numRows * deskSpacingY + 35)

  const workstations = stats.workstations

  const totalItems = stats.count
  const fillPercentage = Math.min((totalItems / maxCount) * 100, 100)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative bg-white dark:bg-slate-950 rounded-lg border-2 border-slate-200 dark:border-slate-800 p-2 aspect-[4/3] w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full text-slate-400 dark:text-slate-600"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Paredes de la oficina */}
          <rect
            x="5"
            y="5"
            width={viewBoxWidth - 10}
            height={viewBoxHeight - 10}
            fill="none"
            stroke={deptColor}
            strokeWidth="2"
            strokeDasharray="none"
            rx="3"
            opacity="0.4"
          />

          

          {/* ESTANTES (Área superior) */}
          {stats.shelfDetails.map((shelf, idx) => {
            const shelfX = startX + idx * shelfSpacing
            const shelfY = shelfAreaY

            return (
              <g key={`shelf-${idx}`} transform={`translate(${shelfX}, ${shelfY})`}>
                <rect x="0" y="0" width={shelfWidth} height="8" rx="1" fill={machineColor} opacity="0.7" />
                <g fill="#94a3b8">
                  <rect x="2" y="2" width="6" height="4" />
                  <rect x="10" y="2" width="8" height="4" />
                  <rect x="20" y="2" width="4" height="4" />
                  <rect x="26" y="2" width="6" height="4" />
                </g>
                {shelf.serial && (
                  <text
                    x={shelfWidth / 2}
                    y="14"
                    fontSize="3"
                    fill={deptColor}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {shortenSerial(shelf.serial, 10)}
                  </text>
                )}
              </g>
            )
          })}

          {/* ESCRITORIOS / PUESTOS DE TRABAJO */}
          {workstations.map((ws, idx) => {
            const row = Math.floor(idx / desksPerRow)
            const col = idx % desksPerRow
            const x = startX + col * deskSpacingX
            const y = startY + (stats.shelves > 0 ? 15 : 0) + row * deskSpacingY

            const isActive = ws.hasDesk || ws.hasChair || ws.hasMonitor || ws.hasCpu || ws.hasLaptop
            const baseOpacity = isActive ? 1 : 0.2

            const mainSerial = ws.monitorSerial || ws.laptopSerial || ws.cpuSerial || ws.deskSerial

            return (
              <g
                key={ws.id}
                transform={`translate(${x}, ${y})`}
                className="transition-all duration-500"
                opacity={baseOpacity}
              >
                {/* Mesa / Escritorio */}
                <rect
                  x="0"
                  y="0"
                  width={deskWidth}
                  height={deskHeight - 8}
                  rx="1"
                  fill={ws.hasDesk ? "white" : "transparent"}
                  className="dark:fill-slate-900"
                  stroke={ws.hasDesk ? deptColor : wallColor}
                  strokeWidth={ws.hasDesk ? "1.5" : "0.5"}
                  strokeDasharray={ws.hasDesk ? "none" : "2,2"}
                />

                {/* Silla */}
                {ws.hasChair && (
                  <g transform={`translate(${deskWidth / 2 - 6}, ${deskHeight - 6})`}>
                    <ellipse cx="6" cy="3" rx="6" ry="3" fill={deptColor} opacity="0.4" />
                    <rect x="2" y="0" width="8" height="4" rx="2" fill={deptColor} opacity="0.6" />
                  </g>
                )}

                {/* Monitor */}
                {ws.hasMonitor && !ws.hasLaptop && (
                  <g transform="translate(7, 1)">
                    <rect x="0" y="0" width="14" height="9" rx="0.5" fill={machineColor} />
                    <rect x="1" y="1" width="12" height="7" rx="0.5" fill={deptColor} opacity="0.8" />
                    <line x1="7" y1="9" x2="7" y2="11" stroke={machineColor} strokeWidth="2" />
                    <line x1="4" y1="11" x2="10" y2="11" stroke={machineColor} strokeWidth="1.5" />
                  </g>
                )}

                {/* Laptop */}
                {ws.hasLaptop && (
                  <g transform="translate(5, 2)">
                    <rect x="0" y="4" width="18" height="8" rx="0.5" fill={machineColor} />
                    <rect x="0" y="0" width="18" height="5" rx="0.5" fill={deptColor} opacity="0.9" />
                    <rect x="1" y="1" width="16" height="3" fill="white" opacity="0.3" />
                  </g>
                )}

                {/* CPU */}
                {ws.hasCpu && (
                  <g transform={`translate(${deskWidth + 1}, 2)`}>
                    <rect x="0" y="0" width="5" height="10" rx="0.5" fill={machineColor} />
                    <circle cx="2.5" cy="2" r="1" fill={deptColor} />
                    <rect x="1" y="5" width="3" height="0.5" fill="#666" />
                    <rect x="1" y="7" width="3" height="0.5" fill="#666" />
                  </g>
                )}

                {/* Teclado */}
                {ws.hasKeyboard && (
                  <g transform="translate(6, 10)">
                    <rect x="0" y="0" width="16" height="3" rx="0.5" fill="#444" />
                    {[...Array(8)].map((_, i) => (
                      <rect key={i} x={1 + i * 1.8} y="0.5" width="1.2" height="0.8" rx="0.2" fill="#666" />
                    ))}
                    {[...Array(7)].map((_, i) => (
                      <rect key={i} x={1.5 + i * 1.8} y="1.8" width="1.2" height="0.8" rx="0.2" fill="#666" />
                    ))}
                  </g>
                )}

                {/* Mouse */}
                {ws.hasMouse && (
                  <g transform="translate(23, 10)">
                    <ellipse cx="2" cy="1.5" rx="2" ry="1.5" fill="#444" />
                    <line x1="2" y1="0.5" x2="2" y2="1" stroke="#666" strokeWidth="0.5" />
                  </g>
                )}

                {/* Teléfono */}
                {ws.phones > 0 && (
                  <g transform="translate(1, 1)">
                    <rect x="0" y="0" width="5" height="4" rx="0.5" fill="#1e293b" />
                    <rect x="0.5" y="0.5" width="4" height="2" fill="#0ea5e9" opacity="0.6" />
                    <rect x="1" y="3" width="3" height="0.5" fill="#666" />
                  </g>
                )}

                {/* Lector DNI */}
                {ws.hasDniReader && (
                  <g transform="translate(1, 6)">
                    <rect x="0" y="0" width="4" height="3" rx="0.3" fill="#059669" />
                    <rect x="0.5" y="0.5" width="3" height="1" fill="#34d399" opacity="0.6" />
                  </g>
                )}

                {/* Ventilador */}
                {ws.hasFan && (
                  <g transform={`translate(${deskWidth - 4}, 0)`}>
                    <circle cx="2" cy="2" r="2" fill="none" stroke="#64748b" strokeWidth="0.5" />
                    <circle cx="2" cy="2" r="0.5" fill="#64748b" />
                    <line x1="2" y1="0.5" x2="2" y2="1.5" stroke="#64748b" strokeWidth="0.3" />
                    <line x1="0.5" y1="2" x2="1.5" y2="2" stroke="#64748b" strokeWidth="0.3" />
                    <line x1="2" y1="2.5" x2="2" y2="3.5" stroke="#64748b" strokeWidth="0.3" />
                    <line x1="2.5" y1="2" x2="3.5" y2="2" stroke="#64748b" strokeWidth="0.3" />
                  </g>
                )}

                {/* Porta CPU */}
                {ws.hasCpuHolder && ws.hasCpu && (
                  <g transform={`translate(${deskWidth}, 11)`}>
                    <rect x="0" y="0" width="7" height="2" rx="0.3" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                  </g>
                )}

                {mainSerial && isActive && (
                  <text
                    x={deskWidth / 2}
                    y={deskHeight + 4}
                    fontSize="3"
                    fill={deptColor}
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {shortenSerial(mainSerial, 12)}
                  </text>
                )}
              </g>
            )
          })}

          {/* IMPRESORAS (Área lateral) */}
          {stats.printerDetails.map((printer, idx) => {
            const printerX = viewBoxWidth - 30
            const printerY = startY + (stats.shelves > 0 ? 15 : 0) + idx * printerSpacing

            return (
              <g key={`printer-${idx}`} transform={`translate(${printerX}, ${printerY})`}>
                <rect x="0" y="4" width={printerWidth} height="12" rx="1" fill={machineColor} />
                <rect x="2" y="0" width={printerWidth - 4} height="4" rx="0.5" fill={machineColor} opacity="0.8" />
                <line x1="5" y1="16" x2="15" y2="16" stroke="white" strokeWidth="2" />
                <circle cx={printerWidth - 3} cy="7" r="1.5" fill={deptColor} />
                <text x={printerWidth / 2} y="22" fontSize="3" fill="currentColor" textAnchor="middle" opacity="0.7">
                  IMP {idx + 1}
                </text>
                {printer.serial && (
                  <text
                    x={printerWidth / 2}
                    y="26"
                    fontSize="2.5"
                    fill={deptColor}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {shortenSerial(printer.serial, 10)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Etiqueta de Porcentaje */}
        <div className="absolute bottom-2 left-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded shadow-sm font-mono flex items-center gap-1 z-10">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: deptColor }} />
          {Math.round(fillPercentage)}% cap.
        </div>
      </div>

      {/* Barra de progreso con detalles */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="flex items-center text-slate-500">
              <Armchair className="w-3 h-3 mr-0.5 inline" /> {stats.furnitureCount}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center text-slate-700 dark:text-slate-200 font-bold">
              <Monitor className="w-3 h-3 mr-0.5 inline" /> {stats.equipmentCount}
            </span>
          </span>
          <span className="text-slate-400 text-[10px]">{maxCount} máx</span>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
          <div
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ width: `${(stats.furnitureCount / maxCount) * 100}%`, backgroundColor: deptColor, opacity: 0.3 }}
          />
          <div
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ width: `${(stats.equipmentCount / maxCount) * 100}%`, backgroundColor: deptColor, opacity: 1 }}
          />
        </div>
      </div>
    </div>
  )
}

function EquipmentCounter({
  department,
  stats,
}: {
  department: Department
  stats: DepartmentStats
}) {
  return (
    <div className="flex gap-4 p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${department.color || "#3b82f6"}20` }}>
          <Armchair className="w-4 h-4" style={{ color: department.color || "#3b82f6" }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Mobiliario</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{stats.furnitureCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${department.color || "#3b82f6"}20` }}>
          <Monitor className="w-4 h-4" style={{ color: department.color || "#3b82f6" }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Equipos</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{stats.equipmentCount}</span>
        </div>
      </div>

      {stats.printers > 0 && (
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${department.color || "#3b82f6"}20` }}>
            <Printer className="w-4 h-4" style={{ color: department.color || "#3b82f6" }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Impresoras</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{stats.printers}</span>
          </div>
        </div>
      )}
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

      const { data: deptsData, error: deptsError } = await supabase
        .from("departments")
        .select("id, name, color")
        .eq("company_id", companyId)
        .order("name")

      if (deptsError) throw deptsError

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
        .order("name")

      if (productsError) throw productsError

      const relevantProducts = (productsData || []).filter((product) => {
        const categoryName = product.internal_product_categories?.name?.toLowerCase() || ""
        return (
          categoryName.includes("mobiliario") ||
          categoryName.includes("tecnolog") ||
          categoryName.includes("equipo") ||
          categoryName.includes("oficina") ||
          categoryName.includes("computo") ||
          categoryName.includes("cómputo")
        )
      })

      const equipmentWithSerials = await Promise.all(
        relevantProducts.map(async (product) => {
          if (product.is_serialized) {
            const { data: serialsData } = await supabase
              .from("internal_product_serials")
              .select("id, serial_number, status, current_location, condition")
              .eq("product_id", product.id)
              .eq("company_id", companyId)
              .or("status.eq.in_stock,status.eq.out_of_stock")
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
              equipmentType: detectEquipmentType(product.name),
              status: serial.status,
            }))
          }
          return []
        }),
      )

      const flatEquipment = equipmentWithSerials.flat()

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

  const departmentStats = useMemo((): DepartmentStats[] => {
    return departments.map((dept) => {
      const deptEquipment = equipment.filter((eq) => eq.current_location === dept.id)

      // Agrupar equipos por tipo con sus seriales
      const getEquipmentByType = (type: EquipmentType) => deptEquipment.filter((eq) => eq.equipmentType === type)

      const desksEq = getEquipmentByType("escritorio")
      const chairsEq = getEquipmentByType("silla")
      const cpusEq = getEquipmentByType("cpu")
      const monitorsEq = getEquipmentByType("monitor")
      const miceEq = getEquipmentByType("mouse")
      const keyboardsEq = getEquipmentByType("teclado")
      const phonesEq = getEquipmentByType("telefono")
      const cpuHoldersEq = getEquipmentByType("porta_cpu")
      const fansEq = getEquipmentByType("ventilador")
      const dniReadersEq = getEquipmentByType("lector_dni")
      const printersEq = getEquipmentByType("impresora")
      const shelvesEq = getEquipmentByType("estante")
      const laptopsEq = getEquipmentByType("laptop")

      const desks = desksEq.length
      const chairs = chairsEq.length
      const cpus = cpusEq.length
      const monitors = monitorsEq.length
      const mice = miceEq.length
      const keyboards = keyboardsEq.length
      const phones = phonesEq.length
      const cpuHolders = cpuHoldersEq.length
      const fans = fansEq.length
      const dniReaders = dniReadersEq.length
      const printers = printersEq.length
      const shelves = shelvesEq.length
      const laptops = laptopsEq.length

      const furnitureCount = desks + chairs + shelves
      const equipmentCount = cpus + monitors + mice + keyboards + phones + cpuHolders + fans + dniReaders + laptops

      const value = deptEquipment.reduce((sum, eq) => sum + (eq.cost_price || 0), 0)

      // Crear workstations con seriales
      const numWorkstations = Math.max(desks, chairs, monitors, laptops)
      const workstations: Workstation[] = []

      for (let i = 0; i < numWorkstations; i++) {
        workstations.push({
          id: `${dept.id}-ws-${i}`,
          hasDesk: i < desks,
          hasChair: i < chairs,
          hasCpu: i < cpus,
          hasMonitor: i < monitors,
          hasMouse: i < mice,
          hasKeyboard: i < keyboards,
          phones: i < phones ? 1 : 0,
          hasCpuHolder: i < cpuHolders,
          hasFan: i < fans,
          hasDniReader: i < dniReaders,
          hasLaptop: i < laptops,
          deskSerial: desksEq[i]?.serial_number,
          chairSerial: chairsEq[i]?.serial_number,
          cpuSerial: cpusEq[i]?.serial_number,
          monitorSerial: monitorsEq[i]?.serial_number,
          mouseSerial: miceEq[i]?.serial_number,
          keyboardSerial: keyboardsEq[i]?.serial_number,
          phoneSerial: phonesEq[i]?.serial_number,
          cpuHolderSerial: cpuHoldersEq[i]?.serial_number,
          fanSerial: fansEq[i]?.serial_number,
          dniReaderSerial: dniReadersEq[i]?.serial_number,
          laptopSerial: laptopsEq[i]?.serial_number,
        })
      }

      const printerDetails: EquipmentDetail[] = printersEq.map((p) => ({
        id: p.id,
        name: p.name,
        serial: p.serial_number,
      }))

      const shelfDetails: EquipmentDetail[] = shelvesEq.map((s) => ({
        id: s.id,
        name: s.name,
        serial: s.serial_number,
      }))

      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        count: deptEquipment.length,
        furnitureCount,
        equipmentCount,
        value,
        desks,
        chairs,
        cpus,
        monitors,
        mice,
        keyboards,
        phones,
        cpuHolders,
        fans,
        dniReaders,
        printers,
        shelves,
        laptops,
        workstations,
        printerDetails,
        shelfDetails,
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
            <CardContent className="pb-3 space-y-3">
              <FloorPlanVisualization department={dept} stats={dept} maxCount={50} />
              <EquipmentCounter department={dept} stats={dept} />
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
                  <TableHead>Tipo</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8">
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
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {eq.equipmentType?.replace("_", " ") || "otro"}
                        </Badge>
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
