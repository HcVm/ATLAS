import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, MapPin, AlertTriangle, Calendar, Tag } from "lucide-react" // Added Tag for serial number
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import QRCodeDisplay from "@/components/qr-code-display"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  cost_price: number
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  qr_code_hash: string
  serial_number: string | null // Added serial_number
  internal_product_categories?: {
    id: number
    name: string
    color: string
  } | null
  companies?: {
    name: string
    logo_url: string | null
    color: string
  } | null
}

export default async function PublicInternalProductPage({ params }: { params: { hash: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    },
  )

  const { data: product, error } = await supabase
    .from("internal_products")
    .select(
      `
      *,
      internal_product_categories (
        id,
        name,
        color
      ),
      companies (
        name,
        logo_url,
        color
      )
    `,
    )
    .eq("qr_code_hash", params.hash)
    .single()

  if (error || !product) {
    console.error("Error fetching public product:", error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Producto no encontrado</CardTitle>
            <CardDescription>
              El código QR no es válido o el producto no existe o no está disponible públicamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Verifica el enlace o contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stockStatus = product.current_stock <= product.minimum_stock ? "low" : "normal"
  const totalValue = product.current_stock * product.cost_price
  const publicProductUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/public/internal-product/${product.qr_code_hash}`

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="flex flex-col items-center text-center pb-4">
          {product.companies?.logo_url && (
            <img
              src={product.companies.logo_url || "/placeholder.svg"}
              alt={`${product.companies.name} Logo`}
              className="h-16 w-16 object-contain mb-4"
            />
          )}
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">{product.name}</CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">Código: {product.code}</CardDescription>
          {product.companies?.name && (
            <p className="text-sm text-muted-foreground mt-2">
              Gestionado por: <span className="font-medium">{product.companies.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Detalles del Producto</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-muted-foreground">Descripción:</span> {product.description || "N/A"}
                </p>
                {product.serial_number && ( // Display serial number if it exists
                  <p className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Número de Serie:</span> {product.serial_number}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Unidad de Medida:</span> {product.unit_of_measure}
                </p>
                {product.internal_product_categories && (
                  <p className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: product.internal_product_categories.color }}
                    />
                    <span className="font-medium text-muted-foreground">Categoría:</span>{" "}
                    {product.internal_product_categories.name}
                  </p>
                )}
                {product.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Ubicación:</span> {product.location}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Información de Inventario</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-muted-foreground">Stock Actual:</span>{" "}
                  <span className={`font-bold ${stockStatus === "low" ? "text-red-600" : "text-green-600"}`}>
                    {product.current_stock} {product.unit_of_measure}
                  </span>
                  {stockStatus === "low" && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Bajo
                    </Badge>
                  )}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Stock Mínimo:</span> {product.minimum_stock}{" "}
                  {product.unit_of_measure}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Costo Unitario:</span> S/{" "}
                  {product.cost_price.toFixed(2)}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Valor Total:</span> S/ {totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Fechas</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Creado el:</span>{" "}
                  {format(new Date(product.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Última Actualización:</span>{" "}
                  {format(new Date(product.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Código QR</h3>
              <QRCodeDisplay value={publicProductUrl} size={128} />
              <p className="text-xs text-muted-foreground mt-2">Este QR enlaza a esta página de información.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
