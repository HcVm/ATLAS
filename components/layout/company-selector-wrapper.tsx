"use client"

import { useCompany } from "@/lib/company-context"
import { CompanySelector } from "./company-selector"

export function CompanySelectorWrapper() {
  const { allCompanies } = useCompany()

  // No mostrar nada si no hay empresas o solo hay una
  if (!allCompanies || allCompanies.length <= 1) {
    return null
  }

  return <CompanySelector />
}
