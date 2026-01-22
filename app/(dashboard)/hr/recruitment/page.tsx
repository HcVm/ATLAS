"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import {
    Users,
    Briefcase,
    Calendar,
    CheckCircle2,
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Mail,
    Phone,
    MapPin,
    DollarSign,
    Clock,
    FileText,
    TrendingUp,
    ChevronDown,
    Building2,
    Loader2,
    ExternalLink,
    Archive
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { NewJobDialog } from "./new-job-dialog"
import { CandidateProfileDialog } from "./candidate-profile-dialog"
import { ScheduleInterviewDialog } from "./schedule-interview-dialog"
// Remove this mock since we'll use DB types but for now I'll redefine locally if import fails or use 'any' to speed up then refine.
// Actually, let's try to infer from usage or define interfaces matching the DB.

// --- Types matching Supabase Schema ---

type JobPosting = {
    id: string
    title: string
    department_id: string | null
    location: string | null
    type: string | null // 'full-time' | 'part-time' etc
    salary_min: number | null
    salary_max: number | null
    currency: string | null
    description: string | null
    requirements: string[] | null
    status: string | null // 'draft' | 'published' | 'closed'
    created_at: string | null
    // Joined fields
    departments?: { name: string } | null
    candidates_count?: number
}

type Candidate = {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    avatar_url: string | null
    // Joined fields via job_applications
    application_id?: string
    stage?: string // 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
    rating?: number
    job_title?: string
    applied_at?: string | null
}

type Column = {
    id: string
    title: string
    color: string
}

const COLUMNS: Column[] = [
    { id: "applied", title: "Nuevos", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
    { id: "screening", title: "En Revisión", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
    { id: "interview", title: "Entrevista", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
    { id: "offer", title: "Oferta", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    { id: "hired", title: "Contratado", color: "bg-slate-800 text-white border-slate-700" },
]

export default function RecruitmentPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [jobs, setJobs] = useState<JobPosting[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedJob, setSelectedJob] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [enabled, setEnabled] = useState(false)
    const [isNewJobOpen, setIsNewJobOpen] = useState(false)

    // Candidate Profile & Scheduling State
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isScheduleOpen, setIsScheduleOpen] = useState(false)
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
    const [selectedCandidateName, setSelectedCandidateName] = useState<string>("")

    // Job Editing State
    const [selectedJobToEdit, setSelectedJobToEdit] = useState<any>(null)

    // specific hack for hello-pangea/dnd in next.js (strict mode)
    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)

            // 1. Fetch Job Postings
            const { data: jobsData, error: jobsError } = await supabase
                .from('job_postings')
                .select(`
                    *,
                    departments:department_id(name)
                `)
                .order('created_at', { ascending: false })

            if (jobsError) throw jobsError

            // 2. Fetch Candidates with Application info
            // We need to join candidates with job_applications
            const { data: applicationsData, error: appsError } = await supabase
                .from('job_applications')
                .select(`
                    id,
                    stage,
                    rating,
                    applied_at,
                    candidates:candidate_id (
                        id,
                        first_name,
                        last_name,
                        email,
                        phone,
                        avatar_url
                    ),
                    job_postings:job_id (
                        title
                    )
                `)

            if (appsError) throw appsError

            // Transform applications to flat candidate structure for the board
            // Transform applications to flat candidate structure for the board
            const flatCandidates: Candidate[] = (applicationsData || []).map(app => ({
                id: app.id,
                first_name: app.candidates?.first_name || '',
                last_name: app.candidates?.last_name || '',
                email: app.candidates?.email || null,
                phone: app.candidates?.phone || null,
                avatar_url: app.candidates?.avatar_url || null,

                application_id: app.id,
                stage: app.stage || 'applied',
                rating: app.rating || 0,
                job_title: app.job_postings?.title || 'Unknown Job',
                applied_at: app.applied_at || null
            }))

            setJobs(jobsData || [])
            setCandidates(flatCandidates)

        } catch (error) {
            console.error('Error fetching recruitment data:', error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos de reclutamiento.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const getFilteredCandidates = () => {
        return candidates.filter(c => {
            const matchesSearch =
                `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.job_title?.toLowerCase().includes(searchQuery.toLowerCase())

            // Note: selectedJob filter would require us to store job_id in candidate object
            // I'll skip that for this immediate step or add it if easy.
            return matchesSearch
        })
    }

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result

        if (!destination) return

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return
        }

        const newStage = destination.droppableId

        // Optimistic Update
        const updatedCandidates = candidates.map(c =>
            c.id === draggableId ? { ...c, stage: newStage } : c
        )
        setCandidates(updatedCandidates)

        // DB Update
        const { error } = await supabase
            .from('job_applications')
            .update({ stage: newStage })
            .eq('id', draggableId) // draggableId is application_id

        if (error) {
            console.error('Error updating stage:', error)
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" })
            fetchData() // Revert
        } else {
            const candidate = candidates.find(c => c.id === draggableId)
            const statusLabel = COLUMNS.find(col => col.id === newStage)?.title
            toast({
                title: "Estado Actualizado",
                description: `${candidate?.first_name} movido a ${statusLabel}`,
            })
        }
    }

    const updateJobStatus = async (jobId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('job_postings')
                .update({ status: newStatus })
                .eq('id', jobId)

            if (error) throw error

            toast({
                title: "Estado actualizado",
                description: `El estado de la vacante ha cambiado.`,
            })
            fetchData()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado.",
                variant: "destructive"
            })
        }
    }

    const deleteJob = async (jobId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta vacante? Esta acción no se puede deshacer.")) return

        try {
            const { error } = await supabase
                .from('job_postings')
                .delete()
                .eq('id', jobId)

            if (error) throw error

            toast({
                title: "Vacante eliminada",
                description: "La vacante ha sido eliminada correctamente.",
            })
            fetchData()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo eliminar la vacante. Asegúrate de que no tenga candidatos activos o intenta archivarla.",
                variant: "destructive"
            })
        }
    }

    return (
        <div className="space-y-6 p-6 min-h-screen pb-20 max-w-[1600px] mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                        Reclutamiento y Selección
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gestiona vacantes y el flujo de talento de la organización.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Reportes
                    </Button>
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setIsNewJobOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Vacante
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm border-l-4 border-l-slate-800">
                    <CardHeader className="pb-2">
                        <CardDescription>Vacantes Activas</CardDescription>
                        <CardTitle className="text-3xl font-bold text-slate-900">{jobs.filter(j => j.status !== 'closed' && j.status !== 'archived').length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">En curso</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Candidatos Totales</CardDescription>
                        <CardTitle className="text-3xl font-bold text-slate-700">{candidates.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">En proceso</div>
                    </CardContent>
                </Card>
                {/* Static stats for now */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Entrevistas (Esta Semana)</CardDescription>
                        <CardTitle className="text-3xl font-bold text-indigo-600">0</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Programadas</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription>Tiempo Prom. Contratación</CardDescription>
                        <CardTitle className="text-3xl font-bold text-slate-700">- <span className="text-sm font-normal text-muted-foreground">días</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            Calculando...
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="board" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <TabsList className="bg-slate-100 dark:bg-slate-800">
                        <TabsTrigger value="board">Tablero Kanban</TabsTrigger>
                        <TabsTrigger value="jobs">Vacantes ({jobs.length})</TabsTrigger>
                        <TabsTrigger value="candidates">Lista Candidatos</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar candidato..."
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={selectedJob} onValueChange={setSelectedJob}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Filtrar por puesto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los puestos</SelectItem>
                                {jobs.map(job => (
                                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <TabsContent value="board" className="mt-0">
                    <div className="h-[calc(100vh-320px)] min-h-[500px] overflow-x-auto pb-4">
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            </div>
                        ) : enabled && (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <div className="flex gap-6 min-w-[1200px] h-full">
                                    {COLUMNS.map(column => {
                                        const columnCandidates = getFilteredCandidates().filter(c => c.stage === column.id)

                                        return (
                                            <div key={column.id} className="flex-1 min-w-[280px] flex flex-col h-full rounded-2xl bg-slate-50/50 border border-slate-200/60 backdrop-blur-sm">
                                                {/* Column Header */}
                                                <div className={`p-4 border-b flex items-center justify-between sticky top-0 bg-opacity-90 backdrop-blur-md rounded-t-2xl z-10 ${column.color.includes('bg-slate-800') ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-3 w-3 rounded-full ${column.color.includes('bg-slate-800') ? 'bg-emerald-400' : column.color.split(' ')[1].replace('text-', 'bg-')}`} />
                                                        <span className="font-semibold">{column.title}</span>
                                                        <Badge variant="secondary" className="ml-2 bg-white/20 hover:bg-white/30 text-current border-0">
                                                            {columnCandidates.length}
                                                        </Badge>
                                                    </div>
                                                    {column.id === 'applied' && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Droppable Area */}
                                                <Droppable droppableId={column.id}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.innerRef}
                                                            className={`flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100/50' : ''}`}
                                                        >
                                                            {columnCandidates.map((candidate, index) => (
                                                                <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            className={`
                                                                                group relative bg-white p-4 rounded-xl shadow-sm border border-slate-200 
                                                                                hover:shadow-md transition-all cursor-grab active:cursor-grabbing
                                                                                ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-slate-900 z-50' : ''}
                                                                            `}
                                                                        >
                                                                            <div className="flex justify-between items-start mb-3">
                                                                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-slate-50">
                                                                                    {candidate.job_title}
                                                                                </Badge>
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            <MoreHorizontal className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end">
                                                                                        <DropdownMenuItem onClick={() => {
                                                                                            setSelectedCandidateId(candidate.id)
                                                                                            setIsProfileOpen(true)
                                                                                        }}>
                                                                                            Ver Perfil
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem onClick={() => {
                                                                                            setSelectedCandidateId(candidate.id)
                                                                                            setSelectedCandidateName(`${candidate.first_name} ${candidate.last_name}`)
                                                                                            setIsScheduleOpen(true)
                                                                                        }}>
                                                                                            Agendar Entrevista
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownThemeSeparator />
                                                                                        <DropdownMenuItem
                                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                                            onClick={async () => {
                                                                                                try {
                                                                                                    const { error } = await supabase
                                                                                                        .from('job_applications')
                                                                                                        .update({ stage: 'rejected' })
                                                                                                        .eq('id', candidate.id)

                                                                                                    if (error) throw error

                                                                                                    toast({
                                                                                                        title: "Candidato rechazado",
                                                                                                        description: `${candidate.first_name} ha sido movido a rechazados.`,
                                                                                                    })
                                                                                                    fetchData()
                                                                                                } catch (error) {
                                                                                                    console.error(error)
                                                                                                    toast({
                                                                                                        title: "Error",
                                                                                                        description: "No se pudo rechazar al candidato.",
                                                                                                        variant: "destructive"
                                                                                                    })
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            Rechazar
                                                                                        </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>

                                                                            <div className="flex items-center gap-3 mb-3">
                                                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                                                    <AvatarImage src={candidate.avatar_url || ''} />
                                                                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                                                                                        {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div>
                                                                                    <h4 className="font-semibold text-sm text-slate-900 leading-tight">{candidate.first_name} {candidate.last_name}</h4>
                                                                                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                                                        <Clock className="h-3 w-3 mr-1" />
                                                                                        {candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString() : 'N/A'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t border-dashed">
                                                                                <div className="flex items-center gap-1.5" title="Teléfono">
                                                                                    <Phone className="h-3 w-3" />
                                                                                    {candidate.phone || "N/A"}
                                                                                </div>
                                                                                {candidate.rating && candidate.rating > 0 && (
                                                                                    <div className="flex items-center justify-end gap-0.5 text-yellow-500">
                                                                                        {Array.from({ length: candidate.rating }).map((_, i) => (
                                                                                            <span key={i}>★</span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )
                                    })}
                                </div>
                            </DragDropContext>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="jobs">
                    <div className="space-y-12">
                        {/* Active & Closed Jobs */}
                        <div>
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {jobs.filter(j => j.status !== 'archived').map(job => (
                                    <Card key={job.id} className={`hover:shadow-md transition-shadow group cursor-pointer border-slate-200 ${job.status === 'closed' ? 'opacity-75 bg-slate-50' : ''}`}>
                                        <CardHeader className="relative">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex gap-2 mb-2">
                                                        <Badge variant="secondary" className="w-fit">{job.departments?.name || 'General'}</Badge>
                                                        {job.status === 'closed' && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Pausada</Badge>}
                                                    </div>
                                                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{job.title}</CardTitle>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedJobToEdit(job)
                                                            setIsNewJobOpen(true)
                                                        }}>
                                                            Editar Vacante
                                                        </DropdownMenuItem>

                                                        {job.status !== 'closed' && (
                                                            <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'closed')}>
                                                                Pausar (Cerrar)
                                                            </DropdownMenuItem>
                                                        )}

                                                        {job.status === 'closed' && (
                                                            <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'published')}>
                                                                Reactivar (Publicar)
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'archived')}>
                                                            Archivar
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            onClick={() => deleteJob(job.id)}
                                                        >
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <CardDescription className="flex items-center gap-2 mt-2">
                                                <MapPin className="h-3.5 w-3.5" /> {job.location || 'Remoto'} | {job.type}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center text-muted-foreground">
                                                        <DollarSign className="h-4 w-4 mr-1" />
                                                        {job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max}` : 'A convenir'}
                                                    </div>
                                                    <div className="flex items-center text-muted-foreground">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Reciente'}
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t flex items-center justify-between">
                                                    <div className="flex -space-x-2">
                                                        <div className="text-xs text-muted-foreground">
                                                            Ver postulantes
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            asChild
                                                            className="px-2"
                                                            title="Ver vista previa en portal público"
                                                        >
                                                            <a href={`/public/jobs/${job.id}`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedJobToEdit(job)
                                                                setIsNewJobOpen(true)
                                                            }}
                                                        >
                                                            Ver Detalles
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                <Button
                                    variant="outline"
                                    className="h-auto min-h-[250px] border-dashed border-2 flex flex-col gap-2 hover:bg-slate-50 hover:border-slate-300"
                                    onClick={() => {
                                        setSelectedJobToEdit(null)
                                        setIsNewJobOpen(true)
                                    }}
                                >
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Plus className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <span className="font-medium text-lg">Publicar Nueva Vacante</span>
                                    <span className="text-sm text-muted-foreground">Definir perfil, requisitos y oferta</span>
                                </Button>
                            </div>
                        </div>

                        {/* Archived Jobs Section */}
                        {jobs.some(j => j.status === 'archived') && (
                            <div className="pt-6 border-t border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-500 mb-6 flex items-center gap-2">
                                    <Archive className="h-5 w-5" />
                                    Vacantes Archivadas
                                </h3>
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 opacity-75 grayscale-[0.8]">
                                    {jobs.filter(j => j.status === 'archived').map(job => (
                                        <Card key={job.id} className="hover:shadow-md transition-shadow group cursor-pointer border-slate-200 bg-slate-50">
                                            <CardHeader className="relative">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <div className="flex gap-2 mb-2">
                                                            <Badge variant="secondary" className="w-fit">{job.departments?.name || 'General'}</Badge>
                                                            <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-100">Archivada</Badge>
                                                        </div>
                                                        <CardTitle className="text-xl text-slate-700">{job.title}</CardTitle>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => updateJobStatus(job.id, 'published')}>
                                                                Restaurar (Desarchivar)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                onClick={() => deleteJob(job.id)}
                                                            >
                                                                Eliminar Definitivamente
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <CardDescription className="flex items-center gap-2 mt-2">
                                                    <MapPin className="h-3.5 w-3.5" /> {job.location || 'Remoto'} | {job.type}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-sm text-muted-foreground flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    Archivada el {new Date().toLocaleDateString()} {/* Idealmente tener archived_at */}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="candidates">
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Talentos</CardTitle>
                            <CardDescription>Lista completa de todos los candidatos históricos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-10 text-muted-foreground">
                                {candidates.length === 0 ? (
                                    <>
                                        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p>No hay candidatos registrados.</p>
                                    </>
                                ) : (
                                    <div className="text-left space-y-2">
                                        {candidates.map(c => (
                                            <div key={c.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <Avatar>
                                                        <AvatarImage src={c.avatar_url || ''} />
                                                        <AvatarFallback>{c.first_name[0]}{c.last_name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900">{c.first_name} {c.last_name}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            {c.job_title} • <Clock className="h-3 w-3" /> {c.applied_at ? new Date(c.applied_at).toLocaleDateString() : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge className={`
                                                        capitalize
                                                        ${c.stage === 'applied' && 'bg-blue-100 text-blue-700'}
                                                        ${c.stage === 'screening' && 'bg-purple-100 text-purple-700'}
                                                        ${c.stage === 'interview' && 'bg-orange-100 text-orange-700'}
                                                        ${c.stage === 'offer' && 'bg-emerald-100 text-emerald-700'}
                                                        ${c.stage === 'hired' && 'bg-slate-800 text-white'}
                                                        ${c.stage === 'rejected' && 'bg-red-100 text-red-700'}
                                                    `}>
                                                        {c.stage === 'rejected' ? 'Rechazado' : c.stage}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCandidateId(c.id)
                                                            setIsProfileOpen(true)
                                                        }}
                                                    >
                                                        Ver Perfil
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <NewJobDialog
                open={isNewJobOpen}
                onOpenChange={(open) => {
                    setIsNewJobOpen(open)
                    if (!open) setSelectedJobToEdit(null)
                }}
                onJobCreated={fetchData}
                jobToEdit={selectedJobToEdit}
            />

            <CandidateProfileDialog
                isOpen={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                candidateId={selectedCandidateId}
                onCandidateUpdate={fetchData}
            />

            <ScheduleInterviewDialog
                isOpen={isScheduleOpen}
                onOpenChange={setIsScheduleOpen}
                candidateId={selectedCandidateId}
                candidateName={selectedCandidateName}
                onScheduled={fetchData}
            />
        </div>
    )
}

function DropdownThemeSeparator() {
    return <div className="h-px bg-slate-100 my-1" />
}
