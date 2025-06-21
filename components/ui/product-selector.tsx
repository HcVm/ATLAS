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
    // Filtrar productos basado en el texto de búsqueda
    if (searchValue.trim() === "") {
      setFilteredProducts(products.slice(0, 50)) // Mostrar solo los primeros 50 para performance
    } else {
      const searchTerm = searchValue.toLowerCase()
      const filtered = products
        .filter(
          (product) =>
            product.code.toLowerCase().includes(searchTerm) ||
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
            (product.brands?.name && product.brands.name.toLowerCase().includes(searchTerm)) ||
            (product.categories?.name && product.categories.name.toLowerCase().includes(searchTerm)),
        )
        .slice(0, 20) // Limitar resultados para performance
      setFilteredProducts(filtered)
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
    if (!selectedCompany) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, code, name, description, sale_price, current_stock, unit_of_measure, image_url,
          brands (id, name),
          categories (id, name)
        `)
        .eq("company_id", selectedCompany.id)
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
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
          <Command>
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
                      Escribe para buscar productos...
                    </div>
                  ) : (
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
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
                              {product.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{product.description}</p>
                              )}
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
