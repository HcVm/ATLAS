"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, ArrowLeft, Shield, Calendar, User, FileText } from "lucide-react"

export default function EditDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [document, setDocument] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("general")

  // Form fields
  const [title, setTitle] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [description, setDescription] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [isPublic, setIsPublic] = useState(false)

  // Certification fields
  const [isCertified, setIsCertified] = useState(false)
  const [certificationType, setCertificationType] = useState("")
  const [certificateNumber, setCertificateNumber] = useState("")
  const [issuedDate, setIssuedDate] = useState<Date | undefined>(undefined)
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [issuerName, setIssuerName] = useState("")
  const [issuerPosition, setIssuerPosition] = useState("")
  const [verificationEnabled, setVerificationEnabled] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch document
        const { data: document, error: documentError } = await supabase
          .from("documents")
          .select("*")
          .eq("id", params.id)
          .single()

        if (documentError) throw documentError

        // Fetch departments
        const { data: departments, error: departmentsError } = await supabase
          .from("departments")
          .select("*")
          .order("name")

        if (departmentsError) throw departmentsError

        // Set document data
        setDocument(document)
        setTitle(document.title || "")
        setDocumentNumber(document.document_number || "")
        setDescription(document.description || "")
        setDepartmentId(document.current_department_id || "")
        setIsPublic(document.is_public || false)

        // Set certification data
        setIsCertified(document.is_certified || false)
        setCertificationType(document.certification_type || "")
        setCertificateNumber(document.certificate_number || "")
        setIssuedDate(document.issued_date ? new Date(document.issued_date) : undefined)
        setExpiryDate(document.expiry_date ? new Date(document.expiry_date) : undefined)
        setIssuerName(document.issuer_name || "")
        setIssuerPosition(document.issuer_position || "")
        setVerificationEnabled(document.verification_enabled !== false)

        // Set departments
        setDepartments(departments || [])

        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar el documento",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, toast])

  const handleSave = async () => {
    try {
      setSaving(true)

      // Prepare the update object with only the fields that exist in the schema
      const updates: any = {
        title,
        description,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      }

      // Add optional fields only if they have values or are being cleared
      if (documentNumber !== undefined) {
        updates.document_number = documentNumber || null
      }

      if (departmentId !== undefined) {
        // Try both field names to be safe
        updates.current_department_id = departmentId || null
      }

      // Certification fields
      updates.is_certified = isCertified

      if (isCertified) {
        updates.certification_type = certificationType || null
        updates.certificate_number = certificateNumber || null
        updates.issued_date = issuedDate ? issuedDate.toISOString().split("T")[0] : null
        updates.expiry_date = expiryDate ? expiryDate.toISOString().split("T")[0] : null
        updates.issuer_name = issuerName || null
        updates.issuer_position = issuerPosition || null
        updates.verification_enabled = verificationEnabled
      } else {
        // Clear certification fields when not certified
        updates.certification_type = null
        updates.certificate_number = null
        updates.issued_date = null
        updates.expiry_date = null
        updates.issuer_name = null
        updates.issuer_position = null
        updates.verification_enabled = false
      }

      console.log("Updating document with:", updates)

      const { error } = await supabase.from("documents").update(updates).eq("id", params.id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast({
        title: "Documento actualizado",
        description: "Los cambios han sido guardados correctamente",
      })

      router.push(`/documents/${params.id}`)
    } catch (error: any) {
      console.error("Error updating document:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el documento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Editar Documento</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <FileText className="h-4 w-4 mr-2" />
            Información General
          </TabsTrigger>
          <TabsTrigger value="access">
            <User className="h-4 w-4 mr-2" />
            Acceso Público
          </TabsTrigger>
          <TabsTrigger value="certification">
            <Shield className="h-4 w-4 mr-2" />
            Certificación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información del Documento</CardTitle>
              <CardDescription>Edita la información básica del documento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del documento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentNumber">Número de Documento</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Número o referencia del documento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del documento"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento Actual</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Acceso Público</CardTitle>
              <CardDescription>
                Controla si este documento puede ser accedido públicamente mediante código QR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <Label htmlFor="isPublic" className="font-medium">
                  Permitir acceso público a este documento
                </Label>
              </div>

              {isPublic && (
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center text-blue-800 dark:text-blue-300 mb-2">
                    <User className="h-5 w-5 mr-2" />
                    <h4 className="font-semibold">Acceso Público Habilitado</h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Este documento será accesible para cualquier persona que tenga el enlace o escanee el código QR. El
                    acceso será rastreado para fines de auditoría.
                  </p>
                </div>
              )}

              {!isPublic && (
                <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center text-gray-800 dark:text-gray-300 mb-2">
                    <Shield className="h-5 w-5 mr-2" />
                    <h4 className="font-semibold">Acceso Restringido</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    Este documento solo será accesible para usuarios autenticados del sistema. El código QR no
                    funcionará para acceso público.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certification">
          <Card>
            <CardHeader>
              <CardTitle>Información de Certificación</CardTitle>
              <CardDescription>Configura este documento como un certificado verificable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCertified"
                  checked={isCertified}
                  onCheckedChange={(checked) => setIsCertified(checked === true)}
                />
                <Label htmlFor="isCertified" className="font-medium">
                  Este documento es un certificado oficial
                </Label>
              </div>

              {isCertified && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                  <div className="space-y-2">
                    <Label htmlFor="certificationType">Tipo de Certificación</Label>
                    <Select value={certificationType} onValueChange={setCertificationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de certificación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Certificado de Calidad">Certificado de Calidad</SelectItem>
                        <SelectItem value="Certificado de Ergonomía">Certificado de Ergonomía</SelectItem>
                        <SelectItem value="Certificado de Originalidad">Certificado de Originalidad</SelectItem>
                        <SelectItem value="Certificado de Autenticidad">Certificado de Autenticidad</SelectItem>
                        <SelectItem value="Certificado de Conformidad">Certificado de Conformidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="certificateNumber">Número de Certificado</Label>
                    <Input
                      id="certificateNumber"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      placeholder="Ej: CERT-000001"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issuedDate" className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Fecha de Emisión
                      </Label>
                      <DatePicker date={issuedDate} setDate={setIssuedDate} className="w-full" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiryDate" className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Fecha de Expiración
                      </Label>
                      <DatePicker date={expiryDate} setDate={setExpiryDate} className="w-full" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuerName" className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Nombre del Emisor
                    </Label>
                    <Input
                      id="issuerName"
                      value={issuerName}
                      onChange={(e) => setIssuerName(e.target.value)}
                      placeholder="Nombre de la persona o entidad que emite el certificado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuerPosition">Cargo del Emisor</Label>
                    <Input
                      id="issuerPosition"
                      value={issuerPosition}
                      onChange={(e) => setIssuerPosition(e.target.value)}
                      placeholder="Ej: Director de Calidad"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
