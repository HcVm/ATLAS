"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
  fiscal_address: string | null
  email: string | null
  contact_person: string | null
}

interface EntitySelectorProps {
  value?: string
  onSelect: (entity: SalesEntity) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export function EntitySelector({
  value,
  onSelect,
  placeholder = "Buscar entidad...",
  label = "Entidad",
  required = false,
  className,
}: EntitySelectorProps) {
  const { selectedCompany } = useCompany()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [entities, setEntities] = useState<SalesEntity[]>([])
  const [filteredEntities, setFilteredEntities] = useState<SalesEntity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<SalesEntity | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Form para crear nueva entidad
  const [newEntity, setNewEntity] = useState({
    name: "",
    ruc: "",
    executing_unit: "",
    fiscal_address: "",
    email: "",
    contact_person: "",
  })

  useEffect(() => {
    if (selectedCompany) {
      fetchEntities()
    }
  }, [selectedCompany])

  useEffect(() => {
    // Filtrar entidades basado en el texto de búsqueda
    if (searchValue.trim() === "") {
      setFilteredEntities(entities)
    } else {
      const filtered = entities.filter(
        (entity) =>
          entity.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          entity.ruc.includes(searchValue) ||
          (entity.executing_unit && entity.executing_unit.includes(searchValue)) ||
          (entity.fiscal_address && entity.fiscal_address.toLowerCase().includes(searchValue.toLowerCase())) ||
          (entity.email && entity.email.toLowerCase().includes(searchValue.toLowerCase())) ||
          (entity.contact_person && entity.contact_person.toLowerCase().includes(searchValue.toLowerCase())),
      )
      setFilteredEntities(filtered)
    }
  }, [searchValue, entities])

  useEffect(() => {
    // Encontrar la entidad seleccionada por ID
    if (value) {
      const entity = entities.find((e) => e.id === value)
      setSelectedEntity(entity || null)
    } else {
      setSelectedEntity(null)
    }
  }, [value, entities])

  const fetchEntities = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("sales_entities")
        .select("id, name, ruc, executing_unit, fiscal_address, email, contact_person")
        .eq("company_id", selectedCompany.id)
        .order("name")

      if (error) throw error
      setEntities(data || [])
    } catch (error: any) {
      console.error("Error fetching entities:", error)
      toast.error("Error al cargar entidades")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    if (!newEntity.name.trim() || !newEntity.ruc.trim()) {
      toast.error("Nombre y RUC son obligatorios")
      return
    }

    try {
      const { data, error } = await supabase
        .from("sales_entities")
        .insert([
          {
            name: newEntity.name.trim(),
            ruc: newEntity.ruc.trim(),
            executing_unit: newEntity.executing_unit.trim() || null,
            fiscal_address: newEntity.fiscal_address.trim() || null,
            email: newEntity.email.trim() || null,
            contact_person: newEntity.contact_person.trim() || null,
            company_id: selectedCompany.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      toast.success("Entidad creada exitosamente")

      // Actualizar la lista de entidades
      setEntities((prev) => [...prev, data])

      // Seleccionar la nueva entidad
      onSelect(data)
      setSelectedEntity(data)

      // Limpiar formulario y cerrar diálogo
      setNewEntity({ name: "", ruc: "", executing_unit: "", fiscal_address: "", email: "", contact_person: "" })
      setShowCreateDialog(false)
      setOpen(false)
    } catch (error: any) {
      console.error("Error creating entity:", error)
      toast.error("Error al crear la entidad: " + error.message)
    }
  }

  const handleSelectEntity = (entity: SalesEntity) => {
    setSelectedEntity(entity)
    onSelect(entity)
    setOpen(false)
    setSearchValue("")
  }

  const handleCreateFromSearch = () => {
    // Pre-llenar el formulario con el texto de búsqueda si parece ser un nombre
    if (searchValue.trim() && !searchValue.includes("-") && searchValue.length > 2) {
      setNewEntity((prev) => ({ ...prev, name: searchValue.trim() }))
    }
    setShowCreateDialog(true)
    setOpen(false)
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
            className="w-full justify-between bg-transparent"
          >
            {selectedEntity ? (
              <div className="flex items-center gap-2 flex-1 text-left">
                <span className="truncate">{selectedEntity.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedEntity.ruc}
                </Badge>
                {selectedEntity.executing_unit && (
                  <Badge variant="secondary" className="text-xs">
                    U.E: {selectedEntity.executing_unit}
                  </Badge>
                )}
                {selectedEntity.fiscal_address && (
                  <Badge variant="secondary" className="text-xs">
                    Dir: {selectedEntity.fiscal_address}
                  </Badge>
                )}
                {selectedEntity.email && (
                  <Badge variant="secondary" className="text-xs">
                    Email: {selectedEntity.email}
                  </Badge>
                )}
                {selectedEntity.contact_person && (
                  <Badge variant="secondary" className="text-xs">
                    Contacto: {selectedEntity.contact_person}
                  </Badge>
                )}
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
              placeholder="Buscar por nombre, RUC, unidad ejecutora, dirección fiscal, correo electrónico o persona de contacto..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Cargando entidades...</div>
              ) : (
                <>
                  {filteredEntities.length === 0 && searchValue.trim() !== "" ? (
                    <CommandEmpty>
                      <div className="text-center p-4">
                        <p className="text-sm text-muted-foreground mb-3">No se encontró "{searchValue}"</p>
                        <Button size="sm" onClick={handleCreateFromSearch} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Crear nueva entidad
                        </Button>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredEntities.map((entity) => (
                        <CommandItem
                          key={entity.id}
                          value={entity.id}
                          onSelect={() => handleSelectEntity(entity)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Check
                              className={cn("h-4 w-4", selectedEntity?.id === entity.id ? "opacity-100" : "opacity-0")}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{entity.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {entity.ruc}
                                </Badge>
                                {entity.executing_unit && (
                                  <Badge variant="secondary" className="text-xs">
                                    U.E: {entity.executing_unit}
                                  </Badge>
                                )}
                                {entity.fiscal_address && (
                                  <Badge variant="secondary" className="text-xs">
                                    Dir: {entity.fiscal_address}
                                  </Badge>
                                )}
                                {entity.email && (
                                  <Badge variant="secondary" className="text-xs">
                                    Email: {entity.email}
                                  </Badge>
                                )}
                                {entity.contact_person && (
                                  <Badge variant="secondary" className="text-xs">
                                    Contacto: {entity.contact_person}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}

                      {/* Opción para crear nueva entidad siempre visible */}
                      <CommandItem onSelect={handleCreateFromSearch}>
                        <Plus className="h-4 w-4 mr-2" />
                        <span>Crear nueva entidad</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Diálogo para crear nueva entidad */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Entidad</DialogTitle>
            <DialogDescription>Registra una nueva entidad (cliente) en el sistema</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntity} className="space-y-4">
            <div>
              <Label htmlFor="new_entity_name">Nombre de la Entidad *</Label>
              <Input
                id="new_entity_name"
                value={newEntity.name}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo de la entidad"
                required
              />
            </div>

            <div>
              <Label htmlFor="new_entity_ruc">RUC *</Label>
              <Input
                id="new_entity_ruc"
                value={newEntity.ruc}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, ruc: e.target.value }))}
                placeholder="20123456789"
                required
              />
            </div>

            <div>
              <Label htmlFor="new_entity_executing_unit">Unidad Ejecutora (Opcional)</Label>
              <Input
                id="new_entity_executing_unit"
                value={newEntity.executing_unit}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, executing_unit: e.target.value }))}
                placeholder="Ej: 001, 002, etc."
              />
            </div>

            <div>
              <Label htmlFor="new_entity_fiscal_address">Dirección Fiscal (Opcional)</Label>
              <Input
                id="new_entity_fiscal_address"
                value={newEntity.fiscal_address}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, fiscal_address: e.target.value }))}
                placeholder="Dirección fiscal de la entidad"
              />
            </div>

            <div>
              <Label htmlFor="new_entity_email">Correo Electrónico (Opcional)</Label>
              <Input
                id="new_entity_email"
                type="email"
                value={newEntity.email}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="new_entity_contact_person">Persona de Contacto (Opcional)</Label>
              <Input
                id="new_entity_contact_person"
                value={newEntity.contact_person}
                onChange={(e) => setNewEntity((prev) => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Nombre de la persona de contacto"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Entidad</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
