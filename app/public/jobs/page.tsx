"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, MapPin, Clock, ArrowRight, Building2, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    companies: { name: string; logo_url: string | null } | null
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
                    departments:department_id(name),
                    companies:company_id(name, logo_url)
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
        job.departments?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.companies?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Section */}
            <div className="bg-slate-900 text-white py-24 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>

                <div className="relative z-10 max-w-5xl mx-auto space-y-6">
                    <Badge variant="outline" className="text-indigo-200 border-indigo-400/30 px-4 py-1.5 text-sm backdrop-blur-sm bg-indigo-900/10">
                        Oportunidades Laborales
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                        Encuentra tu próximo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">gran desafío</span>
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Explora vacantes exclusivas en las mejores empresas y da el siguiente paso en tu carrera profesional.
                    </p>

                    <div className="relative max-w-2xl mx-auto mt-10 shadow-2xl shadow-indigo-500/20 rounded-full">
                        <Search className="absolute left-5 top-5 h-6 w-6 text-slate-400" />
                        <Input
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-slate-300 pl-14 py-8 rounded-full text-lg focus-visible:ring-indigo-400 focus-visible:bg-white/20 transition-all"
                            placeholder="Busca por puesto, empresa o departamento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Briefcase className="h-7 w-7 text-indigo-600" />
                            Vacantes Recientes
                        </h2>
                        <p className="text-slate-500 mt-2 text-lg">Descubre las últimas oportunidades publicadas.</p>
                    </div>
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                        {filteredJobs.length} Resultados
                    </span>
                </div>

                {loading ? (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-8 rounded-2xl border space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 mb-6 border border-slate-200">
                            <Building2 className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Sin vacantes disponibles</h3>
                        <p className="text-slate-500 mt-3 max-w-sm mx-auto">Actualmente no hay ofertas que coincidan con tu búsqueda. Intenta otros términos o vuelve pronto.</p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {filteredJobs.map(job => (
                            <Card key={job.id} className="group relative overflow-hidden border-slate-200/60 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 rounded-2xl bg-white flex flex-col">
                                <CardHeader className="p-6 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-12 w-12 border shadow-sm rounded-xl">
                                                <AvatarImage src={job.companies?.logo_url || ''} alt={job.companies?.name} className="object-contain p-1" />
                                                <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold rounded-xl">
                                                    {job.companies?.name ? job.companies.name.substring(0, 2).toUpperCase() : <Building2 className="h-5 w-5" />}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{job.companies?.name || 'Empresa Confidencial'}</p>
                                                <span className="text-xs text-slate-500 block">{new Date(job.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                                            {job.departments?.name || 'General'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight h-[3.5rem]">
                                        {job.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-2 flex-grow">
                                    <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            {job.location}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span className="capitalize">{job.type}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 pt-0 border-t border-slate-50 mt-auto bg-slate-50/50 group-hover:bg-white transition-colors">
                                    <Button asChild className="w-full bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-900 hover:text-white transition-all group-hover:border-slate-900 mt-4 rounded-xl h-11">
                                        <Link href={`/public/jobs/${job.id}`} className="flex items-center justify-center">
                                            Ver Vacante
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
