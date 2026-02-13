import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { getBankingInfoByCompanyCode, type BankingInfo } from "./company-banking-info"
import { supabase } from "./supabase"

export interface CCILetterData {
  // Información de la empresa (se obtiene automáticamente de la BD)
  companyName?: string
  companyRuc?: string
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

  // Información adicional
  ocam?: string | null
  oc?: string | null
  siaf?: string | null
  physical_order?: string | null

  // Creado por
  createdBy: string

  customDate?: Date
}

// URLs de las hojas membretadas eliminadas - ahora se obtienen de la BD
// Función para determinar qué hoja membretada usar eliminada - ahora se obtiene de la BD

// Función para determinar el tipo de plantilla
const getLetterheadType = (companyCode: string): "AGLE" | "ARM" | "GALUR" | null => {
  const upperCode = companyCode.toUpperCase()

  if (upperCode.includes("AGLE")) {
    return "AGLE"
  } else if (upperCode.includes("ARM")) {
    return "ARM"
  } else if (upperCode.includes("GALUR")) {
    return "GALUR"
  }

  return null
}

// Función para cargar imagen como base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      canvas.width = img.width
      canvas.height = img.height

      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const dataURL = canvas.toDataURL("image/png")
        resolve(dataURL)
      } else {
        reject(new Error("No se pudo obtener el contexto del canvas"))
      }
    }

    img.onerror = () => {
      reject(new Error(`Error al cargar la imagen: ${url}`))
    }

    img.src = url
  })
}

export const generateCCILetter = async (data: CCILetterData): Promise<void> => {
  console.log("🚀 Iniciando generación de Carta de CCI...")

  try {
    // Obtener información del usuario activo
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("❌ Error obteniendo usuario:", userError)
      throw new Error("No se pudo obtener la información del usuario activo")
    }

    // Obtener el perfil del usuario para determinar su empresa
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        *,
        departments!profiles_department_id_fkey (
          id,
          name,
          company_id
        )
      `)
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("❌ Error obteniendo perfil:", profileError)
      throw new Error("No se pudo obtener el perfil del usuario")
    }

    // Determinar la empresa del usuario
    let userCompanyCode = data.companyCode
    let companyId: string | null = null

    if (profile.role === "admin" && profile.selectedCompanyId) {
      // Para admins, usar la empresa seleccionada
      const { data: selectedCompany, error: companyError } = await supabase
        .from("companies")
        .select("id, code, name, ruc, logo_url")
        .eq("id", profile.selectedCompanyId)
        .single()

      if (selectedCompany && !companyError) {
        userCompanyCode = selectedCompany.code
        companyId = selectedCompany.id
        // Actualizar los datos de la empresa
        data.companyCode = selectedCompany.code
        data.companyName = selectedCompany.name
        data.companyRuc = selectedCompany.ruc || "N/A"
        data.companyLogoUrl = selectedCompany.logo_url || undefined
        console.log("👤 Admin detectado - Empresa seleccionada:", selectedCompany.name, selectedCompany.code)
      }
    } else if (profile.departments?.company_id) {
      // Para usuarios regulares, usar la empresa de su departamento
      const { data: userCompany, error: companyError } = await supabase
        .from("companies")
        .select("id, code, name, ruc, logo_url")
        .eq("id", profile.departments.company_id)
        .single()

      if (userCompany && !companyError) {
        userCompanyCode = userCompany.code
        companyId = userCompany.id
        // Actualizar los datos de la empresa
        data.companyCode = userCompany.code
        data.companyName = userCompany.name
        data.companyRuc = userCompany.ruc || "N/A"
        data.companyLogoUrl = userCompany.logo_url || undefined
        console.log("👤 Usuario regular detectado - Empresa:", userCompany.name, userCompany.code)
      }
    }

    // Si no se pudo obtener la empresa del usuario, intentar buscar por código
    if (!data.companyName && data.companyCode) {
      console.log("🔍 Buscando empresa por código:", data.companyCode)
      const { data: companyByCode, error: codeError } = await supabase
        .from("companies")
        .select("id, code, name, ruc, logo_url")
        .eq("code", data.companyCode.toUpperCase())
        .single()

      if (companyByCode && !codeError) {
        data.companyName = companyByCode.name
        data.companyRuc = companyByCode.ruc || "N/A"
        data.companyLogoUrl = companyByCode.logo_url || undefined
        console.log("✅ Empresa encontrada por código:", companyByCode.name)
      } else {
        console.warn("⚠️ No se pudo encontrar la empresa por código:", data.companyCode)
      }
    }

    console.log("🏢 Datos finales de empresa:", {
      code: data.companyCode,
      name: data.companyName,
      ruc: data.companyRuc,
      logo: data.companyLogoUrl ? "Sí" : "No",
    })

    // Obtener información bancaria automáticamente si tenemos el código de empresa
    if (data.companyCode && !data.bankingInfo) {
      const bankingInfo = getBankingInfoByCompanyCode(data.companyCode)
      if (bankingInfo) {
        data.bankingInfo = bankingInfo
      }
      console.log("✅ Banking info obtained for company:", data.companyCode, data.bankingInfo ? "Sí" : "No")
    }

    // Validar que tenemos los datos mínimos necesarios
    if (!data.companyName || !data.companyRuc) {
      throw new Error(
        "No se pudieron obtener los datos de la empresa. Verifique que la empresa esté correctamente configurada.",
      )
    }

    // Determinar qué hoja membretada usar
    // Fetch from DB
    let letterheadUrl: string | null = null
    const { data: companyLet } = await supabase.from('companies').select('letterhead_url').eq('code', data.companyCode).maybeSingle()
    letterheadUrl = (companyLet as any)?.letterhead_url || null

    const letterheadType = getLetterheadType(data.companyCode)
    console.log("📄 Hoja membretada seleccionada:", letterheadType, letterheadUrl)

    let letterheadBase64: string | null = null

    // Cargar hoja membretada si está disponible
    if (letterheadUrl) {
      try {
        console.log("⏳ Cargando hoja membretada...")
        letterheadBase64 = await loadImageAsBase64(letterheadUrl)
        console.log("✅ Hoja membretada cargada exitosamente")
      } catch (error) {
        console.warn("⚠️ Error al cargar hoja membretada, usando diseño estándar:", error)
        letterheadBase64 = null
      }
    }

    console.log("🎨 Creando contenido HTML de la Carta de CCI...")

    // Crear el HTML temporal para el PDF
    const htmlContent = createCCILetterHTML(data, letterheadBase64, letterheadType)

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
      await new Promise((resolve) => setTimeout(resolve, 3000)) // Más tiempo para cargar imágenes

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
      const fileName = `Carta_CCI_${data.letterNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`
      pdf.save(fileName)

      console.log("✅ Carta de CCI generada y descargada exitosamente:", fileName)
    } catch (error) {
      console.error("❌ Error en generación de Carta de CCI:", error)
      throw error
    } finally {
      // Limpiar el elemento temporal
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
    }
  } catch (error) {
    console.error("❌ Error general en generación de Carta de CCI:", error)
    throw error
  }
}

const createCCILetterHTML = (
  data: CCILetterData,
  letterheadBase64: string | null,
  letterheadType: "AGLE" | "ARM" | "GALUR" | null,
): string => {
  const currentDate = data.customDate
    ? data.customDate.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : new Date().toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  // Si tenemos hoja membretada, usar la plantilla específica
  if (letterheadBase64 && letterheadType) {
    switch (letterheadType) {
      case "AGLE":
        return createAGLELetterheadHTML(data, letterheadBase64, currentDate)
      case "ARM":
        return createARMLetterheadHTML(data, letterheadBase64, currentDate)
      case "GALUR":
        return createGALURLetterheadHTML(data, letterheadBase64, currentDate)
      default:
        return createStandardHTML(data, currentDate)
    }
  }

  // Diseño estándar sin membrete
  return createStandardHTML(data, currentDate)
}


const createGALURLetterheadHTML = (data: CCILetterData, letterheadBase64: string, currentDate: string): string => {
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  // Estilos de filas para GALUR - Texto un poco más pequeño para asegurar que quepa
  const labelStyle = "padding: 3mm 0; font-weight: 600; color: #666; width: 35%; font-size: 10px;"
  const valueStyle = "padding: 3mm 0; color: #1a1a1a; font-weight: 700; font-size: 11px;"

  let bankingInfoRows = `
    <tr>
      <td style="${labelStyle}">EMPRESA:</td>
      <td style="${valueStyle}">${data.companyName || "N/A"}</td>
    </tr>
    <tr>
      <td style="${labelStyle}">RUC:</td>
      <td style="${valueStyle}">${data.companyRuc || "N/A"}</td>
    </tr>
    <tr>
      <td style="${labelStyle}">ENTIDAD BANCARIA:</td>
      <td style="${valueStyle}">
        ${data.bankingInfo?.bankAccount?.bank || "BANCO DE CRÉDITO DEL PERÚ (BCP)"}
      </td>
    </tr>
    <tr>
      <td style="${labelStyle}">NÚMERO DE CUENTA:</td>
      <td style="${valueStyle} font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.accountNumber || "N/A"}
      </td>
    </tr>
    <tr>
      <td style="${labelStyle}">CÓDIGO CCI:</td>
      <td style="${valueStyle} font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.cci || "N/A"}
      </td>
    </tr>
  `

  if (data.ocam) {
    bankingInfoRows += `
    <tr>
      <td style="${labelStyle}">OCAM:</td>
      <td style="${valueStyle}">${data.ocam}</td>
    </tr>
    `
  }

  if (data.oc) {
    bankingInfoRows += `
    <tr>
      <td style="${labelStyle}">OC:</td>
      <td style="${valueStyle}">${data.oc}</td>
    </tr>
    `
  }

  if (data.physical_order) {
    bankingInfoRows += `
    <tr>
      <td style="${labelStyle}">ORDEN FÍSICA:</td>
      <td style="${valueStyle}">${data.physical_order}</td>
    </tr>
    `
  }

  if (data.siaf) {
    bankingInfoRows += `
    <tr>
      <td style="${labelStyle}">SIAF:</td>
      <td style="${valueStyle}">${data.siaf}</td>
    </tr>
    `
  }

  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">

      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido sobre la hoja membretada - Ajustado para GALUR -->
      <!-- Margen Izquierdo 45mm para evitar franja verde -->
      <div style="position: relative; z-index: 2; padding: 0; margin: 0; width: 100%; height: 100%;">

        <!-- Área de fecha - Alineada a la derecha de la zona blanca -->
        <div style="position: absolute; top: 50mm; right: 20mm; text-align: right;">
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1a1a1a;">Lima, ${currentDate}.</p>
        </div>

        <!-- Título de la carta - Centrado en el área útil (de 60mm a 210mm-20mm) -->
        <div style="position: absolute; top: 60mm; left: 45mm; right: 20mm; text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.5px; text-decoration: underline;">CARTA DE AUTORIZACIÓN</h1>
        </div>

        <!-- Área del destinatario - Ajustada al área blanca -->
        <div style="position: absolute; top: 70mm; left: 45mm; right: 20mm;">
          <div style="margin-bottom: 6mm;">
            <p style="margin: 0 0 3mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">SEÑORES:</p>
            <h3 style="margin: 0 0 2mm 0; font-size: 13px; font-weight: 800; color: #1a1a1a; line-height: 1.2;">${data.clientName}</h3>
            <p style="margin: 0 0 2mm 0; font-size: 10px; color: #666;">RUC: ${data.clientRuc}</p>
            <p style="margin: 0; font-size: 10px; color: #666; line-height: 1.3;">${addressToDisplay}</p>
          </div>
          
          <p style="margin: 6mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Presente. –</p>
        </div>

        <!-- Contenido principal - Ajustado al área blanca -->
        <div style="position: absolute; top: 110mm; left: 50mm; right: 25mm; line-height: 1.4;">
          <p style="margin: 0 0 5mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Por medio de la presente, comunico a usted, que la entidad bancaria, número de cuenta y el 
            respectivo Código de Cuenta Interbancario (CCI) de la empresa que represento es la siguiente:
          </p>

          <!-- Información bancaria -->
          <div style="margin: 6mm 0;">
            <table style="width: 100%; border-collapse: collapse;">
              ${bankingInfoRows}
            </table>
          </div>

          <p style="margin: 5mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Se certifica que el número de cuenta bancaria informado se encuentra vinculado al RUC 
            indicado, conforme a los datos registrados en el sistema financiero nacional al momento de su 
            apertura.
          </p>

          <p style="margin: 5mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Asimismo, dejo constancia que la factura a ser emitida por mi representada, una vez cumplida o 
            atendida la correspondiente Orden de Compra y/o de Servicio o las prestaciones en bienes y/o 
            servicios materia del contrato quedará cancelada para todos sus efectos mediante la sola 
            acreditación del importe de la referida factura a favor de la cuenta en la entidad bancaria a que 
            se refiere el primer párrafo de la presente.
          </p>
        </div>

        <!-- Área de despedida y firma - Ajustado para no chocar con las ondas inferiores -->
        <div style="position: absolute; bottom: 50mm; left: 50mm; right: 20mm;">
          <p style="margin: 0; font-size: 10px; color: #1a1a1a;">Atentamente,</p>
        </div>
      </div>
    </div>
  `
}

const createARMLetterheadHTML = (data: CCILetterData, letterheadBase64: string, currentDate: string): string => {
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  let bankingInfoRows = `
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666; width: 30%;">EMPRESA:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.companyName || "N/A"}</td>
    </tr>
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">RUC:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.companyRuc || "N/A"}</td>
    </tr>
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">ENTIDAD BANCARIA:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">
        ${data.bankingInfo?.bankAccount?.bank || "BANCO DE CRÉDITO DEL PERÚ (BCP)"}
      </td>
    </tr>
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">NÚMERO DE CUENTA:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700; font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.accountNumber || "N/A"}
      </td>
    </tr>
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">CÓDIGO CCI:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700; font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.cci || "N/A"}
      </td>
    </tr>
  `

  if (data.ocam) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">OCAM:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.ocam}</td>
    </tr>
    `
  }

  if (data.oc) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">OC:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.oc}</td>
    </tr>
    `
  }

  if (data.physical_order) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">ORDEN FÍSICA:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.physical_order}</td>
    </tr>
    `
  }

  if (data.siaf) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 4mm 6mm; font-weight: 600; color: #666;">SIAF:</td>
      <td style="padding: 4mm 6mm; color: #1a1a1a; font-weight: 700;">${data.siaf}</td>
    </tr>
    `
  }

  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">

      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido sobre la hoja membretada - Ajustado exactamente a las áreas de la plantilla -->
      <div style="position: relative; z-index: 2; padding: 0; margin: 0; width: 100%; height: 100%;">

        <!-- Área de fecha - Posicionada en la esquina superior derecha -->
        <div style="position: absolute; top: 40mm; right: 20mm; text-align: right;">
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1a1a1a;">Lima, ${currentDate}.</p>
        </div>

        <!-- Título de la carta -->
        <div style="position: absolute; top: 50mm; left: 0; right: 0; text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.5px;">CARTA DE AUTORIZACIÓN</h1>
        </div>

        <!-- Área del destinatario - Posicionada exactamente donde está en la plantilla -->
        <div style="position: absolute; top: 60mm; left: 20mm; right: 20mm;">
          <div style="margin-bottom: 8mm;">
            <p style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">SEÑORES:</p>
            <h3 style="margin: 0 0 3mm 0; font-size: 13px; font-weight: 800; color: #1a1a1a; line-height: 1.2;">${data.clientName}</h3>
            <p style="margin: 0 0 2mm 0; font-size: 10px; color: #666;">RUC: ${data.clientRuc}</p>
            <p style="margin: 0; font-size: 10px; color: #666; line-height: 1.3;">${addressToDisplay}</p>
          </div>
          
          <p style="margin: 8mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Presente. –</p>
        </div>

        <!-- Contenido principal - Posicionado después del área del destinatario -->
        <div style="position: absolute; top: 100mm; left: 20mm; right: 20mm; line-height: 1.4;">
          <p style="margin: 0 0 6mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Por medio de la presente, comunico a usted, que la entidad bancaria, número de cuenta y el 
            respectivo Código de Cuenta Interbancario (CCI) de la empresa que represento es la siguiente:
          </p>

          <!-- Información bancaria en tabla simple sin fondos que compitan con la plantilla -->
          <div style="margin: 8mm 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              ${bankingInfoRows}
            </table>
          </div>

          <p style="margin: 6mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Se certifica que el número de cuenta bancaria informado se encuentra vinculado al RUC 
            indicado, conforme a los datos registrados en el sistema financiero nacional al momento de su 
            apertura.
          </p>

          <p style="margin: 6mm 0; font-size: 10px; color: #1a1a1a; text-align: justify;">
            Asimismo, dejo constancia que la factura a ser emitida por mi representada, una vez cumplida o 
            atendida la correspondiente Orden de Compra y/o de Servicio o las prestaciones en bienes y/o 
            servicios materia del contrato quedará cancelada para todos sus efectos mediante la sola 
            acreditación del importe de la referida factura a favor de la cuenta en la entidad bancaria a que 
            se refiere el primer párrafo de la presente.
          </p>
        </div>

        <!-- Área de despedida y firma - Posicionada en la parte inferior -->
        <div style="position: absolute; bottom: 30mm; left: 20mm; right: 20mm;">
          <p style="margin: 0 0 15mm 0; font-size: 10px; color: #1a1a1a;">Atentamente,</p>
          
        </div>
      </div>
    </div>
  `
}

const createAGLELetterheadHTML = (data: CCILetterData, letterheadBase64: string, currentDate: string): string => {
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  let bankingInfoRows = `
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666; width: 30%;">EMPRESA:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.companyName || "N/A"}</td>
    </tr>
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">RUC:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.companyRuc || "N/A"}</td>
    </tr>
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">ENTIDAD BANCARIA:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">
        ${data.bankingInfo?.bankAccount?.bank || "BANCO DE CRÉDITO DEL PERÚ (BCP)"}
      </td>
    </tr>
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">NÚMERO DE CUENTA:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700; font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.accountNumber || "N/A"}
      </td>
    </tr>
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">CÓDIGO CCI:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700; font-family: monospace;">
        ${data.bankingInfo?.bankAccount?.cci || "N/A"}
      </td>
    </tr>
  `

  if (data.ocam) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">OCAM:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.ocam}</td>
    </tr>
    `
  }

  if (data.oc) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">OC:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.oc}</td>
    </tr>
    `
  }

  if (data.physical_order) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">ORDEN FÍSICA:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.physical_order}</td>
    </tr>
    `
  }

  if (data.siaf) {
    bankingInfoRows += `
    <tr>
      <td style="padding: 2mm 6mm; font-weight: 600; color: #666;">SIAF:</td>
      <td style="padding: 3mm 6mm; color: #1a1a1a; font-weight: 700;">${data.siaf}</td>
    </tr>
    `
  }

  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">

      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido sobre la hoja membretada - Ajustado exactamente a las áreas de la plantilla -->
      <div style="position: relative; z-index: 2; padding: 0; margin: 0; width: 100%; height: 100%;">

        <!-- Área de fecha - Posicionada en la esquina superior derecha -->
        <div style="position: absolute; top: 40mm; right: 40mm; text-align: right;">
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Lima, ${currentDate}</p>
        </div>

        <!-- Título de la carta -->
        <div style="position: absolute; top: 50mm; left: 0; right: 0; text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.5px;">CARTA DE AUTORIZACIÓN</h1>
        </div>

        <!-- Área del destinatario - Posicionada exactamente donde está en la plantilla -->
        <div style="position: absolute; top: 60mm; left: 20mm; right: 20mm;">
          <div style="margin-bottom: 8mm;">
            <p style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">SEÑORES:</p>
            <h3 style="margin: 0 0 3mm 0; font-size: 13px; font-weight: 800; color: #1a1a1a; line-height: 1.2;">${data.clientName}</h3>
            <p style="margin: 0 0 2mm 0; font-size: 10px; color: #666;">RUC: ${data.clientRuc}</p>
            <p style="margin: 0; font-size: 10px; color: #666; line-height: 1.3;">${addressToDisplay}</p>
          </div>
          
          
        </div >
        <div style="position: absolute; top: 88mm; left: 20mm; right: 20mm;">
        <p style="margin: 0mm 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Presente. –</p>
        </div>


        <!-- Contenido principal - Posicionado después del área del destinatario -->
        <div style="position: absolute; top: 95mm; left: 20mm; right: 20mm; line-height: 1.4;">
          <p style="margin: 0 0 6mm 0; font-size: 11px; color: #1a1a1a; text-align: justify;">
            Por medio de la presente, comunico a usted, que la entidad bancaria, número de cuenta y el 
            respectivo Código de Cuenta Interbancario (CCI) de la empresa que represento es la siguiente:
          </p>

          <!-- Información bancaria en tabla simple sin fondos que compitan con la plantilla -->
          <div style="margin: 8mm 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              ${bankingInfoRows}
            </table>
          </div>

          <p style="margin: 4mm 0; font-size: 11px; color: #1a1a1a; text-align: justify;">
            Se certifica que el número de cuenta bancaria informado se encuentra vinculado al RUC 
            indicado, conforme a los datos registrados en el sistema financiero nacional al momento de su 
            apertura.
          </p>

          <p style="margin: 5mm 0; font-size: 11px; color: #1a1a1a; text-align: justify;">
            Asimismo, dejo constancia que la factura a ser emitida por mi representada, una vez cumplida o 
            atendida la correspondiente Orden de Compra y/o de Servicio o las prestaciones en bienes y/o 
            servicios materia del contrato quedará cancelada para todos sus efectos mediante la sola 
            acreditación del importe de la referida factura a favor de la cuenta en la entidad bancaria a que 
            se refiere el primer párrafo de la presente.
          </p>
        </div>

        <!-- Área de despedida y firma - Posicionada en la parte inferior -->
        <div style="position: absolute; bottom: 40mm; left: 30mm; right: 20mm;">
          <p style="margin: 0 0 15mm 0; font-size: 10px; color: #1a1a1a;">Atentamente,</p>
        </div>

      </div>
    </div>
  `
}

const createStandardHTML = (data: CCILetterData, currentDate: string): string => {
  const addressToDisplay = data.clientFiscalAddress || data.clientAddress || "Dirección no especificada"

  const bankingInfoRows = `
    <div>
      <div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">EMPRESA:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.companyName || "N/A"}</p>
      </div>
      
      <div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">RUC:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.companyRuc || "N/A"}</p>
      </div>
      
      <div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">ENTIDAD BANCARIA:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">
          ${data.bankingInfo?.bankAccount?.bank || "BANCO DE CRÉDITO DEL PERÚ (BCP)"}
        </p>
      </div>
    </div>
    
    <div>
      <div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">NÚMERO DE CUENTA:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700; font-family: monospace;">
          ${data.bankingInfo?.bankAccount?.accountNumber || "N/A"}
        </p>
      </div>
      
      <div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">CÓDIGO CCI:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700; font-family: monospace;">
          ${data.bankingInfo?.bankAccount?.cci || "N/A"}
        </p>
      </div>
      
      ${data.ocam
      ? `<div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">OCAM:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.ocam}</p>
      </div>`
      : ""
    }
      
      ${data.oc
      ? `<div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">OC:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.oc}</p>
      </div>`
      : ""
    }
      
      ${data.physical_order
      ? `<div style="margin-bottom: 4mm;">
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">ORDEN FÍSICA:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.physical_order}</p>
      </div>`
      : ""
    }
      
      ${data.siaf
      ? `<div>
        <p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase;">SIAF:</p>
        <p style="margin: 0; font-size: 11px; color: #1a1a1a; font-weight: 700;">${data.siaf}</p>
      </div>`
      : ""
    }
    </div>
  `

  return `
    <div style="width: 210mm; min-height: 297mm; background: white; font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; padding: 15mm; margin: 0;">

      <!-- Header oficial con acento -->
      <div style="text-align: center; margin-bottom: 15mm; padding: 8mm; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 6mm; border-left: 3mm solid #3b82f6;">
        <p style="margin: 0; font-size: 11px; font-weight: 700; color: #3b82f6; letter-spacing: 0.5px;">
          "AÑO DE LA RECUPERACIÓN Y CONSOLIDACIÓN DE LA ECONOMÍA PERUANA"
        </p>
      </div>

      <!-- Header con logo y datos de empresa -->
      <div style="margin-bottom: 15mm;">
        <div style="background: #fafafa; padding: 8mm; border-radius: 4mm; border-left: 3mm solid #3b82f6;">
          ${data.companyLogoUrl
      ? `
          <div style="text-align: center; margin-bottom: 8mm;">
            <img src="${data.companyLogoUrl}" alt="Logo ${data.companyName}" style="max-width: 120px; max-height: 80px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" crossorigin="anonymous" />
          </div>
          `
      : ""
    }
          
          ${data.bankingInfo?.contactInfo?.phone || data.bankingInfo?.contactInfo?.mobile
      ? `<p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; text-align: center;">
                  ${data.bankingInfo.contactInfo.phone ? `CENTRAL TELEFÓNICA: ${data.bankingInfo.contactInfo.phone}` : ""}
                  ${data.bankingInfo.contactInfo.phone && data.bankingInfo.contactInfo.mobile ? " / " : ""}
                  ${data.bankingInfo.contactInfo.mobile ? `MÓVIL: ${data.bankingInfo.contactInfo.mobile}` : ""}
                </p>`
      : ""
    }
          
          ${data.bankingInfo?.contactInfo?.email && data.bankingInfo.contactInfo.email.length > 0
      ? `<p style="margin: 0 0 2mm 0; font-size: 9px; color: #666; text-align: center;">${data.bankingInfo.contactInfo.email.join(" / ")}</p>`
      : ""
    }
          
          ${data.bankingInfo?.fiscalAddress
      ? `<p style="margin: 0; font-size: 9px; color: #666; text-align: center; line-height: 1.3;">${data.bankingInfo.fiscalAddress}</p>`
      : ""
    }
        </div>
      </div>

      <!-- Título de la carta -->
      <div style="text-align: center; margin-bottom: 15mm;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 8mm; border-radius: 6mm; box-shadow: 0 4mm 6mm rgba(59,130,246,0.25);">
          <h1 style="margin: 0 0 4mm 0; font-size: 18px; font-weight: 800; letter-spacing: 1px;">CARTA DE AUTORIZACIÓN</h1>
          <p style="margin: 0; font-size: 14px; font-weight: 600;">N°${data.letterNumber}</p>
        </div>
      </div>

      <!-- Fecha -->
      <div style="text-align: right; margin-bottom: 15mm;">
        <p style="margin: 0; font-size: 11px; font-weight: 600; color: #1a1a1a;">Lima, ${currentDate}.</p>
      </div>

      <!-- Información del destinatario -->
      <div style="margin-bottom: 15mm;">
        <div style="border: 1px solid #e5e7eb; border-radius: 4mm; overflow: hidden; box-shadow: 0 2mm 6mm rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #374151 0%, #4b5563 100%); color: white; padding: 6mm 10mm;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">DESTINATARIO</h3>
          </div>
          
          <div style="padding: 10mm;">
            <p style="margin: 0 0 4mm 0; font-size: 11px; font-weight: 600; color: #374151;">SEÑORES:</p>
            <h3 style="margin: 0 0 6mm 0; font-size: 14px; font-weight: 800; color: #1a1a1a;">${data.clientName}</h3>
            <p style="margin: 0 0 4mm 0; font-size: 10px; color: #666;">RUC: ${data.clientRuc}</p>
            <p style="margin: 0; font-size: 10px; color: #666; line-height: 1.4;">${addressToDisplay}</p>
          </div>
        </div>
      </div>

      <!-- Presente -->
      <div style="margin-bottom: 10mm;">
        <p style="margin: 0; font-size: 11px; font-weight: 600; color: #374151;">Presente. –</p>
      </div>

      <!-- Asunto -->
      <div style="margin-bottom: 15mm;">
        <div style="border: 1px solid #bfdbfe; border-radius: 4mm; padding: 8mm; border-left: 3mm solid #3b82f6;">
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #1e40af;">
            ASUNTO: AUTORIZACIÓN PARA EL PAGO CON ABONOS DIRECTO EN CUENTA.
          </p>
        </div>
      </div>

      <!-- Contenido principal -->
      <div style="margin-bottom: 15mm; line-height: 1.6;">
        <p style="margin: 0 0 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Por medio de la presente, comunico a usted, que la entidad bancaria, número de cuenta y el 
          respectivo Código de Cuenta Interbancario (CCI) de la empresa que represento es la siguiente:
        </p>

        <!-- Información bancaria -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 4mm; overflow: hidden; box-shadow: 0 2mm 6mm rgba(0,0,0,0.08); margin: 8mm 0;">
          <div style="background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 6mm 10mm;">
            <h3 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">INFORMACIÓN BANCARIA</h3>
          </div>
          
          <div style="padding: 10mm;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6mm;">
              ${bankingInfoRows}
            </div>
          </div>
        </div>

        <p style="margin: 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Se certifica que el número de cuenta bancaria informado se encuentra vinculado al RUC 
          indicado, conforme a los datos registrados en el sistema financiero nacional al momento de su 
          apertura.
        </p>

        <p style="margin: 8mm 0; font-size: 11px; color: #374151; text-align: justify;">
          Asimismo, dejo constancia que la factura a ser emitida por mi representada, una vez cumplida o 
          atendida la correspondiente Orden de Compra y/o de Servicio o las prestaciones en bienes y/o 
          servicios materia del contrato quedará cancelada para todos sus efectos mediante la sola 
          acreditación del importe de la referida factura a favor de la cuenta en la entidad bancaria a que 
          se refiere el primer párrafo de la presente.
        </p>
      </div>

      <!-- Firma -->
      <div style="margin-top: 10mm;">
        <p style="margin: 0 0 5mm 0; font-size: 11px; color: #374151;">Atentamente,</p>
        
        <div style="text-align: center; margin-top: 25mm;">
          <div style="border-bottom: 1px solid #374151; width: 200px; margin: 0 auto 4mm auto;"></div>
          <p style="margin: 0; font-size: 11px; font-weight: 600; color: #374151;">${data.createdBy}</p>
          <p style="margin: 0; font-size: 10px; color: #666;">${data.companyName || "N/A"}</p>
        </div>
      </div>

      <!-- Footer con información del documento -->
      <div style="position: absolute; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; font-size: 8px; color: #9ca3af; padding: 6mm; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0;">Carta de Autorización CCI generada el ${new Date().toLocaleDateString("es-PE")} | ${data.companyName || "N/A"}</p>
      </div>
    </div>
  `
}
