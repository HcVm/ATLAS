"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Users, TrendingUp, MapPin, AlertCircle, CheckCircle, Search, Download } from "lucide-react"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface AttendanceRecord {
  id: string
  user_id: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  lunch_start_time: string | null
  lunch_end_time: string | null
  is_late: boolean
  late_minutes: number
  worked_hours: number
  check_in_location?: string
  check_out_location?: string
  user_profile?: {
    full_name: string
    email: string
    role: string
    department_id: string
    departments: {
      name: string
    }
  }
}

interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  absentToday: number
  averageWorkHours: number
  punctualityRate: number
  lunchComplianceRate: number
  averageLunchDuration: number
  onTimeLunchStart: number
  onTimeLunchReturn: number
}

interface DepartmentStats {
  department: string
  present: number
  late: number
  absent: number
  total: number
  punctualityRate: number
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"]

export default function AttendancePage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    averageWorkHours: 0,
    punctualityRate: 0,
    lunchComplianceRate: 0,
    averageLunchDuration: 0,
    onTimeLunchStart: 0,
    onTimeLunchReturn: 0,
  })
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("today")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (user && selectedCompany) {
      loadAttendanceData()
    }
  }, [user, selectedCompany, selectedPeriod])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedDepartment, searchTerm])

  const loadAttendanceData = async () => {
    try {
      setLoading(true)

      const companyId = selectedCompany?.id
      if (!companyId) return

      // Calculate date range based on selected period
      let startDate: Date
      let endDate: Date = new Date()

      switch (selectedPeriod) {
        case "today":
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        case "week":
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case "month":
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case "quarter":
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 3)
          break
        default:
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
      }

      const startDateStr = format(startDate, "yyyy-MM-dd")
      const endDateStr = format(endDate, "yyyy-MM-dd")

      // Load attendance records first
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("company_id", companyId)
        .gte("attendance_date", startDateStr)
        .lte("attendance_date", endDateStr)
        .order("attendance_date", { ascending: false })

      if (attendanceError) {
        console.error("Error loading attendance data:", attendanceError)
        return
      }

      // Get unique user IDs from attendance records
      const userIds = [...new Set(attendanceData?.map((record) => record.user_id) || [])]

      // Load user profiles separately using correct column names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          department_id,
          departments!profiles_department_id_fkey(name)
        `)
        .in("id", userIds)
        .eq("company_id", companyId)

      if (profilesError) {
        console.error("Error loading profiles:", profilesError)
        return
      }

      // Create a map of id to profile for easy lookup
      const profilesMap = new Map()
      profilesData?.forEach((profile) => {
        profilesMap.set(profile.id, profile)
      })

      // Combine attendance data with profiles
      const processedAttendanceData = (attendanceData || []).map((record) => ({
        ...record,
        user_profile: profilesMap.get(record.user_id) || undefined,
        is_late: record.is_late || false,
        worked_hours: record.worked_hours || 0,
        late_minutes: record.late_minutes || 0,
        check_in_location: record.check_in_location || undefined,
        check_out_location: record.check_out_location || undefined,
      }))

      setAttendanceRecords(processedAttendanceData)
      calculateStats(processedAttendanceData)
      generateChartData(processedAttendanceData)
    } catch (error) {
      console.error("Error loading attendance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const today = format(new Date(), "yyyy-MM-dd")
    const todayRecords = records.filter((record) => record.attendance_date === today)

    const totalEmployees = todayRecords.length
    const presentToday = todayRecords.filter((record) => record.check_in_time).length
    const lateToday = todayRecords.filter((record) => record.is_late).length
    const absentToday = totalEmployees - presentToday

    const totalWorkHours = records
      .filter((record) => record.worked_hours > 0)
      .reduce((sum, record) => sum + record.worked_hours, 0)
    const averageWorkHours = records.length > 0 ? totalWorkHours / records.length : 0

    const punctualRecords = records.filter((record) => record.check_in_time && !record.is_late)
    const punctualityRate = records.length > 0 ? (punctualRecords.length / records.length) * 100 : 0

    const recordsWithLunch = records.filter((record) => record.lunch_start_time && record.lunch_end_time)

    // Calculate lunch compliance (start around 1:00 PM, return around 2:00 PM)
    let onTimeLunchStart = 0
    let onTimeLunchReturn = 0
    let totalLunchDuration = 0

    recordsWithLunch.forEach((record) => {
      if (record.lunch_start_time && record.lunch_end_time) {
        try {
          const lunchStart = parseISO(record.lunch_start_time)
          const lunchEnd = parseISO(record.lunch_end_time)

          // Check if lunch started between 12:58 PM and 1:15 PM (reasonable window)
          const startHour = lunchStart.getHours()
          const startMinute = lunchStart.getMinutes()
          if ((startHour === 12 && startMinute >= 58) || (startHour === 13 && startMinute <= 15)) {
            onTimeLunchStart++
          }

          // Check if lunch ended between 1:45 PM and 2:15 PM (reasonable window)
          const endHour = lunchEnd.getHours()
          const endMinute = lunchEnd.getMinutes()
          if ((endHour === 13 && endMinute >= 45) || (endHour === 14 && endMinute <= 15)) {
            onTimeLunchReturn++
          }

          // Calculate lunch duration in minutes
          const duration = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60)
          totalLunchDuration += duration
        } catch (error) {
          console.error("Error parsing lunch times:", error)
        }
      }
    })

    const lunchComplianceRate =
      recordsWithLunch.length > 0 ? ((onTimeLunchStart + onTimeLunchReturn) / (recordsWithLunch.length * 2)) * 100 : 0
    const averageLunchDuration = recordsWithLunch.length > 0 ? totalLunchDuration / recordsWithLunch.length : 0

    setStats({
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
      averageWorkHours,
      punctualityRate,
      lunchComplianceRate,
      averageLunchDuration,
      onTimeLunchStart,
      onTimeLunchReturn,
    })

    // Calculate department stats
    const deptStats: { [key: string]: DepartmentStats } = {}

    todayRecords.forEach((record) => {
      const deptName = record.user_profile?.departments?.name || "Sin departamento"
      if (!deptStats[deptName]) {
        deptStats[deptName] = {
          department: deptName,
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
          punctualityRate: 0,
        }
      }
      if (record.check_in_time) {
        deptStats[deptName].present++
        if (record.is_late) {
          deptStats[deptName].late++
        }
      }
    })

    Object.values(deptStats).forEach((dept) => {
      dept.absent = dept.total - dept.present
      dept.punctualityRate = dept.present > 0 ? ((dept.present - dept.late) / dept.present) * 100 : 0
    })

    setDepartmentStats(Object.values(deptStats))
  }

  const generateChartData = (records: AttendanceRecord[]) => {
    // Generate daily attendance chart data for the last 7 days
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = format(date, "yyyy-MM-dd")

      const dayRecords = records.filter((record) => record.attendance_date === dateStr)
      const present = dayRecords.filter((record) => record.check_in_time).length
      const late = dayRecords.filter((record) => record.is_late).length
      const onTime = present - late

      last7Days.push({
        date: format(date, "dd/MM"),
        "A tiempo": onTime,
        Tarde: late,
        Ausente: records.length - present,
      })
    }

    setChartData(last7Days)
  }

  const filterRecords = () => {
    let filtered = attendanceRecords

    if (selectedDepartment !== "all") {
      filtered = filtered.filter((record) => record.user_profile?.departments?.name === selectedDepartment)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.user_profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.user_profile?.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredRecords(filtered)
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "--:--"
    try {
      return format(parseISO(timeString), "HH:mm")
    } catch {
      return "--:--"
    }
  }

  const formatLunchDuration = (record: AttendanceRecord) => {
    if (!record.lunch_start_time || !record.lunch_end_time) return "--"
    try {
      const start = parseISO(record.lunch_start_time)
      const end = parseISO(record.lunch_end_time)
      const duration = (end.getTime() - start.getTime()) / (1000 * 60) // minutes
      const hours = Math.floor(duration / 60)
      const minutes = Math.floor(duration % 60)
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    } catch {
      return "--"
    }
  }

  const exportData = () => {
    // Simple CSV export functionality
    const csvContent = [
      [
        "Empleado",
        "Fecha",
        "Entrada",
        "Salida",
        "Inicio Almuerzo",
        "Regreso Almuerzo",
        "Duración Almuerzo",
        "Horas Trabajadas",
        "Tardanza",
        "Departamento",
      ].join(","),
      ...attendanceRecords.map((record) =>
        [
          record.user_profile?.full_name || "",
          record.attendance_date,
          formatTime(record.check_in_time),
          formatTime(record.check_out_time),
          formatTime(record.lunch_start_time),
          formatTime(record.lunch_end_time),
          formatLunchDuration(record),
          record.worked_hours.toFixed(2),
          record.is_late ? `${record.late_minutes} min` : "No",
          record.user_profile?.departments?.name || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `asistencia_${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Análisis de Asistencia</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitorea y analiza la asistencia de todos los empleados</p>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium dark:text-gray-300">{format(new Date(), "dd/MM/yyyy HH:mm")}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departmentStats.map((dept) => (
                <SelectItem key={dept.department} value={dept.department}>
                  {dept.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="records">Registros</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empleados Totales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Personal activo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Presentes Hoy</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEmployees > 0 ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1) : 0}% del
                  total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tardanzas Hoy</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.lateToday}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.presentToday > 0 ? ((stats.lateToday / stats.presentToday) * 100).toFixed(1) : 0}% de presentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntualidad</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.punctualityRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Promedio general</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cumplimiento Almuerzo</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.lunchComplianceRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Horarios apropiados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duración Promedio</CardTitle>
                <Clock className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{Math.round(stats.averageLunchDuration)}m</div>
                <p className="text-xs text-muted-foreground">Tiempo de almuerzo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salidas a Tiempo</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.onTimeLunchStart}</div>
                <p className="text-xs text-muted-foreground">Cerca de la 1:00 PM</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regresos a Tiempo</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.onTimeLunchReturn}</div>
                <p className="text-xs text-muted-foreground">Cerca de las 2:00 PM</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asistencia por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentStats.map((dept) => ({
                        name: dept.department,
                        value: dept.present,
                        total: dept.total,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value, payload }: any) => `${name}: ${value}/${payload.total}`}
                    >
                      {departmentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="A tiempo" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Tarde" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asistencia Diaria (Últimos 7 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="A tiempo" stackId="a" fill="#10b981" />
                    <Bar dataKey="Tarde" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Ausente" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Puntualidad</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "A tiempo", value: stats.presentToday - stats.lateToday },
                        { name: "Tarde", value: stats.lateToday },
                        { name: "Ausente", value: stats.absentToday },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value, percent }: any) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {departmentStats.map((dept) => (
              <Card key={dept.department}>
                <CardHeader>
                  <CardTitle className="text-lg">{dept.department}</CardTitle>
                  <CardDescription>{dept.total} empleados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="font-bold text-green-600">{dept.present}</div>
                      <div className="text-xs">Presentes</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <div className="font-bold text-yellow-600">{dept.late}</div>
                      <div className="text-xs">Tarde</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="font-bold text-red-600">{dept.absent}</div>
                      <div className="text-xs">Ausentes</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dept.punctualityRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Puntualidad</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Asistencia</CardTitle>
              <CardDescription>{attendanceRecords.length} registros encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {record.user_profile?.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{record.user_profile?.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {record.user_profile?.departments?.name} • {record.attendance_date}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">Entrada</div>
                        <div className="text-sm">{formatTime(record.check_in_time)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Salida</div>
                        <div className="text-sm">{formatTime(record.check_out_time)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Almuerzo</div>
                        <div className="text-sm">
                          {record.lunch_start_time ? formatTime(record.lunch_start_time) : "--:--"}
                          {" - "}
                          {record.lunch_end_time ? formatTime(record.lunch_end_time) : "--:--"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Duración</div>
                        <div className="text-sm">{formatLunchDuration(record)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Horas</div>
                        <div className="text-sm">{record.worked_hours.toFixed(1)}h</div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {record.is_late && (
                          <Badge variant="destructive" className="text-xs">
                            {record.late_minutes} min tarde
                          </Badge>
                        )}
                        {record.lunch_start_time && record.lunch_end_time && (
                          <Badge variant="secondary" className="text-xs">
                            {(() => {
                              try {
                                const start = parseISO(record.lunch_start_time!)
                                const end = parseISO(record.lunch_end_time!)
                                const startHour = start.getHours()
                                const startMinute = start.getMinutes()
                                const endHour = end.getHours()
                                const endMinute = end.getMinutes()

                                const onTimeStart =
                                  (startHour === 12 && startMinute >= 58) || (startHour === 13 && startMinute <= 15)
                                const onTimeEnd =
                                  (endHour === 13 && endMinute >= 45) || (endHour === 14 && endMinute <= 15)

                                if (onTimeStart && onTimeEnd) return "Almuerzo OK"
                                if (onTimeStart) return "Salida OK"
                                if (onTimeEnd) return "Regreso OK"
                                return "Fuera de horario"
                              } catch {
                                return "Error"
                              }
                            })()}
                          </Badge>
                        )}
                        {record.check_in_location && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            Ubicación
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
