import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createServiceClient } from "@/lib/supabase-server" // Vuelve a tu import original
import type { Database } from "@/lib/database.types" // Asegúrate de que este import esté presente

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
    return trimmed === "" || trimmed === "-" || trimmed === "N/A" || trimmed === "n/a"
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

export async function POST(request: NextRequest) {
  // Usando tu createServiceClient original
  const supabase = createServiceClient()

  // No se intenta obtener el user.id aquí, ya que no se usaba en tu implementación original
  // Si necesitas el user_id, tendríamos que ajustar cómo se obtiene la sesión en este contexto.

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const acuerdoMarco = formData.get("acuerdoMarco") as string | null

    if (!file || !acuerdoMarco) {
      return NextResponse.json({ error: "File and acuerdoMarco are required" }, { status: 400 })
    }

    // Trim the acuerdoMarco to ensure no leading/trailing whitespace
    const trimmedAcuerdoMarco = acuerdoMarco.trim();
    const codigoAcuerdoMarco = trimmedAcuerdoMarco.split(" ")[0]; // Extract the code part
    console.log(`Received upload request for acuerdo marco: "${trimmedAcuerdoMarco}" (Code: "${codigoAcuerdoMarco}")`);


    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet)

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return NextResponse.json({ error: "No data found in the Excel file" }, { status: 400 })
    }

    // Mapeo de datos del Excel a la estructura de la base de datos
    const processedData: Database["public"]["Tables"]["open_data_entries"]["Insert"][] = []
    const errors: string[] = []
    let filteredCount = 0

    // Las cabeceras están en la fila 6 (índice 5)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    const headers = rawData[5] as string[]
    const dataRows = rawData.slice(6) // Los datos empiezan desde la fila 7 (índice 6)

    console.log("Cabeceras encontradas en fila 6:", headers)

    // Mapear columnas con búsqueda flexible
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

          // Búsqueda exacta primero
          if (headerName === searchName) return true

          // Búsqueda normalizada (sin acentos, case insensitive)
          return normalizeString(headerName) === normalizeString(searchName)
        })

        if (index !== -1) {
          columnIndexes[dbField] = index
          foundColumns.push(`${dbField} -> "${headers[index]}" (columna ${index + 1})`)
          found = true
          break
        }
      }

      if (!found) {
        missingColumns.push(`${dbField} (buscando: ${possibleNames.join(", ")})`)
      }
    })

    console.log("Columnas encontradas:", foundColumns.length)
    console.log("Columnas faltantes:", missingColumns.length)

    // Verificar que tenemos las columnas esenciales
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

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]

      // Saltar filas vacías
      if (!row || row.every((cell) => isEmptyValue(cell))) {
        continue
      }

      const mappedRow: any = {
        acuerdo_marco: trimmedAcuerdoMarco, // Use the trimmed full name for insertion
        codigo_acuerdo_marco: codigoAcuerdoMarco, // Use the extracted code for insertion
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

      const rowErrors = validateRow(mappedRow, i)
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        continue
      }

      processedData.push(mappedRow)
    }

    if (errors.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: `Demasiados errores críticos en el archivo (${errors.length}).`,
          stats: {
            totalRows: dataRows.length,
            processedRows: 0,
            filteredRows: filteredCount,
            insertedRows: 0,
            errors: errors.slice(0, 20),
          },
        },
        { status: 400 },
      )
    }

    // 1. Eliminar datos existentes para este codigo_acuerdo_marco
    console.log(`Attempting to delete existing data for codigo_acuerdo_marco: "${codigoAcuerdoMarco}"`);
    const { error: deleteError } = await supabase.from("open_data_entries").delete().eq("codigo_acuerdo_marco", codigoAcuerdoMarco);

    if (deleteError) {
      console.error("Error deleting existing data:", deleteError.message);
      return NextResponse.json(
        { success: false, message: `Failed to delete existing data: ${deleteError.message}` },
        { status: 500 },
      );
    }
    console.log(`Successfully deleted existing data for codigo_acuerdo_marco: "${codigoAcuerdoMarco}"`);


    // 2. Insertar los nuevos datos
    const batchSize = 100
    let insertedCount = 0
    const insertErrors: string[] = []

    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize)
      console.log(
        `Insertando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(processedData.length / batchSize)} (${batch.length} registros) en open_data_entries`,
      )
      const { error } = await supabase.from("open_data_entries").insert(batch)

      if (error) {
        console.error("Error inserting batch into open_data_entries:", error)
        insertErrors.push(`Error insertando lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        for (const record of batch) {
          const { error: singleError } = await supabase.from("open_data_entries").insert(record)
          if (!singleError) {
            insertedCount++
          } else {
            console.error(`Error en registro (open_data_entries) ${record.orden_electronica}:`, singleError.message)
          }
        }
      } else {
        insertedCount += batch.length
      }
    }

    // 3. Procesar y upsertar alertas de marca
    const brandAlertsToUpsert: Database["public"]["Tables"]["brand_alerts"]["Insert"][] = []
    const brandAlertsErrors: string[] = []

    for (const row of processedData) {
      const brandName = row.marca_ficha_producto?.toUpperCase()
      if (brandName && TARGET_BRANDS.includes(brandName) && row.orden_electronica && row.acuerdo_marco) {
        brandAlertsToUpsert.push({
          orden_electronica: row.orden_electronica,
          acuerdo_marco: row.acuerdo_marco,
          brand_name: brandName,
          // user_id se deja como NULL aquí, ya que no se obtiene la sesión del usuario en este contexto.
          // Si necesitas registrar el usuario, se requiere una forma de obtener el user.id aquí.
        })
      }
    }

    if (brandAlertsToUpsert.length > 0) {
      console.log(`Procesando ${brandAlertsToUpsert.length} alertas de marca para upsert...`)
      for (let i = 0; i < brandAlertsToUpsert.length; i += batchSize) {
        const batch = brandAlertsToUpsert.slice(i, i + batchSize)
        const { error: upsertAlertsError } = await supabase
          .from("brand_alerts")
          .upsert(batch, { onConflict: "orden_electronica,acuerdo_marco" })
          .select("id")

        if (upsertAlertsError) {
          console.error("Error upserting brand alerts batch:", upsertAlertsError)
          brandAlertsErrors.push(
            `Error en lote de alertas de marca ${Math.floor(i / batchSize) + 1}: ${upsertAlertsError.message}`,
          )
          for (const alert of batch) {
            const { error: singleAlertError } = await supabase
              .from("brand_alerts")
              .upsert(alert, { onConflict: "orden_electronica,acuerdo_marco" })
              .select("id")
            if (singleAlertError) {
              console.error(
                `Error en alerta de marca (Orden Electrónica: ${alert.orden_electronica}, Marca: ${alert.brand_name}):`,
                singleAlertError.message,
              )
              brandAlertsErrors.push(
                `Alerta (Orden Electrónica: ${alert.orden_electronica}, Marca: ${alert.brand_name}): ${singleAlertError.message}`,
              )
            }
          }
        } else {
          console.log(`Lote de alertas de marca procesado exitosamente: ${batch.length} registros afectados.`)
        }
      }
    }

    const finalMessage =
      errors.length > 0 || insertErrors.length > 0 || brandAlertsErrors.length > 0
        ? `Archivo procesado con algunos errores. Se insertaron ${insertedCount} registros en datos abiertos y se procesaron ${brandAlertsToUpsert.length} alertas de marca.`
        : `Archivo procesado exitosamente. Se insertaron ${insertedCount} registros en datos abiertos y se procesaron ${brandAlertsToUpsert.length} alertas de marca.`

    return NextResponse.json({
      success: insertedCount > 0,
      message: finalMessage,
      stats: {
        totalRows: dataRows.length,
        processedRows: processedData.length,
        filteredRows: filteredCount,
        insertedOpenDataRows: insertedCount,
        processedBrandAlerts: brandAlertsToUpsert.length,
        errors: errors.concat(insertErrors).concat(brandAlertsErrors),
      },
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
