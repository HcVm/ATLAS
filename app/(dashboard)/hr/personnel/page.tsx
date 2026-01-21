"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, Filter, MoreHorizontal, Mail, Phone, Calendar as CalendarIcon, MapPin, Building2, User, CreditCard, FileText, Upload, Trash2, ExternalLink, LayoutGrid, List } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { useCompany } from "@/lib/company-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { motion, AnimatePresence } from "framer-motion"

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
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

type EmployeeProfile = {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    phone: string | null
    role: string
    department_id: string | null
    departments?: {
        name: string
    } | null
    hr_employee_details?: {
        job_title: string | null
        status: string | null
        start_date: string | null
        document_type: string | null
        document_number: string | null
        birth_date: string | null
        personal_email: string | null
        address: string | null
        phone_secondary: string | null
        emergency_contact_name: string | null
        emergency_contact_phone: string | null
        contract_type: string | null
        end_date: string | null
        salary_amount: number | null
        salary_currency: string | null
        bank_name: string | null
        bank_account_number: string | null
    } | null
}

type HrDocument = {
    id: string
    name: string
    document_type: string
    file_url: string
    created_at: string | null
}

export default function PersonnelPage() {
    const { selectedCompany } = useCompany()
    const { user } = useAuth()
    const [employees, setEmployees] = useState<EmployeeProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Documents state
    const [documents, setDocuments] = useState<HrDocument[]>([])
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form states for editing
    const [formData, setFormData] = useState({
        job_title: "",
        phone: "",
        status: "",
        // Add new fields
        document_type: "",
        document_number: "",
        birth_date: "",
        personal_email: "",
        address: "",
        phone_secondary: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        contract_type: "",
        end_date: "",
        salary_amount: "",
        salary_currency: "PEN",
        bank_name: "",
        bank_account_number: "",
    })

    useEffect(() => {
        if (selectedCompany) {
            fetchEmployees()
        }
    }, [selectedCompany])

    // Fetch documents when selectedEmployee changes
    useEffect(() => {
        if (selectedEmployee && isSheetOpen) {
            fetchDocuments(selectedEmployee.id)
        }
    }, [selectedEmployee, isSheetOpen])

    async function fetchDocuments(employeeId: string) {
        setIsLoadingDocuments(true)
        try {
            const { data, error } = await supabase
                .from("hr_documents")
                .select("*")
                .eq("profile_id", employeeId)
                .order("created_at", { ascending: false })

            if (error) throw error
            setDocuments(data || [])
        } catch (error) {
            console.error("Error fetching documents:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los documentos.",
                variant: "destructive"
            })
        } finally {
            setIsLoadingDocuments(false)
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !selectedEmployee) return

        setIsUploading(true)
        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${selectedEmployee.id}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('hr-documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL (or signed URL if private, but we store the relative path or signed url?)
            // Usually we store the path and generate signed URL on fly, OR store the public URL.
            // As per schema "file_url text not null", let's store the full path or public URL.
            // Since it's likely a private bucket, "file_url" might be misleading if it implies public access.
            // For now, let's store the Storage Path so we can create signed URLs later, 
            // OR if the user intends it to be public, we use public URL.
            // Given "hr-documents" is private, we should store the Path.

            // Let's assume we store the key/path.

            // 3. Insert metadata record
            const { error: dbError } = await supabase
                .from("hr_documents")
                .insert({
                    profile_id: selectedEmployee.id,
                    name: file.name,
                    document_type: file.type,
                    file_url: filePath, // Storing the path for retrieval
                    created_by: user?.id
                })

            if (dbError) throw dbError

            toast({
                title: "Éxito",
                description: "Documento subido correctamente."
            })

            fetchDocuments(selectedEmployee.id)

        } catch (error: any) {
            console.error("Error uploading document:", error)
            toast({
                title: "Error",
                description: error.message || "No se pudo subir el documento.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    async function handleDeleteDocument(docId: string, filePath: string) {
        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('hr-documents')
                .remove([filePath])

            if (storageError) {
                console.error("Storage delete error:", storageError)
                // Start by deleting DB record anyway if file is not found?
                // No, better to warn. But for now if it fails, maybe file didn't exist.
            }

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from("hr_documents")
                .delete()
                .eq("id", docId)

            if (dbError) throw dbError

            toast({ description: "Documento eliminado." })
            if (selectedEmployee) fetchDocuments(selectedEmployee.id)

        } catch (error) {
            console.error("Error deleting document:", error)
            toast({
                title: "Error",
                description: "No se pudo eliminar el documento.",
                variant: "destructive"
            })
        }
    }

    async function handleViewDocument(filePath: string) {
        try {
            const { data, error } = await supabase.storage
                .from('hr-documents')
                .createSignedUrl(filePath, 60 * 60) // 1 hour validity

            if (error) throw error

            window.open(data.signedUrl, '_blank')
        } catch (error) {
            console.error("Error access document:", error)
            toast({
                title: "Error",
                description: "No se pudo abrir el documento.",
                variant: "destructive"
            })
        }
    }

    async function fetchEmployees() {
        if (!selectedCompany) return

        try {
            setLoading(true)

            const { data: departments, error: deptError } = await supabase
                .from("departments")
                .select("id")
                .eq("company_id", selectedCompany.id)

            if (deptError) throw deptError

            const departmentIds = departments.map(d => d.id)

            let query = supabase
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    avatar_url,
                    phone,
                    role,
                    department_id,
                    departments!profiles_department_id_fkey (
                        name,
                        company_id
                    ),
                    hr_employee_details (
                        job_title,
                        status,
                        start_date,
                        document_type,
                        document_number,
                        birth_date,
                        personal_email,
                        address,
                        phone_secondary,
                        emergency_contact_name,
                        emergency_contact_phone,
                        contract_type,
                        end_date,
                        salary_amount,
                        salary_currency,
                        bank_name,
                        bank_account_number
                    )
                `)
                .order("full_name")

            if (departmentIds.length > 0) {
                query = query.in('department_id', departmentIds)
            } else {
                setEmployees([])
                setLoading(false)
                return
            }

            const { data, error } = await query

            if (error) throw error

            const formattedData = (data as any[]).map(item => ({
                ...item,
                hr_employee_details: Array.isArray(item.hr_employee_details)
                    ? item.hr_employee_details[0]
                    : item.hr_employee_details
            }))

            setEmployees(formattedData)
        } catch (error) {
            console.error("Error fetching employees:", error)
            toast({
                title: "Error",
                description: "No se pudo cargar la lista de empleados.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleOpenSheet = (employee: EmployeeProfile, editMode = false) => {
        setSelectedEmployee(employee)
        setFormData({
            job_title: employee.hr_employee_details?.job_title || "",
            phone: employee.phone || "",
            status: employee.hr_employee_details?.status || "active",
            document_type: employee.hr_employee_details?.document_type || "",
            document_number: employee.hr_employee_details?.document_number || "",
            birth_date: employee.hr_employee_details?.birth_date || "",
            personal_email: employee.hr_employee_details?.personal_email || "",
            address: employee.hr_employee_details?.address || "",
            phone_secondary: employee.hr_employee_details?.phone_secondary || "",
            emergency_contact_name: employee.hr_employee_details?.emergency_contact_name || "",
            emergency_contact_phone: employee.hr_employee_details?.emergency_contact_phone || "",
            contract_type: employee.hr_employee_details?.contract_type || "",
            end_date: employee.hr_employee_details?.end_date || "",
            salary_amount: employee.hr_employee_details?.salary_amount?.toString() || "",
            salary_currency: employee.hr_employee_details?.salary_currency || "PEN",
            bank_name: employee.hr_employee_details?.bank_name || "",
            bank_account_number: employee.hr_employee_details?.bank_account_number || "",
        })
        setIsEditing(editMode)
        setIsSheetOpen(true)
    }

    const handleSaveChanges = async () => {
        if (!selectedEmployee) return

        try {
            // Update profile phone
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ phone: formData.phone })
                .eq("id", selectedEmployee.id)

            if (profileError) throw profileError

            // Update HR details
            const { error: hrError } = await supabase
                .from("hr_employee_details")
                .upsert({
                    id: selectedEmployee.id,
                    job_title: formData.job_title,
                    status: formData.status,
                    document_type: formData.document_type || null,
                    document_number: formData.document_number || null,
                    birth_date: formData.birth_date || null,
                    personal_email: formData.personal_email || null,
                    address: formData.address || null,
                    phone_secondary: formData.phone_secondary || null,
                    emergency_contact_name: formData.emergency_contact_name || null,
                    emergency_contact_phone: formData.emergency_contact_phone || null,
                    contract_type: formData.contract_type || null,
                    end_date: formData.end_date || null,
                    salary_amount: formData.salary_amount ? parseFloat(formData.salary_amount) : null,
                    salary_currency: formData.salary_currency,
                    bank_name: formData.bank_name || null,
                    bank_account_number: formData.bank_account_number || null,
                }, { onConflict: 'id' })

            if (hrError) throw hrError

            toast({
                title: "Cambios guardados",
                description: "La información del empleado ha sido actualizada.",
            })

            setIsSheetOpen(false)
            fetchEmployees() // Refresh list

        } catch (error) {
            console.error("Error updating employee:", error)
            toast({
                title: "Error",
                description: "No se pudieron guardar los cambios.",
                variant: "destructive",
            })
        }
    }

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.departments?.name && employee.departments.name.toLowerCase().includes(searchTerm.toLowerCase()))

        const status = employee.hr_employee_details?.status || "active"
        const matchesStatus = statusFilter === "all" || status === statusFilter

        return matchesSearch && matchesStatus
    })

    const stats = {
        total: employees.length,
        active: employees.filter(e => (e.hr_employee_details?.status || 'active') === 'active').length,
        onLeave: employees.filter(e => e.hr_employee_details?.status === 'on_leave').length,
        terminated: employees.filter(e => e.hr_employee_details?.status === 'terminated').length
    }

    if (!selectedCompany) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-lg font-medium">Selecciona una empresa</h2>
                    <p className="text-muted-foreground">Debes seleccionar una empresa para ver el directorio de personal.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Directorio de Personal - {selectedCompany.name}</h1>
                <p className="text-muted-foreground">
                    Gestión de empleados, roles y departamentos.
                </p>
            </div>

            {/* Dashboard Stats */}
            {/* Dashboard Stats */}
            <motion.div
                className="grid gap-4 md:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Personal</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Activos</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "-" : stats.active}</div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Licencia</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "-" : stats.onLeave}</div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cesados</CardTitle>
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? "-" : stats.terminated}</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Controls Bar */}
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 backdrop-blur-sm">
                    {[
                        { id: "all", label: "Todos", color: "text-foreground" },
                        { id: "active", label: "Activos", color: "text-green-600" },
                        { id: "on_leave", label: "Licencia", color: "text-yellow-600" },
                        { id: "terminated", label: "Cesados", color: "text-red-600" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`relative px-4 py-1.5 text-sm font-medium transition-colors ${statusFilter === tab.id ? tab.color : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {statusFilter === tab.id && (
                                <motion.div
                                    layoutId="activeFilter"
                                    className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/50"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, correo o área..."
                            className="pl-9 bg-background/50 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center bg-muted/50 p-1 rounded-md border border-border/50 backdrop-blur-sm">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        {[1, 2, 3, 4].map(i => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="h-24 bg-muted/50" />
                                <CardContent className="h-32" />
                            </Card>
                        ))}
                    </motion.div>
                ) : filteredEmployees.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-slate-50/50"
                    >
                        <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium">No se encontraron colaboradores</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            Intenta ajustar los filtros de búsqueda o estado.
                        </p>
                    </motion.div>
                ) : viewMode === 'grid' ? (
                    <motion.div
                        key="grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        {filteredEmployees.map((employee) => (
                            <motion.div key={employee.id} variants={itemVariants} layoutId={employee.id} className="h-full">
                                <div className="relative h-full flex flex-col rounded-[24px] overflow-hidden bg-card text-card-foreground shadow-md hover:shadow-xl transition-all duration-300 border border-border group">

                                    {/* Action Button (Absolute Top Right) */}
                                    <div className="absolute top-3 right-3 z-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-full">
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Acciones del Empleado</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleOpenSheet(employee, false)} className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" /> Ver Perfil
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenSheet(employee, true)} className="cursor-pointer">
                                                    <FileText className="mr-2 h-4 w-4" /> Editar Datos
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.push(`/hr/personnel/${employee.id}/documents`)} className="cursor-pointer">
                                                    <Upload className="mr-2 h-4 w-4" /> Gestionar Documentos
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Header Gradient */}
                                    <div className="h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent"></div>

                                        {/* Company Branding */}
                                        <div className="absolute top-4 left-0 w-full text-center">
                                            <p className="text-white/70 text-[10px] font-bold tracking-[0.2em] uppercase">Atlas System</p>
                                            <p className="text-white font-bold text-sm tracking-tight truncate px-8">
                                                {selectedCompany?.name || "Empresa"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Avatar Section */}
                                    <div className="relative px-6 pb-6 flex flex-col items-center flex-1">
                                        <div className="relative -mt-14 mb-3">
                                            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
                                                <div className="p-1.5 rounded-full bg-card shadow-lg">
                                                    <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-900">
                                                        <AvatarImage src={employee.avatar_url || ""} className="object-cover" />
                                                        <AvatarFallback className="text-2xl font-bold bg-slate-100 text-slate-700">
                                                            {employee.full_name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </motion.div>

                                            {/* Status Indicator */}
                                            <div
                                                className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-card ${employee.hr_employee_details?.status === 'active' ? 'bg-emerald-500' :
                                                    employee.hr_employee_details?.status === 'on_leave' ? 'bg-yellow-500' :
                                                        employee.hr_employee_details?.status === 'terminated' ? 'bg-red-500' : 'bg-slate-400'
                                                    }`}
                                                title={
                                                    employee.hr_employee_details?.status === 'active' ? 'Activo' :
                                                        employee.hr_employee_details?.status === 'on_leave' ? 'Licencia' :
                                                            employee.hr_employee_details?.status === 'terminated' ? 'Cesado' : 'Desconocido'
                                                }
                                            ></div>
                                        </div>

                                        {/* Name & Role */}
                                        <div className="text-center w-full space-y-1 mb-5">
                                            <h3 className="text-lg font-bold text-foreground leading-tight px-2 truncate" title={employee.full_name}>
                                                {employee.full_name}
                                            </h3>
                                            <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 border-0">
                                                {employee.hr_employee_details?.job_title || employee.role || "Sin Cargo"}
                                            </Badge>
                                        </div>

                                        {/* Info Cards */}
                                        <div className="w-full space-y-2 text-sm">
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                                                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 shrink-0">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Departamento</p>
                                                    <p className="font-semibold text-foreground truncate text-xs">
                                                        {employee.departments?.name || "Sin Asignar"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                                    <Mail className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Email</p>
                                                    <p className="font-semibold text-foreground truncate text-xs" title={employee.email}>
                                                        {employee.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer / Barcode */}
                                        <div className="mt-auto pt-5 w-full">
                                            <div className="border-t border-dashed border-border w-full flex flex-col items-center pt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <div className="h-6 w-3/4 bg-foreground/90" style={{
                                                    maskImage: "repeating-linear-gradient(90deg, black, black 2px, transparent 2px, transparent 5px)"
                                                }}></div>
                                                <p className="text-[9px] font-mono text-muted-foreground mt-1 tracking-widest">{employee.id.substring(0, 8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    >
                        <Card>
                            <CardHeader className="py-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base">Vista Detallada</CardTitle>
                                    <span className="text-xs text-muted-foreground">{filteredEmployees.length} registros</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Empleado</TableHead>
                                            <TableHead>Cargo / Departamento</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Fecha Ingreso</TableHead>
                                            <TableHead className="text-right pr-6">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEmployees.map((employee) => (
                                            <TableRow key={employee.id}>
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarImage src={employee.avatar_url || ""} />
                                                            <AvatarFallback>
                                                                {employee.full_name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">{employee.full_name}</span>
                                                            <span className="text-xs text-muted-foreground capitalize">{employee.role}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-sm font-medium">
                                                            {employee.hr_employee_details?.job_title || "Sin cargo"}
                                                        </div>
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            <Building2 className="mr-1 h-3 w-3" />
                                                            {employee.departments?.name || "Sin departamento"}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <div className="flex items-center">
                                                            <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                                                            {employee.email}
                                                        </div>
                                                        {employee.phone && (
                                                            <div className="flex items-center">
                                                                <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                                                                {employee.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={employee.hr_employee_details?.status === 'terminated' ? "destructive" : "secondary"} className="capitalize text-xs font-normal">
                                                        {employee.hr_employee_details?.status === 'active' ? "Activo" :
                                                            employee.hr_employee_details?.status === 'terminated' ? "Cesado" :
                                                                employee.hr_employee_details?.status === 'on_leave' ? "Licencia" :
                                                                    "Registrado"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-sm text-muted-foreground">
                                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                                        {employee.hr_employee_details?.start_date
                                                            ? format(new Date(employee.hr_employee_details.start_date), "PP", { locale: es })
                                                            : "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleOpenSheet(employee, false)}>
                                                                Ver perfil
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenSheet(employee, true)}>
                                                                Editar datos
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => router.push(`/hr/personnel/${employee.id}/documents`)}>
                                                                Gestionar documentos
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Employee Detail Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    {selectedEmployee && (
                        <>
                            <SheetHeader className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={selectedEmployee.avatar_url || ""} />
                                        <AvatarFallback className="text-2xl">
                                            {selectedEmployee.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <SheetTitle className="text-2xl">{selectedEmployee.full_name}</SheetTitle>
                                        <SheetDescription>
                                            {selectedEmployee.email}
                                        </SheetDescription>
                                        <Badge variant="outline" className="mt-2 text-sm capitalize">
                                            {selectedEmployee.role}
                                        </Badge>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="mt-8 space-y-6">
                                {/* Personal Info */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <User className="h-5 w-5" />
                                        Información Personal
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo de Documento</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.document_type : (selectedEmployee.hr_employee_details?.document_type || "")}
                                                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                                placeholder="DNI / CE"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Número de Documento</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.document_number : (selectedEmployee.hr_employee_details?.document_number || "")}
                                                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha de Nacimiento</Label>
                                            <Input
                                                type="date"
                                                disabled={!isEditing}
                                                value={isEditing ? formData.birth_date : (selectedEmployee.hr_employee_details?.birth_date || "")}
                                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Dirección</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.address : (selectedEmployee.hr_employee_details?.address || "")}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Professional Info */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <Building2 className="h-5 w-5" />
                                        Información Laboral
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Departamento</Label>
                                            <Input
                                                disabled
                                                value={selectedEmployee.departments?.name || "Sin Asignar"}
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cargo / Puesto</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.job_title : (selectedEmployee.hr_employee_details?.job_title || "No definido")}
                                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tipo Contrato</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.contract_type : (selectedEmployee.hr_employee_details?.contract_type || "")}
                                                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Estado Laboral</Label>
                                            {isEditing ? (
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                >
                                                    <option value="active">Activo</option>
                                                    <option value="on_leave">Licencia</option>
                                                    <option value="terminated">Cesado</option>
                                                </select>
                                            ) : (
                                                <Badge variant={selectedEmployee.hr_employee_details?.status === 'terminated' ? "destructive" : "secondary"} className="h-10 px-4 text-sm capitalize flex items-center justify-center">
                                                    {selectedEmployee.hr_employee_details?.status === 'active' ? "Activo" :
                                                        selectedEmployee.hr_employee_details?.status === 'terminated' ? "Cesado" :
                                                            selectedEmployee.hr_employee_details?.status === "on_leave" ? "Licencia" : "Registrado"}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha Inicio</Label>
                                            <Input
                                                disabled
                                                value={selectedEmployee.hr_employee_details?.start_date
                                                    ? format(new Date(selectedEmployee.hr_employee_details.start_date), "PP", { locale: es })
                                                    : "No registrada"}
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fecha Fin (Contrato)</Label>
                                            <Input
                                                type="date"
                                                disabled={!isEditing}
                                                value={isEditing ? formData.end_date : (selectedEmployee.hr_employee_details?.end_date || "")}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Financial Info */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <CreditCard className="h-5 w-5" />
                                        Información Financiera
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Salario</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    disabled
                                                    value={formData.salary_currency}
                                                    className="w-20 bg-muted"
                                                />
                                                <Input
                                                    type="number"
                                                    disabled={!isEditing}
                                                    value={isEditing ? formData.salary_amount : (selectedEmployee.hr_employee_details?.salary_amount || "")}
                                                    onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                                                    className={!isEditing ? "bg-muted" : ""}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Banco</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.bank_name : (selectedEmployee.hr_employee_details?.bank_name || "")}
                                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>Número de Cuenta</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.bank_account_number : (selectedEmployee.hr_employee_details?.bank_account_number || "")}
                                                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Contact Info */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                                        <User className="h-5 w-5" />
                                        Contacto y Emergencia
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Teléfono Principal</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.phone : (selectedEmployee.phone || "")}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teléfono Secundario</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.phone_secondary : (selectedEmployee.hr_employee_details?.phone_secondary || "")}
                                                onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>Email Personal</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.personal_email : (selectedEmployee.hr_employee_details?.personal_email || "")}
                                                onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contacto de Emergencia</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.emergency_contact_name : (selectedEmployee.hr_employee_details?.emergency_contact_name || "")}
                                                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teléfono Emergencia</Label>
                                            <Input
                                                disabled={!isEditing}
                                                value={isEditing ? formData.emergency_contact_phone : (selectedEmployee.hr_employee_details?.emergency_contact_phone || "")}
                                                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                                className={!isEditing ? "bg-muted" : ""}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <SheetFooter className="pb-10">
                                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
                                    </SheetFooter>
                                )}
                            </div>
                        </>
                    )}</SheetContent>
            </Sheet >
        </div >
    )
}
