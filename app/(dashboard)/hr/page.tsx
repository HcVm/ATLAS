"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Calendar, Clock, Briefcase, ArrowRight, Upload, UserPlus, AlertCircle, CheckCircle, Clock as ClockIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
// Recharts imports for visual data
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type RecentDocument = {
    id: string
    name: string
    created_at: string
    profiles: {
        full_name: string
    } | null
}

type AttendanceStat = {
    name: string
    present: number
    late: number
}

export default function HumanResourcesPage() {
    const router = useRouter()
    const [stats, setStats] = useState({
        activeEmployees: 0,
        presentToday: 0,
        lateToday: 0,
        recentDocsCount: 0
    })

    const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
    const [attendanceData, setAttendanceData] = useState<AttendanceStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true)

                // 1. Employee Count
                const { count: activeEmployeesCount } = await supabase
                    .from("profiles")
                    .select("id", { count: 'exact', head: true })

                // 2. Attendance Today
                const todayStr = new Date().toISOString().split('T')[0]
                const { data: todayAttendance } = await supabase
                    .from("attendance")
                    .select("id, is_late")
                    .eq("attendance_date", todayStr)

                const presentCount = todayAttendance?.length || 0
                const lateCount = todayAttendance?.filter(r => r.is_late).length || 0

                // 3. Recent Documents (Last 5 with Uploader Name)
                const { data: docs } = await supabase
                    .from("hr_documents")
                    .select(`
                        id, 
                        name, 
                        created_at,
                        profiles:profile_id (full_name)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(5)

                // 4. Attendance Trends (Last 5 days)
                const last5Days = Array.from({ length: 5 }, (_, i) => {
                    const d = subDays(new Date(), 4 - i)
                    return d.toISOString().split('T')[0]
                })

                const { data: trendData } = await supabase
                    .from("attendance")
                    .select("attendance_date, is_late")
                    .gte("attendance_date", last5Days[0])
                    .lte("attendance_date", last5Days[4])

                const chartData = last5Days.map(date => {
                    const dayRecords = trendData?.filter(r => r.attendance_date === date) || []
                    return {
                        name: format(new Date(date), 'EEE', { locale: es }), // Lun, Mar...
                        present: dayRecords.length,
                        late: dayRecords.filter(r => r.is_late).length
                    }
                })

                setStats({
                    activeEmployees: activeEmployeesCount || 0,
                    presentToday: presentCount,
                    lateToday: lateCount,
                    recentDocsCount: docs?.length || 0 // Just showing total loaded here for now
                })

                // Fix types for profiles join
                const formattedDocs = (docs || []).map(d => ({
                    ...d,
                    profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
                })) as RecentDocument[]

                setRecentDocuments(formattedDocs)
                setAttendanceData(chartData)

            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Title Section */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    Panel de Recursos Humanos
                </h1>
                <p className="text-muted-foreground">
                    Resumen general y métricas clave de la organización.
                </p>
            </div>

            {/* Top Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Personal Activo</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : stats.activeEmployees}</div>
                        <p className="text-xs text-muted-foreground">Colaboradores registrados</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asistencia Hoy</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : stats.presentToday}</div>
                        <p className="text-xs text-muted-foreground">Empleados presentes</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tardanzas Hoy</CardTitle>
                        <ClockIcon className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : stats.lateToday}</div>
                        <p className="text-xs text-muted-foreground">Llegadas tarde registradas</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                        <FileText className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : recentDocuments.length}</div>
                        <p className="text-xs text-muted-foreground">Subidos últimamente</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid gap-6 md:grid-cols-7">

                {/* Left Column: Visuals & Lists (Span 5) */}
                <div className="md:col-span-5 space-y-6">

                    {/* Attendance Chart */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Tendencia de Asistencia (Últimos 5 días)</CardTitle>
                            <CardDescription>Comparativa de asistencia total vs tardanzas.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="present" name="Presentes" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Bar dataKey="late" name="Tardanzas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Recent Documents Table */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Documentos Recientes</CardTitle>
                            <CardDescription>Últimos archivos subidos al sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentDocuments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No hay actividad reciente.</p>
                                ) : (
                                    recentDocuments.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-50 p-2 rounded-full">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{doc.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        De: {doc.profiles?.full_name || "Desconocido"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">
                                                    {doc.created_at ? format(new Date(doc.created_at), "d MMM, p", { locale: es }) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Quick Actions & Navigation (Span 2) */}
                <div className="md:col-span-2 space-y-6">

                    {/* Module Interaction */}
                    <Card className="shadow-sm bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">Accesos Directos</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Button
                                className="w-full justify-start text-left h-auto py-3"
                                variant="outline"
                                onClick={() => router.push("/hr/personnel")}
                            >
                                <div className="bg-blue-100 p-2 rounded-md mr-3">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="font-semibold">Directorio</div>
                                    <div className="text-xs text-muted-foreground">Gestionar personal</div>
                                </div>
                            </Button>

                            <Button
                                className="w-full justify-start text-left h-auto py-3"
                                variant="outline"
                                onClick={() => router.push("/hr/attendance")}
                            >
                                <div className="bg-green-100 p-2 rounded-md mr-3">
                                    <Clock className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <div className="font-semibold">Asistencia</div>
                                    <div className="text-xs text-muted-foreground">Ver registros hoy</div>
                                </div>
                            </Button>

                            <Button
                                className="w-full justify-start text-left h-auto py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 border-slate-200"
                                variant="outline"
                                onClick={() => router.push("/hr/recruitment")}
                            >
                                <div className="bg-slate-100 p-2 rounded-md mr-3">
                                    <Briefcase className="h-5 w-5 text-slate-700" />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-700">Reclutamiento</div>
                                    <div className="text-xs text-muted-foreground">Gestionar vacantes</div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Stats or Alerts */}
                    <Card className="shadow-sm border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <CardTitle className="text-base">Atención Requerida</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 mt-2">
                                <li className="text-sm flex justify-between items-center">
                                    <span>Tardanzas hoy</span>
                                    <span className="font-bold text-red-600">{loading ? '-' : stats.lateToday}</span>
                                </li>
                                <li className="text-sm flex justify-between items-center">
                                    <span>Solicitudes pendientes</span>
                                    <span className="font-bold text-gray-800">0</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
