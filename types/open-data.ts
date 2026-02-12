export interface OpenDataCatalog {
    id: string
    name: string
    description: string
    color: string
    icon: string
    full_name: string
    status: 'active' | 'inactive'
    created_at?: string
}

export interface SystemConfig {
    key: string
    value: string
    description?: string
    updated_at?: string
}

export const CATALOG_ICONS = [
    { icon: "🪑", label: "Mobiliario" },
    { icon: "🔧", label: "Herramientas" },
    { icon: "🧹", label: "Limpieza" },
    { icon: "🏠", label: "Hogar" },
    { icon: "🌱", label: "Jardinería" },
    { icon: "💻", label: "Tecnología" },
    { icon: "🚗", label: "Vehículos" },
    { icon: "🏥", label: "Salud" },
    { icon: "📚", label: "Libros/Papelería" },
    { icon: "📦", label: "Paquetería" },
]

export const CATALOG_COLORS = [
    { label: "Azul", value: "from-blue-500 to-cyan-500" },
    { label: "Indigo", value: "from-blue-600 to-indigo-600" },
    { label: "Ámbar", value: "from-amber-500 to-orange-500" },
    { label: "Esmeralda", value: "from-emerald-500 to-green-600" },
    { label: "Turquesa", value: "from-teal-500 to-emerald-500" },
    { label: "Rojo", value: "from-orange-500 to-red-500" },
    { label: "Púrpura", value: "from-purple-500 to-indigo-500" },
    { label: "Rosa", value: "from-pink-500 to-rose-500" },
]
