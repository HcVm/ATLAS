"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, MapPin, Clock, ArrowRight, Building2, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

type Job = {
    id: string
    title: string
    department_id: string
    location: string
    type: string
    salary_min: number | null
    salary_max: number | null
    created_at: string
    departments: { name: string } | null
}

export default function PublicJobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchJobs()
    }, [])

    async function fetchJobs() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('job_postings')
                .select(`
                    id, 
                    title, 
                    location, 
                    type, 
                    salary_min, 
                    salary_max, 
                    created_at,
                    department_id,
                    departments:department_id(name)
                `)
                .eq('status', 'published')
                .order('created_at', { ascending: false })

            if (data) {
                // @ts-ignore
                setJobs(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.departments?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="bg-slate-900 text-white py-20 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        Únete a Nuestro Equipo
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
                        Estamos buscando talento excepcional para construir el futuro juntos.
                        Explora nuestras vacantes y encuentra tu próximo desafío.
                    </p>

                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <Input
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 pl-12 py-6 rounded-full focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-900"
                            placeholder="Buscar por puesto o departamento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-indigo-600" />
                        Vacantes Disponibles
                        <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-200 px-2 py-0.5 rounded-full">
                            {filteredJobs.length}
                        </span>
                    </h2>
                </div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-6 rounded-xl border space-y-4">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <div className="flex gap-2 pt-4">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                            <Building2 className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-medium text-slate-900">No hay vacantes por ahora</h3>
                        <p className="text-slate-500 mt-2">Vuelve a revisar más tarde o intenta con otra búsqueda.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredJobs.map(job => (
                            <Card key={job.id} className="hover:shadow-lg transition-all hover:border-indigo-200 group">
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                            {job.departments?.name || 'General'}
                                        </Badge>
                                        <span className="text-xs text-slate-400 font-medium">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl group-hover:text-indigo-600 transition-colors">
                                        {job.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            {job.location}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            {job.type}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full bg-slate-900 hover:bg-indigo-600 transition-colors">
                                        <Link href={`/public/jobs/${job.id}`}>
                                            Ver Detalle y Postular
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
