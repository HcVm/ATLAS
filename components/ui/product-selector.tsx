"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Package, AlertTriangle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

interface Product {
  id: string
  code: string
  name: string
  description: string | null
  sale_price: number
  current_stock: number
  unit_of_measure: string
  image_url: string | null
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts()
    }
  }, [selectedCompany])

  useEffect(() => {
    console.log("ProductSelector: Filtering products", {
      searchValue,
      productsCount: products.length,
      searchTerm: searchValue.toLowerCase(),
    })

    // Filtrar productos basado en el texto de búsqueda
    if (searchValue.trim() === "") {
      const initialProducts = products.slice(0, 50)
      console.log("ProductSelector: No search, showing first 50:", initialProducts.length)
      setFilteredProducts(initialProducts)
    } else {
      const searchTerm = searchValue.toLowerCase()
      const filtered = products.filter((product) => {
        const matchesCode = product.code.toLowerCase().includes(searchTerm)
        const matchesName = product.name.toLowerCase().includes(searchTerm)
        const matchesDescription = product.description && product.description.toLowerCase().includes(searchTerm)
        const matchesBrand = product.brands?.name && product.brands.name.toLowerCase().includes(searchTerm)
        const matchesCategory = product.categories?.name && product.categories.name.toLowerCase().includes(searchTerm)

        const matches = matchesCode || matchesName || matchesDescription || matchesBrand || matchesCategory

        if (matches) {
          console.log("ProductSelector: Match found:", product.name, {
            matchesCode,
            matchesName,
            matchesBrand,
            matchesCategory,
          })
        }

        return matches
      })

      console.log("ProductSelector: Filtered results:", filtered.length)
      setFilteredProducts(filtered.slice(0, 20))
    }
  }, [searchValue, products])

  useEffect(() => {
    // Encontrar el producto seleccionado por ID
    if (value) {
      const product = products.find((p) => p.id === value)
      setSelectedProduct(product || null)
    } else {
      setSelectedProduct(null)
    }
  }, [value, products])

  const fetchProducts = async () => {
    if (!selectedCompany) {
      console.log("ProductSelector: No company selected")
      return
    }

    console.log("ProductSelector: Fetching products for company:", selectedCompany.id)
    setLoading(true)

    try {
      // Primero intentar una consulta simple sin relaciones
      const { data: simpleData, error: simpleError } = await supabase
        .from("products")
        .select(
          "id, code, name, description, sale_price, current_stock, unit_of_measure, image_url, brand_id, category_id",
        )
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true)
        .order("name")

      if (simpleError) {
        console.error("ProductSelector: Error in simple query:", simpleError)
        throw simpleError
      }

      console.log("ProductSelector: Found products (simple):", simpleData?.length || 0)

      if (!simpleData || simpleData.length === 0) {
        // Si no hay productos, verificar si existen productos para esta empresa
        const { data: allProducts, error: allError } = await supabase
          .from("products")
          .select("id, name, is_active, company_id")
          .eq("company_id", selectedCompany.id)

        console.log("ProductSelector: All products for company:", allProducts?.length || 0)
        if (allProducts) {
          console.log("ProductSelector: Active products:", allProducts.filter((p) => p.is_active).length)
          console.log("ProductSelector: Inactive products:", allProducts.filter((p) => !p.is_active).length)
        }
      }

      // Ahora intentar obtener las relaciones por separado
      const productsWithRelations = await Promise.all(
        (simpleData || []).map(async (product) => {
          let brandName = ""
          let categoryName = ""

          // Obtener marca si existe
          if (product.brand_id) {
            const { data: brand } = await supabase.from("brands").select("name").eq("id", product.brand_id).single()
            brandName = brand?.name || ""
          }

          // Obtener categoría si existe
          if (product.category_id) {
            const { data: category } = await supabase
              .from("product_categories")
              .select("name")
              .eq("id", product.category_id)
              .single()
            categoryName = category?.name || ""
          }

          return {
            ...product,
            brands: brandName ? { name: brandName } : null,
            categories: categoryName ? { name: categoryName } : null,
          }
        }),
      )

      console.log("ProductSelector: Products with relations:", productsWithRelations.length)
      setProducts(productsWithRelations)
    } catch (error: any) {
      console.error("ProductSelector: Error fetching products:", error)
      toast.error("Error al cargar productos: " + error.message)

      // Como fallback, intentar cargar solo los datos básicos
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("products")
          .select("id, code, name, description, sale_price, current_stock, unit_of_measure")
          .eq("company_id", selectedCompany.id)
          .eq("is_active", true)
          .order("name")

        if (!fallbackError && fallbackData) {
          console.log("ProductSelector: Fallback data loaded:", fallbackData.length)
          setProducts(fallbackData.map((p) => ({ ...p, brands: null, categories: null })))
        }
      } catch (fallbackError) {
        console.error("ProductSelector: Fallback also failed:", fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

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
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedProduct ? (
              <div className="flex items-center gap-2 flex-1 text-left">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="truncate font-medium">{selectedProduct.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedProduct.code}
                    </Badge>
                    {selectedProduct.brands && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedProduct.brands.name}
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

        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por código, nombre, marca o categoría..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Cargando productos...</div>
              ) : (
                <>
                  {filteredProducts.length === 0 && searchValue.trim() !== "" ? (
                    <CommandEmpty>
                      <div className="text-center p-4">
                        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          No se encontraron productos para "{searchValue}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Intenta con otro término de búsqueda o contacta al área de inventario para agregar nuevos
                          productos.
                        </p>
                      </div>
                    </CommandEmpty>
                  ) : filteredProducts.length === 0 && searchValue.trim() === "" ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {products.length > 0 ? "Escribe para buscar productos..." : "No hay productos disponibles"}
                    </div>
                  ) : (
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.id}-${product.code}-${product.name}`}
                          onSelect={() => handleSelectProduct(product)}
                          className="flex items-center justify-between p-3"
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
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {product.code}
                                </Badge>
                                {product.brands && (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.brands.name}
                                  </Badge>
                                )}
                                {product.categories && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.categories.name}
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

                      {/* Mensaje informativo al final */}
                      {filteredProducts.length > 0 && (
                        <div className="border-t p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            ¿No encuentras el producto? Contacta al área de inventario para agregarlo.
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
