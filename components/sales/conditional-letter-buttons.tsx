"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Shield, CreditCard } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ConditionalLetterButtonsProps {
  entityId: string
  onGenerateWarranty: () => void
  onGenerateCCI: () => void
  variant?: "dropdown" | "buttons"
  size?: "sm" | "default"
}

export function ConditionalLetterButtons({
  entityId,
  onGenerateWarranty,
  onGenerateCCI,
  variant = "dropdown",
  size = "default",
}: ConditionalLetterButtonsProps) {
  const [clientType, setClientType] = useState<"private" | "government" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClientType = async () => {
      try {
        const { data, error } = await supabase.from("sales_entities").select("client_type").eq("id", entityId).single()

        if (error) {
          console.error("Error fetching client type:", error)
          setClientType(null)
        } else {
          setClientType(data?.client_type || null)
        }
      } catch (error) {
        console.error("Error in fetchClientType:", error)
        setClientType(null)
      } finally {
        setLoading(false)
      }
    }

    if (entityId) {
      fetchClientType()
    }
  }, [entityId])

  const shouldShowWarranty = true // Siempre mostrar garantía
  const shouldShowCCI = clientType === "government" // Solo para gubernamentales

  if (loading) {
    return null // No mostrar nada mientras carga
  }

  if (variant === "dropdown") {
    return (
      <>
        {shouldShowWarranty && (
          <DropdownMenuItem onClick={onGenerateWarranty}>
            <Shield className="mr-2 h-4 w-4 text-green-600" />
            Carta de garantía
          </DropdownMenuItem>
        )}
        {shouldShowCCI && (
          <DropdownMenuItem onClick={onGenerateCCI}>
            <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
            Carta de CCI
          </DropdownMenuItem>
        )}
      </>
    )
  }

  // Variant "buttons" para vista móvil
  return (
    <>
      {shouldShowWarranty && (
        <Button
          variant="outline"
          size={size}
          className="w-full bg-transparent text-green-600 hover:bg-green-50"
          onClick={onGenerateWarranty}
        >
          <Shield className="h-4 w-4 mr-1" />
          Garantía
        </Button>
      )}
      {shouldShowCCI && (
        <Button
          variant="outline"
          size={size}
          className="w-full bg-transparent text-blue-600 hover:bg-blue-50"
          onClick={onGenerateCCI}
        >
          <CreditCard className="h-4 w-4 mr-1" />
          CCI
        </Button>
      )}
    </>
  )
}
