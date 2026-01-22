"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
// ... imports
import { uploadCV } from "@/app/actions/upload-cv"
import {
    MapPin,
    Clock,
    DollarSign,
    Building2,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    UploadCloud,
    FileText,
    Briefcase
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

// --- Types ---

type JobDetail = {
    id: string
    title: string
    description: string
    location: string
    type: string
    salary_min: number | null
    salary_max: number | null
    departments: { name: string } | null
    companies: { name: string; logo_url: string | null } | null
}

// --- Form Schema ---

// Max file size 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const formSchema = z.object({
    first_name: z.string().min(2, "Nombre requerido"),
    last_name: z.string().min(2, "Apellido requerido"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(6, "Teléfono requerido"),
    linkedin_url: z.string().url("URL inválida").optional().or(z.literal("")),
    salary_expectation: z.string().min(1, "Pretensión salarial requerida"),
    // resume_url is now removed from manual input, we handle file separately or use a hidden field if needed, 
    // but for shadcn form + file upload, it's often easier to manage file state outside or with a custom field.
    // Let's keep it simple: we'll use a state for valid file and validating manually on submit or via refine.
    cover_letter: z.string().optional()
})

export default function JobDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [job, setJob] = useState<JobDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [certiFile, setCertiFile] = useState<File | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            linkedin_url: "",
            salary_expectation: "",
            cover_letter: ""
        }
    })

    useEffect(() => {
        if (params.id) {
            fetchJob(params.id as string)
        }
    }, [params.id])

    async function fetchJob(id: string) {
        setLoading(true)
        const { data, error } = await supabase
            .from('job_postings')
            .select(`
                id, 
                title, 
                description,
                location, 
                type, 
                salary_min, 
                salary_max, 
                departments:department_id(name),
                companies:company_id(name, logo_url)
            `)
            .eq('id', id)
            .single()

        if (data) {
            // @ts-ignore
            setJob(data)
        } else {
            console.error("Error fetching job:", error)
        }
        setLoading(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast({ title: "Archivo muy pesado", description: "El archivo debe pesar menos de 5MB", variant: "destructive" })
                return
            }
            if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
                toast({ title: "Formato no soportado", description: "Solo se aceptan PDF o Word", variant: "destructive" })
                return
            }
            setResumeFile(file)
        }
    }

    const handleCertiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast({ title: "Archivo muy pesado", description: "El archivo debe pesar menos de 5MB", variant: "destructive" })
                return
            }
            // Accepted types for Certi might be broader (images etc), but stick to documents/pdf for now or same as CV + images
            const EXTENDED_TYPES = [...ACCEPTED_FILE_TYPES, "image/jpeg", "image/png"]
            if (!EXTENDED_TYPES.includes(file.type)) {
                toast({ title: "Formato no soportado", description: "Solo PDF, Word o Imágenes (JPEG, PNG)", variant: "destructive" })
                return
            }
            setCertiFile(file)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!job) return

        if (!resumeFile) {
            toast({ title: "CV Requerido", description: "Por favor adjunta tu CV para continuar.", variant: "destructive" })
            return
        }

        setSubmitting(true)

        try {
            // 1. Upload Resume via Server Action (Bypasses RLS)
            const formData = new FormData()
            formData.append("file", resumeFile)
            formData.append("jobId", job.id)
            formData.append("firstName", values.first_name)
            formData.append("lastName", values.last_name)
            formData.append("docType", "CV")

            const { publicUrl: resumeUrl, error: uploadError } = await uploadCV(formData)

            if (uploadError || !resumeUrl) {
                console.error('Upload error:', uploadError)
                throw new Error(uploadError || "Error al subir CV")
            }

            // 1.1 Upload Certi if exists
            let certiUrl = null
            if (certiFile) {
                const certiFormData = new FormData()
                certiFormData.append("file", certiFile)
                certiFormData.append("jobId", job.id)
                certiFormData.append("firstName", values.first_name)
                certiFormData.append("lastName", values.last_name)
                certiFormData.append("docType", "CERTI")

                const { publicUrl, error: certiError } = await uploadCV(certiFormData)
                if (certiError) {
                    console.error('Certi upload warning:', certiError)
                    // converting warning to toast but continuing application? Or stopping?
                    // Let's continue but warn.
                    toast({ title: "Advertencia", description: "No se pudo subir el certificado, pero tu postulación continuará.", variant: "default" })
                }
                certiUrl = publicUrl
            }

            // 2. Create Candidate
            // We append salary expectation to notes or handle it if we had a column. 
            // For now, let's assume we want to store it in notes or if we can't add column easily right now without sql.
            // But wait, the user asked for it. 
            // I'll put it in the 'notes' of the APPLICATION + 'cover_letter'.

            const { data: candidate, error: candidateError } = await supabase
                .from('candidates')
                .insert({
                    first_name: values.first_name,
                    last_name: values.last_name,
                    email: values.email,
                    phone: values.phone,
                    linkedin_url: values.linkedin_url || null,
                    resume_url: resumeUrl,
                    source: 'website'
                })
                .select()
                .single()

            if (candidateError) throw candidateError

            // 3. Create Application
            let applicationNotes = `Pretensión Salarial: ${values.salary_expectation}\n\n${values.cover_letter || ''}`

            if (certiUrl) {
                applicationNotes += `\n\n[CERTIFICADO ANTECEDENTES]: ${certiUrl}`
            }

            const { error: appError } = await supabase
                .from('job_applications')
                .insert({
                    job_id: job.id,
                    candidate_id: candidate.id,
                    stage: 'applied',
                    notes: applicationNotes
                })

            if (appError) throw appError

            setSuccess(true)
            toast({
                title: "Aplicación enviada",
                description: "Hemos recibido tu postulación correctamente.",
            })
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.error("Error applying:", error)
            toast({
                title: "Error",
                description: "Ocurrió un problema al enviar tu aplicación. " + (error.message || ""),
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-12 w-3/4" />
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </div>
        )
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Vacante no encontrada</h2>
                <Button asChild variant="outline">
                    <Link href="/public/jobs">Volver al listado</Link>
                </Button>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-lg w-full text-center p-8 border-none shadow-xl">
                    <div className="flex justify-center mb-6">
                        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold mb-2 text-slate-900">¡Aplicación Enviada!</CardTitle>
                    <CardDescription className="text-lg text-slate-600">
                        Gracias por postular al puesto de <strong>{job.title}</strong>.
                    </CardDescription>
                    <p className="text-slate-500 mt-4 mb-8">
                        Hemos recibido tu CV y pretensiones salariales. Nuestro equipo de Talento revisará tu perfil y te contactaremos prontamente.
                    </p>
                    <Button asChild size="lg" className="w-full bg-slate-900 hover:bg-slate-800">
                        <Link href="/public/jobs">Ver más vacantes</Link>
                    </Button>
                </Card>
            </div>
        )
    }



    // ... imports remain the same

    // ... (skipping down to Header render)

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-slate-900 text-white relative overflow-hidden pb-12 pt-6"
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"
                />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="mb-8">
                        <Link href="/public/jobs" className="inline-flex items-center text-slate-300 hover:text-white transition-colors text-sm font-medium group">
                            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Volver a vacantes
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start gap-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            <Avatar className="h-24 w-24 border-4 border-white/10 shadow-xl rounded-2xl bg-white">
                                <AvatarImage src={job.companies?.logo_url || ''} alt={job.companies?.name} className="object-contain p-2" />
                                <AvatarFallback className="bg-indigo-50 text-indigo-700 text-2xl font-bold rounded-2xl">
                                    {job.companies?.name ? job.companies.name.substring(0, 2).toUpperCase() : <Building2 className="h-10 w-10" />}
                                </AvatarFallback>
                            </Avatar>
                        </motion.div>

                        <div className="space-y-4 flex-1">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">
                                    {job.title}
                                </h1>
                                <p className="text-xl text-indigo-200 font-medium">{job.companies?.name}</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="flex flex-wrap gap-3"
                            >
                                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-white/10 backdrop-blur-md px-3 py-1.5 text-sm h-auto">
                                    {job.departments?.name || 'General'}
                                </Badge>
                                <Badge variant="outline" className="border-indigo-200/30 text-indigo-100 px-3 py-1.5 text-sm h-auto gap-2">
                                    <Clock className="h-4 w-4" /> {job.type}
                                </Badge>
                                <Badge variant="outline" className="border-indigo-200/30 text-indigo-100 px-3 py-1.5 text-sm h-auto gap-2">
                                    <MapPin className="h-4 w-4" /> {job.location}
                                </Badge>
                                {job.salary_min && (
                                    <Badge variant="outline" className="border-green-400/30 text-green-300 px-3 py-1.5 text-sm h-auto gap-2 bg-green-900/10">
                                        <DollarSign className="h-4 w-4" /> S/. {job.salary_min} - {job.salary_max}
                                    </Badge>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="max-w-7xl mx-auto px-6 py-12 -mt-8 relative z-20">
                <div className="grid lg:grid-cols-12 gap-10">

                    {/* Left: Job Description */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
                        >
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                Descripción del Puesto
                            </h2>

                            <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap break-words w-full overflow-hidden">
                                {job.description}
                            </div>
                        </motion.div>

                        {/* Additional Info / Footer for Job */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="border-t border-slate-200 pt-8 mt-8 pl-2"
                        >
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-slate-500 text-sm">
                                <span>¿Conoces a alguien ideal para este puesto?</span>
                                <Button variant="outline" size="sm" className="rounded-full bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => {
                                    navigator.clipboard.writeText(window.location.href)
                                    toast({ title: "Enlace copiado", description: "El enlace ha sido copiado al portapapeles." })
                                }}>
                                    Copiar Enlace para Compartir
                                </Button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Application Form */}
                    <div className="lg:col-span-5 xl:col-span-4">
                        <div className="sticky top-24">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                            >
                                <Card className="shadow-2xl border-0 ring-1 ring-slate-200 overflow-hidden rounded-3xl">
                                    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 p-8 text-white relative overflow-hidden group">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                            className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl opacity-50 pointer-events-none"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                        <h3 className="font-bold text-2xl mb-2 relative z-10 font-display flex items-center gap-2">
                                            Aplica Ahora
                                            <motion.span
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="inline-block"
                                            >
                                                →
                                            </motion.span>
                                        </h3>
                                        <p className="text-indigo-100/90 text-sm relative z-10 leading-relaxed">
                                            Completa el formulario para iniciar tu proceso de selección.
                                        </p>
                                    </div>
                                    <CardContent className="p-8 bg-white">
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="first_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nombre</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Tu nombre" {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="last_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Apellido</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Tu apellido" {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="ejemplo@correo.com" {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="phone"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Teléfono</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="+51 999 999 999" {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="salary_expectation"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Pretensión Salarial (S/.)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ej. 3500" {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="space-y-4 pt-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="cv-upload" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">CV (Obligatorio)</Label>
                                                        <div className={`
                                                        border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative group h-[140px]
                                                        ${resumeFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'}
                                                    `}>
                                                            <Input
                                                                id="cv-upload"
                                                                type="file"
                                                                accept=".pdf,.doc,.docx"
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                onChange={handleFileChange}
                                                            />
                                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${resumeFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                {resumeFile ? <CheckCircle2 className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                                                            </div>
                                                            {resumeFile ? (
                                                                <div className="text-sm font-medium text-emerald-700 flex flex-col items-center gap-1">
                                                                    <span className="truncate max-w-[180px] text-xs font-semibold">{resumeFile.name}</span>
                                                                    <span className="text-[10px] text-emerald-600">Click para cambiar</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-sm font-semibold text-slate-700">Sube tu CV aquí</span>
                                                                    <span className="text-xs text-slate-400 mt-1">PDF o Word (Máx 5MB)</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* CertiJoven moved to collapsible or refined styling to save space? Kept standard for now but refined look */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="certi-upload" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Certificado (Opcional)</Label>
                                                        <div className={`
                                                        border-2 border-dashed rounded-xl p-4 flex items-center gap-4 transition-all cursor-pointer relative group bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300
                                                        ${certiFile ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'}
                                                    `}>
                                                            <Input
                                                                id="certi-upload"
                                                                type="file"
                                                                accept=".pdf,.doc,.docx,.jpg,.png"
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                onChange={handleCertiFileChange}
                                                            />
                                                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${certiFile ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 text-left">
                                                                {certiFile ? (
                                                                    <div className="text-sm font-medium text-orange-800 truncate">{certiFile.name}</div>
                                                                ) : (
                                                                    <>
                                                                        <div className="text-sm font-medium text-slate-700">CertiJoven/Adulto</div>
                                                                        <div className="text-xs text-slate-400">Opcional</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {!certiFile && <UploadCloud className="h-4 w-4 text-slate-400 mr-2" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="linkedin_url"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">LinkedIn (Opcional)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="https://linkedin.com/in/..." {...field} className="bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all rounded-xl h-11" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <Button
                                                    type="submit"
                                                    className="w-full bg-slate-900 hover:bg-indigo-600 transition-all duration-300 h-12 text-base font-semibold shadow-lg hover:shadow-indigo-500/25 rounded-xl"
                                                    disabled={submitting}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                            Procesando...
                                                        </>
                                                    ) : (
                                                        "Enviar Postulación"
                                                    )}
                                                </Button>

                                                <p className="text-[10px] text-center text-slate-400 leading-tight px-4">
                                                    Al enviar este formulario aceptas nuestra política de privacidad y el tratamiento de tus datos personales para procesos de selección.
                                                </p>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}

// Simple Placeholder for Motion Div to avoid importing framer-motion if not needed or reuse simple div

