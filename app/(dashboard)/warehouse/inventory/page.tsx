"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-user"
import { Loader2, Paperclip } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function InventoryPage() {
  const { user } = useUser()
  const { toast } = useToast()

  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  const [selectedCompany, setSelectedCompany] = useState<any>(null)

  const [showMovementDialog, setShowMovementDialog] = useState(false)
  const [isCreatingMovement, setIsCreatingMovement] = useState(false)

  const [movementAttachments, setMovementAttachments] = useState<Record<string, any[]>>({})

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", user?.role === "admin" ? selectedCompany?.id : user?.company_id)

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch products. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          *,
          products (
            name
          )
        `)
        .eq("company_id", user?.role === "admin" ? selectedCompany?.id : user?.company_id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setMovements(data || [])
    } catch (error: any) {
      console.error("Error fetching movements:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch movements. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from("companies").select("*")

      if (error) throw error

      setCompanies(data || [])
    } catch (error: any) {
      console.error("Error fetching companies:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch companies. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*")

      if (error) throw error

      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch departments. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchMovements()
    fetchCompanies()
    fetchDepartments()
  }, [user])

  useEffect(() => {
    if (user?.role === "admin") {
      fetchProducts()
      fetchMovements()
    }
  }, [selectedCompany])

  const handleCreateMovement = async (data: any) => {
    try {
      setIsCreatingMovement(true)

      // For admin users, use selectedCompany; for others, use their assigned company
      const companyId = user?.role === "admin" ? selectedCompany?.id : user?.company_id

      if (!companyId) {
        toast({
          title: "Error",
          description: "No hay empresa seleccionada",
          variant: "destructive",
        })
        return
      }

      const { data: movementData, error } = await supabase
        .from("inventory_movements")
        .insert({
          product_id: data.product_id,
          movement_type: data.movement_type,
          quantity: data.quantity,
          sale_price: data.sale_price,
          total_amount: data.total_amount,
          purchase_order_number: data.purchase_order_number,
          destination_entity_name: data.destination_entity_name,
          destination_department_id: data.destination_department_id,
          destination_address: data.destination_address,
          supplier: data.supplier,
          reason: data.reason,
          notes: data.notes,
          company_id: companyId,
          created_by: user.id,
          movement_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Update product stock
      const product = products.find((p) => p.id === data.product_id)
      if (product) {
        let newStock = product.current_stock

        if (data.movement_type === "entrada") {
          newStock += data.quantity
        } else if (data.movement_type === "salida") {
          newStock -= data.quantity
        } else if (data.movement_type === "ajuste") {
          newStock = data.quantity
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({ current_stock: newStock })
          .eq("id", data.product_id)

        if (updateError) throw updateError
      }

      toast({
        title: "Movimiento creado",
        description: "El movimiento de inventario ha sido registrado exitosamente.",
      })

      setShowMovementDialog(false)
      fetchMovements()
      fetchProducts()

      // Return the created movement data for attachment upload
      return movementData
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el movimiento. Intente nuevamente.",
        variant: "destructive",
      })
      throw error // Re-throw so the dialog can handle it
    } finally {
      setIsCreatingMovement(false)
    }
  }

  const AttachmentsList = ({ movementId }: { movementId: string }) => {
    const attachments = movementAttachments[movementId] || []

    if (attachments.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">Documentos adjuntos:</p>
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center gap-2">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate"
            >
              {attachment.file_name}
            </a>
            <span className="text-xs text-muted-foreground">
              ({(attachment.file_size / 1024 / 1024).toFixed(1)} MB)
            </span>
          </div>
        ))}
      </div>
    )
  }

  const fetchMovementAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_movement_attachments")
        .select(`
          id,
          movement_id,
          file_name,
          file_url,
          file_size,
          file_type,
          created_at,
          profiles:uploaded_by (
            full_name
          )
        `)
        .in(
          "movement_id",
          movements.map((m) => m.id),
        )

      if (error) throw error

      // Group attachments by movement_id
      const groupedAttachments = (data || []).reduce(
        (acc, attachment) => {
          if (!acc[attachment.movement_id]) {
            acc[attachment.movement_id] = []
          }
          acc[attachment.movement_id].push(attachment)
          return acc
        },
        {} as Record<string, any[]>,
      )

      setMovementAttachments(groupedAttachments)
    } catch (error) {
      console.error("Error fetching movement attachments:", error)
    }
  }

  useEffect(() => {
    if (movements.length > 0) {
      fetchMovementAttachments()
    }
  }, [movements])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventario</h1>

        {user?.role === "admin" && (
          <Select onValueChange={(value) => setSelectedCompany(companies.find((c) => c.id === value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona una empresa" defaultValue={user?.company_id} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
          <DialogTrigger asChild>
            <Button>Crear Movimiento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Movimiento de Inventario</DialogTitle>
              <DialogDescription>Realiza un nuevo movimiento de inventario.</DialogDescription>
            </DialogHeader>
            <CreateMovementForm
              products={products}
              departments={departments}
              onCreate={handleCreateMovement}
              isLoading={isCreatingMovement}
              onCancel={() => setShowMovementDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableCaption>Una lista de los movimientos de inventario.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio de Venta</TableHead>
            <TableHead>Monto Total</TableHead>
            <TableHead>Orden de Compra</TableHead>
            <TableHead>Entidad Destino</TableHead>
            <TableHead>Departamento Destino</TableHead>
            <TableHead>Dirección Destino</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Razón</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead>Adjuntos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>{movement.products?.name}</TableCell>
              <TableCell>{movement.movement_type}</TableCell>
              <TableCell>{movement.quantity}</TableCell>
              <TableCell>{movement.sale_price}</TableCell>
              <TableCell>{movement.total_amount}</TableCell>
              <TableCell>{movement.purchase_order_number}</TableCell>
              <TableCell>{movement.destination_entity_name}</TableCell>
              <TableCell>{movement.destination_department_id}</TableCell>
              <TableCell>{movement.destination_address}</TableCell>
              <TableCell>{movement.supplier}</TableCell>
              <TableCell>{movement.reason}</TableCell>
              <TableCell>{movement.notes}</TableCell>
              <TableCell>
                <AttachmentsList movementId={movement.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={12}>{movements.length} Movimientos Totales</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

interface CreateMovementFormProps {
  products: any[]
  departments: any[]
  onCreate: (data: any) => Promise<any>
  isLoading: boolean
  onCancel: () => void
}

function CreateMovementForm({ products, departments, onCreate, isLoading, onCancel }: CreateMovementFormProps) {
  const { toast } = useToast()
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null)
  const [movementType, setMovementType] = useState<"entrada" | "salida" | "ajuste">("entrada")
  const [quantity, setQuantity] = useState<number>(0)
  const [salePrice, setSalePrice] = useState<number>(0)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState<string>("")
  const [destinationEntityName, setDestinationEntityName] = useState<string>("")
  const [destinationAddress, setDestinationAddress] = useState<string>("")
  const [supplier, setSupplier] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [movementDate, setMovementDate] = useState<Date | undefined>(new Date())

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un producto.",
        variant: "destructive",
      })
      return
    }

    if (!quantity || quantity <= 0) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una cantidad válida.",
        variant: "destructive",
      })
      return
    }

    const data = {
      product_id: selectedProduct.id,
      movement_type: movementType,
      quantity: quantity,
      sale_price: salePrice,
      total_amount: totalAmount,
      purchase_order_number: purchaseOrderNumber,
      destination_entity_name: destinationEntityName,
      destination_department_id: selectedDepartment?.id,
      destination_address: destinationAddress,
      supplier: supplier,
      reason: reason,
      notes: notes,
      movement_date: movementDate,
    }

    try {
      const movementData = await onCreate(data)
      // Handle success, clear form, etc.
      console.log("Movement created successfully:", movementData)
    } catch (error) {
      // Handle error
      console.error("Failed to create movement:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="product">Producto</Label>
        <Select onValueChange={(value) => setSelectedProduct(products.find((p) => p.id === value))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="movementType">Tipo de Movimiento</Label>
        <Select onValueChange={(value) => setMovementType(value as "entrada" | "salida" | "ajuste")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="salida">Salida</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="salePrice">Precio de Venta</Label>
        <Input type="number" id="salePrice" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="totalAmount">Monto Total</Label>
        <Input
          type="number"
          id="totalAmount"
          value={totalAmount}
          onChange={(e) => setTotalAmount(Number(e.target.value))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="purchaseOrderNumber">Orden de Compra</Label>
        <Input
          type="text"
          id="purchaseOrderNumber"
          value={purchaseOrderNumber}
          onChange={(e) => setPurchaseOrderNumber(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="destinationEntityName">Entidad Destino</Label>
        <Input
          type="text"
          id="destinationEntityName"
          value={destinationEntityName}
          onChange={(e) => setDestinationEntityName(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="destinationDepartment">Departamento Destino</Label>
        <Select onValueChange={(value) => setSelectedDepartment(departments.find((d) => d.id === value))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="destinationAddress">Dirección Destino</Label>
        <Input
          type="text"
          id="destinationAddress"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="supplier">Proveedor</Label>
        <Input type="text" id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reason">Razón</Label>
        <Input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Fecha de Movimiento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[240px] justify-start text-left font-normal", !movementDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {movementDate ? format(movementDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={movementDate}
              onSelect={setMovementDate}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            Creando...
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          </>
        ) : (
          "Crear Movimiento"
        )}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  )
}
