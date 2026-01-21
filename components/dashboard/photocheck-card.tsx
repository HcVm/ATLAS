"use client"

import { motion } from "framer-motion"
import { Building2, Mail, QrCode, Camera, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PhotocheckCardProps {
    user: any
    profile: {
        full_name: string
        email: string
        avatar_url: string
        phone?: string
    }
    department?: {
        name: string
    } | null
    selectedCompany?: {
        name: string
    } | null
    showUploadButton?: boolean
    onUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
    uploading?: boolean
    className?: string
    compact?: boolean
}

export function PhotocheckCard({
    user,
    profile,
    department,
    selectedCompany,
    showUploadButton = false,
    onUpload,
    uploading = false,
    className = "",
    compact = false,
}: PhotocheckCardProps) {
    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return (
                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm border-0">
                        ADMINISTRADOR
                    </Badge>
                )
            case "supervisor":
                return (
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm border-0">
                        SUPERVISOR
                    </Badge>
                )
            case "user":
                return (
                    <Badge
                        variant="secondary"
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-0"
                    >
                        USUARIO
                    </Badge>
                )
            default:
                return <Badge variant="outline">{role?.toUpperCase() || "USUARIO"}</Badge>
        }
    }

    if (!user) return null

    return (
        <div className={`w-full ${className}`}>
            <motion.div
                className="relative rounded-[24px] overflow-hidden bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 h-full"
                whileHover={{ y: compact ? 0 : -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {/* Badge Slot Hole - Only show if not compact */}
                {!compact && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-800 z-20" />
                )}

                {/* Header Gradient */}
                <div className={`${compact ? 'h-24' : 'h-32'} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden transition-all`}>
                    <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-30 mix-blend-overlay" />

                    {/* Branding */}
                    <div className={`absolute ${compact ? 'top-6' : 'top-8'} w-full text-center transition-all`}>
                        <p className="text-white/80 text-xs font-bold tracking-[0.2em] uppercase">Atlas System</p>
                        <p className="text-white text-lg font-bold tracking-tight">
                            {selectedCompany?.name || "Atlas Enterprise"}
                        </p>
                    </div>
                </div>

                {/* Avatar Section */}
                <div className={`relative px-8 ${compact ? 'pb-6' : 'pb-8'} pt-0 flex flex-col items-center`}>
                    <div className={`relative ${compact ? '-mt-12 mb-3' : '-mt-16 mb-4'} transition-all`}>
                        <div className="p-1 rounded-full bg-white dark:bg-slate-950 shadow-xl">
                            <Avatar className={`${compact ? 'h-24 w-24' : 'h-32 w-32'} border-4 border-slate-50 dark:border-slate-900 transition-all`}>
                                <AvatarImage src={profile.avatar_url || "/placeholder.svg"} className="object-cover" />
                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-4xl">
                                    {profile.full_name
                                        ? profile.full_name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                        : "U"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {/* Active Status Dot */}
                        <div
                            className={`absolute bottom-2 right-2 ${compact ? 'h-5 w-5' : 'h-6 w-6'} rounded-full bg-emerald-500 border-4 border-white dark:border-slate-950 transition-all`}
                            title="Activo"
                        />
                    </div>

                    <div className={`text-center space-y-1 w-full ${compact ? 'mb-4' : 'mb-6'} transition-all`}>
                        <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-white leading-tight`}>
                            {profile.full_name}
                        </h2>
                        <div className="flex justify-center pt-1">{getRoleBadge(user.role)}</div>
                        <div className="flex justify-center items-center gap-1.5 pt-2 text-xs text-slate-500 dark:text-slate-400 font-medium opacity-80">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                                Miembro desde{" "}
                                {format(new Date(user.created_at || new Date()), "MMM yyyy", { locale: es })}
                            </span>
                        </div>
                    </div>

                    <div className="w-full space-y-3">
                        <div className={`flex items-center gap-3 ${compact ? 'p-2.5' : 'p-3'} rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50`}>
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                    Departamento
                                </p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate text-sm">
                                    {department?.name || "Sin Asignar"}
                                </p>
                            </div>
                        </div>

                        <div className={`flex items-center gap-3 ${compact ? 'p-2.5' : 'p-3'} rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50`}>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                    Email
                                </p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate text-xs sm:text-sm">
                                    {profile.email}
                                </p>
                            </div>
                        </div>

                        <div className={`flex items-center gap-3 ${compact ? 'p-2.5' : 'p-3'} rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50`}>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                <QrCode className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                    ID Usuario
                                </p>
                                <p className="font-mono font-medium text-slate-700 dark:text-slate-200 truncate text-xs">
                                    {user.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Barcode Mockup */}
                    <div className={`${compact ? 'mt-4 pt-4' : 'mt-8 pt-6'} border-t border-dashed border-slate-200 dark:border-slate-800 w-full flex flex-col items-center`}>
                        <div
                            className="h-12 w-4/5 bg-slate-900 dark:bg-white opacity-80"
                            style={{
                                maskImage:
                                    "repeating-linear-gradient(90deg, black, black 2px, transparent 2px, transparent 5px)",
                            }}
                        />
                        <p className="text-[10px] text-slate-400 font-mono mt-2 tracking-[0.2em]">
                            {user.id.substring(0, 18).toUpperCase()}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Optional Upload Button for Profile Page */}
            {showUploadButton && onUpload && (
                <div className="text-center mt-6">
                    <input
                        type="file"
                        id="avatar-upload-card"
                        accept="image/*"
                        onChange={onUpload}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        className="w-full gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => document.getElementById("avatar-upload-card")?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                        ) : (
                            <Camera className="h-4 w-4" />
                        )}
                        Cambiar Foto
                    </Button>
                </div>
            )}
        </div>
    )
}
