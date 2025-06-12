"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCompany } from "@/lib/company-context"
import { Badge } from "@/components/ui/badge"

export function CompanySelector() {
  const { selectedCompany, allCompanies, setSelectedCompany } = useCompany()
  const [open, setOpen] = useState(false)

  if (!allCompanies || allCompanies.length <= 1) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full md:w-[200px] justify-between">
          {selectedCompany ? (
            <div className="flex items-center gap-2">
              <Badge
                style={{ backgroundColor: selectedCompany.color || "#888888" }}
                className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-white font-bold"
              >
                {selectedCompany.code.substring(0, 1)}
              </Badge>
              <span>{selectedCompany.code}</span>
            </div>
          ) : (
            <span>Seleccionar empresa</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full md:w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>No se encontraron empresas.</CommandEmpty>
            <CommandGroup>
              {allCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.code}
                  onSelect={() => {
                    setSelectedCompany(company)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Badge
                    style={{ backgroundColor: company.color || "#888888" }}
                    className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-white font-bold"
                  >
                    {company.code.substring(0, 1)}
                  </Badge>
                  <span>{company.name}</span>
                  <Check
                    className={cn("ml-auto h-4 w-4", selectedCompany?.id === company.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
