"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Package, AlertTriangle, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

interface InternalProduct {
  id: string
  code: string
  name: string
  description: string | null
  cost_price: number
  current_stock: number
  unit_of_measure: string
  company_id: string
  is_serialized: boolean
  company: {
    id: string
    name: string
    ruc: string
  }
  internal_product_categories?: {
    name: string
  }
  calculated_stock?: number
}

interface InternalProductSelectorProps {
  value?: string
  onSelect: (product: InternalProduct | null) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  showStock?: boolean
  showPrice?: boolean
  disabled?: boolean
  categoryId?: string | null
}

export function clearInternalProductCache() {
  console.log("InternalProductSelector: Cache cleared (no-op)")
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function InternalProductSelector({
  value,
  onSelect,
  placeholder = "Buscar producto...",
  label = "Producto",
  required = false,
  className,
  showStock = true,
  showPrice = true,
  disabled = false,
  categoryId = null,
}: InternalProductSelectorProps) {
  const { selectedCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [products, setProducts] = useState<InternalProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<InternalProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [popularProducts, setPopularProducts] = useState<InternalProduct[]>([])

  const calculateSerializedStock = async (productIds: string[]) => {
    if (productIds.length === 0) return {}

    try {
      const { data, error } = await supabase
        .from("internal_product_serials")
        .select("product_id")
        .in("product_id", productIds)
        .eq("status", "in_stock")

      if (error) throw error

      // Count serials per product
      const stockCounts: Record<string, number> = {}
      data?.forEach((serial) => {
        stockCounts[serial.product_id] = (stockCounts[serial.product_id] || 0) + 1
      })

      return stockCounts
    } catch (error) {
      console.error("Error calculating serialized stock:", error)
      return {}
    }
  }

  const enrichProductsWithStock = async (productList: InternalProduct[]) => {
    const serializedProducts = productList.filter((p) => p.is_serialized)
    if (serializedProducts.length === 0) return productList

    const serializedIds = serializedProducts.map((p) => p.id)
    const stockCounts = await calculateSerializedStock(serializedIds)

    return productList.map((product) => {
      if (product.is_serialized) {
        return {
          ...product,
          calculated_stock: stockCounts[product.id] || 0,
        }
      }
      return product
    })
  }

  // Fetch selected product if not in current results
  const fetchSelectedProduct = useCallback(
    async (productId: string) => {
      if (!selectedCompany?.id) return

      try {
        let query = supabase
          .from("internal_products")
          .select(
            `
          id, code, name, description, cost_price, current_stock, unit_of_measure,
          company_id, category_id, is_serialized,
          companies!inner(id, name, ruc),
          internal_product_categories(name)
        `,
          )
          .eq("id", productId)
          .eq("company_id", selectedCompany.id)

        if (categoryId) {
          query = query.eq("category_id", categoryId)
        }

        const { data, error } = await query.single()

        if (!error && data) {
          const formattedProduct = {
            ...data,
            internal_product_categories: data.internal_product_categories,
            company: data.companies,
          }

          const enrichedProducts = await enrichProductsWithStock([formattedProduct])
          setSelectedProduct(enrichedProducts[0])
        } else {
          setSelectedProduct(null)
          onSelect(null)
        }
      } catch (error) {
        console.error("InternalProductSelector: Error fetching selected product:", error)
        setSelectedProduct(null)
        onSelect(null)
      }
    },
    [selectedCompany?.id, categoryId, onSelect],
  )

  // Debounce search value
  const debouncedSearchValue = useDebounce(searchValue, 300)

  // Preload popular products (top 10 most sold or recently used)
  const preloadPopularProducts = useCallback(async () => {
    if (!selectedCompany?.id) return

    try {
      let query = supabase
        .from("internal_products")
        .select(
          `
          id, code, name, description, cost_price, current_stock, unit_of_measure,
          company_id, category_id, is_serialized,
          companies!inner(id, name, ruc),
          internal_product_categories(name)
        `,
        )
        .eq("is_active", true)
        .eq("company_id", selectedCompany.id)

      if (categoryId) {
        query = query.eq("category_id", categoryId)
      }

      const { data: popularData, error } = await query.order("current_stock", { ascending: false }).limit(10)

      if (!error && popularData) {
        const formattedProducts = popularData.map((p) => ({
          ...p,
          description: p.description,
          internal_product_categories: p.internal_product_categories,
          company: p.companies,
        }))

        const enrichedProducts = await enrichProductsWithStock(formattedProducts)
        setPopularProducts(enrichedProducts)
      }
    } catch (error) {
      console.error("InternalProductSelector: Error preloading popular products:", error)
    }
  }, [selectedCompany?.id, categoryId])

  // Load popular products on mount and when category/company changes
  useEffect(() => {
    preloadPopularProducts()
  }, [preloadPopularProducts])

  // Search products without cache
  const searchProducts = useCallback(
    async (searchTerm: string) => {
      if (!selectedCompany?.id) {
        setProducts([])
        setHasSearched(false)
        return
      }

      if (searchTerm.length < 2) {
        setProducts(popularProducts)
        setHasSearched(false)
        return
      }

      console.log("InternalProductSelector: Searching for:", searchTerm)
      setLoading(true)
      setHasSearched(true)

      try {
        let query = supabase
          .from("internal_products")
          .select(
            `
            id, code, name, description, cost_price, current_stock, unit_of_measure,
            company_id, category_id, is_serialized,
            companies!inner(id, name, ruc),
            internal_product_categories(name)
          `,
          )
          .eq("is_active", true)
          .eq("company_id", selectedCompany.id)
          .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)

        if (categoryId) {
          query = query.eq("category_id", categoryId)
        }

        const { data: searchData, error } = await query.order("name").limit(20)

        if (error) throw error

        if (!searchData || searchData.length === 0) {
          setProducts([])
          return
        }

        const formattedProducts = searchData.map((product) => ({
          ...product,
          internal_product_categories: product.internal_product_categories,
          company: product.companies,
        }))

        const enrichedProducts = await enrichProductsWithStock(formattedProducts)
        setProducts(enrichedProducts)
      } catch (error: any) {
        console.error("InternalProductSelector: Search error:", error)
        toast.error("Error al buscar productos: " + error.message)
        setProducts([])
      } finally {
        setLoading(false)
      }
    },
    [popularProducts, selectedCompany?.id, categoryId],
  )

  // Effect for debounced search and category change
  useEffect(() => {
    searchProducts(debouncedSearchValue)
  }, [debouncedSearchValue, searchProducts, categoryId])

  // Find selected product
  useEffect(() => {
    if (value) {
      let product = products.find((p) => p.id === value)

      if (!product && popularProducts.length > 0) {
        product = popularProducts.find((p) => p.id === value)
      }

      if (!product) {
        fetchSelectedProduct(value)
      } else {
        setSelectedProduct(product)
      }
    } else {
      setSelectedProduct(null)
    }
  }, [value, products, popularProducts, fetchSelectedProduct])

  const handleSelectProduct = (product: InternalProduct) => {
    setSelectedProduct(product)
    onSelect(product)
    setOpen(false)
    setSearchValue("")
  }

  const getStockBadgeVariant = (product: InternalProduct) => {
    const stock = product.is_serialized ? (product.calculated_stock ?? 0) : product.current_stock
    if (stock <= 0) return "destructive"
    if (stock <= 10) return "secondary"
    return "outline"
  }

  const getStockText = (product: InternalProduct) => {
    const stock = product.is_serialized ? (product.calculated_stock ?? 0) : product.current_stock
    if (stock <= 0) return "Sin stock"
    return `${stock} ${product.unit_of_measure}`
  }

  const displayProducts = useMemo(() => {
    if (searchValue.length >= 2) {
      return products
    }
    return popularProducts.slice(0, 10)
  }, [searchValue, products, popularProducts])

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
            disabled={disabled || !selectedCompany?.id || (required && !categoryId)}
          >
            {selectedProduct ? (
              <div className="flex items-center gap-2 flex-1 text-left">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="truncate font-medium">{selectedProduct.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {selectedProduct.code}
                    </Badge>
                    {selectedCompany && selectedProduct.company_id !== selectedCompany.id && (
                      <Badge variant="destructive" className="text-xs">
                        {selectedProduct.company.name}
                      </Badge>
                    )}
                    {showStock && (
                      <Badge variant={getStockBadgeVariant(selectedProduct)} className="text-xs">
                        {getStockText(selectedProduct)}
                      </Badge>
                    )}
                    {showPrice && (
                      <span className="text-xs text-muted-foreground">S/ {selectedProduct.cost_price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0 max-h-[400px]" align="start">
          <Command shouldFilter={false} className="h-full">
            <CommandInput
              placeholder="Escribe al menos 2 caracteres para buscar..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Buscando productos...
                </div>
              ) : (
                <>
                  {displayProducts.length === 0 && searchValue.length >= 2 ? (
                    <CommandEmpty>
                      <div className="text-center p-4">
                        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          No se encontraron productos para "{searchValue}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Intenta con otro término de búsqueda o contacta al área de inventario.
                        </p>
                      </div>
                    </CommandEmpty>
                  ) : displayProducts.length === 0 && searchValue.length < 2 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {popularProducts.length > 0
                        ? "Productos populares aparecerán aquí. Escribe para buscar más productos."
                        : "Escribe al menos 2 caracteres para buscar productos..."}
                    </div>
                  ) : (
                    <CommandGroup>
                      {searchValue.length < 2 && popularProducts.length > 0 && (
                        <div className="px-2 py-1 text-xs text-muted-foreground border-b">Productos populares</div>
                      )}

                      {displayProducts.map((product) => {
                        const displayStock = product.is_serialized
                          ? (product.calculated_stock ?? 0)
                          : product.current_stock

                        return (
                          <CommandItem
                            key={product.id}
                            value={`${product.id}-${product.code}-${product.name}`}
                            onSelect={() => handleSelectProduct(product)}
                            className="flex items-center justify-between p-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedProduct?.id === product.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{product.name}</span>
                                  {displayStock <= 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {product.code}
                                  </Badge>
                                  {product.internal_product_categories && (
                                    <Badge variant="outline" className="text-xs">
                                      {product.internal_product_categories.name}
                                    </Badge>
                                  )}
                                  {selectedCompany && product.company_id !== selectedCompany.id && (
                                    <Badge variant="destructive" className="text-xs">
                                      {product.company.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {showPrice && <p className="text-sm font-medium">S/ {product.cost_price.toFixed(2)}</p>}
                                {showStock && (
                                  <Badge variant={getStockBadgeVariant(product)} className="text-xs">
                                    {getStockText(product)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        )
                      })}

                      {/* Info footer */}
                      {displayProducts.length > 0 && (
                        <div className="border-t p-3 text-center bg-muted/50">
                          <p className="text-xs text-muted-foreground">
                            {searchValue.length >= 2
                              ? `${displayProducts.length} productos encontrados. Los productos de otras empresas aparecen marcados.`
                              : "Productos más utilizados. Escribe para buscar más productos."}
                          </p>
                        </div>
                      )}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
