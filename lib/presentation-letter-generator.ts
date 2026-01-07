import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { supabase } from "./supabase"

export interface PresentationLetterData {
  // Información de la empresa (se obtiene automáticamente de la BD o contexto)
  companyName?: string
  companyRuc?: string
  companyCode: string
  companyLogoUrl?: string

  // Información de la carta
  letterNumber: string

  // Información del cliente
  clientName: string
  clientRuc: string
  clientAddress: string

  // Creado por
  createdBy: string

  customDate?: Date
}

// URLs de las hojas membretadas
const LETTERHEAD_URLS = {
  AGLE: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/HOJA%20MEMBRETADA%20AGLEFIX.png",
  ARM: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/HOJA%20MEMBRETADA%20ARMFIX.png",
  GALUR: "https://zcqvxaxyzgrzegonbsao.supabase.co/storage/v1/object/public/images/membretes/HOJA%20MEMBRETADA%20GALUR%20BC.png",
}

// Función para determinar qué hoja membretada usar
const getLetterheadUrl = (companyCode: string): string | null => {
  const upperCode = companyCode.toUpperCase()

  if (upperCode.includes("AGLE")) {
    return LETTERHEAD_URLS.AGLE
  } else if (upperCode.includes("ARM")) {
    return LETTERHEAD_URLS.ARM
  } else if (upperCode.includes("GALUR")) {
    return LETTERHEAD_URLS.GALUR
  }

  return null
}

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

export const generatePresentationLetter = async (data: PresentationLetterData): Promise<void> => {
  console.log("🚀 Iniciando generación de Carta de Presentación...")

  try {
    // Si no tenemos datos de la empresa, intentar buscarlos (similar a cci-letter-generator)
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

    // Determinar qué hoja membretada usar
    const letterheadUrl = getLetterheadUrl(data.companyCode)
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
        console.warn("⚠️ Error al cargar hoja membretada:", error)
        letterheadBase64 = null
      }
    }

    console.log("🎨 Creando contenido HTML de la Carta de Presentación...")

    // Crear el HTML temporal para el PDF
    const htmlContent = createPresentationLetterHTML(data, letterheadBase64, letterheadType)

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
      const fileName = `Carta_Presentacion_${data.companyCode}_${data.clientName.replace(/\s+/g, "_")}.pdf`
      pdf.save(fileName)

      console.log("✅ Carta de Presentación generada y descargada exitosamente:", fileName)
    } catch (error) {
      console.error("❌ Error en generación de Carta de Presentación:", error)
      throw error
    } finally {
      // Limpiar el elemento temporal
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
    }
  } catch (error) {
    console.error("❌ Error general en generación de Carta de Presentación:", error)
    throw error
  }
}

const createPresentationLetterHTML = (
  data: PresentationLetterData,
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

  if (letterheadBase64 && letterheadType) {
    switch (letterheadType) {
      case "ARM":
        return createARMPresentationHTML(data, letterheadBase64, currentDate)
      case "AGLE":
        return createAGLEPresentationHTML(data, letterheadBase64, currentDate)
      case "GALUR":
        return createGALURPresentationHTML(data, letterheadBase64, currentDate)
      default:
        return createStandardPresentationHTML(data, currentDate)
    }
  }

  return createStandardPresentationHTML(data, currentDate)
}

const createARMPresentationHTML = (data: PresentationLetterData, letterheadBase64: string, currentDate: string): string => {
  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">
      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido -->
      <div style="position: relative; z-index: 2; padding: 50mm 20mm 20mm 20mm; width: 100%; height: 100%; box-sizing: border-box;">
        
        <!-- Título -->
        <div style="text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800; text-decoration: underline;">CARTA DE PRESENTACIÓN</h1>
          <h2 style="margin: 2mm 0 0 0; font-size: 14px; font-weight: 700;">${data.letterNumber}</h2>
        </div>

        <!-- Fecha -->
        <div style="text-align: right; margin-top: 5mm;">
          <p style="margin: 0; font-size: 12px; font-weight: 600;">Lima, ${currentDate}</p>
        </div>

        <!-- Destinatario -->
        <div style="margin-top: 5mm;">
          <p style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 700;">ENTIDAD:</p>
          <h3 style="margin: 0 0 2mm 0; font-size: 14px; font-weight: 800;">${data.clientName}</h3>
          <p style="margin: 0 0 2mm 0; font-size: 11px;">RUC: ${data.clientRuc}</p>
          <p style="margin: 0; font-size: 11px;">${data.clientAddress}</p>
        </div>

        <!-- Asunto -->
        <div style="margin-top: 5mm;">
          <p style="margin: 0; font-size: 12px; font-weight: 700;">ASUNTO: Presentación de empresa y propuesta de suministros para Ayuda Humanitaria y Bienes Diversos.</p>
        </div>

        <!-- Cuerpo -->
        <div style="margin-top: 5mm; font-size: 11px; text-align: justify; line-height: 1.4;">
          <p style="margin-bottom: 4mm;">De nuestra mayor consideración:</p>
          
          <p style="margin-bottom: 4mm;">
            Es grato dirigirnos a usted para saludarlo cordialmente y presentar a <strong>A.R.M. CORPORATIONS DEL PERÚ E.I.R.L.</strong>, identificada con RUC N.º <strong>20608878701</strong>. Somos una organización con sólida trayectoria en el mercado nacional, especializada en brindar soluciones integrales con altos estándares de calidad, cumplimiento y eficiencia operativa.
          </p>
          
          <p style="margin-bottom: 4mm;">
            Conscientes de la importancia estratégica que tiene para su entidad la atención de emergencias y el soporte a poblaciones vulnerables, ponemos a su disposición nuestra especialidad en el suministro de:
          </p>
          
          <p style="margin-bottom: 4mm; font-weight: 700;">Suministro Especializado: Bienes de Ayuda Humanitaria</p>
          <p style="margin-bottom: 4mm;">
            Contamos con la capacidad logística para proveer kits de emergencia, frazadas, carpas, herramientas y otros insumos críticos, asegurando el cumplimiento de las especificaciones técnicas requeridas por INDECI y demás organismos rectores.
          </p>
          
          <p style="margin-bottom: 4mm;">Asimismo, nuestra empresa se constituye como un aliado estratégico en las siguientes líneas de atención:</p>
          
          <p style="margin-bottom: 4mm;">
            <strong>Bienes:</strong> Mobiliario en general, materiales de construcción (ferretería y agregados), implementos de seguridad, vestimenta de faena, útiles de escritorio, alimentos para consumo humano y materiales de limpieza.
          </p>
          
          <p style="margin-bottom: 4mm;">
            <strong>Servicios:</strong> Transporte (seco y refrigerado), acondicionamiento de espacios, construcción, instalaciones, acabados y servicios de imprenta/publicidad.
          </p>
          
          <p style="margin-bottom: 4mm;">
            En ese sentido, solicitamos respetuosamente ser considerados como proveedores potenciales en sus próximos procesos de contratación, compras directas o requerimientos de baja cuantía, garantizando una atención oportuna y precios competitivos.
          </p>
          
          <p style="margin-bottom: 4mm;">
            Para mayor información, adjuntamos nuestro portafolio detallado y quedamos a su disposición a través de nuestros canales de contacto:
          </p>
          
          <div style="margin-bottom: 4mm; margin-left: 5mm;">
            <p style="margin: 0;"><strong>Central:</strong> (01) 748-3677 anexo 102</p>
            <p style="margin: 0;"><strong>Celular:</strong> 940 959 514</p>
            <p style="margin: 0;"><strong>Correos:</strong> arm-ventas@armcorporations.com / arm1-ventas@corporations.com</p>
          </div>
          
          <p style="margin-bottom: 4mm;">
            Sin otro particular, agradecemos de antemano la atención brindada y quedamos a la espera de sus gratas noticias.
          </p>
        </div>

        <!-- Despedida -->
        <div style="position: absolute; bottom: 31mm; left: 20mm; right: 20mm;">
           <p style="margin: 0; font-size: 11px;">Atentamente,</p>
        </div>
      </div>
    </div>
  `
}

const createAGLEPresentationHTML = (data: PresentationLetterData, letterheadBase64: string, currentDate: string): string => {
  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">
      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido -->
      <div style="position: relative; z-index: 2; padding: 50mm 20mm 20mm 20mm; width: 100%; height: 100%; box-sizing: border-box;">
        
        <!-- Título -->
        <div style="text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800;">CARTA DE PRESENTACIÓN</h1>
          <h2 style="margin: 2mm 0 0 0; font-size: 14px; font-weight: 700;">${data.letterNumber}</h2>
        </div>

        <!-- Fecha -->
        <div style="text-align: right; margin-top: 5mm;">
          <p style="margin: 0; font-size: 12px; font-weight: 600;">Lima, ${currentDate}</p>
        </div>

        <!-- Destinatario -->
        <div style="margin-top: 5mm;">
          <p style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 700;">ENTIDAD:</p>
          <h3 style="margin: 0 0 2mm 0; font-size: 14px; font-weight: 800;">${data.clientName}</h3>
          <p style="margin: 0 0 2mm 0; font-size: 11px;">RUC: ${data.clientRuc}</p>
          <p style="margin: 0; font-size: 11px;">${data.clientAddress}</p>
        </div>

        <!-- Asunto -->
        <div style="margin-top: 5mm;">
          <p style="margin: 0; font-size: 12px; font-weight: 700;">ASUNTO: Presentación de servicios y cartera de bienes – AGLE PERUVIAN COMPANY E.I.R.L.</p>
        </div>

        <!-- Cuerpo -->
        <div style="margin-top: 5mm; font-size: 10px; text-align: justify; line-height: 1.3;">
          <p style="margin-bottom: 3mm; font-weight: 600;">A la atención de la Oficina de Logística / Unidad de Abastecimiento:</p>
          
          <p style="margin-bottom: 3mm;">
            Reciban un cordial saludo a nombre de <strong>AGLE PERUVIAN COMPANY E.I.R.L.</strong>, identificada con RUC <strong>20608849891</strong>. Por intermedio de la presente, tenemos el agrado de poner a su disposición nuestra amplia experiencia como aliados estratégicos en la provisión de bienes y servicios para el sector público y privado a nivel nacional.
          </p>
          
          <p style="margin-bottom: 3mm;">
            Nuestra empresa se distingue por su eficiencia operativa y un riguroso control de calidad, garantizando soluciones integrales que se ajustan a las normativas vigentes y requerimientos técnicos de su institución.
          </p>
          
          <p style="margin-bottom: 2mm; font-weight: 700;">Nuestra Cartera de Soluciones</p>
          <p style="margin-bottom: 2mm;">Contamos con una capacidad logística diversificada en los siguientes rubros:</p>
          
          <p style="margin-bottom: 1mm; font-weight: 700;">1. Suministro de Bienes:</p>
          <ul style="margin: 0 0 2mm 5mm; padding: 0;">
            <li><strong>Equipamiento y Mobiliario:</strong> Mobiliario de oficina, accesorios domésticos y de usos diversos.</li>
            <li><strong>Tecnología:</strong> Computadoras, periféricos y suministros de cómputo.</li>
            <li><strong>Seguridad y Textil:</strong> Implementos de seguridad (EPP), vestimenta formal, deportiva y de faena.</li>
            <li><strong>Alimentación y Ayuda:</strong> Alimentos de consumo humano, bebidas y bienes para ayuda humanitaria.</li>
            <li><strong>Mantenimiento:</strong> Artículos de limpieza, útiles de escritorio y ferretería/agregados.</li>
            <li><strong>Maquinaria:</strong> Herramientas y equipos para jardinería.</li>
          </ul>

          <p style="margin-bottom: 1mm; font-weight: 700;">2. Servicios Especializados:</p>
          <ul style="margin: 0 0 2mm 5mm; padding: 0;">
            <li><strong>Infraestructura:</strong> Construcción, acondicionamiento, instalaciones y acabados en general.</li>
            <li><strong>Logística:</strong> Transporte de carga en seco y refrigerado a nivel nacional.</li>
            <li><strong>Comunicación:</strong> Servicios de imprenta, producción y activaciones de campañas publicitarias.</li>
          </ul>
          
          <p style="margin-bottom: 2mm; font-weight: 700;">Compromiso de Calidad</p>
          <p style="margin-bottom: 3mm;">
            Nos caracterizamos por ofrecer ofertas competitivas y un cumplimiento estricto de los plazos de entrega. Estamos preparados para atender sus procesos de contratación, compras directas y cotizaciones con la celeridad que el servicio público exige.
          </p>
          
          <p style="margin-bottom: 3mm;">
            Quedamos a su entera disposición para concertar una reunión técnica o remitir cotizaciones según sus necesidades actuales a través de nuestros canales oficiales:
          </p>
          
          <ul style="margin: 0 0 3mm 5mm; padding: 0;">
            <li><strong>Central Telefónica:</strong> 01-748 2242 (Anexo 112 / Anexo 119)</li>
            <li><strong>Celular área de ventas:</strong> 940 930 710 / 933 367 375</li>
            <li><strong>Correos Electrónicos:</strong> cotizaciones.lg@agleperuvianc.com / cotizaciones.eg@agleperuvianc.com</li>
          </ul>
          
          <p style="margin-bottom: 3mm; margin-left: 13mm;">
            Sin otro particular, agradecemos de antemano la atención brindada y quedamos a la espera de sus gratas noticias.
          </p>
        </div>

        <!-- Despedida -->
        <div style="position: absolute; bottom: 40mm; left: 40mm; right: 20mm;">
           <p style="margin: 0; font-size: 10px;">Atentamente,</p>
        </div>
      </div>
    </div>
  `
}

const createGALURPresentationHTML = (data: PresentationLetterData, letterheadBase64: string, currentDate: string): string => {
  return `
    <div style="width: 210mm; height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; position: relative; overflow: hidden; margin: 0; padding: 0;">
      <!-- Hoja membretada como fondo -->
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        <img src="${letterheadBase64}" alt="Hoja Membretada" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Contenido -->
      <div style="position: relative; z-index: 2; padding: 62mm 20mm 20mm 45mm; width: 100%; height: 100%; box-sizing: border-box;">
        
        <!-- Título -->
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 800;">CARTA DE PRESENTACIÓN</h1>
          <h2 style="margin: 2mm 0 0 0; font-size: 14px; font-weight: 700;">${data.letterNumber}</h2>
        </div>

        <!-- Fecha -->
        <div style="text-align: right; margin-top: -15mm;">
          <p style="margin: 0; font-size: 12px; font-weight: 600;">Lima, ${currentDate}</p>
        </div>

        <!-- Destinatario -->
        <div style="margin-top: 10mm;">
          <p style="margin: 0 0 1mm 0; font-size: 12px; font-weight: 700;">ATENCIÓN:</p>
          <h3 style="margin: 0 0 1mm 0; font-size: 13px; font-weight: 800;">${data.clientRuc} - ${data.clientName}</h3>
          <p style="margin: 0 0 1mm 0; font-size: 10px;">${data.clientAddress}</p>
          <p style="margin: 0; font-size: 10px;">Unidad de Logística – Abastecimiento</p>
        </div>

        <!-- Cuerpo -->
        <div style="margin-top: 3mm; font-size: 10px; text-align: justify; line-height: 1.25;">
          <p style="margin-bottom: 2mm; font-weight: 700;">PRESENTE:</p>
          <p style="margin-bottom: 2mm;">De nuestra especial consideración:</p>
          
          <p style="margin-bottom: 2mm;">
            Es un gusto saludarlos en representación de <strong>GALUR BUSINESS CORPORATION S.A.C.</strong>, con RUC <strong>20604486859</strong>. Nos dirigimos a su prestigiosa institución para presentar nuestro portafolio de soluciones integrales. Contamos con más de 7 años de experiencia atendiendo sectores estratégicos del ámbito público y privado, respaldados por marcas de alta gama y garantía como ZEUS, WORLDLIFE, HOPE LIFE y VALHALLA.
          </p>
          
          <p style="margin-bottom: 2mm;">
            Nuestra empresa se distingue por su capacidad logística para el suministro de materiales críticos, especializándonos en las siguientes líneas de negocio:
          </p>
          
          <p style="margin-bottom: 1mm; font-weight: 700;">LÍNEA DE BIENES:</p>
          <ul style="margin: 0 0 2mm 5mm; padding: 0;">
            <li><strong>Construcción y Ferretería:</strong> Suministro de materiales de construcción, agregados, herramientas eléctricas y manuales, y equipos de alta resistencia.</li>
            <li><strong>Maderas y Mobiliario:</strong> Venta de madera estructural y acabados; diseño y fabricación de mobiliario administrativo, escolar y de usos diversos bajo estándares de calidad.</li>
            <li><strong>Ayuda Humanitaria y Seguridad:</strong> Kits de emergencia, bienes de ayuda humanitaria e implementos de seguridad industrial (EPP).</li>
            <li><strong>Suministros Operativos:</strong> Útiles de escritorio, materiales de limpieza, vestimenta formal y de faena (uniformes técnicos).</li>
            <li><strong>Alimentación:</strong> Alimentos para consumo humano y bebidas no alcohólicas.</li>
          </ul>

          <p style="margin-bottom: 1mm; font-weight: 700;">LÍNEA DE SERVICIOS:</p>
          <ul style="margin: 0 0 2mm 5mm; padding: 0;">
            <li><strong>Infraestructura y Obras:</strong> Ejecución de proyectos de construcción, mantenimiento de instalaciones, acondicionamiento de espacios y acabados en general.</li>
            <li><strong>Logística y Transporte:</strong> Servicio de transporte de carga en seco y refrigerado a nivel nacional.</li>
            <li><strong>Comunicación y Publicidad:</strong> Servicios de imprenta, producción publicitaria y activaciones de campaña.</li>
          </ul>
          
          <p style="margin-bottom: 2mm;">
            En <strong>GALUR BUSINESS CORPORATION S.A.C.</strong>, entendemos la importancia del cumplimiento de plazos y la normativa vigente en las contrataciones del Estado. Por ello, nos ponemos a su entera disposición para participar en sus próximos procesos de selección, garantizando eficiencia, transparencia y la mejor relación costo-beneficio.
          </p>
          
          <p style="margin-bottom: 2mm;">
            Adjuntamos nuestros canales de contacto para cualquier consulta técnica o cotización:
          </p>
          
          <ul style="margin: 0 0 2mm 5mm; padding: 0;">
            <li><strong>Central Telefónica:</strong> 082 470 013 - Anexo 122</li>
            <li><strong>Teléfono:</strong> 915 166 406</li>
            <li><strong>Correo electrónico:</strong> galur.ventas@galurbc.com / galur.ventas2@galurbc.com</li>
          </ul>
          
          <p style="margin-bottom: 2mm;">
            Sin otro particular, agradecemos de antemano la atención prestada y quedamos a la espera de sus gratas noticias.
          </p>
        </div>

        <!-- Despedida -->
        <div style="margin-top: 15mm;">
           <p style="margin: 0; font-size: 11px;">Atentamente,</p>
        </div>
      </div>
    </div>
  `
}

const createStandardPresentationHTML = (data: PresentationLetterData, currentDate: string): string => {
  return `
    <div style="width: 210mm; min-height: 297mm; background: white; font-family: 'Arial', sans-serif; color: #1a1a1a; padding: 20mm;">
      <h1 style="text-align: center;">CARTA DE PRESENTACIÓN</h1>
      <p style="text-align: right;">Lima, ${currentDate}</p>
      
      <div style="margin-top: 20mm;">
        <p><strong>SEÑORES:</strong></p>
        <p><strong>${data.clientName}</strong></p>
        <p>RUC: ${data.clientRuc}</p>
        <p>${data.clientAddress}</p>
      </div>

      <div style="margin-top: 10mm;">
        <p><strong>ASUNTO: Presentación de servicios</strong></p>
      </div>

      <div style="margin-top: 10mm; text-align: justify;">
        <p>De nuestra consideración:</p>
        <p>Por medio de la presente saludamos a usted y presentamos a la empresa <strong>${data.companyName}</strong>.</p>
        <p>...</p>
      </div>
    </div>
  `
}
