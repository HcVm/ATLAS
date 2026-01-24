import { OpenDataEntryTest } from "./types"

// Function to normalize keys (uppercase, trim, remove accents)
function normalizeKey(key: string): string {
    return key.trim().toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function parseDate(dateStr: any): Date {
    if (!dateStr) return new Date()
    if (dateStr instanceof Date) return dateStr

    // Try "DD/MM/YYYY"
    if (typeof dateStr === "string" && dateStr.includes("/")) {
        const parts = dateStr.split("/")
        if (parts.length === 3) {
            // Assume DD/MM/YYYY
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
        }
    }

    // Try ISO
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? new Date() : d
}

function parseNumber(num: any): number {
    if (typeof num === "number") return num
    if (!num) return 0
    return parseFloat(num.toString().replace(/,/g, "")) || 0
}

export function transformToOpenDataEntry(rawItem: any): OpenDataEntryTest | null {
    try {
        // Helper to find value by fuzzy key match
        const getValue = (keywords: string[]): any => {
            const foundKey = Object.keys(rawItem).find(k => {
                const norm = normalizeKey(k)
                return keywords.some(kw => norm.includes(normalizeKey(kw)))
            })
            return foundKey ? rawItem[foundKey] : null
        }

        // Mandatory fields check
        const orden = getValue(["ORDEN_ELECTRONICA", "ORDEN ELECTRONICA", "OCID"])
        if (!orden) return null

        const monto = parseNumber(getValue(["MONTO_TOTAL", "MONTO TOTAL ENTREGA", "AMOUNT"]))

        return {
            codigo_acuerdo_marco: getValue(["CODIGO_ACUERDO_MARCO", "ACUERDO MARCO COD"]) || "DESCONOCIDO",
            ruc_proveedor: getValue(["RUC_PROVEEDOR", "PROVEEDOR RUC"]) || "",
            razon_social_proveedor: getValue(["RAZON_SOCIAL_PROVEEDOR", "PROVEEDOR"]) || "",
            ruc_entidad: getValue(["RUC_ENTIDAD", "ENTIDAD RUC"]) || "",
            razon_social_entidad: getValue(["RAZON_SOCIAL_ENTIDAD", "ENTIDAD"]) || "",
            unidad_ejecutora: getValue(["UNIDAD_EJECUTORA"]) || "",
            procedimiento: getValue(["PROCEDIMIENTO"]) || "Catálogo Electrónico",
            tipo_compra: getValue(["TIPO_COMPRA"]) || "Compra Ordinaria",
            orden_electronica: orden,
            estado_orden_electronica: getValue(["ESTADO_ORDEN", "ESTADO"]) || "FORMALIZADA",
            total_entregas: parseNumber(getValue(["TOTAL_ENTREGAS"])) || 1,
            nro_orden_fisica: getValue(["NRO_ORDEN_FISICA"]) || "-",
            orden_digitalizada: getValue(["LINK_ORDEN", "ORDEN DIGITALIZADA"]),

            fecha_publicacion: parseDate(getValue(["FECHA_PUBLICACION", "FECHA FORMALIZACION"])).toISOString(),
            fecha_aceptacion: parseDate(getValue(["FECHA_ACEPTACION"])).toISOString(),

            acuerdo_marco: getValue(["ACUERDO_MARCO_DESCRIPCION", "ACUERDO MARCO"]) || "",
            direccion_proveedor: getValue(["DIRECCION_PROVEEDOR"]),

            catalogo: getValue(["CATALOGO", "CATALOGO ID"]) || "Mobiliario",
            categoria: getValue(["CATEGORIA"]) || "General",

            descripcion_ficha_producto: getValue(["DESCRIPCION_FICHA", "PRODUCTO"]),
            marca_ficha_producto: getValue(["MARCA"]),
            nro_parte: getValue(["NRO_PARTE", "PART NUMBER"]),
            link_ficha_producto: getValue(["LINK_FICHA"]),

            nro_entrega: parseNumber(getValue(["NRO_ENTREGA"])) || 1,
            fecha_inicio_entrega: parseDate(getValue(["FECHA_INICIO_ENTREGA"])).toISOString(),
            plazo_entrega: parseNumber(getValue(["PLAZO_ENTREGA"])) || 0,
            fecha_fin_entrega: parseDate(getValue(["FECHA_FIN_ENTREGA"])).toISOString(),

            dep_entrega: getValue(["DEP_ENTREGA", "DEPARTAMENTO"]) || "",
            prov_entrega: getValue(["PROV_ENTREGA", "PROVINCIA"]) || "",
            dist_entrega: getValue(["DIST_ENTREGA", "DISTRITO"]) || "",
            direccion_entrega: getValue(["DIRECCION_ENTREGA"]),

            cantidad_entrega: parseNumber(getValue(["CANTIDAD_ENTREGA", "CANTIDAD"])),
            precio_unitario: parseNumber(getValue(["PRECIO_UNITARIO"])),
            sub_total: parseNumber(getValue(["SUB_TOTAL"])),
            igv_entrega: parseNumber(getValue(["IGV_ENTREGA", "IGV"])),
            monto_total_entrega: monto
        }
    } catch (e) {
        console.error("Error transforming item:", e, rawItem)
        return null
    }
}

export async function fetchPeruComprasData(url: string): Promise<OpenDataEntryTest[]> {
    try {
        // 1. Validate if URL is from Peru Compras (security)
        if (!url.includes("perucompras.gob.pe")) {
            throw new Error("La URL debe ser de un dominio de Perú Compras (.gob.pe)")
        }

        // 2. Fetch with Browser-like Headers
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.catalogos.perucompras.gob.pe/",
                "Connection": "keep-alive"
            }
        })

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`)

        // 3. Check Content Type (Detect redirects to HTML Login)
        const contentType = res.headers.get("content-type")
        const text = await res.text()

        if (contentType && contentType.includes("text/html")) {
            // If we got HTML, it might be the login page or an error page
            if (text.includes("<!DOCTYPE html>")) {
                console.error("Received HTML instead of JSON. Preview:", text.substring(0, 200))
                throw new Error("El servidor devolvió una página HTML (posiblemente Login o Error) en lugar de JSON. El enlace puede haber expirado o requerir sesión.")
            }
        }

        // 4. Parse JSON
        let data;
        try {
            data = JSON.parse(text)
        } catch (e) {
            throw new Error("No se pudo interpretar la respuesta como JSON válida.")
        }

        // Determine is array or wrapper
        let items: any[] = []
        if (Array.isArray(data)) {
            items = data
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data
        } else if (data.releases) {
            // Handle OCDS Releases Structure
            items = data.releases.flatMap((rel: any) => {
                // Flatten logic: OCDS usually has "ocid", "date", "tender", "awards" etc.
                // We need to map this complex structure to our flat table if possible
                // For now, let's look for known Peru Compras flat arrays which are common in their simplified downloads
                return [rel]
            })
        }

        const transformed = items.map(transformToOpenDataEntry).filter(Boolean) as OpenDataEntryTest[]
        return transformed

    } catch (error) {
        console.error("Fetch error:", error)
        throw error
    }
}
