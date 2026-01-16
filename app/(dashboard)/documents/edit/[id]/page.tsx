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
import { DatePickerImproved } from "@/components/ui/date-picker-improved"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, ArrowLeft, Shield, Calendar, User, FileText, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
}

export default function EditDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
        setTitle(document.title || "")
        setDocumentNumber(document.document_number || "")
        setDescription(document.description || "")
        setDepartmentId(document.current_department_id || "")
        setIsPublic(document.is_public || false)

        // Set certification data
        setIsCertified(document.is_certified || false)
        setCertificationType(document.certification_type || "")
        setCertificateNumber(document.certificate_number || "")

        if (document.issued_date) {
          try {
            setIssuedDate(new Date(document.issued_date))
          } catch (e) { console.error(e) }
        }
        if (document.expiry_date) {
          try {
            setExpiryDate(new Date(document.expiry_date))
          } catch (e) { console.error(e) }
        }

        setIssuerName(document.issuer_name || "")
        setIssuerPosition(document.issuer_position || "")
        setVerificationEnabled(document.verification_enabled !== false)
        setDepartments(departments || [])
        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching data:", error)
        toast({ title: "Error", description: "No se pudo cargar el documento", variant: "destructive" })
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id, toast])

  const handleSave = async () => {
    try {
      setSaving(true)
      const updates: any = {
        title,
        description,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      }

      if (documentNumber !== undefined) updates.document_number = documentNumber || null
      if (departmentId !== undefined) updates.current_department_id = departmentId || null

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
        updates.certification_type = null
        updates.certificate_number = null
        updates.issued_date = null
        updates.expiry_date = null
        updates.issuer_name = null
        updates.issuer_position = null
        updates.verification_enabled = false
      }

      const { error } = await supabase.from("documents").update(updates).eq("id", params.id)
      if (error) throw error

      toast({ title: "¡Éxito!", description: "Documento actualizado correctamente." })
      router.push(`/documents/${params.id}`)
    } catch (error: any) {
      console.error("Error updating document:", error)
      toast({ title: "Error", description: error.message || "No se pudo actualizar.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button 
               variant="outline" 
               size="icon" 
               onClick={() => router.back()} 
               className="rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:translate-x-[-2px] transition-transform"
            >
               <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Button>
            <div>
               <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Editar Documento
               </h1>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Actualiza la información y configuración
               </p>
            </div>
         </div>
         <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 min-w-[140px]"
         >
            {saving ? (
               <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
               </>
            ) : (
               <>
                  <Save className="mr-2 h-4 w-4" /> Guardar
               </>
            )}
         </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-full flex justify-start overflow-x-auto">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-6">
            <FileText className="h-4 w-4 mr-2" /> Información General
          </TabsTrigger>
          <TabsTrigger value="access" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-6">
            <User className="h-4 w-4 mr-2" /> Acceso y Visibilidad
          </TabsTrigger>
          <TabsTrigger value="certification" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-6">
            <Shield className="h-4 w-4 mr-2" /> Certificación
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
           <TabsContent value="general">
             <motion.div variants={itemVariants}>
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                   <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-lg font-bold">Detalles Básicos</CardTitle>
                      <CardDescription>Información principal del documento.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="title" className="font-semibold text-slate-700 dark:text-slate-300">Título</Label>
                            <Input
                               id="title"
                               value={title}
                               onChange={(e) => setTitle(e.target.value)}
                               className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="documentNumber" className="font-semibold text-slate-700 dark:text-slate-300">Número de Documento</Label>
                            <Input
                               id="documentNumber"
                               value={documentNumber}
                               onChange={(e) => setDocumentNumber(e.target.value)}
                               className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                            />
                         </div>
                      </div>

                      <div className="space-y-2">
                         <Label htmlFor="description" className="font-semibold text-slate-700 dark:text-slate-300">Descripción</Label>
                         <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 resize-none"
                         />
                      </div>

                      <div className="space-y-2">
                         <Label htmlFor="department" className="font-semibold text-slate-700 dark:text-slate-300">Departamento Actual</Label>
                         <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                               <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                               {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                      </div>
                   </CardContent>
                </Card>
             </motion.div>
           </TabsContent>

           <TabsContent value="access">
             <motion.div variants={itemVariants}>
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                   <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-lg font-bold">Configuración de Visibilidad</CardTitle>
                      <CardDescription>Controla quién puede ver este documento.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                         <div className="space-y-0.5">
                            <Label htmlFor="isPublic" className="text-base font-semibold text-slate-800 dark:text-slate-200">Acceso Público</Label>
                            <p className="text-sm text-slate-500">Permitir acceso mediante QR sin inicio de sesión.</p>
                         </div>
                         <Checkbox
                            id="isPublic"
                            checked={isPublic}
                            onCheckedChange={(checked) => setIsPublic(checked === true)}
                            className="h-6 w-6 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded-md"
                         />
                      </div>

                      {isPublic ? (
                         <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 flex gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                            <div>
                               <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Acceso Público Habilitado</h4>
                               <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                                  Cualquier persona con el enlace o código QR podrá ver este documento.
                               </p>
                            </div>
                         </div>
                      ) : (
                         <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-3">
                            <Shield className="h-5 w-5 text-slate-500 dark:text-slate-400 mt-0.5" />
                            <div>
                               <h4 className="font-semibold text-slate-800 dark:text-slate-200">Acceso Restringido</h4>
                               <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                  Solo usuarios autenticados del sistema pueden acceder.
                               </p>
                            </div>
                         </div>
                      )}
                   </CardContent>
                </Card>
             </motion.div>
           </TabsContent>

           <TabsContent value="certification">
             <motion.div variants={itemVariants}>
                <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden">
                   <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-lg font-bold">Datos de Certificación</CardTitle>
                      <CardDescription>Configura este documento como certificado oficial.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                         <div className="space-y-0.5">
                            <Label htmlFor="isCertified" className="text-base font-semibold text-slate-800 dark:text-slate-200">Es un Certificado</Label>
                            <p className="text-sm text-slate-500">Habilita campos especiales de verificación.</p>
                         </div>
                         <Checkbox
                            id="isCertified"
                            checked={isCertified}
                            onCheckedChange={(checked) => setIsCertified(checked === true)}
                            className="h-6 w-6 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded-md"
                         />
                      </div>

                      {isCertified && (
                         <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <Label className="font-semibold">Tipo</Label>
                                  <Select value={certificationType} onValueChange={setCertificationType}>
                                     <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                     <SelectContent className="rounded-xl">
                                        {["Calidad", "Ergonomía", "Originalidad", "Autenticidad", "Conformidad"].map(t => (
                                           <SelectItem key={t} value={`Certificado de ${t}`}>Certificado de {t}</SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                               </div>
                               <div className="space-y-2">
                                  <Label className="font-semibold">Número de Certificado</Label>
                                  <Input 
                                     value={certificateNumber} 
                                     onChange={(e) => setCertificateNumber(e.target.value)} 
                                     className="h-11 rounded-xl"
                                     placeholder="Ej: CERT-2024-001" 
                                  />
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <Label className="flex items-center font-semibold"><Calendar className="h-4 w-4 mr-2" /> Emisión</Label>
                                  <DatePickerImproved date={issuedDate} setDate={setIssuedDate} placeholder="Fecha de emisión" />
                               </div>
                               <div className="space-y-2">
                                  <Label className="flex items-center font-semibold"><Calendar className="h-4 w-4 mr-2" /> Expiración</Label>
                                  <DatePickerImproved date={expiryDate} setDate={setExpiryDate} placeholder="Fecha de expiración" />
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <Label className="flex items-center font-semibold"><User className="h-4 w-4 mr-2" /> Emisor</Label>
                                  <Input value={issuerName} onChange={(e) => setIssuerName(e.target.value)} className="h-11 rounded-xl" placeholder="Nombre completo" />
                               </div>
                               <div className="space-y-2">
                                  <Label className="font-semibold">Cargo</Label>
                                  <Input value={issuerPosition} onChange={(e) => setIssuerPosition(e.target.value)} className="h-11 rounded-xl" placeholder="Ej: Director" />
                               </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                               <Checkbox
                                  id="verificationEnabled"
                                  checked={verificationEnabled}
                                  onCheckedChange={(checked) => setVerificationEnabled(checked === true)}
                               />
                               <Label htmlFor="verificationEnabled">Permitir verificación pública mediante QR</Label>
                            </div>
                         </div>
                      )}
                   </CardContent>
                </Card>
             </motion.div>
           </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
