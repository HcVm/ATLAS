import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createServiceClient } from "@/lib/supabase-server"
import type { Database } from "@/lib/database.types"

// Límite de tamaño de archivo (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
// Límite de filas por chunk para procesamiento
const MAX_ROWS_PER_CHUNK = 5000

// Mapeo flexible de columnas del Excel a campos de la base de datos
const COLUMN_MAPPING = {
  // Orden Electrónica
  orden_electronica: [
    "Orden Electrónica",
    "ORDEN ELECTRÓNICA",
    "Orden Electronica",
    "ORDEN ELECTRONICA",
    "orden_electronica",
  ],

  // Número de Orden Física
  nro_orden_fisica: [
    "Nro. Orden Física",
    "NRO. ORDEN FÍSICA",
    "Nro Orden Fisica",
    "NRO ORDEN FISICA",
    "Número Orden Física",
    "Nro Orden Física",
    "N ro Orden Física", // Agregado para manejar el espacio que aparece en tu Excel
  ],

  // Fecha de Publicación
  fecha_publicacion: [
    "Fecha Publicación",
    "FECHA PUBLICACIÓN",
    "Fecha de Publicación",
    "FECHA DE PUBLICACIÓN",
    "Fecha Publicacion",
    "FECHA PUBLICACION",
    "fecha_publicacion",
  ],

  // Fecha de Aceptación
  fecha_aceptacion: [
    "Fecha Aceptación",
    "FECHA ACEPTACIÓN",
    "Fecha de Aceptación",
    "FECHA DE ACEPTACIÓN",
    "Fecha Aceptacion",
    "FECHA ACEPTACION",
  ],

  // Razón Social Entidad
  razon_social_entidad: [
    "Razón Social Entidad",
    "RAZÓN SOCIAL ENTIDAD",
    "Razon Social Entidad",
    "RAZON SOCIAL ENTIDAD",
    "Entidad",
  ],

  // RUC Entidad
  ruc_entidad: ["Ruc Entidad", "RUC ENTIDAD", "RUC Entidad", "ruc_entidad"],

  // Unidad Ejecutora
  unidad_ejecutora: ["Unidad Ejecutora", "UNIDAD EJECUTORA", "unidad_ejecutora"],

  // Razón Social Proveedor
  razon_social_proveedor: [
    "Razón Social Proveedor",
    "RAZÓN SOCIAL PROVEEDOR",
    "Razon Social Proveedor",
    "RAZON SOCIAL PROVEEDOR",
    "Proveedor",
  ],

  // RUC Proveedor
  ruc_proveedor: ["Ruc Proveedor", "RUC PROVEVEDOR", "RUC Proveedor", "ruc_proveedor"],

  // Dirección Proveedor
  direccion_proveedor: ["Dirección Proveedor", "DIRECCIÓN PROVEEDOR", "Direccion Proveedor", "DIRECCION PROVEEDOR"],

  // Descripción Ficha Producto
  descripcion_ficha_producto: [
    "Descripción Ficha Producto",
    "DESCRIPCIÓN FICHA PRODUCTO",
    "Descripcion Ficha Producto",
    "DESCRIPCION FICHA PRODUCTO",
    "Descripción Producto",
    "Descripcion Producto",
  ],

  // Marca Ficha Producto
  marca_ficha_producto: ["Marca Ficha Producto", "MARCA FICHA PRODUCTO", "Marca Producto", "MARCA PRODUCTO"],

  // Número de Parte
  nro_parte: ["Nro. Parte", "NRO. PARTE", "Nro Parte", "NRO PARTE", "Número Parte"],

  // Categoría
  categoria: ["Categoría", "CATEGORÍA", "Categoria", "CATEGORIA"],

  // Catálogo
  catalogo: ["Catálogo", "CATÁLOGO", "Catalogo", "CATALOGO"],

  // Cantidad Entrega
  cantidad_entrega: ["Cantidad Entrega", "CANTIDAD ENTREGA", "Cantidad", "CANTIDAD"],

  // Precio Unitario
  precio_unitario: ["Precio Unitario", "PRECIO UNITARIO", "Precio Unit", "PRECIO UNIT"],

  // Sub Total
  sub_total: ["Sub Total", "SUB TOTAL", "SubTotal", "SUBTOTAL"],

  // IGV Entrega
  igv_entrega: ["IGV Entrega", "IGV ENTREGA", "IGV", "igv"],

  // Monto Total Entrega
  monto_total_entrega: ["Monto Total Entrega", "MONTO TOTAL ENTREGA", "Monto Total", "MONTO TOTAL", "Total"],

  // Fecha Inicio Entrega
  fecha_inicio_entrega: ["Fecha Inicio Entrega", "FECHA INICIO ENTREGA", "Fecha Inicio", "FECHA INICIO"],

  // Fecha Fin Entrega
  fecha_fin_entrega: ["Fecha Fin Entrega", "FECHA FIN ENTREGA", "Fecha Fin", "FECHA FIN"],

  // Plazo Entrega
  plazo_entrega: ["Plazo Entrega", "PLAZO ENTREGA", "Plazo", "PLAZO", "Plaz o Entrega"], // Agregado para manejar el espacio

  // Dirección Entrega
  direccion_entrega: ["Dirección Entrega", "DIRECCIÓN ENTREGA", "Direccion Entrega", "DIRECCION ENTREGA"],

  // Estado Orden Electrónica
  estado_orden_electronica: [
    "Estado Orden Electrónica",
    "ESTADO ORDEN ELECTRÓNICA",
    "Estado Orden Electronica",
    "ESTADO ORDEN ELECTRONICA",
    "Estado de la Orden Electrónica",
    "ESTADO DE LA ORDEN ELECTRÓNICA",
    "Estado",
  ],

  // Procedimiento
  procedimiento: ["Procedimiento", "PROCEDIMIENTO"],

  // Tipo Compra
  tipo_compra: ["Tipo Compra", "TIPO COMPRA", "Tipo de Compra", "TIPO DE COMPRA"],

  // Campos adicionales que pueden estar en el Excel
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

// Columnas requeridas - Solo las más críticas
const REQUIRED_COLUMNS = [
  "orden_electronica",
  "razon_social_entidad",
  "ruc_entidad",
  "razon_social_proveedor",
  "ruc_proveedor",
]

// Marcas a monitorear para alertas (en mayúsculas para comparación)
const TARGET_BRANDS = ["WORLDLIFE", "HOPE LIFE", "ZEUS", "VALHALLA"]

// Fecha por defecto para campos de fecha vacíos
const DEFAULT_DATE = "2000-01-01"

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/[^\w\s]/g, "") // Remover caracteres especiales
    .replace(/\s+/g, " ") // Normalizar espacios
    .trim()
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" || trimmed === "-"
  }
  return false
}

function formatDateToISOString(dateString: string): string {
  // Detectar formato DD/MM/YYYY o D/M/YYYY
  const spanishDateRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  const match = dateString.match(spanishDateRegex)

  if (match) {
    const day = match[1].padStart(2, "0")
    const month = match[2].padStart(2, "0")
    const year = match[3]
    return `${year}-${month}-${day}` // Formato ISO YYYY-MM-DD
  }

  return dateString // Devolver original si no coincide con el patrón
}

function processDateAsString(dateValue: any): string {
  if (isEmptyValue(dateValue)) return DEFAULT_DATE

  try {
    // Si es un número (fecha de Excel), convertir a fecha y luego a string
    if (typeof dateValue === "number") {
      const date = XLSX.SSF.parse_date_code(dateValue)
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}` // YYYY-MM-DD
    }

    // Si ya es una fecha, convertir a string ISO
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split("T")[0]
    }

    // Si es string, intentar formatear correctamente
    if (typeof dateValue === "string") {
      const trimmed = dateValue.trim()
      if (trimmed === "" || trimmed === "-") return DEFAULT_DATE

      // Convertir formato español (DD/MM/YYYY) a ISO (YYYY-MM-DD)
      return formatDateToISOString(trimmed)
    }

    // Si no se pudo procesar, usar fecha por defecto
    return DEFAULT_DATE
  } catch (error) {
    console.error("Error processing date:", dateValue, error)
    return DEFAULT_DATE
  }
}

function parseNumericValue(value: any): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    // Remover caracteres no numéricos excepto punto y coma
    const cleaned = value.replace(/[^\d.,-]/g, "")
    const parsed = Number.parseFloat(cleaned.replace(",", "."))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function validateRow(row: any, rowIndex: number): string[] {
  const errors: string[] = []

  // Validar campos requeridos (críticos)
  for (const field of REQUIRED_COLUMNS) {
    if (isEmptyValue(row[field])) {
      errors.push(`Fila ${rowIndex + 7}: Campo crítico '${field}' está vacío`)
    }
  }

  // Validar RUCs (deben tener 11 dígitos) - solo si no están vacíos
  if (row.ruc_entidad && !isEmptyValue(row.ruc_entidad) && !/^\d{11}$/.test(row.ruc_entidad.toString())) {
    errors.push(`Fila ${rowIndex + 7}: RUC Entidad inválido: ${row.ruc_entidad}`)
  }

  if (row.ruc_proveedor && !isEmptyValue(row.ruc_proveedor) && !/^\d{11}$/.test(row.ruc_proveedor.toString())) {
    errors.push(`Fila ${rowIndex + 7}: RUC Proveedor inválido: ${row.ruc_proveedor}`)
  }

  return errors
}

// Función para dividir datos en chunks basado en filas
function divideDataIntoChunks(dataRows: any[][], maxRowsPerChunk: number): any[][][] {
  const chunks: any[][][] = []

  for (let i = 0; i < dataRows.length; i += maxRowsPerChunk) {
    const chunk = dataRows.slice(i, i + maxRowsPerChunk)
    chunks.push(chunk)
  }

  return chunks
}

// Función mejorada para detectar marcas objetivo
function detectTargetBrands(marcaText: string): string[] {
  if (!marcaText) return []

  const detectedBrands: string[] = []
  const upperText = marcaText.toUpperCase().trim()

  // Patrones de búsqueda más específicos para cada marca
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
        break // Found this brand, move to next brand
      }
    }
  }

  return detectedBrands
}

// Función para procesar un chunk de datos
async function processDataChunk(
  dataRows: any[][],
  headers: string[],
  columnIndexes: { [key: string]: number },
  trimmedAcuerdoMarco: string,
  codigoAcuerdoMarco: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<{
  processedData: Database["public"]["Tables"]["open_data_entries"]["Insert"][]
  brandAlerts: Database["public"]["Tables"]["brand_alerts"]["Insert"][]
  errors: string[]
  filteredCount: number
}> {
  console.log(`Procesando chunk ${chunkIndex + 1}/${totalChunks} (${dataRows.length} filas)`)

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

async function insertDataChunk(
  supabase: any,
  processedData: Database["public"]["Tables"]["open_data_entries"]["Insert"][],
  brandAlerts: Database["public"]["Tables"]["brand_alerts"]["Insert"][],
): Promise<{ insertedCount: number; brandAlertsCount: number; errors: string[] }> {
  const errors: string[] = []
  let insertedCount = 0
  let brandAlertsCount = 0

  const BATCH_SIZE = 50
  for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
    const batch = processedData.slice(i, i + BATCH_SIZE)

    const { error } = await supabase.from("open_data_entries").insert(batch)

    if (error) {
      console.error("Error insertando batch:", error.message)
      errors.push(`Error en batch: ${error.message}`)

      for (const record of batch) {
        const { error: singleError } = await supabase.from("open_data_entries").insert(record)
        if (!singleError) {
          insertedCount++
        }
      }
    } else {
      insertedCount += batch.length
    }
  }

  if (brandAlerts.length > 0) {
    console.log(`Verificando ${brandAlerts.length} alertas de marca potenciales...`)

    // Process in batches to avoid query size limits
    const ALERT_BATCH_SIZE = 100
    for (let i = 0; i < brandAlerts.length; i += ALERT_BATCH_SIZE) {
      const batch = brandAlerts.slice(i, i + ALERT_BATCH_SIZE)
      const ordenes = batch.map((a) => a.orden_electronica)

      try {
        // Bulk fetch existing alerts for these orders
        const { data: existingAlerts, error: fetchError } = await supabase
          .from("brand_alerts")
          .select("orden_electronica, brand_name")
          .in("orden_electronica", ordenes)

        if (fetchError) {
          console.error("Error fetching existing alerts:", fetchError.message)
          errors.push(`Error verificando alertas existentes: ${fetchError.message}`)
          // Fallback to individual processing for this batch in case of error
          for (const alert of batch) {
            try {
              const { error: insertError } = await supabase.from("brand_alerts").insert([alert])
              if (!insertError) {
                brandAlertsCount++
                console.log(`Nueva alerta creada (fallback): ${alert.orden_electronica} - ${alert.brand_name}`)
              } else if (insertError.code === "23505") {
                console.log(`Alerta existente (fallback): ${alert.orden_electronica} - ${alert.brand_name}`)
              } else {
                errors.push(`Error en alerta fallback: ${insertError.message}`)
              }
            } catch (e: any) {
              errors.push(`Error inesperado fallback: ${e.message}`)
            }
          }
          continue
        }

        const existingSet = new Set(existingAlerts?.map((a: any) => `${a.orden_electronica}-${a.brand_name}`))
        const toInsert: typeof brandAlerts = []

        for (const alert of batch) {
          const key = `${alert.orden_electronica}-${alert.brand_name}`
          if (existingSet.has(key)) {
            console.log(`Alerta existente preservada: ${alert.orden_electronica} - ${alert.brand_name}`)
          } else {
            toInsert.push(alert)
          }
        }

        if (toInsert.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from("brand_alerts")
            .insert(toInsert)
            .select()

          if (insertError) {
            // If bulk insert fails (e.g. race condition), fallback to individual
            if (insertError.code === "23505") {
              console.log("Conflicto en inserción masiva, intentando individualmente...")
              for (const alert of toInsert) {
                const { error: singleInsertError } = await supabase.from("brand_alerts").insert([alert])
                if (!singleInsertError) {
                  brandAlertsCount++
                  console.log(`Nueva alerta creada: ${alert.orden_electronica} - ${alert.brand_name}`)
                } else if (singleInsertError.code === "23505") {
                  console.log(`Alerta duplicada omitida: ${alert.orden_electronica} - ${alert.brand_name}`)
                } else {
                  console.error("Error insertando nueva alerta:", singleInsertError.message)
                  errors.push(`Error en nueva alerta: ${singleInsertError.message}`)
                }
              }
            } else {
              console.error("Error insertando lote de alertas:", insertError.message)
              errors.push(`Error en lote de alertas: ${insertError.message}`)
            }
          } else {
            brandAlertsCount += (inserted || []).length
            ;(inserted || []).forEach((alert: any) => {
              console.log(`Nueva alerta creada: ${alert.orden_electronica} - ${alert.brand_name}`)
            })
          }
        }
      } catch (err: any) {
        console.error("Error inesperado procesando lote de alertas:", err)
        errors.push(`Error inesperado en lote de alertas: ${err.message}`)
      }
    }
  }

  return { insertedCount, brandAlertsCount, errors }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const acuerdoMarco = formData.get("acuerdoMarco") as string | null

    if (!file || !acuerdoMarco) {
      return NextResponse.json(
        {
          success: false,
          message: "Archivo y acuerdo marco son requeridos",
        },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `El archivo es demasiado grande. Tamaño máximo permitido: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 413 },
      )
    }

    const trimmedAcuerdoMarco = acuerdoMarco.trim()
    const codigoAcuerdoMarco = trimmedAcuerdoMarco.split(" ")[0]

    console.log(`Procesando archivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`)
    console.log(`Acuerdo marco: "${trimmedAcuerdoMarco}" (Código: "${codigoAcuerdoMarco}")`)

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      cellNF: false,
      cellText: false,
      dense: true,
    })

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]


    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as any[][]

    if (!Array.isArray(rawData) || rawData.length < 7) {
      return NextResponse.json(
        {
          success: false,
          message: "El archivo no contiene suficientes datos o el formato es incorrecto",
        },
        { status: 400 },
      )
    }
    const headers = rawData[5] as string[]
    const dataRows = rawData.slice(6) 

    console.log(`Archivo procesado: ${headers.length} columnas, ${dataRows.length} filas de datos`)

    const columnIndexes: { [key: string]: number } = {}
    const foundColumns: string[] = []
    const missingColumns: string[] = []

    Object.entries(COLUMN_MAPPING).forEach(([dbField, possibleNames]) => {
      let found = false

      for (const possibleName of possibleNames) {
        const index = headers.findIndex((h) => {
          if (!h) return false
          const headerName = h.toString().trim()
          const searchName = possibleName.trim()
          if (headerName === searchName) return true

          return normalizeString(headerName) === normalizeString(searchName)
        })

        if (index !== -1) {
          columnIndexes[dbField] = index
          foundColumns.push(`${dbField} -> "${headers[index]}"`)
          found = true
          break
        }
      }

      if (!found) {
        missingColumns.push(`${dbField}`)
      }
    })

    console.log(`Columnas encontradas: ${foundColumns.length}, faltantes: ${missingColumns.length}`)

    const missingRequiredColumns = REQUIRED_COLUMNS.filter((col) => !(col in columnIndexes))
    if (missingRequiredColumns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Faltan columnas críticas: ${missingRequiredColumns.join(", ")}`,
        },
        { status: 400 },
      )
    }

    const needsChunking = dataRows.length > MAX_ROWS_PER_CHUNK || file.size > 10 * 1024 * 1024
    const chunks = needsChunking ? divideDataIntoChunks(dataRows, MAX_ROWS_PER_CHUNK) : [dataRows]

    const { error: deleteError } = await supabase
      .from("open_data_entries")
      .delete()
      .eq("codigo_acuerdo_marco", codigoAcuerdoMarco)

    if (deleteError) {
      console.error("Error eliminando datos existentes:", deleteError.message)
      return NextResponse.json(
        {
          success: false,
          message: `Error eliminando datos existentes: ${deleteError.message}`,
        },
        { status: 500 },
      )
    }

    let totalInserted = 0
    let totalBrandAlerts = 0
    let totalFiltered = 0
    let totalProcessed = 0
    const allErrors: string[] = []

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]

      console.log(`Procesando chunk ${chunkIndex + 1}/${chunks.length}`)

      const chunkResult = await processDataChunk(
        chunk,
        headers,
        columnIndexes,
        trimmedAcuerdoMarco,
        codigoAcuerdoMarco,
        chunkIndex,
        chunks.length,
      )

      totalProcessed += chunkResult.processedData.length
      totalFiltered += chunkResult.filteredCount
      allErrors.push(...chunkResult.errors)
      if (chunkResult.processedData.length > 0) {
        const insertResult = await insertDataChunk(supabase, chunkResult.processedData, chunkResult.brandAlerts)

        totalInserted += insertResult.insertedCount
        totalBrandAlerts += insertResult.brandAlertsCount
        allErrors.push(...insertResult.errors)

      }

      if (chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    const finalMessage =
      allErrors.length > 0
        ? `Archivo procesado con algunos errores. Se insertaron ${totalInserted} registros y se procesaron ${totalBrandAlerts} alertas de marca en ${chunks.length} chunk(s) para el acuerdo ${codigoAcuerdoMarco}.`
        : `Archivo procesado exitosamente. Se insertaron ${totalInserted} registros y se procesaron ${totalBrandAlerts} alertas de marca en ${chunks.length} chunk(s) para el acuerdo ${codigoAcuerdoMarco}.`

    return NextResponse.json({
      success: totalInserted > 0,
      message: finalMessage,
      stats: {
        totalRows: dataRows.length,
        processedRows: totalProcessed,
        filteredRows: totalFiltered,
        insertedRows: totalInserted,
        processedBrandAlerts: totalBrandAlerts,
        chunksProcessed: chunks.length,
        processingMethod: needsChunking ? "chunked" : "single",
        fileSize: file.size,
        fileName: file.name,
        acuerdoMarco: codigoAcuerdoMarco,
        errors: allErrors.slice(0, 20),
      },
    })
  } catch (error: any) {
    console.error("Error en upload:", error)

    if (error.message?.includes("PayloadTooLargeError") || error.code === "LIMIT_FILE_SIZE") {
      return NextResponse.json(
        {
          success: false,
          message: "El archivo es demasiado grande. El sistema intentará procesarlo automáticamente en chunks.",
        },
        { status: 413 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor. Por favor, intenta nuevamente.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}