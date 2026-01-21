"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Download, Filter, CalendarCheck, AlertCircle, ChevronLeft, ChevronRight, Calculator, Calendar as CalendarIcon, User } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format, parseISO, startOfWeek, endOfWeek, addDays, isSameDay, subWeeks, addWeeks, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type AttendanceRecord = {
    id: string
    user_id: string
    attendance_date: string
    check_in_time: string | null
    check_out_time: string | null
    lunch_start_time: string | null
    lunch_end_time: string | null
    worked_hours: number | null
    is_late: boolean | null
    late_minutes: number | null
    notes: string | null
    profiles?: {
        full_name: string
        avatar_url: string | null
        email: string
    } | null
}

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date()) // Default to today

    // Calculate start and end of the currently viewed week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })   // Sunday

    useEffect(() => {
        async function fetchAttendance() {
            try {
                setLoading(true)

                // Fetch records for the entire week range
                const { data: attendanceData, error } = await supabase
                    .from("attendance")
                    .select("*")
                    .gte("attendance_date", format(weekStart, "yyyy-MM-dd"))
                    .lte("attendance_date", format(weekEnd, "yyyy-MM-dd"))
                    .order("check_in_time", { ascending: true })

                if (error) throw error

                if (!attendanceData || attendanceData.length === 0) {
                    setAttendance([])
                    return
                }

                // Extract unique user IDs
                const userIds = [...new Set(attendanceData.map(r => r.user_id))]

                // Fetch profiles
                const { data: profilesData } = await supabase
                    .from("profiles")
                    .select("id, full_name, avatar_url, email")
                    .in("id", userIds)

                const profilesMap = new Map(profilesData?.map(p => [p.id, p]))

                // Merge data
                const mergedData = attendanceData.map(record => ({
                    ...record,
                    profiles: profilesMap.get(record.user_id) || null
                }))

                setAttendance(mergedData)
            } catch (error) {
                console.error("Error fetching attendance:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAttendance()
    }, [currentDate]) // Re-fetch when week changes

    const formatTime = (timeString: string | null) => {
        if (!timeString) return "--:--"
        try {
            return format(parseISO(timeString), "HH:mm")
        } catch {
            return "--:--"
        }
    }

    // Generate array of 7 days for the cards
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

    // Filter attendance for the list view (either selected day or all week)
    const filteredAttendance = selectedDay
        ? attendance.filter(r => isSameDay(parseISO(r.attendance_date), selectedDay))
        : attendance

    // Helper to get stats for a specific day
    const getDayStats = (date: Date) => {
        const records = attendance.filter(r => isSameDay(parseISO(r.attendance_date), date))
        const total = records.length
        const late = records.filter(r => r.is_late).length
        const onTime = total - late
        // Explicitly cast to number to fix type error if records is empty or calculated values are NaN
        const punctuality = total > 0 ? Math.round((onTime / total) * 100) : 0

        return { total, late, onTime, punctuality }
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Registro de Asistencia</h1>
                    <p className="text-muted-foreground">
                        Semana del {format(weekStart, "d 'de' MMMM", { locale: es })} al {format(weekEnd, "d 'de' MMMM", { locale: es })}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs font-medium">
                        Hoy
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Week Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {weekDays.map((date) => {
                    const stats = getDayStats(date)
                    const isSelected = selectedDay && isSameDay(date, selectedDay)
                    const isToday = isSameDay(date, new Date())

                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => setSelectedDay(isSelected ? null : date)}
                            className={cn(
                                "relative flex flex-col p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                                isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105 z-10"
                                    : "bg-card text-card-foreground hover:bg-accent/50",
                                isToday && !isSelected && "border-blue-500/50 ring-1 ring-blue-500/20"
                            )}
                        >
                            {/* Day Header */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <span className={cn("text-xs font-medium uppercase", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                        {format(date, "EEE", { locale: es })}
                                    </span>
                                    <span className="text-lg font-bold">
                                        {format(date, "d")}
                                    </span>
                                </div>
                                {stats.total > 0 && (
                                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full",
                                        isSelected ? "bg-white/20" : "bg-primary/10 text-primary"
                                    )}>
                                        {stats.total}
                                    </span>
                                )}
                            </div>

                            {/* Day Stats (only if data exists) */}
                            {stats.total > 0 ? (
                                <div className="space-y-1.5 mt-auto">
                                    <div className="flex justify-between text-[10px]">
                                        <span>Puntualidad</span>
                                        <span>{stats.punctuality}%</span>
                                    </div>
                                    <Progress value={stats.punctuality} className={cn("h-1", isSelected ? "bg-black/20" : "")} indicatorClassName={cn(isSelected ? "bg-white" : "bg-green-500")} />

                                    <div className="flex gap-2 text-[10px] mt-2 pt-2 border-t border-dashed border-gray-400/20">
                                        <span className={cn("flex items-center gap-1", isSelected ? "text-white/90" : "text-green-600")}>
                                            <Clock className="w-3 h-3" /> {stats.onTime}
                                        </span>
                                        {stats.late > 0 && (
                                            <span className={cn("flex items-center gap-1", isSelected ? "text-red-200" : "text-red-500")}>
                                                <AlertCircle className="w-3 h-3" /> {stats.late}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-auto pt-4 text-center">
                                    <span className={cn("text-[10px] italic", isSelected ? "text-white/50" : "text-muted-foreground/50")}>
                                        Sin registros
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Detail Table */}
            <Card className="border-none shadow-sm bg-transparent">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            {selectedDay
                                ? `Registros del ${format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}`
                                : "Todos los registros de la semana"}
                        </h2>
                    </div>

                    <div className="flex gap-2">
                        {/* Add actions here if needed */}
                    </div>
                </div>

                <div className="rounded-xl border bg-card">
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="text-sm text-muted-foreground">Cargando asistencia...</p>
                            </div>
                        </div>
                    ) : filteredAttendance.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center p-8 text-center">
                            <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">No hay registros</h3>
                            <p className="text-muted-foreground max-w-sm mt-1">
                                {selectedDay
                                    ? "No se encontraron marcaciones para el día seleccionado."
                                    : "No hay registros de asistencia para esta semana."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Colaborador</TableHead>
                                    <TableHead>Hora Entrada</TableHead>
                                    <TableHead>Inicio Almuerzo</TableHead>
                                    <TableHead>Fin Almuerzo</TableHead>
                                    <TableHead>Hora Salida</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Horas Trabajadas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAttendance.map((record) => (
                                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={record.profiles?.avatar_url || ""} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {record.profiles?.full_name?.substring(0, 2).toUpperCase() || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{record.profiles?.full_name || "Usuario Desconocido"}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {record.profiles?.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-green-500/10 text-green-600 rounded-md">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <span className="font-mono text-sm font-medium">
                                                    {formatTime(record.check_in_time)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {formatTime(record.lunch_start_time || null)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {formatTime(record.lunch_end_time || null)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-orange-500/10 text-orange-600 rounded-md">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <span className="font-mono text-sm font-medium text-muted-foreground">
                                                    {formatTime(record.check_out_time)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {record.is_late ? (
                                                <Badge variant="destructive" className="pl-1 pr-2 py-0.5 h-6 gap-1 font-normal">
                                                    <AlertCircle className="w-3 h-3 fill-current" />
                                                    <span>Tardanza ({record.late_minutes}m)</span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="pl-1 pr-2 py-0.5 h-6 gap-1 font-normal bg-green-50 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800">
                                                    <CalendarCheck className="w-3 h-3" />
                                                    <span>Puntual</span>
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex items-center gap-2 justify-end">
                                                <span className="font-bold text-sm tabular-nums">{record.worked_hours || "0.00"}</span>
                                                <span className="text-xs text-muted-foreground">hrs</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    )
}
