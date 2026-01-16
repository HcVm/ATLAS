import type { Database } from "@/lib/database.types"
import * as XLSX from "xlsx"

export const MAX_ROWS_PER_CHUNK = 5000

export const COLUMN_MAPPING = {
  orden_electronica: [
    "Orden Electrónica",
    "ORDEN ELECTRÓNICA",
    "Orden Electronica",
    "ORDEN ELECTRONICA",
    "orden_electronica",
  ],

  nro_orden_fisica: [
    "Nro. Orden Física",
    "NRO. ORDEN FÍSICA",
    "Nro Orden Fisica",
    "NRO ORDEN FISICA",
    "Número Orden Física",
    "Nro Orden Física",
    "N ro Orden Física",
  ],

  fecha_publicacion: [
    "Fecha Publicación",
    "FECHA PUBLICACIÓN",
    "Fecha de Publicación",
    "FECHA DE PUBLICACIÓN",
    "Fecha Publicacion",
    "FECHA PUBLICACION",
    "fecha_publicacion",
  ],

  fecha_aceptacion: [
    "Fecha Aceptación",
    "FECHA ACEPTACIÓN",
    "Fecha de Aceptación",
    "FECHA DE ACEPTACIÓN",
    "Fecha Aceptacion",
    "FECHA ACEPTACION",
  ],

  razon_social_entidad: [
    "Razón Social Entidad",
    "RAZÓN SOCIAL ENTIDAD",
    "Razon Social Entidad",
    "RAZON SOCIAL ENTIDAD",
    "Entidad",
  ],

  ruc_entidad: ["Ruc Entidad", "RUC ENTIDAD", "RUC Entidad", "ruc_entidad"],

  unidad_ejecutora: ["Unidad Ejecutora", "UNIDAD EJECUTORA", "unidad_ejecutora"],

  razon_social_proveedor: [
    "Razón Social Proveedor",
    "RAZÓN SOCIAL PROVEEDOR",
    "Razon Social Proveedor",
    "RAZON SOCIAL PROVEEDOR",
    "Proveedor",
  ],

  ruc_proveedor: ["Ruc Proveedor", "RUC PROVEVEDOR", "RUC Proveedor", "ruc_proveedor"],

  direccion_proveedor: ["Dirección Proveedor", "DIRECCIÓN PROVEEDOR", "Direccion Proveedor", "DIRECCION PROVEEDOR"],

  descripcion_ficha_producto: [
    "Descripción Ficha Producto",
    "DESCRIPCIÓN FICHA PRODUCTO",
    "Descripcion Ficha Producto",
    "DESCRIPCION FICHA PRODUCTO",
    "Descripción Producto",
    "Descripcion Producto",
  ],

  marca_ficha_producto: ["Marca Ficha Producto", "MARCA FICHA PRODUCTO", "Marca Producto", "MARCA PRODUCTO"],

  nro_parte: ["Nro. Parte", "NRO. PARTE", "Nro Parte", "NRO PARTE", "Número Parte"],

  categoria: ["Categoría", "CATEGORÍA", "Categoria", "CATEGORIA"],

  catalogo: ["Catálogo", "CATÁLOGO", "Catalogo", "CATALOGO"],

  cantidad_entrega: ["Cantidad Entrega", "CANTIDAD ENTREGA", "Cantidad", "CANTIDAD"],

  precio_unitario: ["Precio Unitario", "PRECIO UNITARIO", "Precio Unit", "PRECIO UNIT"],

  sub_total: ["Sub Total", "SUB TOTAL", "SubTotal", "SUBTOTAL"],

  igv_entrega: ["IGV Entrega", "IGV ENTREGA", "IGV", "igv"],

  monto_total_entrega: ["Monto Total Entrega", "MONTO TOTAL ENTREGA", "Monto Total", "MONTO TOTAL", "Total"],

  fecha_inicio_entrega: ["Fecha Inicio Entrega", "FECHA INICIO ENTREGA", "Fecha Inicio", "FECHA INICIO"],

  fecha_fin_entrega: ["Fecha Fin Entrega", "FECHA FIN ENTREGA", "Fecha Fin", "FECHA FIN"],

  plazo_entrega: ["Plazo Entrega", "PLAZO ENTREGA", "Plazo", "PLAZO", "Plaz o Entrega"],

  direccion_entrega: ["Dirección Entrega", "DIRECCIÓN ENTREGA", "Direccion Entrega", "DIRECCION ENTREGA"],

  estado_orden_electronica: [
    "Estado Orden Electrónica",
    "ESTADO ORDEN ELECTRÓNICA",
    "Estado Orden Electronica",
    "ESTADO ORDEN ELECTRONICA",
    "Estado de la Orden Electrónica",
    "ESTADO DE LA ORDEN ELECTRÓNICA",
    "Estado",
  ],

  procedimiento: ["Procedimiento", "PROCEDIMIENTO"],

  tipo_compra: ["Tipo Compra", "TIPO COMPRA", "Tipo de Compra", "TIPO DE COMPRA"],

  nro_entrega: ["Nro. Entrega", "NRO. ENTREGA", "Nro Entrega", "NRO ENTREGA"],
  total_entregas: ["Total Entregas", "TOTAL ENTREGAS"],
  dep_entrega: ["Dep. Entrega", "DEP. ENTREGA", "Dep Entrega", "DEP ENTREGA"],
  prov_entrega: ["Prov. Entrega", "PROV. ENTREGA", "Prov Entrega", "PROV ENTREGA"],
  dist_entrega: ["Dist. Entrega", "DIST. ENTREGA", "Dist Entrega", "DIST ENTREGA"],
  link_ficha_producto: ["Link Ficha Producto", "LINK FICHA PRODUCTO"],
  orden_digitalizada: ["Orden Digitalizada", "ORDEN DIGITALIZADA"],
  acuerdo_marco: ["Acuerdo Marco", "ACUERDO MARCO", "acuerdo_marco"],
  fecha_inicio_vigencia: [
    "Fecha Inicio Vigencia",
    "FECHA INICIO VIGENCIA",
    "Fecha Inicio Vigencia",
    "FECHA INICIO VIGENCIA",
  ],
  fecha_fin_vigencia: ["Fecha Fin Vigencia", "FECHA FIN VIGENCIA", "Fecha Fin Vigencia", "FECHA FIN VIGENCIA"],
  estado: ["Estado", "ESTADO"],
  tipo_contratacion: ["Tipo Contratación", "TIPO CONTRATACIÓN", "Tipo Contratacion", "TIPO CONTRATACION"],
  modalidad_seleccion: ["Modalidad Selección", "MODALIDAD SELECCIÓN", "Modalidad Seleccion", "MODALIDAD SELECCION"],
  objeto_contratacion: ["Objeto Contratación", "OBJETO CONTRATACIÓN", "Objeto Contratacion", "OBJETO CONTRATACION"],
  entidad_contratante: ["Entidad Contratante", "ENTIDAD CONTRATANTE"],
  proveedor: ["Proveedor", "PROVEEDOR"],
  monto_adjudicado: ["Monto Adjudicado", "MONTO ADJUDICADO", "Monto Adjudicado", "MONTO ADJUDICADO"],
}

export const REQUIRED_COLUMNS = [
  "orden_electronica",
  "razon_social_entidad",
  "ruc_entidad",
  "razon_social_proveedor",
  "ruc_proveedor",
]

export const TARGET_BRANDS = ["WORLDLIFE", "HOPE LIFE", "ZEUS", "VALHALLA"]

const DEFAULT_DATE = "2000-01-01"

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" || trimmed === "-"
  }
  return false
}

export function formatDateToISOString(dateString: string): string {
  const spanishDateRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  const match = dateString.match(spanishDateRegex)

  if (match) {
    const day = match[1].padStart(2, "0")
    const month = match[2].padStart(2, "0")
    const year = match[3]
    return `${year}-${month}-${day}` 
  }

  return dateString 
}

export function processDateAsString(dateValue: any): string {
  if (isEmptyValue(dateValue)) return DEFAULT_DATE

  try {
    if (typeof dateValue === "number") {
      const date = XLSX.SSF.parse_date_code(dateValue)
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}` 
    }

    if (dateValue instanceof Date) {
      return dateValue.toISOString().split("T")[0]
    }

    if (typeof dateValue === "string") {
      const trimmed = dateValue.trim()
      if (trimmed === "" || trimmed === "-") return DEFAULT_DATE

      return formatDateToISOString(trimmed)
    }

    return DEFAULT_DATE
  } catch (error) {
    console.error("Error processing date:", dateValue, error)
    return DEFAULT_DATE
  }
}

export function parseNumericValue(value: any): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "")
    const parsed = Number.parseFloat(cleaned.replace(",", "."))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function validateRow(row: any, rowIndex: number): string[] {
  const errors: string[] = []

  for (const field of REQUIRED_COLUMNS) {
    if (isEmptyValue(row[field])) {
      errors.push(`Fila ${rowIndex + 7}: Campo crítico '${field}' está vacío`)
    }
  }

  if (row.ruc_entidad && !isEmptyValue(row.ruc_entidad) && !/^\d{11}$/.test(row.ruc_entidad.toString())) {
    errors.push(`Fila ${rowIndex + 7}: RUC Entidad inválido: ${row.ruc_entidad}`)
  }

  if (row.ruc_proveedor && !isEmptyValue(row.ruc_proveedor) && !/^\d{11}$/.test(row.ruc_proveedor.toString())) {
    errors.push(`Fila ${rowIndex + 7}: RUC Proveedor inválido: ${row.ruc_proveedor}`)
  }

  return errors
}

export function detectTargetBrands(marcaText: string): string[] {
  if (!marcaText) return []

  const detectedBrands: string[] = []
  const upperText = marcaText.toUpperCase().trim()

  const brandPatterns = {
    WORLDLIFE: ["WORLDLIFE", "MARCA: WORLDLIFE", "MARCA:WORLDLIFE", "MARCA WORLDLIFE"],
    "HOPE LIFE": ["HOPE LIFE", "MARCA: HOPE LIFE", "MARCA:HOPE LIFE", "MARCA HOPE LIFE", "HOPELIFE", "MARCA: HOPELIFE"],
    ZEUS: ["ZEUS", "MARCA: ZEUS", "MARCA:ZEUS", "MARCA ZEUS"],
    VALHALLA: ["VALHALLA", "MARCA: VALHALLA", "MARCA:VALHALLA", "MARCA VALHALLA"],
  }

  for (const [brand, patterns] of Object.entries(brandPatterns)) {
    for (const pattern of patterns) {
      if (upperText.includes(pattern)) {
        if (!detectedBrands.includes(brand)) {
          detectedBrands.push(brand)
        }
        break
      }
    }
  }

  return detectedBrands
}

export async function processDataChunk(
  dataRows: any[][],
  columnIndexes: { [key: string]: number },
  trimmedAcuerdoMarco: string,
  codigoAcuerdoMarco: string,
  chunkIndex: number,
): Promise<{
  processedData: Database["public"]["Tables"]["open_data_entries"]["Insert"][]
  brandAlerts: Database["public"]["Tables"]["brand_alerts"]["Insert"][]
  errors: string[]
  filteredCount: number
}> {
  const processedData: Database["public"]["Tables"]["open_data_entries"]["Insert"][] = []
  const brandAlerts: Database["public"]["Tables"]["brand_alerts"]["Insert"][] = []
  const errors: string[] = []
  let filteredCount = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const globalIndex = chunkIndex * MAX_ROWS_PER_CHUNK + i

    if (!row || row.every((cell) => isEmptyValue(cell))) {
      continue
    }

    const mappedRow: any = {
      acuerdo_marco: trimmedAcuerdoMarco,
      codigo_acuerdo_marco: codigoAcuerdoMarco,
    }

    Object.entries(columnIndexes).forEach(([dbField, excelIndex]) => {
      const value = row[excelIndex]

      if (dbField.includes("fecha")) {
        mappedRow[dbField] = processDateAsString(value)
      } else if (
        [
          "cantidad_entrega",
          "precio_unitario",
          "sub_total",
          "igv_entrega",
          "monto_total_entrega",
          "plazo_entrega",
          "nro_entrega",
          "total_entregas",
          "monto_adjudicado",
        ].includes(dbField)
      ) {
        mappedRow[dbField] = parseNumericValue(value)
      } else {
        mappedRow[dbField] = isEmptyValue(value) ? "" : value.toString().trim()
      }
    })

    if (mappedRow.orden_electronica && mappedRow.orden_electronica.toString().endsWith("-0")) {
      filteredCount++
      continue
    }

    const rowErrors = validateRow(mappedRow, globalIndex)
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      if (errors.length > 20) break
      continue
    }

    processedData.push(mappedRow)

    if (mappedRow.marca_ficha_producto && mappedRow.orden_electronica && mappedRow.acuerdo_marco) {
      const detectedBrands = detectTargetBrands(mappedRow.marca_ficha_producto)

      for (const brandName of detectedBrands) {
        brandAlerts.push({
          orden_electronica: mappedRow.orden_electronica,
          acuerdo_marco: mappedRow.acuerdo_marco,
          brand_name: brandName,
          status: "pending",
          notes: `Detectado automáticamente en marca_ficha_producto: "${mappedRow.marca_ficha_producto}"`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  return { processedData, brandAlerts, errors, filteredCount }
}
