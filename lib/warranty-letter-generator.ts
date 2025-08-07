import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"

export interface WarrantyLetterData {
  // Información de la empresa
  companyName: string
  companyRuc: string
  companyCode: string
  companyLogoUrl?: string

  // Información bancaria (se obtiene automáticamente por código de empresa)
  bankingInfo?: BankingInfo

  // Información de la carta
  letterNumber: string

  // Información del cliente
  clientName: string
  clientRuc: string
  clientAddress: string // Dirección de entrega (fallback)
  clientFiscalAddress?: string // Nueva dirección fiscal

  // Productos con garantía
  products: Array<{
    quantity: number
    description: string
    modelo?: string // ✅ Corregido: campo opcional modelo (como en la BD)
    brand: string
    code: string
  }>

  // Garantía
  warrantyMonths: number

  // Creado por
  createdBy: string
}

// Mapeo de marcas a códigos de empresa (CORREGIDO)
const BRAND_TO_COMPANY: Record<string, string> = {
  "HOPE LIFE": "ARM",
  WORLDLIFE: "ARM",
  ZEUS: "AGLE",
  VALHALLA: "AGLE",
}

// URLs de membretes por marca (CORREGIDO)
const LETTERHEAD_URLS: Record<string, string> = {
  "HOPE LIFE": "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/MEMBRETEPRUEBAHOPELIFE.png",
  WORLDLIFE: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/WORLDLIFE-HOJAMEMBRETADA.png",
  ZEUS: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/ZEUS-HOJA%20MEMBRETADAF.png",
  VALHALLA: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/VALHALLA-HOJAMEMBRETADA1.png",
}

export const generateWarrantyLetters = async (data: WarrantyLetterData): Promise<void> => {
  console.log("🚀 Iniciando generación de Cartas de Garantía...")
  console.log("DEBUG: Data recibida en generateWarrantyLetters:", data);
  console.log("DEBUG: data.products en generateWarrantyLetters:", data.products);

  // Agrupar productos por marca
  const productsByBrand = (data.products || []).reduce( // Modificado para manejar 'undefined'
    (acc, product) => {
      const brand = product.brand.toUpperCase()
      if (!acc[brand]) {
        acc[brand] = []
      }
      acc[brand].push(product)
      return acc
    },
    {} as Record<string, typeof data.products>,
  )

  console.log("📦 Productos agrupados por marca:", productsByBrand)

  // Generar una carta por cada marca
  for (const [brand, products] of Object.entries(productsByBrand)) {
    console.log(`🎨 Generando carta para marca: ${brand}`)

    const brandData = {
      ...data,
      products: products,
    }

    await generateSingleWarrantyLetter(brandData, brand)
  }

  console.log("✅ Todas las cartas de garantía generadas exitosamente")
}

const generateSingleWarrantyLetter = async (data: WarrantyLetterData, brand: string): Promise<void> => {
  // Obtener información bancaria automáticamente si tenemos el código de empresa
  if (data.companyCode && !data.bankingInfo) {
    const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
    if (bankingInfo) {
      data.bankingInfo = bankingInfo
    }
  }

  // Determinar el tipo de empresa (AGLE o ARM)
  const companyType = BRAND_TO_COMPANY[brand] || "AGLE"
  const letterheedUrl = LETTERHEAD_URLS[brand]

  console.log(`🎨 Creando contenido HTML para ${brand} (${companyType})...`)

  // Crear el HTML según el tipo de empresa
  const htmlContent =
    companyType === "AGLE"
      ? createAGLEWarrantyLetterHTML(data, brand, letterheedUrl)
      : createARMWarrantyLetterHTML(data, brand, letterheedUrl)

  // Crear un elemento temporal en el DOM
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = "absolute"
  tempDiv.style.left = "-9999px"
  tempDiv.style.top = "0"
  tempDiv.style.width = "210mm" // A4 width exactly
  tempDiv.style.backgroundColor = "white"
  tempDiv.style.fontFamily = "Arial, sans-serif"
  document.body.appendChild(tempDiv)

  try {
    console.log("⏳ Esperando renderizado del contenido...")

    // Esperar un poco para que el contenido se renderice
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Obtener las dimensiones reales del contenido
    const contentHeight = tempDiv.scrollHeight
    const contentWidth = tempDiv.scrollWidth

    console.log("📏 Dimensiones del contenido:", { width: contentWidth, height: contentHeight })

    // Convertir HTML a canvas con configuración para A4
    console.log("🖼️ Convirtiendo HTML a canvas...")

    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 794, // A4 width in pixels at 96 DPI
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    })

    // Dimensiones A4 en mm
    const a4Width = 210
    const a4Height = 297

    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Calcular altura proporcional manteniendo el ancho A4
    const pdfHeight = (imgHeight * a4Width) / imgWidth

    console.log("📄 Creando PDF con dimensiones A4:", { width: a4Width, height: pdfHeight })

    // Crear PDF con formato A4
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pdfHeight > a4Height ? [a4Width, pdfHeight] : "a4",
    })

    // Convertir canvas a imagen
    const imgData = canvas.toDataURL("image/png", 1.0) // Máxima calidad

    // Agregar la imagen al PDF ocupando todo el ancho A4
    pdf.addImage(imgData, "PNG", 0, 0, a4Width, pdfHeight, undefined, "FAST")

    // Descargar el PDF
    const fileName = `Certificado_Garantia_${brand}_${data.letterNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
    pdf.save(fileName)

    console.log(`✅ Carta de Garantía ${brand} generada y descargada exitosamente:`, fileName)
  } catch (error) {
    console.error(`❌ Error en generación de Carta de Garantía ${brand}:`, error)
    throw error
  } finally {
    // Limpiar el elemento temporal
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv)
    }
  }
}

// Función helper para obtener el texto del producto con fallback
const getProductDisplayText = (product: WarrantyLetterData["products"][0]): string => {
  // Usar modelo si existe, sino usar description, sino usar "PRODUCTO"
  return product.modelo?.trim() || product.description?.trim() || "PRODUCTO"
}

const createAGLEWarrantyLetterHTML = (data: WarrantyLetterData, brand: string, letterheedUrl?: string): string => {
  const currentDate = new Date().toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada";

  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #000; position: relative; overflow: hidden; margin: 0; padding: 0;">

      <!-- Membrete de fondo -->
      ${
        letterheedUrl
          ? `
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
          <img src="${letterheedUrl}" alt="Membrete ${brand}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" crossorigin="anonymous" />
        </div>
      `
          : ""
      }

      <!-- Contenido principal - Posicionado para no interferir con el membrete -->
      <div style="position: relative; z-index: 2; padding: 30mm 20mm 20mm 20mm; height: calc(297mm - 80mm); box-sizing: border-box;">

        <!-- Título principal -->
        <div style="text-align: center; margin-bottom: 6mm;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #000; letter-spacing: 1px;">
            CERTIFICADO DE GARANTÍA
          </h1>
        </div>

        <!-- Fecha -->
        <div style="text-align: right; margin-bottom: 7mm;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #000;">Lima, ${currentDate}</p>
        </div>

        <!-- Información del destinatario -->
        <div style="margin-bottom: 5mm;">
          <p style="margin: 0 0 3mm 0; font-size: 11px; font-weight: 600; color: #000;">SEÑORES:</p>
          <h3 style="margin: 0 0 3mm 0; font-size: 13px; font-weight: 800; color: #000;">${data.clientName}</h3>
          <p style="margin: 0 0 3mm 0; font-size: 10px; color: #000;">Ruc: ${data.clientRuc}</p>
          <p style="margin: 0 0 3mm 0; font-size: 10px; color: #000; line-height: 1.4;">${addressToDisplay}.</p>
        </div>

        <!-- Contenido principal -->
        <div style="margin-bottom: 5mm; line-height: 1.5; text-align: justify;">
          <p style="margin: 0 0 3mm 0; font-size: 10px; color: #000;">
            Por medio de la presente, <strong>AGLE PERUVIAN COMPANY E.I.R.L.</strong> garantiza este producto por un período de <strong>${data.warrantyMonths === 1 ? "un (1) mes" : data.warrantyMonths === 12 ? "doce (12) meses" : `${data.warrantyMonths} meses`}</strong> contados a partir de la fecha de entrega al usuario final. Esta garantía cubre defectos de fabricación y fallos de funcionamiento en todos los componentes, así como la mano de obra necesaria para su reparación o reemplazo, siempre que dichos defectos sean atribuibles a procesos de fabricación.
          </p>

          <p style="margin: 0 0  3mm 0; font-size: 10px; color: #000;">
            El producto ha sido sometido a estrictos procedimientos de control de calidad antes de su distribución. En caso de detectarse alguna falla dentro del periodo de garantía, el cliente deberá contactarse a través de los canales autorizados indicados en este documento, para los siguientes bienes:
          </p>

          <!-- Lista de productos usando MODELO con fallback a descripción -->
          <div style="margin: 5mm 0;">
            <p style="margin: 0 0 3mm 0; font-size: 10px; font-weight: 700; color: #000;">➤ Producto:</p>
            ${data.products
              .map(
                (product) => `
              <p style="margin: 0 0 3mm 0; font-size: 10px; color: #000; font-weight: 700;">
                ${brand} ${getProductDisplayText(product).toUpperCase()} CÓDIGO ${(product.code || "N/A").toUpperCase()}, ${product.quantity.toString().padStart(2, "0")} UNIDADES.
              </p>
            `,
              )
              .join("")}
          </div>

          <p style="margin: 3mm 0 0 0; font-size: 10px; color: #000;">
            <strong>➤ Fabricante/Distribuidor:</strong> AGLE PERUVIAN COMPANY E.I.R.L.
          </p>
        </div>

        <!-- Exclusiones de garantía -->
        <div style="margin-bottom: 5mm;">
          <h3 style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 700; color: #000;">Exclusiones de la Garantía</h3>
          
          <p style="margin: 0 0 4mm 0; font-size: 10px; font-weight: 700; color: #000;">Esta garantía no será válida en los siguientes casos:</p>
          
          <div style="margin-bottom: 3mm;">
            <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
              • Cuando el producto haya sido utilizado en condiciones distintas a las especificadas por el fabricante o fuera de sus parámetros normales de operación.
            </p>
            
            <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
              • Si el producto ha sido intervenido, modificado, reparado o alterado por personas o servicios técnicos no autorizados por AGLE PERUVIAN COMPANY E.I.R.L.
            </p>
            
            <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
              • En caso de uso indebido, negligencia, daño intencional o manipulación incorrecta por parte del usuario final.
            </p>

            <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
              • Daños ocasionados por causas externas, tales como: accidentes, desastres naturales, sobrecargas eléctricas, exposición a líquidos, o uso de accesorios no originales.
            </p>
          </div>
        </div>

        <!-- Limitación de responsabilidad -->
        <div style="margin-bottom: 5mm;">
          <h3 style="margin: 0 0 3mm 0; font-size: 11px; font-weight: 700; color: #000;">Limitación de Responsabilidad</h3>
          
          <p style="margin: 0 0 3mm 0; font-size: 10px; color: #000;">AGLE PERUVIAN COMPANY E.I.R.L. no será responsable en ningún caso por:</p>
          
          <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">• Pérdida de beneficios o lucro cesante.</p>
          <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">• Daños indirectos, incidentales o consecuenciales.</p>
          <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">• Cualquier otro perjuicio económico, personal o material derivado del uso, mal funcionamiento o imposibilidad de uso del producto.</p>
        </div>

        <!-- Alcance de la garantía -->
        <div style="margin-bottom: 6mm;">
          <p style="margin: 0 0 5mm 0; font-size: 10px; color: #000; text-align: justify;">
            Esta garantía ampara únicamente el producto identificado en este documento y no es transferible. Cualquier servicio prestado fuera del periodo de garantía, o que no esté cubierto por las condiciones aquí descritas, estará sujeto a cargos adicionales por parte del proveedor. <strong>¡Gracias por confiar en nosotros!</strong>
          </p>
        </div>

        <!-- Firma -->
        <div style="margin-top: 8mm;">
          <p style="margin: 0 0 6mm 0; font-size: 10px; color: #000;">Atentamente,</p>
        </div>
      </div>
    </div>
  `
}

const createARMWarrantyLetterHTML = (data: WarrantyLetterData, brand: string, letterheedUrl?: string): string => {
  const currentDate = new Date().toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada";

  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #000; position: relative; overflow: hidden; margin: 0; padding: 0;">

      <!-- Membrete de fondo -->
      ${
        letterheedUrl
          ? `
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
          <img src="${letterheedUrl}" alt="Membrete ${brand}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" crossorigin="anonymous" />
        </div>
      `
          : ""
      }

      <!-- Contenido principal - Posicionado para no interferir con el membrete -->
      <div style="position: relative; z-index: 2; padding: 45mm 20mm 20mm 20mm; height: calc(297mm - 80mm); box-sizing: border-box;">

        <!-- Título principal -->
        <div style="text-align: center; margin-bottom: 7mm;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #000; letter-spacing: 1px;">
            CARTA DE GARANTÍA
          </h1>
        </div>

        <!-- Fecha -->
        <div style="text-align: right; margin-bottom: 15mm;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #000;">Lima, ${currentDate}.</p>
        </div>

        <!-- Información del destinatario -->
        <div style="margin-bottom: 10mm;">
          <p style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 600; color: #000;">Señor(a)(es):</p>
          <h3 style="margin: 0 0 4mm 0; font-size: 13px; font-weight: 800; color: #000;">${data.clientName}</h3>
          <p style="margin: 0 0 4mm 0; font-size: 10px; color: #000;">RUC: ${data.clientRuc}</p>
          <p style="margin: 0 0 8mm 0; font-size: 10px; color: #000; line-height: 1.4;">DIRECCIÓN: ${addressToDisplay}</p>
        </div>

        <!-- Contenido principal -->
        <div style="margin-bottom: 8mm; line-height: 1.5; text-align: justify;">
          <p style="margin: 0 0 6mm 0; font-size: 10px; color: #000;">
            Por medio de la presente, la empresa <strong>ARM CORPORATIONS DEL PERÚ E.I.R.L.</strong> les garantiza que las siguientes herramientas:
          </p>

          <!-- Lista de productos usando MODELO con fallback a descripción -->
          <div style="margin: 5mm 0;">
            ${data.products
              .map(
                (product) => `
              <p style="margin: 0 0 3mm 0; font-size: 11px; font-weight: 700; color: #000; line-height: 1.3;">
                ${product.quantity} ${getProductDisplayText(product).toUpperCase()} DE MARCA ${product.brand.toUpperCase()}${product.code ? ` CON CÓDIGO ${product.code.toUpperCase()}` : ""}.
              </p>
            `,
              )
              .join("")}
          </div>

          <p style="margin: 5mm 0; font-size: 10px; color: #000;">
            Cuentan con una garantía de <strong>${data.warrantyMonths} MESES</strong>, en todas sus partes y mano de obra, contra cualquier defecto de fabricación y funcionamiento a partir de la fecha entregada al consumidor final. El producto adquirido ha sido sometido a los más estrictos procesos de control de calidad antes de llegar a usted; por lo que, si se presenta algún desperfecto en su funcionamiento, atribuible a su fabricación, durante la vigencia del plazo de esta garantía, le rogaríamos contactarnos a través de algunos de los medios especificados en el presente certificado.
          </p>

          <p style="margin: 5mm 0; font-size: 10px; color: #000;">
            Asimismo, <strong>ARM CORPORATIONS DEL PERÚ E.I.R.L.</strong> no se responsabiliza de modo alguno por lucro de pérdida de utilidades, daños indirectos, ni por ningún otro perjuicio que surja como consecuencia de un indebido funcionamiento del producto adquirido.
          </p>
        </div>

        <!-- Condiciones de garantía -->
        <div style="margin-bottom: 8mm;">
          <p style="margin: 0 0 4mm 0; font-size: 10px; font-weight: 700; color: #000;">ESTA GARANTÍA NO ES VÁLIDA EN CUALQUIERA DE LOS SIGUIENTES CASOS:</p>
          
          <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
            • Cuando el producto se hubiese utilizado en condiciones distintas a lo normal.
          </p>
          
          <p style="margin: 0 0 2mm 0; font-size: 9px; line-height: 1.3; color: #000;">
            • Cuando el producto hubiese sido alterado o manipulado por terceros.
          </p>
          
          <p style="margin: 0 0 6mm 0; font-size: 9px; line-height: 1.3; color: #000;">
            • Cuando el producto haya tenido un mal uso por parte del usuario final.
          </p>

          <div style="text-align: center; padding: 4mm; border: 1px solid #000; margin-top: 4mm;">
            <p style="margin: 0; font-size: 10px; font-weight: 700; color: #000;">
              ESTA GARANTÍA AMPARA ÚNICAMENTE AL PRODUCTO DESCRITO EN ESTE DOCUMENTO.
            </p>
          </div>
        </div>

        <!-- Firma -->
        <div style="margin-top: 15mm;">
          <p style="margin: 0 0 10mm 0; font-size: 10px; color: #000;">Atentamente,</p>
          
        </div>
      </div>
    </div>
  `
}

// Función de compatibilidad hacia atrás
export const generateWarrantyLetter = generateWarrantyLetters
