// Company information database for different brands and distributors
export interface CompanyInfo {
  id: string
  name: string
  code: string
  ruc: string | null
  logo_url: string | null
  color: string | null
}

/**
 * Fetches company information from database by company ID
 * Used to get distributor information for stickers
 */
export async function getCompanyInfoById(companyId: string): Promise<CompanyInfo | null> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, code, ruc, logo_url, color")
      .eq("id", companyId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("[v0] Error fetching company info:", error)
    return null
  }
}

/**
 * Fetches all companies (distributors)
 */
export async function getAllCompanies(): Promise<CompanyInfo[]> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, code, ruc, logo_url, color")
      .order("name")

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("[v0] Error fetching companies:", error)
    return []
  }
}
