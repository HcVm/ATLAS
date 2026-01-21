"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, Filter, MoreHorizontal, Mail, Phone, Calendar as CalendarIcon, MapPin, Building2, User, CreditCard, FileText, Upload, Trash2, ExternalLink, ArrowLeft, X } from "lucide-react"
import { useEffect, useState, useRef, use } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { motion, AnimatePresence } from "framer-motion"

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
}

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 10
        }
    }
}
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type HrDocument = {
    id: string
    name: string
    document_type: string
    file_url: string
    created_at: string | null
}

type EmployeeProfile = {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
    departments?: {
        name: string
    } | null
    hr_employee_details?: {
        job_title: string | null
    } | null
}

const DOCUMENT_CATEGORIES = [
    { value: "cv", label: "CV" },
    { value: "contract", label: "Contrato" },
    { value: "id", label: "Identificación" },
    { value: "background_check", label: "Antecedentes" },
    { value: "loan", label: "Préstamo" },
    { value: "warning", label: "Amonestación" },
    { value: "certificate", label: "Certificado" },
    { value: "medical", label: "Médico" },
    { value: "other", label: "Otro" },
]

export default function EmployeeDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [employee, setEmployee] = useState<EmployeeProfile | null>(null)
    const [documents, setDocuments] = useState<HrDocument[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [documentName, setDocumentName] = useState("")
    const [documentCategory, setDocumentCategory] = useState("")

    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        fetchEmployeeAndDocuments()
    }, [id])

    async function fetchEmployeeAndDocuments() {
        try {
            setIsLoading(true)

            // Fetch employee basic info
            const { data: empData, error: empError } = await supabase
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    avatar_url,
                    role,
                    departments:departments!profiles_department_id_fkey (name),
                    hr_employee_details (job_title)
                `)
                .eq("id", id)
                .single()

            if (empError) throw empError

            const formattedEmployee = {
                ...empData,
                departments: Array.isArray(empData.departments) ? empData.departments[0] : empData.departments,
                hr_employee_details: Array.isArray(empData.hr_employee_details) ? empData.hr_employee_details[0] : empData.hr_employee_details
            } as EmployeeProfile

            setEmployee(formattedEmployee)

            // Fetch documents
            const { data: docData, error: docError } = await supabase
                .from("hr_documents")
                .select("*")
                .eq("profile_id", id)
                .order("created_at", { ascending: false })

            if (docError) throw docError

            setDocuments(docData || [])

        } catch (error) {
            console.error("Error fetching data:", error)
            toast({
                title: "Error",
                description: "No se pudo cargar la información.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            if (!documentName) {
                // Remove extension for default name
                const nameWithoutExt = file.name.split('.').slice(0, -1).join('.')
                setDocumentName(nameWithoutExt)
            }
        }
    }

    const resetUploadForm = () => {
        setSelectedFile(null)
        setDocumentName("")
        setDocumentCategory("")
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    async function handleUploadSubmit() {
        if (!selectedFile || !employee || !documentName || !documentCategory) {
            toast({
                title: "Faltan datos",
                description: "Por favor complete todos los campos (Archivo, Nombre, Categoría).",
                variant: "destructive"
            })
            return
        }

        setIsUploading(true)
        try {
            const fileExt = selectedFile.name.split('.').pop()
            const filePath = `${employee.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('hr-documents')
                .upload(filePath, selectedFile)

            if (uploadError) throw uploadError

            const { error: dbError } = await supabase
                .from("hr_documents")
                .insert({
                    profile_id: employee.id,
                    name: documentName,
                    document_type: documentCategory, // Using category as type
                    file_url: filePath,
                    created_by: user?.id
                })

            if (dbError) throw dbError

            toast({ title: "Documento subido correctamente" })
            setIsUploadModalOpen(false)
            resetUploadForm()
            fetchEmployeeAndDocuments()

        } catch (error: any) {
            console.error("Upload error:", error)
            toast({
                title: "Error",
                description: "No se pudo subir el documento.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    async function handleDeleteDocument(docId: string, filePath: string) {
        try {
            const { error: storageError } = await supabase.storage
                .from('hr-documents')
                .remove([filePath])

            const { error: dbError } = await supabase
                .from("hr_documents")
                .delete()
                .eq("id", docId)

            if (dbError) throw dbError

            toast({ description: "Documento eliminado." })
            setDocuments(documents.filter(d => d.id !== docId))

        } catch (error) {
            console.error("Delete error:", error)
            toast({
                title: "Error",
                description: "No se pudo eliminar el documento.",
                variant: "destructive"
            })
        } finally {
            setDeletingId(null)
        }
    }

    async function handleViewDocument(filePath: string) {
        try {
            const { data, error } = await supabase.storage
                .from('hr-documents')
                .createSignedUrl(filePath, 3600)

            if (error) throw error
            window.open(data.signedUrl, '_blank')
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo abrir el documento.",
                variant: "destructive"
            })
        }
    }

    const getCategoryLabel = (value: string) => {
        return DOCUMENT_CATEGORIES.find(c => c.value === value)?.label || value
    }

    const getCategoryColor = (value: string) => {
        const colors: Record<string, string> = {
            cv: "bg-blue-100 text-blue-700",
            contract: "bg-purple-100 text-purple-700",
            id: "bg-orange-100 text-orange-700",
            background_check: "bg-slate-100 text-slate-700",
            medical: "bg-red-100 text-red-700",
            loan: "bg-green-100 text-green-700",
            warning: "bg-yellow-100 text-yellow-700",
            default: "bg-gray-100 text-gray-700"
        }
        return colors[value] || colors.default
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    }

    if (!employee) {
        return <div className="p-8 text-center">Empleado no encontrado.</div>
    }

    return (
        <motion.div
            className="space-y-6 p-6 max-w-7xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-muted/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Gestión de Documentos
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <User className="h-4 w-4" />
                            {employee.full_name}
                            <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
                                {employee.hr_employee_details?.job_title || employee.role}
                            </Badge>
                        </p>
                    </div>
                </div>

                <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
                    if (!open) resetUploadForm()
                    setIsUploadModalOpen(open)
                }}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90">
                            <Upload className="h-4 w-4 mr-2" />
                            Subir Nuevo Documento
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Subir Documento</DialogTitle>
                            <DialogDescription>
                                Añade un nuevo archivo al expediente digital de {employee.full_name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            {/* File Input Zone */}
                            <div className="grid gap-2">
                                <Label htmlFor="file">Archivo</Label>
                                <div
                                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer text-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Input
                                        id="file"
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 bg-primary/10 rounded-full">
                                            <Upload className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="text-sm font-medium">
                                            {selectedFile ? selectedFile.name : "Click para seleccionar archivo"}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF, Word, Excel o Imágenes"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre del Documento</Label>
                                    <Input
                                        id="name"
                                        value={documentName}
                                        onChange={(e) => setDocumentName(e.target.value)}
                                        placeholder="Ej. Contrato Laboral 2024"
                                        className="h-10"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">Categoría</Label>
                                    <Select value={documentCategory} onValueChange={setDocumentCategory}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Selecciona el tipo de documento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DOCUMENT_CATEGORIES.map((category) => (
                                                <SelectItem key={category.value} value={category.value}>
                                                    {category.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleUploadSubmit} disabled={isUploading || !selectedFile || !documentName || !documentCategory}>
                                {isUploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                                Subir Archivo
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold">Expediente Digital</CardTitle>
                                <CardDescription>
                                    Gestión y almacenamiento de documentos laborales
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="px-3 py-1 text-xs">
                                {documents.length} Archivos
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AnimatePresence mode="wait">
                            {documents.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                                >
                                    <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="h-10 w-10 opacity-20" />
                                    </div>
                                    <p className="font-medium">Sin documentos</p>
                                    <p className="text-sm opacity-70">Sube el primer documento para comenzar</p>
                                </motion.div>
                            ) : (
                                <div className="overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/20">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[40%] pl-6">Documento</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead>Fecha de Carga</TableHead>
                                                <TableHead className="text-right pr-6">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.map((doc, index) => (
                                                <motion.tr
                                                    key={doc.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="group hover:bg-muted/30 transition-colors border-b last:border-0"
                                                >
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm ${getCategoryColor(doc.document_type)} bg-opacity-20`}>
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                                    {doc.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {(doc.file_url.split('.').pop() || 'file').toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`font-normal capitalize border-0 ${getCategoryColor(doc.document_type)}`}>
                                                            {getCategoryLabel(doc.document_type)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <CalendarIcon className="h-3 w-3" />
                                                            {format(new Date(doc.created_at || new Date().toISOString()), "PPP", { locale: es })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewDocument(doc.file_url)}
                                                                className="hover:bg-blue-50 hover:text-blue-600 h-8 w-8 p-0"
                                                                title="Ver Documento"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Está seguro de eliminar?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Eliminará permanentemente el archivo "{doc.name}". Esta acción no se puede deshacer.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteDocument(doc.id, doc.file_url)}>
                                                                            Eliminar Archivo
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
