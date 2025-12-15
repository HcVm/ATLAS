"use client"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Package, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PriceHistoryRecord {
  id: string
  cost_price: number
  effective_date: string
  quantity: number
  invoice_number?: string
  supplier_name?: string
}

interface SimilarProduct {
  id: string
  name: string
  code: string
  cost_price: number
  current_stock: number
  master_product_name?: string
  variant_description?: string
  created_at: string
  internal_product_categories?: {
    name: string
    color: string
  }
  price_history: PriceHistoryRecord[]
}

interface ProductSimilarityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  similarProducts: SimilarProduct[]
  newProductName: string
  newProductPrice: number
  onCreateNew: () => void
  onUseExisting: (productId: string) => void
}

export function ProductSimilarityDialog({
  open,
  onOpenChange,
  similarProducts,
  newProductName,
  newProductPrice,
  onCreateNew,
  onUseExisting,
}: ProductSimilarityDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  useEffect(() => {
    if (open && similarProducts.length === 1) {
      setSelectedProduct(similarProducts[0].id)
    }
  }, [open, similarProducts])

  const calculatePriceDifference = (oldPrice: number, newPrice: number) => {
    if (oldPrice === 0) return 0
    return ((newPrice - oldPrice) / oldPrice) * 100
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Productos Similares Encontrados
          </DialogTitle>
          <DialogDescription>
            Encontramos productos existentes similares a "{newProductName}". Puedes agregar stock al producto existente
            o crear uno nuevo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {similarProducts.map((product) => {
              const priceDiff = calculatePriceDifference(product.cost_price, newProductPrice)
              const isSelected = selectedProduct === product.id

              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedProduct(product.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base">{product.name}</h4>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">Código: {product.code}</p>
                        {product.variant_description && (
                          <p className="text-xs text-muted-foreground mt-1">{product.variant_description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        <Package className="h-3 w-3 mr-1" />
                        {product.current_stock} en stock
                      </Badge>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Precio Actual</p>
                        <p className="text-lg font-semibold">
                          S/ {product.cost_price.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Precio Nuevo</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold">
                            S/ {newProductPrice.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </p>
                          {priceDiff !== 0 && (
                            <Badge variant={priceDiff > 0 ? "destructive" : "default"} className="text-xs">
                              {priceDiff > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(priceDiff).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {product.price_history.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Historial de Precios</p>
                        <div className="space-y-1">
                          {product.price_history.slice(0, 3).map((record) => (
                            <div key={record.id} className="flex justify-between text-xs bg-muted/50 p-2 rounded">
                              <span>
                                {formatDate(record.effective_date)} - {record.quantity} unidad(es)
                              </span>
                              <span className="font-medium">
                                S/ {record.cost_price.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                          {product.price_history.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{product.price_history.length - 3} compras más
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>¿Qué sucederá?</AlertTitle>
          <AlertDescription>
            {selectedProduct ? (
              <>
                Se agregará el stock al producto seleccionado y se actualizará el{" "}
                <strong>costo promedio ponderado</strong>. El historial de precios se mantendrá para auditorías.
              </>
            ) : (
              <>
                Se creará un <strong>nuevo producto independiente</strong> con su propio código y números de serie.
              </>
            )}
          </AlertDescription>
        </Alert>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCreateNew}>
            Crear Producto Nuevo
          </Button>
          <Button onClick={() => selectedProduct && onUseExisting(selectedProduct)} disabled={!selectedProduct}>
            Agregar a Producto Existente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
