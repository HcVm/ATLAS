// lib/brand-utils.ts
export const BASE_MONITORED_BRANDS = ["WORLDLIFE", "HOPE LIFE", "ZEUS", "VALHALLA"] as const

export const ALL_BRAND_SEARCH_PATTERNS = new Map<string, string>()

BASE_MONITORED_BRANDS.forEach((brand) => {
  ALL_BRAND_SEARCH_PATTERNS.set(brand, brand)
  ALL_BRAND_SEARCH_PATTERNS.set(`MARCA: ${brand}`, brand)
  ALL_BRAND_SEARCH_PATTERNS.set(`MARCA:${brand}`, brand)
  ALL_BRAND_SEARCH_PATTERNS.set(`MARCA ${brand}`, brand)

  if (brand === "HOPE LIFE") {
    ALL_BRAND_SEARCH_PATTERNS.set("HOPELIFE", brand)
    ALL_BRAND_SEARCH_PATTERNS.set("MARCA: HOPELIFE", brand)
    ALL_BRAND_SEARCH_PATTERNS.set("MARCA:HOPELIFE", brand)
    ALL_BRAND_SEARCH_PATTERNS.set("Hope Life", brand)
    ALL_BRAND_SEARCH_PATTERNS.set("HopeLife", brand)
  }

  const lower = brand.toLowerCase()
  ALL_BRAND_SEARCH_PATTERNS.set(`marca: ${lower}`, brand)
  ALL_BRAND_SEARCH_PATTERNS.set(`marca:${lower}`, brand)
  ALL_BRAND_SEARCH_PATTERNS.set(`marca ${lower}`, brand)
})

// === FUNCIÓN DE NORMALIZACIÓN ===
export function normalizeBrand(input: string): string {
  if (!input) return ""
  const upper = input.toUpperCase().trim()
  return ALL_BRAND_SEARCH_PATTERNS.get(upper) || upper
}