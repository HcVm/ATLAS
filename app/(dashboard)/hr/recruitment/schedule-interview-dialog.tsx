"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface ScheduleInterviewDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    candidateId: string | null
    candidateName: string | null
    onScheduled: () => void
}

export function ScheduleInterviewDialog({
    isOpen,
    onOpenChange,
    candidateId,
    candidateName,
    onScheduled
}: ScheduleInterviewDialogProps) {
    const [date, setDate] = useState<Date>()
    const [time, setTime] = useState("10:00")
    const [loading, setLoading] = useState(false)

    async function handleSchedule() {
        if (!candidateId || !date || !time) return

        setLoading(true)

        // Construct the full notes string
        const meetingDate = format(date, "d 'de' MMMM, yyyy", { locale: es })
        const note = `Entrevista agendada para el: ${meetingDate} a las ${time} hrs.`

        try {
            // 1. Fetch current notes to append
            const { data: currentData, error: fetchError } = await supabase
                .from('job_applications')
                .select('notes')
                .eq('id', candidateId)
                .single()

            if (fetchError) throw fetchError

            const existingNotes = currentData?.notes || ''
            const newNotes = existingNotes ? `${existingNotes}\n\n[System]: ${note}` : `[System]: ${note}`

            // 2. Update stage and notes
            const { error } = await supabase
                .from('job_applications')
                .update({
                    stage: 'interview',
                    notes: newNotes
                })
                .eq('id', candidateId)

            if (error) throw error

            toast.success("Entrevista agendada", {
                description: `Se ha agendado la entrevista con ${candidateName} y actualizado su estado.`
            })

            onScheduled()
            onOpenChange(false)
            setDate(undefined)
            setTime("10:00")

        } catch (error) {
            console.error(error)
            toast.error("Error al agendar", {
                description: "No se pudo actualizar la información del candidato."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agendar Entrevista</DialogTitle>
                    <DialogDescription>
                        Selecciona fecha y hora para la entrevista con <span className="font-semibold text-foreground">{candidateName}</span>.
                        El candidato será movido automáticamente a la etapa de "Entrevista".
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Fecha</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date < new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid gap-2">
                        <Label>Hora</Label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="time"
                                className="pl-9"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSchedule} disabled={!date || !time || loading}>
                        {loading ? "Agendando..." : "Confirmar Entrevista"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
