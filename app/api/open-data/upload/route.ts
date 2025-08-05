import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { createServiceClient } from "@/lib/supabase-server"

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
  ruc_proveedor: ["Ruc Proveedor", "RUC PROVEEDOR", "RUC Proveedor", "ruc_proveedor"],

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
}

// Columnas requeridas - Solo las más críticas
const REQUIRED_COLUMNS = [
  "orden_electronica",
  "razon_social_entidad",
  "ruc_entidad",
  "razon_social_proveedor",
  "ruc_proveedor",
]

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
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const acuerdoMarco = formData.get("acuerdoMarco") as string

    if (!file) {
      return NextResponse.json({ success: false, message: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    if (!acuerdoMarco) {
      return NextResponse.json({ success: false, message: "No se especificó el acuerdo marco" }, { status: 400 })
    }

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convertir a JSON - Las cabeceras están en la fila 6 (índice 5)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 7) {
      return NextResponse.json(
        {
          success: false,
          message: "El archivo no contiene suficientes datos. Las cabeceras deben estar en la fila 6.",
        },
        { status: 400 },
      )
    }

    // Las cabeceras están en la fila 6 (índice 5)
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

    // Procesar datos
    const processedData: any[] = []
    const errors: string[] = []
    let filteredCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]

      // Saltar filas vacías
      if (!row || row.every((cell) => isEmptyValue(cell))) {
        continue
      }

      // Crear objeto con los datos mapeados
      const mappedRow: any = {
        acuerdo_marco: acuerdoMarco,
        codigo_acuerdo_marco: acuerdoMarco.split(" ")[0], // Extraer código
      }

      // Mapear cada campo
      Object.entries(columnIndexes).forEach(([dbField, excelIndex]) => {
        const value = row[excelIndex]

        // Procesar según el tipo de campo
        if (dbField.includes("fecha")) {
          // Procesar fechas como strings en formato ISO
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
          ].includes(dbField)
        ) {
          // Procesar números
          mappedRow[dbField] = parseNumericValue(value)
        } else {
          // Procesar texto
          mappedRow[dbField] = isEmptyValue(value) ? "" : value.toString().trim()
        }
      })

      // Debug: Para las primeras 3 filas, mostrar los datos mapeados
      if (i < 3) {
        console.log(`Fila ${i + 7} mapeada:`, {
          orden_electronica: mappedRow.orden_electronica,
          fecha_publicacion: mappedRow.fecha_publicacion,
          fecha_fin_entrega: mappedRow.fecha_fin_entrega,
          razon_social_entidad: mappedRow.razon_social_entidad,
        })
      }

      // Filtrar registros con "Orden Electrónica" terminada en "-0"
      if (mappedRow.orden_electronica && mappedRow.orden_electronica.toString().endsWith("-0")) {
        filteredCount++
        continue
      }

      // Validar fila
      const rowErrors = validateRow(mappedRow, i)
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        continue
      }

      processedData.push(mappedRow)
    }

    // Solo fallar si hay muchos errores críticos
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

    // Insertar en la base de datos
    const supabase = createServiceClient()

    // Eliminar datos existentes del mismo acuerdo marco
    console.log(`Eliminando datos existentes para acuerdo marco: ${acuerdoMarco}`)
    const { error: deleteError } = await supabase.from("open_data_entries").delete().eq("acuerdo_marco", acuerdoMarco)

    if (deleteError) {
      console.log("No se pudieron eliminar datos existentes:", deleteError.message)
    }

    // Insertar en lotes
    const batchSize = 100 // Reducido para mejor manejo de errores
    let insertedCount = 0
    const insertErrors: string[] = []

    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize)

      console.log(
        `Insertando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(processedData.length / batchSize)} (${batch.length} registros)`,
      )

      const { data, error } = await supabase.from("open_data_entries").insert(batch)

      if (error) {
        console.error("Error inserting batch:", error)
        insertErrors.push(`Error insertando lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)

        // Si hay error, intentar insertar uno por uno para identificar registros problemáticos
        console.log("Intentando inserción individual...")
        for (let j = 0; j < batch.length; j++) {
          const record = batch[j]
          const { error: singleError } = await supabase.from("open_data_entries").insert(record)
          if (!singleError) {
            insertedCount++
          } else {
            console.error(`Error en registro ${i + j + 1}:`, singleError.message)
            // Mostrar el registro problemático (solo campos relevantes)
            console.error("Registro problemático:", {
              orden_electronica: record.orden_electronica,
              fecha_publicacion: record.fecha_publicacion,
              fecha_fin_entrega: record.fecha_fin_entrega,
            })
          }
        }
      } else {
        insertedCount += batch.length
        console.log(`Lote insertado exitosamente: ${batch.length} registros`)
      }
    }

    const finalMessage =
      insertErrors.length > 0
        ? `Archivo procesado con algunos errores. Se insertaron ${insertedCount} de ${processedData.length} registros.`
        : `Archivo procesado exitosamente. Se insertaron ${insertedCount} registros.`

    return NextResponse.json({
      success: insertedCount > 0,
      message: finalMessage,
      stats: {
        totalRows: dataRows.length,
        processedRows: processedData.length,
        filteredRows: filteredCount,
        insertedRows: insertedCount,
        errors: errors,
        insertErrors: insertErrors,
      },
    })
  } catch (error) {
    console.error("Error processing upload:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor al procesar el archivo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
