"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Esquema de validación
const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  organization: z.string().min(2, { message: "La organización debe tener al menos 2 caracteres" }),
  contact: z.string().min(5, { message: "El contacto debe tener al menos 5 caracteres" }),
  purpose: z.string().min(10, { message: "Por favor, describe el propósito de la descarga" }),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar los términos y condiciones" }),
  }),
})

export type AnonymousUserData = z.infer<typeof formSchema>

interface AnonymousDownloadFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AnonymousUserData) => void
  documentTitle: string
  loading?: boolean
}

export function AnonymousDownloadForm({
  isOpen,
  onClose,
  onSubmit,
  documentTitle,
  loading = false,
}: AnonymousDownloadFormProps) {
  const [showTermsWarning, setShowTermsWarning] = useState(false)

  const form = useForm<AnonymousUserData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      organization: "",
      contact: "",
      purpose: "",
      acceptTerms: false,
    },
  })

  const handleSubmit = (data: AnonymousUserData) => {
    onSubmit(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Información requerida para la descarga</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Descarga controlada</AlertTitle>
            <AlertDescription>
              Para descargar "{documentTitle}", necesitamos registrar su información. Esto nos ayuda a mantener un
              control sobre quién accede a nuestros documentos.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese su nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organización</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de su organización o empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Información de contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Email o número de teléfono" {...field} />
                    </FormControl>
                    <FormDescription>
                      Esta información podría ser utilizada para verificar su identidad si es necesario.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propósito de la descarga</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa brevemente para qué utilizará este documento"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Términos y condiciones</h4>
                <p className="text-sm text-muted-foreground mb-2">Al descargar este documento, usted acepta:</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mb-3">
                  <li>No distribuir este documento sin autorización</li>
                  <li>No modificar el contenido del documento</li>
                  <li>Utilizar el documento únicamente para los fines declarados</li>
                  <li>Que su información de descarga quedará registrada en nuestro sistema</li>
                </ul>
                <div className="flex items-center">
                  <Link
                    href="/terms-and-conditions"
                    target="_blank"
                    className="text-sm text-primary flex items-center hover:underline"
                  >
                    Ver términos y condiciones completos
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked)
                          setShowTermsWarning(!checked && form.formState.isSubmitted)
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Acepto los términos y condiciones para la descarga y uso de este documento</FormLabel>
                      {showTermsWarning && (
                        <p className="text-sm text-destructive">Debes aceptar los términos para continuar</p>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Procesando..." : "Descargar documento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
