"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Package, AlertTriangle, Search, Loader2, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

interface Product {
  id: string
  code: string
  name: string
  description: string | null // Aseguramos que description está aquí
  sale_price: number
  current_stock: number
  unit_of_measure: string
  image_url: string | null
  company_id: string
  company: {
    id: string
    name: string
    ruc: string
  }
  brands?: {
    name: string
  }
  categories?: {
    name: string
  }
}

interface ProductSelectorProps {
  value?: string
  onSelect: (product: Product) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  showStock?: boolean
  showPrice?: boolean
  disabled?: boolean
}

// Cache para resultados de búsqueda
const searchCache = new Map<string, Product[]>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
const cacheTimestamps = new Map<string, number>()

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

export function ProductSelector({
  value,
  onSelect,
  placeholder = "Buscar producto...",
  label = "Producto",
  required = false,
  className,
  showStock = true,
  showPrice = true,
  disabled = false,
}: ProductSelectorProps) {
  const { selectedCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [popularProducts, setPopularProducts] = useState<Product[]>([])

  // Debounce search value
  const debouncedSearchValue = useDebounce(searchValue, 300)

  // Memoized cache key
  const cacheKey = useMemo(() => {
    return `products_${debouncedSearchValue.toLowerCase().trim()}_${selectedCompany?.id || "all"}`
  }, [debouncedSearchValue, selectedCompany?.id])

  // Check if cache is valid
  const isCacheValid = useCallback((key: string) => {
    const timestamp = cacheTimestamps.get(key)
    if (!timestamp) return false
    return Date.now() - timestamp < CACHE_DURATION
  }, [])

  // Get cached results
  const getCachedResults = useCallback(
    (key: string) => {
      if (isCacheValid(key)) {
        return searchCache.get(key) || []
      }
      return null
    },
    [isCacheValid],
  )

  // Set cache
  const setCacheResults = useCallback((key: string, results: Product[]) => {
    searchCache.set(key, results)
    cacheTimestamps.set(key, Date.now())
  }, [])

  // Preload popular products (top 10 most sold or recently used)
  const preloadPopularProducts = useCallback(async () => {
    try {
      const { data: popularData, error } = await supabase
        .from("products")
        .select(`
          id, code, name, description, sale_price, current_stock, unit_of_measure, image_url,
          companies!inner(id, name, ruc),
          brands!products_brand_id_fkey(name),
          product_categories!products_category_id_fkey(name)
        `) // AHORA INCLUYE description
        .eq("is_active", true)
        .order("current_stock", { ascending: false })
        .limit(10)

      if (!error && popularData) {
        const formattedProducts = popularData.map((p) => ({
          ...p,
          description: p.description, // CORREGIDO: Asignar la descripción real
          categories: p.product_categories,
          company: p.companies,
          brands: p.brands,
        }))
        setPopularProducts(formattedProducts)
      }
    } catch (error) {
      console.error("Error preloading popular products:", error)
    }
  }, [])

  // Load popular products on mount
  useEffect(() => {
    preloadPopularProducts()
  }, [preloadPopularProducts])

  // Search products with optimization
  const searchProducts = useCallback(
    async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setProducts(popularProducts)
        setHasSearched(false)
        return
      }

      // Check cache first
      const cached = getCachedResults(cacheKey)
      if (cached) {
        console.log("ProductSelector: Using cached results for:", searchTerm)
        setProducts(cached)
        setHasSearched(true)
        return
      }

      console.log("ProductSelector: Searching for:", searchTerm)
      setLoading(true)
      setHasSearched(true)

      try {
        const { data: searchData, error } = await supabase
          .from("products")
          .select(`
          id, code, name, description, sale_price, current_stock, unit_of_measure, image_url,
          company_id, brand_id, category_id,
          companies!inner(id, name, ruc),
          brands!products_brand_id_fkey(name),
          product_categories!products_category_id_fkey(name)
        `)
          .eq("is_active", true)
          .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order("name")
          .limit(20)

        if (error) throw error

        if (!searchData || searchData.length === 0) {
          setProducts([])
          setCacheResults(cacheKey, [])
          return
        }

        // Format products with relations
        const formattedProducts = searchData.map((product) => ({
          ...product,
          brands: product.brands,
          categories: product.product_categories,
          company: product.companies,
        }))

        setProducts(formattedProducts)
        setCacheResults(cacheKey, formattedProducts)
      } catch (error: any) {
        console.error("ProductSelector: Search error:", error)
        toast.error("Error al buscar productos: " + error.message)
        setProducts([])
      } finally {
        setLoading(false)
      }
    },
    [cacheKey, getCachedResults, setCacheResults, popularProducts],
  )

  // Effect for debounced search
  useEffect(() => {
    searchProducts(debouncedSearchValue)
  }, [debouncedSearchValue, searchProducts])

  // Find selected product
  useEffect(() => {
    if (value) {
      // First check in current products
      let product = products.find((p) => p.id === value)

      // If not found and we have popular products, check there
      if (!product && popularProducts.length > 0) {
        product = popularProducts.find((p) => p.id === value)
      }

      // If still not found, fetch it directly
      if (!product) {
        fetchSelectedProduct(value)
      } else {
        setSelectedProduct(product)
      }
    } else {
      setSelectedProduct(null)
    }
  }, [value, products, popularProducts])

  // Fetch selected product if not in current results
  const fetchSelectedProduct = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, code, name, description, sale_price, current_stock, unit_of_measure, image_url,
          company_id, brand_id, category_id,
          companies!inner(id, name, ruc),
          brands!products_brand_id_fkey(name),
          product_categories!products_category_id_fkey(name)
        `)
        .eq("id", productId)
        .single()

      if (!error && data) {
        const formattedProduct = {
          ...data,
          brands: data.brands,
          categories: data.product_categories,
          company: data.companies,
        }

        setSelectedProduct(formattedProduct)
      }
    } catch (error) {
      console.error("Error fetching selected product:", error)
    }
  }, [])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    onSelect(product)
    setOpen(false)
    setSearchValue("")
  }

  const getStockBadgeVariant = (stock: number) => {
    if (stock <= 0) return "destructive"
    if (stock <= 10) return "secondary"
    return "outline"
  }

  const getStockText = (stock: number, unit: string) => {
    if (stock <= 0) return "Sin stock"
    return `${stock} ${unit}`
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
            disabled={disabled}
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
                    {selectedProduct.brands?.name && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {selectedProduct.brands.name}
                      </Badge>
                    )}
                    {selectedCompany && selectedProduct.company_id !== selectedCompany.id && (
                      <Badge variant="destructive" className="text-xs">
                        {selectedProduct.company.name}
                      </Badge>
                    )}
                    {showStock && (
                      <Badge variant={getStockBadgeVariant(selectedProduct.current_stock)} className="text-xs">
                        {getStockText(selectedProduct.current_stock, selectedProduct.unit_of_measure)}
                      </Badge>
                    )}
                    {showPrice && (
                      <span className="text-xs text-muted-foreground">S/ {selectedProduct.sale_price.toFixed(2)}</span>
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

                      {displayProducts.map((product) => (
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
                                {product.current_stock <= 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {product.code}
                                </Badge>
                                {product.brands?.name && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> {product.brands.name}
                                  </Badge>
                                )}
                                {product.categories && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.categories.name}
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
                              {showPrice && <p className="text-sm font-medium">S/ {product.sale_price.toFixed(2)}</p>}
                              {showStock && (
                                <Badge variant={getStockBadgeVariant(product.current_stock)} className="text-xs">
                                  {getStockText(product.current_stock, product.unit_of_measure)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}

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
