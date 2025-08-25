import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Users, AlertTriangle, CheckCircle, Scale } from "lucide-react"
import { getCurrentDateLong } from "@/lib/date-utils"

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Términos y Condiciones</h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestión Documental - Acceso Público</p>
          <Badge variant="outline" className="text-sm">
            Última actualización: {getCurrentDateLong()}
          </Badge>
        </div>

        <Separator />

        {/* Introducción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              1. Introducción y Aceptación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Al acceder y descargar documentos de este sistema de gestión documental, usted acepta cumplir con estos
              términos y condiciones. Si no está de acuerdo con alguno de estos términos, no debe utilizar este
              servicio.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center text-blue-800 dark:text-blue-300 mb-2">
                <CheckCircle className="h-5 w-5 mr-2" />
                <h4 className="font-semibold">Consentimiento Informado</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Al completar el formulario de descarga, usted otorga su consentimiento informado para el procesamiento
                de sus datos personales según se describe en estos términos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recopilación de Datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              2. Recopilación y Uso de Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Datos que Recopilamos:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Nombre completo</li>
              <li>Organización o institución de pertenencia</li>
              <li>Información de contacto (teléfono o email)</li>
              <li>Propósito específico de la descarga</li>
              <li>Dirección IP y ubicación geográfica</li>
              <li>Información del navegador y dispositivo</li>
              <li>Fecha y hora de acceso</li>
            </ul>

            <h4 className="font-semibold mt-6">Finalidad del Tratamiento:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Verificar la identidad del solicitante</li>
              <li>Mantener un registro de acceso a documentos públicos</li>
              <li>Prevenir el uso indebido de la información</li>
              <li>Cumplir con requisitos legales y de auditoría</li>
              <li>Contactar al usuario en caso de ser necesario</li>
            </ul>
          </CardContent>
        </Card>

        {/* Obligaciones del Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scale className="mr-2 h-5 w-5" />
              3. Obligaciones y Responsabilidades del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">El usuario se compromete a:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Utilizar los documentos únicamente para los fines declarados</li>
              <li>No modificar, alterar o falsificar el contenido de los documentos</li>
              <li>No redistribuir los documentos sin autorización expresa</li>
              <li>Respetar los derechos de autor y propiedad intelectual</li>
              <li>Mantener la confidencialidad de información sensible</li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center text-amber-800 dark:text-amber-300 mb-2">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <h4 className="font-semibold">Importante</h4>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Cada descarga genera un token único que permite rastrear el documento. El uso indebido puede resultar en
                acciones legales.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad y Trazabilidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              4. Seguridad y Trazabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Medidas de Seguridad:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Cada descarga se registra con un token único e irrepetible</li>
              <li>Se mantiene un log completo de todas las descargas</li>
              <li>Los documentos pueden incluir marcas de agua digitales</li>
              <li>Se registra información técnica para fines de seguridad</li>
              <li>Los datos se almacenan de forma segura y encriptada</li>
            </ul>

            <h4 className="font-semibold mt-6">Rastreo de Documentos:</h4>
            <p>
              Todos los documentos descargados incluyen información de rastreo que permite identificar al usuario que
              realizó la descarga. Esta información se utiliza exclusivamente para fines de seguridad y auditoría.
            </p>
          </CardContent>
        </Card>

        {/* Limitaciones y Restricciones */}
        <Card>
          <CardHeader>
            <CardTitle>5. Limitaciones y Restricciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Uso Prohibido:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Uso comercial no autorizado de los documentos</li>
              <li>Modificación o alteración del contenido original</li>
              <li>Distribución masiva sin autorización</li>
              <li>Uso para fines ilegales o fraudulentos</li>
              <li>Intento de eludir las medidas de seguridad</li>
            </ul>

            <h4 className="font-semibold mt-6">Limitación de Responsabilidad:</h4>
            <p>
              El sistema se proporciona "tal como está". No garantizamos la disponibilidad continua del servicio ni la
              exactitud absoluta de todos los documentos. El uso del sistema es bajo su propia responsabilidad.
            </p>
          </CardContent>
        </Card>

        {/* Protección de Datos */}
        <Card>
          <CardHeader>
            <CardTitle>6. Protección de Datos y Privacidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h4 className="font-semibold">Sus Derechos:</h4>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Derecho de acceso a sus datos personales</li>
              <li>Derecho de rectificación de datos incorrectos</li>
              <li>Derecho de supresión (cuando sea legalmente posible)</li>
              <li>Derecho de portabilidad de datos</li>
              <li>Derecho de oposición al tratamiento</li>
            </ul>

            <h4 className="font-semibold mt-6">Retención de Datos:</h4>
            <p>
              Los datos de descarga se conservan por un período de 7 años para fines de auditoría y cumplimiento legal.
              Transcurrido este período, los datos se eliminan de forma segura.
            </p>
          </CardContent>
        </Card>

        {/* Modificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>7. Modificaciones a los Términos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. Las
              modificaciones entrarán en vigor inmediatamente después de su publicación en esta página.
            </p>
            <p>
              Es responsabilidad del usuario revisar periódicamente estos términos. El uso continuado del servicio
              después de cualquier modificación constituye la aceptación de los nuevos términos.
            </p>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>8. Contacto y Consultas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Si tiene preguntas sobre estos términos y condiciones o sobre el tratamiento de sus datos personales,
              puede contactarnos a través de:
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p className="font-semibold">Responsable del Tratamiento de Datos:</p>
              <p>Sistema de Gestión Documental</p>
              <p>Email: privacy@agpcdocs.com</p>
              <p>Teléfono: +1 (555) 123-4567</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>
            Al hacer clic en "Acepto los términos y condiciones" en el formulario de descarga, usted confirma que ha
            leído, entendido y acepta estos términos en su totalidad.
          </p>
          <p className="mt-2">Fecha de última actualización: {getCurrentDateLong()}</p>
        </div>
      </div>
    </div>
  )
}
