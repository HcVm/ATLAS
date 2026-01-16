"use client"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface RequestFormFieldsProps {
  form: any
  requestType: string
}

const inputClasses = "bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-900/80"

export function RequestFormFields({ form, requestType }: RequestFormFieldsProps) {
  return (
    <>
      {/* Common Fields */}
      <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Asunto</FormLabel>
            <FormControl>
              <Input placeholder="Resumen breve de tu solicitud" {...field} className={inputClasses} />
            </FormControl>
            <FormDescription className="text-slate-500 dark:text-slate-400">Un título descriptivo para tu solicitud</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Descripción</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe detalladamente tu solicitud"
                className={`min-h-[100px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormDescription className="text-slate-500 dark:text-slate-400">Proporciona todos los detalles relevantes</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Type-specific fields would be rendered here based on requestType */}
      {requestType === "late_justification" && <LateJustificationFields form={form} />}

      {requestType === "absence_justification" && <AbsenceJustificationFields form={form} />}

      {requestType === "overtime_request" && <OvertimeRequestFields form={form} />}

      {requestType === "permission_request" && <PermissionRequestFields form={form} />}

      {requestType === "equipment_request" && <EquipmentRequestFields form={form} />}

      {requestType === "general_request" && <GeneralRequestFields form={form} />}
    </>
  )
}

function LateJustificationFields({ form }: { form: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="incident_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Fecha de la Tardanza</FormLabel>
              <FormControl>
                <Input type="date" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="incident_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Hora de Llegada</FormLabel>
              <FormControl>
                <Input type="time" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Motivo de la Tardanza</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explica el motivo de tu tardanza"
                className={`min-h-[80px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

function AbsenceJustificationFields({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="incident_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Fecha de la Ausencia</FormLabel>
            <FormControl>
              <Input type="date" {...field} className={inputClasses} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Motivo de la Ausencia</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explica el motivo de tu ausencia"
                className={`min-h-[80px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="medical_certificate"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-slate-700 dark:text-slate-300">Tengo certificado médico disponible</FormLabel>
              <FormDescription className="text-slate-500 dark:text-slate-400">
                Marca esta casilla si tienes un certificado médico que respalda tu ausencia
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </>
  )
}

function OvertimeRequestFields({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="work_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Fecha del Trabajo Extra</FormLabel>
            <FormControl>
              <Input type="date" {...field} className={inputClasses} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Hora de Inicio</FormLabel>
              <FormControl>
                <Input type="time" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Hora de Fin</FormLabel>
              <FormControl>
                <Input type="time" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hours_worked"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Horas Trabajadas</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  {...field}
                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  className={inputClasses}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Motivo del Trabajo Extra</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explica por qué fue necesario trabajar horas extras"
                className={`min-h-[80px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

function  PermissionRequestFields({ form }: { form: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Fecha de Inicio</FormLabel>
              <FormControl>
                <Input type="date" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Fecha de Fin</FormLabel>
              <FormControl>
                <Input type="date" {...field} className={inputClasses} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="permission_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Tipo de Permiso</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Selecciona el tipo de permiso" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="vacation">Vacaciones</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="medical">Médico</SelectItem>
                <SelectItem value="family">Familiar</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Motivo del Permiso</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explica el motivo de tu solicitud de permiso"
                className={`min-h-[80px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

function EquipmentRequestFields({ form }: { form: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="equipment_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Tipo de Equipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className={inputClasses}>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="computer">Computadora/Laptop</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="office_supplies">Suministros de Oficina</SelectItem>
                  <SelectItem value="tools">Herramientas</SelectItem>
                  <SelectItem value="furniture">Mobiliario</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 dark:text-slate-300">Cantidad</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                  className={inputClasses}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Prioridad</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Selecciona la prioridad" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="justification"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Justificación</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explica por qué necesitas este equipo/material"
                className={`min-h-[100px] resize-none ${inputClasses}`}
                {...field}
              />
            </FormControl>
            <FormDescription className="text-slate-500 dark:text-slate-400">
              Describe cómo este equipo/material mejorará tu productividad o resolverá un problema específico
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

function GeneralRequestFields({ form }: { form: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Categoría</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Selecciona la categoría" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="suggestion">Sugerencia</SelectItem>
                <SelectItem value="complaint">Queja</SelectItem>
                <SelectItem value="improvement">Mejora</SelectItem>
                <SelectItem value="question">Pregunta</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300">Prioridad</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Selecciona la prioridad" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}