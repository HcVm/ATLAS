"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
                departments:department_id(name)
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

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/public/jobs" className="text-slate-500 hover:text-indigo-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 truncate max-w-[300px] md:max-w-md">{job.title}</h1>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{job.departments?.name}</span> • <span>{job.location}</span>
                            </div>
                        </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="hidden md:flex">
                        <Link href="/public/jobs">
                            Ver otros empleos
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid lg:grid-cols-12 gap-10">

                    {/* Left: Job Description */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="flex flex-wrap gap-3 mb-6">
                                <Badge variant="secondary" className="px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-100">
                                    {job.departments?.name || 'General'}
                                </Badge>
                                <Badge variant="outline" className="px-3 py-1 gap-1">
                                    <Clock className="h-3 w-3" /> {job.type}
                                </Badge>
                                <Badge variant="outline" className="px-3 py-1 gap-1">
                                    <MapPin className="h-3 w-3" /> {job.location}
                                </Badge>
                                {job.salary_min && (
                                    <Badge variant="outline" className="px-3 py-1 gap-1 text-green-700 border-green-200 bg-green-50">
                                        <DollarSign className="h-3 w-3" /> S/. {job.salary_min} - {job.salary_max}
                                    </Badge>
                                )}
                            </div>

                            <h2 className="text-3xl font-bold text-slate-900 mb-6">{job.title}</h2>

                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                                <h3 className="flex items-center gap-2 text-slate-900 font-semibold text-lg mb-4">
                                    <Briefcase className="h-5 w-5 text-indigo-500" />
                                    Descripción del Puesto
                                </h3>
                                {job.description}
                            </div>
                        </div>
                    </div>

                    {/* Right: Application Form */}
                    <div className="lg:col-span-5 xl:col-span-4">
                        <div className="sticky top-24">
                            <Card className="shadow-xl border-0 ring-1 ring-slate-200 overflow-hidden rounded-2xl">
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
                                    <h3 className="font-bold text-xl mb-1">Aplica Ahora</h3>
                                    <p className="text-slate-300 text-sm opacity-90">Únete a nuestro equipo de talentos</p>
                                </div>
                                <CardContent className="p-6 bg-white">
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="first_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-semibold uppercase text-slate-500">Nombre</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Tu nombre" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
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
                                                            <FormLabel className="text-xs font-semibold uppercase text-slate-500">Apellido</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Tu apellido" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
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
                                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">Email</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="ejemplo@correo.com" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
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
                                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">Teléfono</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+51 999 999 999" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
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
                                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">Pretensión Salarial (S/.)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ej. 3500" {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cv-upload" className="text-xs font-semibold uppercase text-slate-500">CV (Obligatorio)</Label>
                                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group bg-slate-50/50 h-[150px]">
                                                        <Input
                                                            id="cv-upload"
                                                            type="file"
                                                            accept=".pdf,.doc,.docx"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={handleFileChange}
                                                        />
                                                        <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            <UploadCloud className="h-5 w-5" />
                                                        </div>
                                                        {resumeFile ? (
                                                            <div className="text-sm font-medium text-emerald-600 flex flex-col items-center gap-1">
                                                                <FileText className="h-4 w-4" />
                                                                <span className="truncate max-w-[120px] text-xs">{resumeFile.name}</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-sm font-medium text-slate-700">Subir CV</span>
                                                                <span className="text-xs text-slate-400 mt-1">PDF/Word (Máx 5MB)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="certi-upload" className="text-xs font-semibold uppercase text-slate-500">CertiJoven/Adulto</Label>
                                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group bg-slate-50/50 h-[150px]">
                                                        <Input
                                                            id="certi-upload"
                                                            type="file"
                                                            accept=".pdf,.doc,.docx,.jpg,.png"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            onChange={handleCertiFileChange}
                                                        />
                                                        <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        {certiFile ? (
                                                            <div className="text-sm font-medium text-emerald-600 flex flex-col items-center gap-1">
                                                                <FileText className="h-4 w-4" />
                                                                <span className="truncate max-w-[120px] text-xs">{certiFile.name}</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-sm font-medium text-slate-700">Subir Certificado</span>
                                                                <span className="text-xs text-slate-400 mt-1">Opcional (Máx 5MB)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="linkedin_url"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold uppercase text-slate-500">LinkedIn (Opcional)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="https://linkedin.com/in/..." {...field} className="bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base shadow-lg shadow-indigo-200" disabled={submitting}>
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    "Enviar Postulación"
                                                )}
                                            </Button>

                                            <p className="text-xs text-center text-slate-400 px-4">
                                                Al enviar este formulario aceptas nuestra política de privacidad y tratamiento de datos.
                                            </p>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Simple Placeholder for Motion Div to avoid importing framer-motion if not needed or reuse simple div
const motion_div_placeholder = ({ children, className }: any) => <div className={className}>{children}</div>
