"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Edit,
  Calendar,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  Eye,
  QrCode,
  Tag,
  ListOrdered,
  Printer,
  Trash2,
  Boxes,
  ListChecks,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { es } from "date-fns/locale"
import { QRDisplayDialog } from "@/components/qr-code-display"
import QRCodeLib from "qrcode"
import { QuickSerialMovementDialog } from "@/components/warehouse/quick-serial-movement-dialog"
// Importar AlertDialog y sus componentes, y actualizar sticker-print-service
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { registerStickerPrint, getLastStickerPrint, hasStickerBeenPrinted } from "@/lib/sticker-print-service"
import { StickerPrintIndicator } from "@/components/warehouse/sticker-print-indicator"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number | null
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  qr_code_hash: string | null
  is_serialized: boolean
  internal_product_categories?: {
    id: number
    name: string
    color: string
  }
}

interface Movement {
  id: string
  movement_type: "entrada" | "salida" | "ajuste" | "baja"
  quantity: number
  cost_price: number
  total_amount: number
  reason: string
  notes: string | null
  requested_by: string
  department_requesting: string | null
  supplier: string | null
  movement_date: string
  created_at: string
  serial_id: string | null
  internal_product_serials: {
    serial_number: string
  } | null
}

interface SerializedProduct {
  id: string
  product_id: string
  serial_number: string
  status: "in_stock" | "sold" | "damaged" | "lost" | "withdrawn" | "in_repair" // Added 'withdrawn' and 'in_repair' for clarity
  current_location: string | null
  assigned_department: string | null // Added this field
  qr_code_hash: string | null
  created_at: string
  updated_at: string
  company_id: string
  condition?: "nuevo" | "usado" // Added condition field
}

interface Department {
  id: string
  name: string
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowUp, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "salida", label: "Asignación", icon: ArrowDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "ajuste", icon: RotateCcw, color: "text-blue-600", bgColor: "bg-blue-50", label: "Ajuste" },
  { value: "baja", label: "Baja del Sistema", icon: Trash2, color: "text-orange-600", bgColor: "bg-orange-50" }, // ← NUEVO
]

export default function InternalProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [serials, setSerials] = useState<SerializedProduct[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrData, setQrData] = useState("")
  const [qrTitle, setQrTitle] = useState("")
  const printRef = useRef<HTMLDivElement>(null)
  const [departments, setDepartments] = useState<Department[]>([])

  const [quickMovementType, setQuickMovementType] = useState<"salida" | "baja">("salida")
  const [isQuickMovementOpen, setIsQuickMovementOpen] = useState(false)
  const [selectedSerial, setSelectedSerial] = useState<SerializedProduct | null>(null)

  const [serialStickerPrintData, setSerialStickerPrintData] = useState<Record<string, any>>({})
  const [bulkStickerPrintData, setBulkStickerPrintData] = useState<any>(null)

  const [reprintConfirmDialog, setReprintConfirmDialog] = useState<{
    open: boolean
    type: "bulk" | "serial" | "all" | null
    serialData?: SerializedProduct | null
    lastPrintData?: any
  }>({
    open: false,
    type: null,
  })

  const logStickerPrint = async (serialId?: string | null, quantity = 1) => {
    if (!user?.id || !user?.company_id) return

    await registerStickerPrint({
      productId: product?.id || "",
      serialId: serialId || null,
      userId: user.id,
      companyId: user.company_id,
      quantity,
      client: supabase,
    })
  }

  const handleReprintConfirm = async () => {
    try {
      switch (reprintConfirmDialog.type) {
        case "bulk":
          await executePrintBulkSticker()
          break
        case "serial":
          if (reprintConfirmDialog.serialData) {
            await executePrintSticker(reprintConfirmDialog.serialData)
          }
          break
        case "all":
          await executePrintAllStickers()
          break
      }
      setReprintConfirmDialog({ open: false, type: null })
    } catch (error) {
      console.error("Error in handleReprintConfirm:", error)
    }
  }

  // Diseñado para stickers de 50mm x 25mm con QR y badge de "A GRANEL".
  const handlePrintBulkSticker = async () => {
    if (!product || !user?.company_id) return

    try {
      const hasBeenPrinted = await hasStickerBeenPrinted(product.id, null, user.company_id, supabase)
      const lastPrint = await getLastStickerPrint(product.id, null, user.company_id, supabase)

      if (hasBeenPrinted && lastPrint) {
        setReprintConfirmDialog({
          open: true,
          type: "bulk",
          lastPrintData: lastPrint,
        })
      } else {
        await executePrintBulkSticker()
      }
    } catch (error) {
      console.error("Error checking bulk sticker print status:", error)
      toast.error("Error al verificar estado de impresión")
    }
  }

  const executePrintBulkSticker = async () => {
    if (!product) return

    try {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", user?.company_id).single()
      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

      let qrCodeUrl = ""
      if (product.qr_code_hash) {
        const publicUrl = `${window.location.origin}/public/internal-product/${product.qr_code_hash}`
        qrCodeUrl = await QRCodeLib.toDataURL(publicUrl, {
          errorCorrectionLevel: "H",
          width: 1024,
          margin: 1,
        })
      }

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta Granel - ${product.name}</title>
              <style>
                @page { size: 50mm 25mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
                .sticker { width: 50mm; height: 25mm; display: flex; flex-direction: row; padding: 0; overflow: hidden; }
                .main-content { flex: 1; display: flex; flex-direction: column; padding: 3mm 2mm 3mm 5mm; min-width: 0; }
                .header-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #ccc; margin-bottom: 1mm; padding-bottom: 0.5mm; }
                .company-text { font-size: 5pt; font-weight: 750; text-transform: uppercase; }
                .atlas-badge { font-size: 5pt; font-weight: 800; color: #fff; background: #000; padding: 0.5mm 1.5mm; border-radius: 2px; }
                .serial { font-weight: 700; font-size: 7pt; font-family: monospace; margin-bottom: 1mm; }
                .product-name { font-weight: 700; font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-grid { display: flex; flex-direction: column; gap: 0.5mm; }
                .info-row { display: flex; gap: 1mm; font-size: 6pt; }
                .info-label { font-weight: 700; }
                .qr-column { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 17mm; padding-right: 0.5mm; }
                .qr-column img { width: 16mm; height: 16mm; image-rendering: pixelated; image-rendering: -moz-crisp-edges; }
              </style>
            </head>
            <body>
              <div class="sticker">
                <div class="main-content">
                  <div class="header-row">
                    <span class="company-text">${companyName} INV ${currentYear}</span>
                    <span class="atlas-badge">ATLAS</span>
                  </div>
                  <div class="serial">A GRANEL</div>
                  <div class="product-name">${product.name}</div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Ubic:</span>
                      <span class="info-value">${resolveLocation(product.location)}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Ref:</span>
                      <span class="info-value">${product.code}</span>
                    </div>
                  </div>
                </div>
                ${qrCodeUrl ? `<div class="qr-column"><img src="${qrCodeUrl}" alt="QR" /></div>` : ""}
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)

        await logStickerPrint(null, 1)
      }
    } catch (error) {
      console.error("Error printing bulk sticker:", error)
      toast.error("Error al generar la etiqueta para granel")
    }
  }

  useEffect(() => {
    if (params.id && user?.company_id) {
      fetchProductDetails()
    }
  }, [params.id, user?.company_id])

  const fetchProductDetails = async () => {
    try {
      setLoading(true)

      const { data: deptsData } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", user?.company_id)

      setDepartments(deptsData || [])

      const { data: productData, error: productError } = await supabase
        .from("internal_products")
        .select(
          `
          *,
          internal_product_categories (
            id,
            name,
            color
          )
        `,
        )
        .eq("id", params.id)
        .eq("company_id", user?.company_id)
        .single()

      if (productError) throw productError

      let calculatedStock = productData.current_stock
      if (productData?.is_serialized) {
        const { count, error: serialCountError } = await supabase
          .from("internal_product_serials")
          .select("id", { count: "exact", head: true })
          .eq("product_id", params.id)
          .eq("status", "in_stock") // Only count items that are in stock
          .eq("company_id", user?.company_id)

        if (!serialCountError) {
          calculatedStock = count || 0
        }
      }

      setProduct({ ...productData, current_stock: calculatedStock } as Product)

      if (productData?.is_serialized) {
        const { data: serialsData, error: serialsError } = await supabase
          .from("internal_product_serials")
          .select("*") // Select all relevant fields for SerializedProduct
          .eq("product_id", params.id)
          .eq("company_id", user?.company_id)
          .order("serial_number", { ascending: true })

        if (serialsError) throw serialsError
        setSerials(serialsData || [])

        const printDataMap: Record<string, any> = {}
        await Promise.all(
          (serialsData || []).map(async (serial) => {
            const lastPrint = await getLastStickerPrint(productData.id, serial.id, user?.company_id || "")
            printDataMap[serial.id] = lastPrint
          }),
        )
        setSerialStickerPrintData(printDataMap)
      } else {
        setSerials([])
        const lastBulkPrint = await getLastStickerPrint(productData.id, null, user?.company_id || "")
        setBulkStickerPrintData(lastBulkPrint)
      }

      const { data: movementsData, error: movementsError } = await supabase
        .from("internal_inventory_movements")
        .select(
          `
          *,
          internal_products (
            is_serialized
          ),
          internal_product_serials (
            serial_number
          )
        `,
        )
        .eq("product_id", params.id)
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false })

      if (movementsError) throw movementsError

      setMovements(movementsData || [])
    } catch (error) {
      console.error("Error fetching product details:", error)
      toast.error("Error al cargar los detalles del producto")
      router.push("/warehouse/internal/products")
    } finally {
      setLoading(false)
    }
  }

  const resolveLocation = (location: string | null): string => {
    if (!location) return "N/A"

    // Check if it's a UUID (department ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(location)) {
      const dept = departments.find((d) => d.id === location)
      return dept?.name || location
    }

    return location
  }

  const handleGenerateQR = (type: "product" | "serial", item: Product | SerializedProduct) => {
    let qrContent = ""
    let qrTitleText = ""

    if (type === "product" && "code" in item) {
      qrContent = `${window.location.origin}/public/internal-product/${item.qr_code_hash}`
      qrTitleText = `QR para Modelo: ${item.name} (${item.code})`
    } else if (type === "serial" && "serial_number" in item) {
      qrContent = `${window.location.origin}/public/internal-product/${item.qr_code_hash}`
      qrTitleText = `QR para Serie: ${item.serial_number}`
    }

    setQrData(qrContent)
    setQrTitle(qrTitleText)
    setQrDialogOpen(true)
  }

  const handlePrintSticker = async (serial: SerializedProduct) => {
    if (!user?.company_id) return

    try {
      const hasBeenPrinted = await hasStickerBeenPrinted(product?.id || "", serial.id, user.company_id)
      const lastPrint = await getLastStickerPrint(product?.id || "", serial.id, user.company_id)

      if (hasBeenPrinted && lastPrint) {
        setReprintConfirmDialog({
          open: true,
          type: "serial",
          serialData: serial,
          lastPrintData: lastPrint,
        })
      } else {
        await executePrintSticker(serial)
      }
    } catch (error) {
      console.error("Error checking serial sticker print status:", error)
      toast.error("Error al verificar estado de impresión")
    }
  }

  const executePrintSticker = async (serial: SerializedProduct) => {
    try {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", user?.company_id).single()

      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

      const resolvedLocation = resolveLocation(serial.current_location)

      let qrCodeUrl = ""
      if (serial.qr_code_hash) {
        const publicUrl = `${window.location.origin}/public/internal-product/${serial.qr_code_hash}`
        qrCodeUrl = await QRCodeLib.toDataURL(publicUrl, {
          errorCorrectionLevel: "H",
          width: 1024,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        })
      }

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta - ${serial.serial_number}</title>
              <meta charset="UTF-8">
              <style>
                @page {
                  size: 50mm 25mm;
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                .sticker {
                  width: 50mm;
                  height: 25mm;
                  border: none;
                  background: white;
                  display: flex;
                  flex-direction: row;
                  box-sizing: border-box;
                  overflow: hidden;
                }
                .main-content {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  padding: 3mm 2mm 3mm 5mm;
                  min-width: 0;
                  overflow: hidden;
                }
                .header-row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding-bottom: 1mm;
                  border-bottom: 0.5px solid #ccc;
                  margin-bottom: 1mm;
                }
                .company-text {
                  font-size: 5pt;
                  font-weight: 750;
                  color: #000;
                  line-height: 1;
                  text-transform: uppercase;
                  letter-spacing: 0.2px;
                }
                .atlas-badge {
                  font-size: 5pt;
                  font-weight: 800;
                  color: #fff;
                  background: #000;
                  padding: 0.5mm 1.5mm;
                  border-radius: 3px;
                }
                .serial {
                  font-weight: 700;
                  font-size: 7pt;
                  font-family: monospace;
                  letter-spacing: 0.1px;
                  margin-bottom: 1mm;
                  line-height: 1;
                }
                .product-name {
                  font-weight: 700;
                  font-size: 6pt;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-bottom: 0.5mm;
                }
                .info-grid {
                  display: flex;
                  flex-direction: column;
                  gap: 0.5mm;
                }
                .info-row {
                  display: flex;
                  gap: 1mm;
                  font-size: 6pt;
                  line-height: 1;
                }
                .info-label {
                  font-weight: 600;
                  min-width: 20px;
                }
                .info-value {
                  font-family: monospace;
                  font-size: 5pt;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .qr-column {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 16mm;
                  padding-right: 0.5mm;
                }
                .qr-column img {
                  width: 15mm;
                  height: 15mm;
                }
              </style>
            </head>
            <body>
              <div class="sticker">
                <div class="main-content">
                  <div class="header-row">
                    <span class="company-text">${companyName} INV ${currentYear}</span>
                    <span class="atlas-badge">ATLAS</span>
                  </div>
                  <div class="serial">${serial.serial_number}</div>
                  <div class="product-name">${product?.name || ""}</div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="info-label">Ubic:</span>
                      <span class="info-value">${resolvedLocation}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Ref:</span>
                      <span class="info-value">${product?.code || ""}</span>
                    </div>
                  </div>
                </div>
                ${
                  qrCodeUrl
                    ? `
              <div class="qr-column">
                <img src="${qrCodeUrl}" alt="QR" />
              </div>
              `
                    : ""
                }
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 250)

        await logStickerPrint(serial.id, 1)
      }
    } catch (error) {
      console.error("Error generating sticker:", error)
      toast.error("Error al generar la etiqueta")
    }
  }

  const handlePrintAllStickers = async () => {
    if (!product || serials.length === 0 || !user?.company_id) return

    try {
      // Verificar si todas las series ya han sido impresas
      const inStockSerials = serials.filter((s) => s.status === "in_stock")
      if (inStockSerials.length === 0) {
        toast.error("No hay productos en stock para imprimir etiquetas")
        return
      }

      // Verificar si al menos una serie ya fue impresa
      let hasAnyBeenPrinted = false
      for (const serial of inStockSerials) {
        const hasBeenPrinted = await hasStickerBeenPrinted(product.id, serial.id, user.company_id, supabase)
        if (hasBeenPrinted) {
          hasAnyBeenPrinted = true
          break
        }
      }

      if (hasAnyBeenPrinted) {
        const lastPrint = await getLastStickerPrint(product.id, inStockSerials[0].id, user.company_id, supabase)
        setReprintConfirmDialog({
          open: true,
          type: "all",
          lastPrintData: lastPrint,
        })
      } else {
        await executePrintAllStickers()
      }
    } catch (error) {
      console.error("Error checking all stickers print status:", error)
      toast.error("Error al verificar estado de impresión")
    }
  }

  const executePrintAllStickers = async () => {
    if (!product || serials.length === 0) return

    try {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", user?.company_id).single()
      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

      const inStockSerials = serials.filter((s) => s.status === "in_stock")

      const stickersHtml = await Promise.all(
        inStockSerials.map(async (serial) => {
          let qrCodeUrl = ""
          if (serial.qr_code_hash) {
            const publicUrl = `${window.location.origin}/public/internal-product/${serial.qr_code_hash}`
            qrCodeUrl = await QRCodeLib.toDataURL(publicUrl, {
              errorCorrectionLevel: "H",
              width: 1024,
              margin: 1,
            })
          }

          const resolvedLocation = resolveLocation(serial.current_location)

          return `
            <div class="sticker">
              <div class="main-content">
                <div class="header-row">
                  <span class="company-text">${companyName} INV ${currentYear}</span>
                  <span class="atlas-badge">ATLAS</span>
                </div>
                <div class="serial">${serial.serial_number}</div>
                <div class="product-name">${product.name}</div>
                <div class="info-grid">
                  <div class="info-row"><span class="info-label">Ubic:</span><span class="info-value">${resolvedLocation}</span></div>
                  <div class="info-row"><span class="info-label">Ref:</span><span class="info-value">${product.code}</span></div>
                </div>
              </div>
              ${qrCodeUrl ? `<div class="qr-column"><img src="${qrCodeUrl}" alt="QR" /><div class="qr-label">Escanear</div></div>` : ""}
            </div>
          `
        }),
      )

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiquetas - ${product.name}</title>
              <style>
                @page { size: 50mm 25mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .sticker { width: 50mm; height: 25mm; display: flex; flex-direction: row; padding: 0; overflow: hidden; page-break-after: always; }
                .main-content { flex: 1; display: flex; flex-direction: column; padding: 3mm 2mm 3mm 5mm; min-width: 0; }
                .header-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #ccc; margin-bottom: 1mm; padding-bottom: 0.5mm; }
                .company-text { font-size: 5pt; font-weight: 750; text-transform: uppercase; }
                .atlas-badge { font-size: 5pt; font-weight: 800; color: #fff; background: #000; padding: 0.5mm 1.5mm; border-radius: 2px; }
                .serial { font-weight: 700; font-size: 7pt; font-family: monospace; margin-bottom: 1mm; }
                .product-name { font-weight: 700; font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-grid { display: flex; flex-direction: column; gap: 0.5mm; }
                .info-row { display: flex; gap: 1mm; font-size: 6pt; }
                .info-label { font-weight: 600; min-width: 20px; }
                .info-value { font-family: monospace; font-size: 5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .qr-column { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 16mm; padding-right: 0.5mm; gap: 1mm; }
                .qr-column img { width: 15mm; height: 15mm; image-rendering: pixelated; image-rendering: -moz-crisp-edges; -ms-interpolation-mode: nearest-neighbor; }
                .qr-label { font-size: 4pt; font-weight: 600; text-transform: uppercase; }
              </style>
            </head>
            <body>
              ${stickersHtml.join("")}
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)

        // Registrar todas las impresiones en paralelo
        await Promise.all(inStockSerials.map((serial) => logStickerPrint(serial.id, 1)))
      }
    } catch (error) {
      console.error("Error printing all stickers:", error)
      toast.error("Error al generar las etiquetas")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Producto no encontrado</h3>
        <p className="text-muted-foreground">El producto que buscas no existe o no tienes permisos para verlo.</p>
        <Button asChild className="mt-4">
          <Link href="/warehouse/internal/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
      </div>
    )
  }

  const stockStatus = product.current_stock <= product.minimum_stock ? "low" : "normal"

  const movementStats = {
    total: movements.length,
    entradas: movements.filter((m) => m.movement_type === "entrada").length,
    salidas: movements.filter((m) => m.movement_type === "salida").length,
    ajustes: movements.filter((m) => m.movement_type === "ajuste").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/warehouse/internal/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">Código: {product.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button variant="outline" asChild>
            <Link href={`/warehouse/internal/products/edit/${product.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Badge variant={product.is_active ? "default" : "secondary"}>
            {product.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-sm">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p className="text-sm font-mono">{product.code}</p>
                </div>
                {product.description && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Producto</label>
                  <div className="flex items-center gap-1">
                    {product.is_serialized ? (
                      <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                        <ListChecks className="h-3 w-3 mr-1" />
                        Activo Fijo (Serializado)
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">
                        <Boxes className="h-3 w-3 mr-1" />
                        Consumible (A Granel)
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  {product.internal_product_categories ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: product.internal_product_categories.color }}
                      />
                      <span className="text-sm">{product.internal_product_categories.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin categoría</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unidad de Medida</label>
                  <p className="text-sm">{product.unit_of_measure}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Costo Unitario</label>
                  <p className="text-sm font-semibold">
                    {product.cost_price !== null ? `S/ ${product.cost_price.toFixed(2)}` : "N/A"}
                  </p>
                </div>
                {product.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ubicación</label>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{resolveLocation(product.location)}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Creado</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {formatInTimeZone(product.created_at, "America/Lima", "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {formatInTimeZone(product.updated_at, "America/Lima", "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!product.is_serialized && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <Boxes className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900">Producto a Granel (Sin Seriales)</p>
                <p className="text-sm text-orange-800">
                  Este producto no utiliza etiquetas individuales. El stock se gestiona mediante conteo directo en
                  movimientos de entrada y salida.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-orange-700">Estado del Sticker:</span>
                  <StickerPrintIndicator
                    productId={product.id}
                    serialId={null}
                    isSerializedProduct={false}
                    lastPrintInfo={bulkStickerPrintData}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Serialized Units Table (if applicable) */}
          {product.is_serialized && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Números de Serie en Stock
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePrintAllStickers}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Todos ({serials.filter((s) => s.status === "in_stock").length})
                  </Button>
                </div>
              </div>
              <QuickSerialMovementDialog
                isOpen={isQuickMovementOpen}
                onOpenChange={setIsQuickMovementOpen}
                type={quickMovementType}
                product={product}
                serial={selectedSerial}
                companyId={user?.company_id || ""}
                onSuccess={fetchProductDetails}
              />
              <Card>
                <CardContent>
                  {serials.length === 0 ? (
                    <div className="text-center py-8">
                      <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No hay unidades serializadas registradas para este producto.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Genera un movimiento de entrada para agregar stock y crear series automáticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N° Serie</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Ubicación Actual</TableHead>
                            <TableHead>Creado</TableHead>
                            <TableHead>Sticker</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serials.map((serial) => (
                            <TableRow key={serial.id}>
                              <TableCell className="font-medium font-mono">{serial.serial_number}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    serial.status === "in_stock"
                                      ? "default"
                                      : serial.status === "out_of_stock" ||
                                          serial.status === "sold" ||
                                          serial.status === "lost" ||
                                          serial.status === "damaged"
                                        ? "destructive"
                                        : serial.status === "withdrawn"
                                          ? "secondary"
                                          : "outline"
                                  }
                                >
                                  {serial.status === "in_stock"
                                    ? "En Stock"
                                    : serial.status === "out_of_stock" || serial.status === "sold"
                                      ? "Asignado/Vendido"
                                      : serial.status === "in_repair"
                                        ? "En Reparación"
                                        : serial.status === "withdrawn"
                                          ? "Dado de Baja"
                                          : serial.status === "damaged"
                                            ? "Dañado"
                                            : "Desconocido"}
                                </Badge>
                                {serial.condition && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {serial.condition === "nuevo" ? "Nuevo" : "Usado"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{resolveLocation(serial.current_location)}</TableCell>
                              <TableCell>
                                {formatInTimeZone(serial.created_at, "America/Lima", "dd/MM/yyyy HH:mm", { locale: es })}
                              </TableCell>
                              <TableCell>
                                <StickerPrintIndicator
                                  productId={product.id}
                                  serialId={serial.id}
                                  isSerializedProduct={true}
                                  lastPrintInfo={serialStickerPrintData[serial.id]}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {serial.status === "in_stock" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        onClick={() => {
                                          setQuickMovementType("salida")
                                          setSelectedSerial(serial)
                                          setIsQuickMovementOpen(true)
                                        }}
                                      >
                                        <ArrowDown className="h-4 w-4 mr-1" />
                                        Asignar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                        onClick={() => {
                                          setQuickMovementType("baja")
                                          setSelectedSerial(serial)
                                          setIsQuickMovementOpen(true)
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Baja
                                      </Button>
                                    </>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => handleGenerateQR("serial", serial)}>
                                    <QrCode className="h-4 w-4" />
                                    <span className="sr-only">Generar QR para serial</span>
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handlePrintSticker(serial)}>
                                    <Printer className="h-4 w-4" />
                                    <span className="sr-only">Imprimir etiqueta</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>{movements.length} movimientos registrados</CardDescription>
            </CardHeader>
            <CardContent>
                  {movements.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay movimientos registrados</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View for Movements */}
                  <div className="grid grid-cols-1 gap-4 md:hidden">
                    {movements.map((movement) => {
                      const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                      const Icon = movementType?.icon || Package

                      let serialDisplay = "N/A"
                      if (product.is_serialized) {
                        if (movement.internal_product_serials?.serial_number) {
                          serialDisplay = movement.internal_product_serials.serial_number
                        } else if (movement.movement_type === "entrada" && movement.notes) {
                          // Simple logic for mobile display of generated serials (summary)
                          if (movement.notes.includes("---SERIALES_GENERADOS---")) {
                            serialDisplay = "Múltiples series generadas"
                          } else if (movement.notes.includes("Series generadas:")) {
                            serialDisplay = "Múltiples series generadas"
                          }
                        }
                      }

                      return (
                        <div key={movement.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm font-medium">
                                {formatInTimeZone(movement.movement_date, "America/Lima", "dd/MM/yyyy", {
                                  locale: es,
                                })}
                              </div>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Icon className={`h-3 w-3 ${movementType?.color}`} />
                              {movementType?.label}
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 text-lg font-medium">
                              <span className={movementType?.color}>
                                {movement.movement_type === "salida" || movement.movement_type === "baja" ? "-" : "+"}
                                {movement.quantity}
                              </span>
                              <span className="text-muted-foreground text-sm">{product.unit_of_measure}</span>
                            </div>
                            <div className="text-sm font-medium">S/ {movement.total_amount.toFixed(2)}</div>
                          </div>

                          {product.is_serialized && (
                            <div className="text-sm">
                              <span className="text-muted-foreground text-xs">Serie:</span>
                              <div className="font-mono truncate">{serialDisplay}</div>
                            </div>
                          )}

                          <div className="text-sm">
                            <span className="text-muted-foreground text-xs">Motivo:</span>
                            <div className="truncate">{movement.reason}</div>
                          </div>

                          <div className="pt-2 border-t flex justify-between items-center">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{movement.requested_by}</span>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                              <Link href={`/warehouse/internal/movements/${movement.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="rounded-md border overflow-x-auto overflow-y-visible hidden md:block">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        {product.is_serialized && <TableHead>N° Serie</TableHead>}
                        <TableHead>Valor</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => {
                        const movementType = MOVEMENT_TYPES.find((t) => t.value === movement.movement_type)
                        const Icon = movementType?.icon || Package

                        let serialDisplay = "N/A"
                        let fullSerialsList = ""
                        let serialsArray: string[] = []
                        let showTooltip = false

                        if (product.is_serialized) {
                          if (movement.internal_product_serials?.serial_number) {
                            // Salidas, bajas, ajustes → tienen serial_id
                            serialDisplay = movement.internal_product_serials.serial_number
                          } else if (movement.movement_type === "entrada" && movement.notes) {
                            // Entradas → extraemos de las notas (soportar múltiples formatos)

                            // Try new delimited format first (from fixed assets)
                            const newFormatMatch = movement.notes.match(
                              /---SERIALES_GENERADOS---\s*([\s\S]*?)\s*---FIN_SERIALES---/,
                            )
                            if (newFormatMatch) {
                              fullSerialsList = newFormatMatch[1].trim()
                              // Handle both comma-separated and newline-separated formats
                              if (fullSerialsList.includes(",")) {
                                serialsArray = fullSerialsList
                                  .split(",")
                                  .map((s: string) => s.trim())
                                  .filter(Boolean)
                              } else {
                                serialsArray = fullSerialsList
                                  .split("\n")
                                  .map((s: string) => s.trim())
                                  .filter(Boolean)
                              }
                            } else {
                              // Try old format: "Series generadas: serial1, serial2, serial3" (greedy match to end)
                              const oldFormatMatch = movement.notes.match(/Series generadas:\s*(.+)$/i)
                              if (oldFormatMatch) {
                                fullSerialsList = oldFormatMatch[1].trim()
                                serialsArray = fullSerialsList
                                  .split(",")
                                  .map((s: string) => s.trim())
                                  .filter(Boolean)
                              }
                            }

                            if (serialsArray.length === 1) {
                              serialDisplay = serialsArray[0]
                            } else if (serialsArray.length > 1) {
                              serialDisplay = `${serialsArray[0]} y +${serialsArray.length - 1} más`
                              showTooltip = true
                            }
                          }
                        }
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {formatInTimeZone(movement.movement_date, "America/Lima", "dd/MM/yyyy", { locale: es })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatInTimeZone(movement.created_at, "America/Lima", "HH:mm", { locale: es })}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Icon className={`h-3 w-3 ${movementType?.color}`} />
                                {movementType?.label}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className={`font-medium ${movementType?.color}`}>
                                  {movement.movement_type === "salida" || movement.movement_type === "baja" ? "-" : "+"}
                                  {movement.quantity}
                                </span>
                                <span className="text-muted-foreground text-sm">{product.unit_of_measure}</span>
                              </div>
                            </TableCell>

                            {product.is_serialized && (
                              <TableCell className="font-mono text-sm relative">
                                {serialDisplay === "N/A" ? (
                                  <span className="text-muted-foreground">N/A</span>
                                ) : showTooltip ? (
                                  // TOOLTIP QUE NUNCA SE CORTA (usa Portal implícito con posicionamiento fijo relativo)
                                  <div className="group cursor-help inline-block">
                                    <span className="text-blue-600 border-b border-dotted border-blue-400">
                                      {serialDisplay}
                                    </span>

                                    {/* Tooltip que aparece por encima de todo */}
                                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 shadow-2xl">
                                      <div className="font-semibold mb-2 text-green-400">
                                        Series generadas ({serialsArray.length}):
                                      </div>
                                      <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {serialsArray.map((s, i) => (
                                          <div key={i} className="font-mono">
                                            {s}
                                          </div>
                                        ))}
                                      </div>
                                      {/* Flechita */}
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 border-8 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                ) : (
                                  <span>{serialDisplay}</span>
                                )}
                              </TableCell>
                            )}

                            <TableCell>S/ {movement.total_amount.toFixed(2)}</TableCell>

                            <TableCell>
                              <div className="max-w-[200px] truncate" title={movement.reason}>
                                {movement.reason}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{movement.requested_by}</span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/warehouse/internal/movements/${movement.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estado del Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${stockStatus === "low" ? "text-red-600" : "text-green-600"}`}>
                  {product.current_stock}
                </div>
                <p className="text-sm text-muted-foreground">{product.unit_of_measure}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Stock mínimo:</span>
                  <span>
                    {product.minimum_stock} {product.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor total:</span>
                  <span className="font-semibold">
                    S/ {(product.current_stock * (product.cost_price || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {stockStatus === "low" && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Stock Bajo</p>
                    <p className="text-orange-600">Requiere reposición</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Código QR del Modelo
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
              {/* Se habilita el botón de "Generar QR" o "Imprimir Etiqueta" para productos a granel en la sección de stock o cabecera. */}
              {/* Añadimos el botón específicamente en el card de stock o acciones. */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={product.is_serialized ? () => handleGenerateQR("product", product) : handlePrintBulkSticker}
                  disabled={!product.qr_code_hash && !product.is_serialized} // Disable if no QR hash and not serialized
                >
                  {product.is_serialized ? (
                    <>
                      <QrCode className="h-4 w-4" /> Generar QR
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" /> Imprimir Etiqueta Granel
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Genera y escanea este código para ver la información pública del modelo de producto.
              </p>
            </CardContent>
          </Card>

          {/* Movement Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <ArrowUp className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{movementStats.entradas}</div>
                  <p className="text-xs text-green-700">Entradas</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <ArrowDown className="h-6 w-6 mx-auto mb-1 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{movementStats.salidas}</div>
                  <p className="text-xs text-red-700">Asignaciones</p>
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <RotateCcw className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{movementStats.ajustes}</div>
                <p className="text-xs text-blue-700">Ajustes</p>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-lg font-semibold">{movementStats.total}</div>
                <p className="text-sm text-muted-foreground">Total de movimientos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <QRDisplayDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} qrData={qrData} title={qrTitle} />

      {/* Agregar diálogo de confirmación de re-impresión al JSX */}
      <AlertDialog
        open={reprintConfirmDialog.open}
        onOpenChange={(open) => !open && setReprintConfirmDialog({ open: false, type: null })}
      >
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-amber-600">Sticker ya ha sido impreso</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>Este sticker ya ha sido impreso anteriormente:</p>
                {reprintConfirmDialog.lastPrintData && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                    <p className="font-semibold text-amber-900">Última impresión:</p>
                    <p className="text-amber-800">
                      {reprintConfirmDialog.lastPrintData.printed_at
                        ? formatInTimeZone(
                            reprintConfirmDialog.lastPrintData.printed_at,
                            "America/Lima",
                            "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
                            { locale: es },
                          )
                        : "Fecha desconocida"}
                    </p>
                    <p className="text-amber-800">Por: {reprintConfirmDialog.lastPrintData.printed_by_name}</p>
                    <p className="text-amber-800">Copias: {reprintConfirmDialog.lastPrintData.quantity_printed}</p>
                  </div>
                )}
                <p className="font-semibold">¿Deseas imprimir nuevamente?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReprintConfirm} className="bg-amber-600 hover:bg-amber-700 text-white">
                Imprimir de todos modos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
