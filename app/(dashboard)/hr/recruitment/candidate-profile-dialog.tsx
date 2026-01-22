"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Mail, Phone, MapPin, FileText, ExternalLink, Clock, Briefcase } from "lucide-react"
import { format } from "date-fns"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"

import { toast } from "@/components/ui/use-toast"

interface CandidateProfileDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    candidateId: string | null
    onCandidateUpdate?: () => void
}

type CandidateDetails = {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    avatar_url: string | null
    linkedin_url: string | null
    resume_url: string | null
    source: string | null
    notes: string | null // joined from applications
    stage: string | null
    applied_at: string | null
    job_title: string | null
    certiUrl?: string | null
}

export function CandidateProfileDialog({ isOpen, onOpenChange, candidateId, onCandidateUpdate }: CandidateProfileDialogProps) {
    const [candidate, setCandidate] = useState<CandidateDetails | null>(null)
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        if (isOpen && candidateId) {
            fetchCandidateDetails(candidateId)
        }
    }, [isOpen, candidateId])

    async function fetchCandidateDetails(id: string) {
        setLoading(true)
        // We need to fetch from job_applications to get the candidate info joined
        // The id passed here is actually the application_id (based on how the kanban is built), let's double check.
        // In RecuitmentPage, draggableId IS application_id.

        const { data, error } = await supabase
            .from('job_applications')
            .select(`
            id,
            stage,
            notes,
            applied_at,
            candidates!inner (
                id,
                first_name,
                last_name,
                email,
                phone,
                linkedin_url,
                resume_url,
                avatar_url,
                source
            ),
            job_postings!inner (
                title
            )
        `)
            .eq('id', id)
            .single()

        if (error) {
            console.error("Error fetching details:", error)
        } else if (data) {
            // Extract Certi URL logic
            let cleanNotes = data.notes || ''
            let extractedCertiUrl = null

            if (cleanNotes.includes('[CERTIFICADO ANTECEDENTES]:')) {
                const match = cleanNotes.match(/\[CERTIFICADO ANTECEDENTES\]: (https:\/\/[^\s]+)/);
                if (match) {
                    extractedCertiUrl = match[1]
                    // Remove the line from notes for display
                    cleanNotes = cleanNotes.replace(match[0], '').trim()
                }
            }

            setCandidate({
                id: data.candidates.id,
                first_name: data.candidates.first_name,
                last_name: data.candidates.last_name,
                email: data.candidates.email,
                phone: data.candidates.phone,
                avatar_url: data.candidates.avatar_url,
                linkedin_url: data.candidates.linkedin_url,
                resume_url: data.candidates.resume_url,
                source: data.candidates.source,
                notes: cleanNotes,
                stage: data.stage,
                applied_at: data.applied_at,
                // @ts-ignore
                job_title: data.job_postings?.title,
                certiUrl: extractedCertiUrl
            })
        }
        setLoading(false)
    }

    async function saveNotes() {
        if (!candidateId || !candidate) return
        setUpdating(true)
        try {
            // Re-append certiUrl if exists when saving to DB
            let notesToSave = candidate.notes || ''
            if (candidate.certiUrl) {
                notesToSave += `\n\n[CERTIFICADO ANTECEDENTES]: ${candidate.certiUrl}`
            }

            const { error } = await supabase
                .from('job_applications')
                .update({ notes: notesToSave })
                .eq('id', candidateId)

            if (error) throw error

            toast({
                title: "Notas actualizadas",
                description: "La información ha sido guardada correctamente."
            })

            if (onCandidateUpdate) {
                onCandidateUpdate()
            }

        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudieron guardar las notas.",
                variant: 'destructive'
            })
        } finally {
            setUpdating(false)
        }
    }

    async function handleStageChange(newStage: string) {
        if (!candidateId) return
        setUpdating(true)
        try {
            const { error } = await supabase
                .from('job_applications')
                .update({ stage: newStage })
                .eq('id', candidateId)

            if (error) throw error

            // Update local state to reflect change immediately (optional)
            if (candidate) {
                setCandidate({ ...candidate, stage: newStage })
            }

            if (onCandidateUpdate) {
                onCandidateUpdate()
            }

            const stageLabels: Record<string, string> = {
                'screening': 'En Revisión (Screening)',
                'interview': 'Entrevista',
                'rejected': 'Rechazado',
                'applied': 'Aplicado'
            }

            toast({
                title: "Estado actualizado",
                description: `El candidato ha sido movido a: ${stageLabels[newStage] || newStage}`,
                variant: newStage === 'rejected' ? 'destructive' : 'default'
            })

        } catch (err) {
            console.error("Error updating stage:", err)
            toast({
                title: "Error",
                description: "No se pudo actualizar el estado del candidato.",
                variant: "destructive"
            })
        } finally {
            setUpdating(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[85vh] p-0 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        Cargando perfil...
                    </div>
                ) : candidate ? (
                    <>
                        <div className="p-6 pb-0">
                            <DialogHeader className="mb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <Avatar className="h-20 w-20 border-4 border-slate-50 shadow-md">
                                            <AvatarImage src={candidate.avatar_url || ''} />
                                            <AvatarFallback className="text-2xl bg-slate-100 text-slate-500">
                                                {candidate.first_name[0]}{candidate.last_name[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <DialogTitle className="text-2xl font-bold text-slate-900">
                                                {candidate.first_name} {candidate.last_name}
                                            </DialogTitle>
                                            <DialogDescription className="text-slate-500 mt-1 flex items-center gap-2">
                                                <Briefcase className="h-3.5 w-3.5" />
                                                Postulante para <span className="font-medium text-slate-700">{candidate.job_title}</span>
                                            </DialogDescription>
                                            <div className="flex gap-2 mt-3">
                                                <Badge variant="outline" className="gap-1 bg-slate-50">
                                                    <Clock className="h-3 w-3" />
                                                    {candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString() : 'N/A'}
                                                </Badge>
                                                <Badge className={`
                                            capitalize
                                            ${candidate.stage === 'applied' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
                                            ${candidate.stage === 'screening' && 'bg-purple-100 text-purple-700 hover:bg-purple-200'}
                                            ${candidate.stage === 'interview' && 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
                                            ${candidate.stage === 'offer' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}
                                            ${candidate.stage === 'hired' && 'bg-slate-800 text-white'}
                                            ${candidate.stage === 'rejected' && 'bg-red-100 text-red-700 hover:bg-red-200'}
                                        `}>
                                                    {candidate.stage === 'rejected' ? 'Rechazado' : candidate.stage}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        <ScrollArea className="flex-1 px-8 py-6">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            Contacto
                                        </h4>
                                        <div className="space-y-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                <span>{candidate.email || 'No especificado'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                                <span>{candidate.phone || 'No especificado'}</span>
                                            </div>
                                            {candidate.linkedin_url && (
                                                <a
                                                    href={candidate.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-md hover:underline"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    Perfil de LinkedIn
                                                </a>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            Documentos
                                        </h4>
                                        {candidate.resume_url ? (
                                            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-red-500">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">Curriculum Vitae</p>
                                                            <p className="text-xs text-slate-500">Documento Principal</p>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                                                            Ver
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic">No hay CV adjunto</div>
                                        )}

                                        {/* Display Certi URL based on state */}
                                        {candidate.certiUrl && (
                                            <div className="mt-3 p-4 border border-slate-200 rounded-xl bg-orange-50/50 hover:bg-orange-50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-orange-500">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-900">Certificado</p>
                                                            <p className="text-xs text-slate-500">Antecedentes</p>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={candidate.certiUrl} target="_blank" rel="noopener noreferrer">
                                                            Ver
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section className="h-full flex flex-col">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            Notas Internas
                                        </h4>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <Textarea
                                                className="bg-yellow-50/50 border-yellow-100 min-h-[200px] resize-none focus-visible:ring-yellow-200 p-4"
                                                placeholder="Escribe notas sobre el candidato, razones de rechazo o puntos clave..."
                                                value={candidate.notes || ''}
                                                onChange={(e) => setCandidate({ ...candidate, notes: e.target.value })}
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={saveNotes}
                                                    disabled={updating}
                                                    className="text-xs h-8"
                                                >
                                                    Guardar Notas
                                                </Button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-6 border-t bg-slate-50">
                            <div className="flex w-full justify-between items-center">
                                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                                    Cerrar
                                </Button>
                                <div className="flex gap-2">
                                    {candidate.stage !== 'rejected' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="border-red-200 hover:bg-red-50 text-red-600"
                                                onClick={() => handleStageChange('rejected')}
                                                disabled={updating}
                                            >
                                                Rechazar
                                            </Button>

                                            {/* Only show 'Screening' option if not already there or further */}
                                            {candidate.stage === 'applied' && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleStageChange('screening')}
                                                    disabled={updating}
                                                >
                                                    Mover a Revisión
                                                </Button>
                                            )}
                                            <Button
                                                className="bg-slate-900"
                                                onClick={() => handleStageChange('interview')}
                                                disabled={updating}
                                            >
                                                Mover a Entrevista
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        No se encontró información del candidato.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
