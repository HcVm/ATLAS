"use client"

import type * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale" // Importamos el locale español

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = es, // Establecemos español como locale por defecto
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-3 select-none", className)} // Añadimos select-none para evitar selección de texto
      classNames={{
        months: "flex flex-col space-y-4", // Simplificamos para evitar problemas de layout
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center px-10", // Añadimos px-10 para dar espacio a los botones
        caption_label: "text-sm font-medium text-center flex-1", // Centramos el texto y usamos flex-1
        nav: "flex items-center absolute inset-0 justify-between", // Posicionamiento absoluto para los botones
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-75 hover:opacity-100 border-0", // Quitamos bordes y mejoramos hover
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "w-9 text-[0.8rem] font-normal text-muted-foreground text-center", // Centramos el texto
        row: "flex w-full mt-1", // Reducimos el margen superior
        cell: cn(
          "relative w-9 h-9 p-0 text-center focus-within:relative focus-within:z-20",
          // Simplificamos los selectores para evitar problemas
          "first:rounded-l-md last:rounded-r-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground", // Mejoramos hover
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
