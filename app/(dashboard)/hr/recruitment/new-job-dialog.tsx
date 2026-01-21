"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

const formSchema = z.object({
    title: z.string().min(2, "El título debe tener al menos 2 caracteres"),
    department_id: z.string().min(1, "Selecciona un departamento"),
    location: z.string().min(2, "La ubicación es requerida"),
    type: z.string().min(1, "Selecciona el tipo de contrato"),
    salary_min: z.string().optional(), // We'll convert to number on submit
    salary_max: z.string().optional(),
    description: z.string().min(10, "La descripción debe ser más detallada"),
})

interface NewJobDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onJobCreated: () => void
}

export function NewJobDialog({ open, onOpenChange, onJobCreated, jobToEdit }: NewJobDialogProps & { jobToEdit?: any }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            location: "Lima, Híbrido",
            salary_min: "",
            salary_max: "",
            description: "",
        },
    })

    useEffect(() => {
        if (open) {
            fetchDepartments()
            if (jobToEdit) {
                form.reset({
                    title: jobToEdit.title,
                    department_id: jobToEdit.department_id,
                    location: jobToEdit.location,
                    type: jobToEdit.type,
                    salary_min: jobToEdit.salary_min?.toString() || "",
                    salary_max: jobToEdit.salary_max?.toString() || "",
                    description: jobToEdit.description,
                })
            } else {
                form.reset({
                    title: "",
                    location: "Lima, Híbrido",
                    salary_min: "",
                    salary_max: "",
                    description: "",
                    // Reset other fields if needed or let zod defaults handle it
                })
            }
        }
    }, [open, user, jobToEdit, form])

    async function fetchDepartments() {
        // Fallback to user.company_id if selectedCompanyId is not present
        const companyId = user?.selectedCompanyId || user?.company_id

        if (!companyId) {
            console.warn("No company ID found.")
            return
        }

        const { data, error } = await supabase
            .from('departments')
            .select('id, name')
            .eq('company_id', companyId) // Filter by company
            .order('name')

        if (error) {
            console.error("Error fetching departments:", error)
        }

        if (!error && data) {
            setDepartments(data)
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const companyId = user?.selectedCompanyId || user?.company_id

            if (!companyId) {
                toast({
                    title: "Error",
                    description: "No se encontró la empresa asociada.",
                    variant: "destructive",
                })
                return
            }

            const payload = {
                title: values.title,
                department_id: values.department_id,
                location: values.location,
                type: values.type,
                salary_min: values.salary_min ? Number(values.salary_min) : null,
                salary_max: values.salary_max ? Number(values.salary_max) : null,
                description: values.description,
                status: 'published',
                company_id: companyId
            }

            let error;

            if (jobToEdit) {
                const { error: updateError } = await supabase
                    .from('job_postings')
                    .update(payload)
                    .eq('id', jobToEdit.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('job_postings')
                    .insert(payload)
                error = insertError
            }

            if (error) throw error

            toast({
                title: jobToEdit ? "Vacante Actualizada" : "Vacante Publicada",
                description: jobToEdit ? "Los cambios han sido guardados." : "La vacante se ha creado y publicado exitosamente.",
            })

            if (!jobToEdit) form.reset()
            onOpenChange(false)
            onJobCreated()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudo guardar la vacante. Inténtalo de nuevo.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{jobToEdit ? "Editar Vacante" : "Publicar Nueva Vacante"}</DialogTitle>
                    <DialogDescription>
                        {jobToEdit ? "Modifica los detalles de la vacante existente." : "Crea una nueva oportunidad laboral. La vacante será visible inmediatamente."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título del Puesto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Senior Frontend Developer" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="department_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modalidad</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="full-time">Full-time</SelectItem>
                                                <SelectItem value="part-time">Part-time</SelectItem>
                                                <SelectItem value="contract">Contrato</SelectItem>
                                                <SelectItem value="internship">Prácticas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ubicación</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Lima, Remoto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="salary_min"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Salario Min (S/.)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="2500" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="salary_max"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Salario Max (S/.)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="3500" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción del Puesto</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe las responsabilidades y requerimientos..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-slate-900">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {jobToEdit ? "Guardar Cambios" : "Publicar Vacante"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
