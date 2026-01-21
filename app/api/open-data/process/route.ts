import type { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { createServiceClient } from "@/lib/supabase-server"
import type { Database } from "@/lib/database.types"

const MAX_ROWS_PER_CHUNK = 5000
const COLUMN_MAPPING = {
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

const REQUIRED_COLUMNS = [
  "orden_electronica",
  "razon_social_entidad",
  "ruc_entidad",
  "razon_social_proveedor",
  "ruc_proveedor",
]

const TARGET_BRANDS = ["WORLDLIFE", "HOPE LIFE", "ZEUS", "VALHALLA"]

const DEFAULT_DATE = "2000-01-01"

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
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

function processDateAsString(dateValue: any): string {
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

function parseNumericValue(value: any): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "")
    const parsed = Number.parseFloat(cleaned.replace(",", "."))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function validateRow(row: any, rowIndex: number): string[] {
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

function divideDataIntoChunks(dataRows: any[][], maxRowsPerChunk: number): any[][][] {
  const chunks: any[][][] = []

  for (let i = 0; i < dataRows.length; i += maxRowsPerChunk) {
    const chunk = dataRows.slice(i, i + maxRowsPerChunk)
    chunks.push(chunk)
  }

  return chunks
}

const BRAND_PATTERNS = {
  WORLDLIFE: ["WORLDLIFE", "MARCA: WORLDLIFE", "MARCA:WORLDLIFE", "MARCA WORLDLIFE"],
  "HOPE LIFE": ["HOPE LIFE", "MARCA: HOPE LIFE", "MARCA:HOPE LIFE", "MARCA HOPE LIFE", "HOPELIFE", "MARCA: HOPELIFE"],
  ZEUS: ["ZEUS", "MARCA: ZEUS", "MARCA:ZEUS", "MARCA ZEUS"],
  VALHALLA: ["VALHALLA", "MARCA: VALHALLA", "MARCA:VALHALLA", "MARCA VALHALLA"],
}

function detectTargetBrands(marcaText: string): string[] {
  if (!marcaText) return []

  const detectedBrands: string[] = []
  const upperText = marcaText.toUpperCase().trim()

  for (const [brand, patterns] of Object.entries(BRAND_PATTERNS)) {
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
    const ALERT_BATCH_SIZE = 100
    for (let i = 0; i < brandAlerts.length; i += ALERT_BATCH_SIZE) {
      const batch = brandAlerts.slice(i, i + ALERT_BATCH_SIZE)
      const orderIds = batch
        .map((a) => a.orden_electronica)
        .filter((id): id is string => typeof id === "string" && id.length > 0)

      if (orderIds.length === 0) continue

      try {
        const { data: existingAlerts, error: fetchError } = await supabase
          .from("brand_alerts")
          .select("orden_electronica, brand_name")
          .in("orden_electronica", orderIds)

        if (fetchError) {
          console.error("Error fetching existing alerts (batch), falling back to individual:", fetchError.message)
          // Fallback to individual processing
          for (const alert of batch) {
            try {
              const { data: existing, error: checkErr } = await supabase
                .from("brand_alerts")
                .select("id")
                .eq("orden_electronica", alert.orden_electronica)
                .eq("brand_name", alert.brand_name)
                .single()

              if (checkErr && checkErr.code !== "PGRST116") {
                errors.push(`Error verificando alerta: ${checkErr.message}`)
                continue
              }
              if (existing) continue

              const { error: insErr } = await supabase.from("brand_alerts").insert(alert)
              if (insErr) {
                if (insErr.code !== "23505") errors.push(`Error insertando alerta: ${insErr.message}`)
              } else {
                brandAlertsCount++
              }
            } catch (e: any) {
              errors.push(`Error inesperado en alerta: ${e.message}`)
            }
          }
          continue
        }

        const existingSet = new Set(existingAlerts?.map((a) => `${a.orden_electronica}|${a.brand_name}`) || [])

        const newAlerts = batch.filter((a) => !existingSet.has(`${a.orden_electronica}|${a.brand_name}`))

        if (newAlerts.length > 0) {
          const { error: insertError } = await supabase.from("brand_alerts").insert(newAlerts)

          if (insertError) {
            console.error("Error batch inserting alerts:", insertError.message)

            // Fallback to individual insert on batch error
            for (const alert of newAlerts) {
              const { error: singleError } = await supabase.from("brand_alerts").insert(alert)
              if (!singleError) {
                brandAlertsCount++
              } else if (singleError.code !== "23505") {
                errors.push(`Error insertando alerta individual: ${singleError.message}`)
              }
            }
          } else {
            brandAlertsCount += newAlerts.length
          }
        }
      } catch (err: any) {
        console.error("Error processing brand alerts batch:", err)
        errors.push(`Error en alertas batch: ${err.message}`)
      }
    }
  }

  return { insertedCount, brandAlertsCount, errors }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { blobUrl, fileName, fileSize, acuerdoMarco } = await request.json()



    if (!blobUrl || !acuerdoMarco) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "URL del archivo y acuerdo marco son requeridos",
        }),
        { status: 400 },
      )
    }

    const trimmedAcuerdoMarco = acuerdoMarco.trim()
    const codigoAcuerdoMarco = trimmedAcuerdoMarco.split(" ")[0]

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(blobUrl)
          const buffer = Buffer.from(await response.arrayBuffer())

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
            throw new Error("El archivo no contiene suficientes datos o el formato es incorrecto")
          }


          const headers = rawData[5] as string[]
          const dataRows = rawData.slice(6)

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                progress: 0.1,
                message: `Archivo analizado: ${headers.length} columnas, ${dataRows.length} filas`,
              })}\n\n`,
            ),
          )

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

          const missingRequiredColumns = REQUIRED_COLUMNS.filter((col) => !(col in columnIndexes))
          if (missingRequiredColumns.length > 0) {
            throw new Error(`Faltan columnas críticas: ${missingRequiredColumns.join(", ")}`)
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                progress: 0.2,
                message: `Columnas mapeadas: ${foundColumns.length} encontradas`,
              })}\n\n`,
            ),
          )

          const ordenElectronicaIndex = columnIndexes.orden_electronica
          if (ordenElectronicaIndex === undefined) {
            throw new Error("La columna 'orden_electronica' es necesaria para la deduplicación y no se encontró.")
          }

          const uniqueOrdenes = new Set<string>()
          const deduplicatedDataRows = dataRows.filter((row) => {
            const ordenElectronica = row[ordenElectronicaIndex]
            if (ordenElectronica && !uniqueOrdenes.has(ordenElectronica)) {
              uniqueOrdenes.add(ordenElectronica)
              return true
            }
            return false
          })

          const duplicatesCount = dataRows.length - deduplicatedDataRows.length
          if (duplicatesCount > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  progress: 0.25,
                  message: `Se encontraron y eliminaron ${duplicatesCount} duplicados.`,
                })}\n\n`,
              ),
            )
          }

          const needsChunking = deduplicatedDataRows.length > MAX_ROWS_PER_CHUNK || fileSize > 10 * 1024 * 1024
          const chunks = needsChunking
            ? divideDataIntoChunks(deduplicatedDataRows, MAX_ROWS_PER_CHUNK)
            : [deduplicatedDataRows]


          const { error: deleteError } = await supabase
            .from("open_data_entries")
            .delete()
            .eq("codigo_acuerdo_marco", codigoAcuerdoMarco)

          if (deleteError) {
            throw new Error(`Error eliminando datos existentes: ${deleteError.message}`)
          }

          // Send progress update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                progress: 0.3,
                message: "Datos existentes eliminados, iniciando procesamiento...",
              })}\n\n`,
            ),
          )

          let totalInserted = 0
          let totalBrandAlerts = 0
          let totalFiltered = 0
          let totalProcessed = 0
          const allErrors: string[] = []

          for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex]

            const progress = 0.3 + (chunkIndex / chunks.length) * 0.6
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  progress,
                  message: `Procesando chunk ${chunkIndex + 1}/${chunks.length}...`,
                })}\n\n`,
              ),
            )

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

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
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
                  fileSize: fileSize,
                  fileName: fileName,
                  acuerdoMarco: codigoAcuerdoMarco,
                  errors: allErrors.slice(0, 20),
                },
              })}\n\n`,
            ),
          )
        } catch (error) {
          console.error("Error en procesamiento:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "Error desconocido",
              })}\n\n`,
            ),
          )
        } finally {
          controller.close()
        }
      },

    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
              },
    })
  } catch (error) {
    console.error("Error en process:", error)
    return new Response(
      JSON.stringify({

        success: false,
        message: "Error interno del servidor",
      }),

      { status: 500 },
    )
  }
}