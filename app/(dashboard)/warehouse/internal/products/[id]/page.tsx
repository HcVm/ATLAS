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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { QRDisplayDialog } from "@/components/qr-code-display"
import JsBarcode from "jsbarcode"
import QRCodeLib from "qrcode"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number | null // Changed to allow null
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
  movement_type: "entrada" | "salida" | "ajuste"
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
  serial_number: string
  status: string
  current_location: string | null
  created_at: string
  updated_at: string
  product_id: string
  qr_code_hash: string | null
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowUp, color: "text-green-600", bgColor: "bg-green-50" },
  { value: "salida", label: "Asignación", icon: ArrowDown, color: "text-red-600", bgColor: "bg-red-50" },
  { value: "ajuste", label: "Ajuste", icon: RotateCcw, color: "text-blue-600", bgColor: "bg-blue-50" },
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

  useEffect(() => {
    if (params.id && user?.company_id) {
      fetchProductDetails()
    }
  }, [params.id, user?.company_id])

  const fetchProductDetails = async () => {
    try {
      setLoading(true)

      // Fetch product details
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

      setProduct(productData as Product)

      // If product is serialized, fetch its individual serials
      if (productData?.is_serialized) {
        const { data: serialsData, error: serialsError } = await supabase
          .from("internal_product_serials")
          .select("*")
          .eq("product_id", params.id)
          .eq("company_id", user?.company_id)
          .order("serial_number", { ascending: true })

        if (serialsError) throw serialsError
        setSerials(serialsData || [])
      } else {
        setSerials([])
      }

      // Fetch product movements
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
    try {
      const { data: companyData } = await supabase.from("companies").select("name").eq("id", user?.company_id).single()

      const companyName = companyData?.name || "EMPRESA"
      const currentYear = new Date().getFullYear()

      // Generate barcode
      const barcodeCanvas = document.createElement("canvas")
      barcodeCanvas.width = 1200
      barcodeCanvas.height = 200

      JsBarcode(barcodeCanvas, serial.serial_number, {
        format: "CODE128",
        width: 3,
        height: 120,
        displayValue: false,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      })

      const barcodeUrl = barcodeCanvas.toDataURL("image/png")

      // Generate QR code
      let qrCodeUrl = ""
      if (serial.qr_code_hash) {
        const publicUrl = `${window.location.origin}/public/internal-product/${serial.qr_code_hash}`
        qrCodeUrl = await QRCodeLib.toDataURL(publicUrl, {
          errorCorrectionLevel: "H",
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        })
      }

      // Open print window with sticker
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
                  size: 62mm 37mm;
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
                  width: 62mm;
                  height: 37mm;
                  border: 2px solid #000;
                  border-radius: 8px;
                  padding: 2mm;
                  background: white;
                  display: flex;
                  flex-direction: column;
                  gap: 0.5mm;
                  box-sizing: border-box;
                }
                .header-text {
                  text-align: center;
                  font-size: 6pt;
                  font-weight: 700;
                  color: #000;
                  line-height: 1.1;
                  margin-bottom: 0.5mm;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                }
                .barcode-section {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .barcode-section img {
                  width: 100%;
                  max-width: 58mm;
                  height: auto;
                  max-height: 9mm;
                  display: block;
                  object-fit: contain;
                }
                .bottom-section {
                  flex: 1;
                  display: flex;
                  gap: 2mm;
                  align-items: flex-start;
                }
                .info-column {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  gap: 0.5mm;
                  min-width: 0;
                }
                .qr-column {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  gap: 0.5mm;
                  flex-shrink: 0;
                }
                .qr-column img {
                  width: 50px;
                  height: 50px;
                  display: block;
                }
                .serial {
                  font-weight: 700;
                  font-size: 7.5pt;
                  margin: 0.3mm 0;
                  font-family: 'Courier New', monospace;
                  word-break: break-all;
                  line-height: 1.15;
                  color: #000;
                  letter-spacing: -0.2px;
                }
                .location {
                  font-size: 6.5pt;
                  color: #000;
                  font-family: Arial, sans-serif;
                  margin: 0.3mm 0;
                  line-height: 1.1;
                  font-weight: 600;
                }
                .product {
                  margin-top: 0.3mm;
                  line-height: 1.1;
                }
                .product-name {
                  font-weight: 700;
                  font-size: 5.5pt;
                  margin-bottom: 0.3mm;
                  color: #000;
                  font-family: Arial, sans-serif;
                  line-height: 1.1;
                }
                .product-code {
                  color: #000;
                  font-size: 5.5pt;
                  font-family: Arial, sans-serif;
                  font-weight: 600;
                  line-height: 1.1;
                }
                .qr-label {
                  font-size: 5pt;
                  text-align: center;
                  color: #000;
                  line-height: 1.1;
                  max-width: 50px;
                  font-weight: 500;
                  font-family: Arial, sans-serif;
                }
                @media print {
                  body {
                    margin: 0;
                    padding: 0;
                  }
                  .sticker {
                    border: 2px solid #000 !important;
                    border-radius: 8px !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="sticker">
                <div class="header-text">INVENTARIO ${companyName} ${currentYear}</div>
                <div class="barcode-section">
                  <img src="${barcodeUrl}" alt="${serial.serial_number}" />
                </div>
                <div class="bottom-section">
                  <div class="info-column">
                    <div class="serial">${serial.serial_number}</div>
                    <div class="location">Ubicación: ${serial.current_location || "N/A"}</div>
                    <div class="product">
                      <div class="product-name">${product?.name || ""}</div>
                      <div class="product-code">${product?.code || ""}</div>
                    </div>
                  </div>
                  ${
                    qrCodeUrl
                      ? `
                  <div class="qr-column">
                    <img src="${qrCodeUrl}" alt="QR Code" />
                    <div class="qr-label">Info del producto</div>
                  </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } catch (error) {
      console.error("Error generating sticker:", error)
      toast.error("Error al generar la etiqueta")
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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
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
                    <ListOrdered className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline">{product.is_serialized ? "Serializado" : "No Serializado"}</Badge>
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
                      <span className="text-sm">{product.location}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Creado</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serialized Units Table (if applicable) */}
          {product.is_serialized && (
            <Card>
              <CardHeader>
                <CardTitle>Unidades Serializadas</CardTitle>
                <CardDescription>{serials.length} unidades registradas</CardDescription>
              </CardHeader>
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
                                    : serial.status === "out_of_stock"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {serial.status === "in_stock"
                                  ? "En Stock"
                                  : serial.status === "out_of_stock"
                                    ? "Asignado"
                                    : serial.status === "in_repair"
                                      ? "En Reparación"
                                      : "Desechado"}
                              </Badge>
                            </TableCell>
                            <TableCell>{serial.current_location || "N/A"}</TableCell>
                            <TableCell>
                              {format(new Date(serial.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
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
                <div className="rounded-md border">
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
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: es })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(movement.created_at), "HH:mm", { locale: es })}
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
                                  {movement.movement_type === "salida" ? "-" : "+"}
                                  {movement.quantity}
                                </span>
                                <span className="text-muted-foreground text-sm">{product.unit_of_measure}</span>
                              </div>
                            </TableCell>
                            {product.is_serialized && (
                              <TableCell>
                                {movement.internal_product_serials?.serial_number ? (
                                  <div className="flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm">{movement.internal_product_serials.serial_number}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
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
          {product.qr_code_hash && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Código QR del Modelo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => handleGenerateQR("product", product)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generar QR
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Genera y escanea este código para ver la información pública del modelo de producto.
                </p>
              </CardContent>
            </Card>
          )}

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
    </div>
  )
}
