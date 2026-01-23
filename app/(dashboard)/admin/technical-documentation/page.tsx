"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RoleGuard } from "@/components/role-guard"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Database,
    Layout,
    Server,
    Shield,
    FileText,
    Package,
    ShoppingCart,
    Users,
    MessageSquare,
    Globe,
    Code,
    Layers,
    Cpu,
    GitBranch,
    Lock,
    MapPin,
    DollarSign,
    AlertTriangle,
    Terminal,
    Ticket,
    LifeBuoy,
    FileCheck,
    ClipboardCheck,
    Calendar,
    ListTodo,
    Kanban,
    CheckCircle,
    Barcode,
    QrCode,
    Tag,
    Printer,
    Ruler,
    Sticker,
    Cloud,
    Rocket,
    Github
} from "lucide-react"
import { MermaidDiagram } from "@/components/ui/mermaid-diagram"
import Image from "next/image"

// --- Tech Logo Mapping ---
const techLogos: Record<string, string> = {
    "next.js": "/logostec/next-logo.png",
    "next.js 15": "/logostec/next-logo.png",
    "next.js 15 (app router)": "/logostec/next-logo.png",
    "supabase": "/logostec/supabase-logo.png",
    "supabase auth": "/logostec/supabase-logo.png",
    "supabase auth (ssr + middleware)": "/logostec/supabase-logo.png",
    "supabase realtime": "/logostec/supabase-logo.png",
    "supabase realtime client": "/logostec/supabase-logo.png",
    "supabase storage": "/logostec/supabase-logo.png",
    "postgresql": "/logostec/postgresql-logo.png",
    "postgresql 15+": "/logostec/postgresql-logo.png",
    "postgres": "/logostec/postgresql-logo.png",
    "tailwindcss": "/logostec/tailwind-logo.png",
    "tailwind": "/logostec/tailwind-logo.png",
    "framer motion": "/logostec/framer-motion-logo.png",
    "shadcn/ui": "/logostec/shad-cn-logo.png",
    "shadcn": "/logostec/shad-cn-logo.png",
    "radix": "/logostec/radix-ui-logo.png",
    "radix ui": "/logostec/radix-ui-logo.png",
    "vercel": "/logostec/vercel-logo.png",
    "github": "/logostec/github-logo.png",
    "github enterprise / pro": "/logostec/github-logo.png",
    "node.js": "/logostec/node-js-logo.png",
    "node.js (edge function capable)": "/logostec/node-js-logo.png",
    "gemini": "/logostec/gemini-logo.png",
    "gemini 2.0": "/logostec/gemini-logo.png",
    "gemini 2.0 flash": "/logostec/gemini-logo.png",
    "gemini 2.0 flash lite": "/logostec/gemini-logo.png",
    "google gemini": "/logostec/gemini-logo.png",
    "google gemini 2.0": "/logostec/gemini-logo.png",
    "puppeteer": "/logostec/puppeteer-logo.png",
    "puppeteer core": "/logostec/puppeteer-logo.png",
    "zod": "/logostec/zod-logo.png",
    "zod schemas": "/logostec/zod-logo.png",
    "jwt": "/logostec/jwt-logo.png",
    "@hello-pangea/dnd": "/logostec/hello-pangea-dnd-logo.png",
    "hello-pangea": "/logostec/hello-pangea-dnd-logo.png",
}

// Helper to find logo for a tech string
function findTechLogo(tech: string): string | null {
    const normalized = tech.toLowerCase().trim()
    return techLogos[normalized] || null
}

// Tech Stack data for the showcase
const techStackData = [
    { name: "Next.js 15", logo: "/logostec/next-logo.png", category: "Frontend" },
    { name: "Supabase", logo: "/logostec/supabase-logo.png", category: "Backend" },
    { name: "PostgreSQL", logo: "/logostec/postgresql-logo.png", category: "Database" },
    { name: "TailwindCSS", logo: "/logostec/tailwind-logo.png", category: "Styling" },
    { name: "Shadcn/UI", logo: "/logostec/shad-cn-logo.png", category: "Components" },
    { name: "Framer Motion", logo: "/logostec/framer-motion-logo.png", category: "Animation" },
    { name: "Vercel", logo: "/logostec/vercel-logo.png", category: "Deployment" },
    { name: "Google Gemini", logo: "/logostec/gemini-logo.png", category: "AI" },
    { name: "Puppeteer", logo: "/logostec/puppeteer-logo.png", category: "Scraping" },
    { name: "Zod", logo: "/logostec/zod-logo.png", category: "Validation" },
    { name: "Radix UI", logo: "/logostec/radix-ui-logo.png", category: "Primitives" },
    { name: "Node.js", logo: "/logostec/node-js-logo.png", category: "Runtime" },
]

// --- Data Definition ---

type TechLayer = {
    title: string
    icon: any
    items: { label: string; value: string | string[] }[]
    color: string
}

type DetailSection = {
    title: string
    content?: string
    type: 'text' | 'list' | 'code' | 'warning' | 'info'
    items?: string[]
    code?: string
}

type SubModule = {
    title: string
    description?: string
    mermaid?: string
    layers: {
        frontend: TechLayer
        backend: TechLayer
        database: TechLayer
    }
    details?: DetailSection[]
}

type SystemModule = {
    id: string
    name: string
    description: string
    icon: any
    mermaid?: string
    layers?: {
        frontend: TechLayer
        backend: TechLayer
        database: TechLayer
    }
    details?: DetailSection[]
    subModules?: SubModule[]
}

const modules: SystemModule[] = [
    {
        id: "core",
        name: "Arquitectura Principal (Core)",
        description: "Fundamentos tecnológicos, estructura del proyecto y estándares globales.",
        icon: Layout,
        subModules: [
            {
                title: "Tech Stack & Ecosystem",
                description: "Arquitectura Serverless basada en Next.js 15 App Router y Supabase.",
                mermaid: `
flowchart TD
    Client[Next.js Client] <-->|Server Actions| Server[Next.js Server]
    Server <-->|Postgres JS| DB[(Supabase Postgres)]
    Client <-->|WebSocket| Realtime[Supabase Realtime]
    Client <-->|Upload| Storage[Supabase Storage]
    Server <-->|AI SDK| Gemini[Google Gemini 2.0]
    
    subgraph Services
        PDF[pdf-lib]
        Scraper[Puppeteer Core]
    end
    Server --> PDF
    Server --> Scraper
                `,
                layers: {
                    frontend: {
                        title: "Frontend Core",
                        icon: Code,
                        color: "text-blue-500",
                        items: [
                            { label: "Framework", value: "Next.js 15 (App Router)" },
                            { label: "Components", value: "RSC (Server) vs Client" },
                            { label: "UI Lib", value: ["Shadcn/UI", "TailwindCSS", "Framer Motion"] }
                        ]
                    },
                    backend: {
                        title: "Backend Services",
                        icon: Server,
                        color: "text-indigo-500",
                        items: [
                            { label: "Runtime", value: "Node.js (Edge function capable)" },
                            { label: "Auth", value: "Supabase Auth (SSR + Middleware)" },
                            { label: "API", value: "Server Actions (Mutations)" }
                        ]
                    },
                    database: {
                        title: "Data Layer",
                        icon: Database,
                        color: "text-amber-500",
                        items: [
                            { label: "Engine", value: "PostgreSQL 15+" },
                            { label: "Security", value: "Row Level Security (RLS)" },
                            { label: "Types", value: "Generated (lib/database.types.ts)" }
                        ]
                    }
                }
            },
            {
                title: "Estructura del Proyecto",
                description: "Organización 'Feature-First' para escalabilidad y mantenimiento.",
                mermaid: `
graph TD
    Root[p:/ATLAS] --> App[app/]
    App --> Dash[dashboard/]
    App --> Api[api/]
    App --> Auth[auth/]
    
    Dash --> FeatA[warehouse/]
    Dash --> FeatB[sales/]
    
    FeatA --> Page[page.tsx]
    FeatA --> Layout[layout.tsx]
    FeatA --> Comp[components/]
    
    Root --> Lib[lib/]
    Root --> CompShared[components/ui/]
                `,
                layers: {
                    frontend: {
                        title: "Routing Strategy",
                        icon: MapPin,
                        color: "text-emerald-500",
                        items: [
                            { label: "Groups", value: "(dashboard) vs (auth) vs (presentation)" },
                            { label: "Naming", value: "kebab-case (files)" }
                        ]
                    },
                    backend: {
                        title: "Shared Logic",
                        icon: Layers,
                        color: "text-teal-600",
                        items: [
                            { label: "/lib", value: ["supabase.ts", "utils.ts", "services/"] },
                            { label: "/attributes", value: "Global Constants" }
                        ]
                    },
                    database: {
                        title: "Core Tables",
                        icon: CheckCircle,
                        color: "text-cyan-600",
                        items: [
                            { label: "Users", value: "profiles (Role, Dept, Company)" },
                            { label: "Orgs", value: "companies (Multitenancy)" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Principios de Diseño",
                        type: "list",
                        items: [
                            "Server Components por defecto para fetching.",
                            "Client Components solo para interactividad.",
                            "Colocación (Colocation) de componentes específicos cerca de sus páginas."
                        ]
                    }
                ]
            },
            {
                title: "Sistema de Diseño (ATLAS UI)",
                description: "Estándares visuales para mantener consistencia y experiencia premium.",
                mermaid: `
graph LR
    Tokens[Design Tokens] --> Components[Shadcn Primitives]
    Components --> Composites[Complex Widgets]
    Composites --> Pages[Page Views]
    
    style Tokens fill:#f9f,stroke:#333
    style Components fill:#bbf,stroke:#333
                `,
                layers: {
                    frontend: {
                        title: "Visual Language",
                        icon: Layout,
                        color: "text-pink-500",
                        items: [
                            { label: "Theme", value: "Dark/Light Mode aware" },
                            { label: "Effects", value: "Glassmorphism, Blurs" },
                            { label: "Font", value: "Inter / Sans-serif Variable" }
                        ]
                    },
                    backend: {
                        title: "Dynamic Assets",
                        icon: Package,
                        color: "text-rose-500",
                        items: [
                            { label: "Icons", value: "Lucide React" },
                            { label: "PDFs", value: "pdf-lib (Server Side Gen)" }
                        ]
                    },
                    database: {
                        title: "Access Control",
                        icon: Lock,
                        color: "text-slate-500",
                        items: [
                            { label: "RBAC", value: "Roles: Admin, Supervisor, User" },
                            { label: "Context", value: "auth-context (React)" }
                        ]
                    }
                }
            },
            {
                title: "Infraestructura & DevOps",
                description: "Pipeline de Integración Continua (CI/CD) y arquitectura Cloud Serverless.",
                mermaid: `
gitGraph
    commit
    commit
    branch feature/warehouse
    checkout feature/warehouse
    commit
    commit
    checkout main
    merge feature/warehouse
    commit tag: "v1.0.0"
                `,
                layers: {
                    frontend: {
                        title: "Vercel Deployment",
                        icon: Rocket,
                        color: "text-black dark:text-white",
                        items: [
                            { label: "Trigger", value: "Auto-deploy on Push to Main" },
                            { label: "Preview", value: "Epimeral Environments per PR" },
                            { label: "Domains", value: "SSL Automático (Edge Network)" }
                        ]
                    },
                    backend: {
                        title: "Supabase Integration",
                        icon: Cloud,
                        color: "text-emerald-500",
                        items: [
                            { label: "Connection", value: "Pooler (PgBouncer) Transaction Mode" },
                            { label: "Keys", value: "Anon (Public) vs Service Role (Admin)" },
                            { label: "Env", value: ".env.local (Sync with Vercel)" }
                        ]
                    },
                    database: {
                        title: "Git Workflow",
                        icon: Github,
                        color: "text-slate-700",
                        items: [
                            { label: "Repo", value: "GitHub Enterprise / Pro" },
                            { label: "Protection", value: "Branch Rules (Require PR Approval)" },
                            { label: "Scripts", value: "npm run gen:types (Type Sync)" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Variables de Entorno Críticas",
                        type: "warning",
                        content: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY son obligatorias. El servicio de impresión requiere configuración de WebUSB."
                    }
                ]
            }
        ]
    },
    {
        id: "auth",
        name: "Autenticación y Usuarios",
        description: "Sistema híbrido de autenticación (Supabase Auth) y autorización (RBAC personalizado en Profiles).",
        icon: Shield,
        mermaid: `
graph TD
    User((Usuario)) -->|Login UI| Auth[AuthContext]
    Auth -->|Credentials| SB[Supabase Auth]
    SB -->|JWT Session| Auth
    
    subgraph Client Protected
        Auth -->|Session Check| RoleGuard
        RoleGuard -->|Authorized| ProtectedPage
        RoleGuard -->|Unauthorized| LoginRedirect
    end
    
    subgraph Server Logic
        API[API Routes] -->|Cookies| SB_Server[auth.getUser]
        SB_Server -->|Valid| Execute
        SB_Server -->|Invalid| 401[Unauthorized]
    end
    
    subgraph Database
        SB -->|User ID| Profiles[public.profiles]
        Profiles -->|Role/Dept| RLS[RLS Policies]
    end
        `,
        layers: {
            frontend: {
                title: "Client-Side & State",
                icon: Layout,
                color: "text-blue-500",
                items: [
                    { label: "State Manager", value: "AuthContext (lib/auth-context.tsx)" },
                    { label: "Hook de Acceso", value: "useRoleAccess (hooks/use-role-access.ts)" },
                    { label: "Protección UI", value: ["<RoleGuard /> Wrapper", "Redirección Client-Side"] },
                    { label: "Features", value: ["Auto-creación de perfil", "Manejo de Company-Select"] }
                ]
            },
            backend: {
                title: "Server & API Logic",
                icon: Server,
                color: "text-indigo-500",
                items: [
                    { label: "Strategy", value: "No Middleware Global (Auth en Route Handlers)" },
                    { label: "Admin Bypass", value: "lib/supabase-admin.ts (Service Role Key)" },
                    { label: "API Routes", value: ["POST /api/users (Create)", "PUT /api/users/[id]"] },
                    { label: "Validación", value: "getUser() en cada request API" }
                ]
            },
            database: {
                title: "Database Schema (RLS)",
                icon: Database,
                color: "text-emerald-500",
                items: [
                    { label: "Auth Core", value: "auth.users (JWT Management)" },
                    { label: "Extensión", value: "public.profiles (Roles, Depts)" },
                    { label: "Security Policy", value: "RLS: Users view own data, Admins bypass via App Logic or Admin Client" },
                    { label: "Triggers", value: "on_auth_user_created (Auto Profile)" }
                ]
            }
        },
        details: [
            {
                title: "Matriz de Permisos (RBAC)",
                type: "list",
                items: [
                    "Admin: Acceso total (Supervision, Tasks, Reports, Settings).",
                    "Supervisor: Gestión operativa (Tasks, Employees, Reports), sin acceso a configuración global.",
                    "User: Acceso básico, restringido a sus propias tareas y registros."
                ]
            },
            {
                title: "Lógica de Hooks (useRoleAccess)",
                type: "code",
                content: "El hook centraliza la lógica de permisos para evitar condicionales dispersos en la UI.",
                code: `// hooks/use-role-access.tsx
const permissions = useMemo(() => {
  switch (role) {
    case "admin": return { canViewSupervision: true, ... }
    case "supervisor": return { canViewSupervision: true, canManageUsers: false ... }
    default: return { canViewSupervision: false ... }
  }
}, [user])`
            },
            {
                title: "Seguridad Crítica",
                type: "warning",
                content: "El sistema utiliza 'supabase-admin.ts' con la SERVICE_ROLE_KEY para operaciones administrativas privilegiadas (como crear usuarios sin invitación). Este archivo NUNCA debe ser importado en componentes de cliente."
            }
        ]
    },
    {
        id: "docs",
        name: "Gestión Documental",
        description: "Ciclo de vida de documentos, versiones y generación de códigos QR.",
        icon: FileText,
        mermaid: `
sequenceDiagram
    participant User
    participant UI as Create Doc UI
    participant API as /api/documents
    participant Storage as Supabase Storage
    participant DB as Postgres

    User->>UI: Rellena formulario + Adjunta PDF
    UI->>Storage: Sube archivo (uuid.pdf)
    Storage-->>UI: Retorna Public URL
    UI->>API: POST /create {meta, url}
    API->>API: Genera Código (EMP-202X-001)
    API->>DB: Insert Document Record
    DB-->>API: Success
    API-->>UI: Document Created
    UI->>User: Muestra Confirmación + QR
        `,
        layers: {
            frontend: {
                title: "Frontend Components",
                icon: Layout,
                color: "text-orange-500",
                items: [
                    { label: "Vistas", value: ["/documents", "/documentation"] },
                    { label: "Componentes", value: ["CreateDocumentForm", "QRCodeDisplay"] },
                    { label: "Libs", value: ["html5-qrcode", "jspdf"] }
                ]
            },
            backend: {
                title: "Server Logic",
                icon: Server,
                color: "text-red-500",
                items: [
                    { label: "Storage", value: "Bucket 'documents' (PDFs, Adjuntos)" },
                    { label: "Autonumeración", value: "Generación lógica de códigos (EMP-2024-001)" }
                ]
            },
            database: {
                title: "Data Schema",
                icon: Database,
                color: "text-yellow-500",
                items: [
                    { label: "Tablas", value: ["documents", "document_versions", "document_movements"] },
                    { label: "Triggers", value: "Actualización de timestamps y estados" }
                ]
            }
        },
        details: [
            {
                title: "Generación de Etiquetas (Stickers)",
                type: "list",
                items: [
                    "Librería: 'html2canvas' para rasterizar el componente React a PNG.",
                    "Formato: Optimizado para impresoras térmicas Brother/Dymo (62mm x 37mm).",
                    "QR: Generado en cliente usando paquete 'qrcode', encodea URL pública de rastreo."
                ]
            },
            {
                title: "Lógica de Impresión Térmica",
                type: "code",
                content: "Se inyecta CSS específico (@page size) en una ventana emergente para garantizar el ajuste perfecto sin diálogos de sistema nativos molestos.",
                code: `// components/documents/document-sticker-generator.tsx
const printSticker = () => {
  const printWindow = window.open("", "_blank")
  printWindow.document.write(\`
    <style>
      @page { size: 62mm 37mm; margin: 0; }
      .sticker { width: 62mm; height: 37mm; ... }
    </style>
  \`)
}`
            },
            {
                title: "Rastreo Público",
                type: "info",
                content: "Los documentos tienen un 'trackingHash' único que permite su consulta pública sin autenticación en '/public/document-tracking/[hash]', ideal para transparencia externa."
            }
        ]
    },
    {
        id: "warehouse",
        name: "Almacén e Inventario",
        description: "Gestión integral de inventario dividido en operaciones comerciales e internas.",
        icon: Package,
        subModules: [
            {
                title: "Almacén General (Comercial)",
                description: "Gestión de stock para venta y distribución comercial.",
                mermaid: `
stateDiagram-v2
    [*] --> Nuevo
    Nuevo --> EnStock: Registrar Ingreso
    EnStock --> Reservado: Orden de Venta
    Reservado --> Despachado: Confirmar Salida
    EnStock --> Baja: Ajuste Inventario
    Despachado --> [*]
    
    state "Validación de Stock" as Validacion
    Reservado --> Validacion: Check Availability
                `,
                layers: {
                    frontend: {
                        title: "Frontend Interaction",
                        icon: Layout,
                        color: "text-cyan-500",
                        items: [
                            { label: "Rutas", value: ["/warehouse", "/warehouse/inventory"] },
                            { label: "Componentes", value: ["ProductCard", "MovementHistory"] }
                        ]
                    },
                    backend: {
                        title: "Business Logic",
                        icon: Server,
                        color: "text-blue-600",
                        items: [
                            { label: "Validaciones", value: "Prevención de stock negativo" },
                            { label: "Reportes", value: "product-report-generator.ts (PDF)" }
                        ]
                    },
                    database: {
                        title: "Commercial Storage",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tablas Maestras", value: ["products", "categories"] },
                            { label: "Transaccional", value: ["inventory_movements"] }
                        ]
                    }
                }
            },
            {
                title: "Almacén Interno (Activos)",
                description: "Control de activos fijos, consumibles y asignación a personal.",
                mermaid: `
graph TD
    Asset((Activo Fijo)) -->|Registro| Store[Almacén Interno]
    Store -->|Asignar| Employee[Empleado]
    Store -->|Asignar| Dept[Departamento]
    Employee -->|Devolución| Store
    Employee -->|Reporte| Broken[Averiado/Baja]
    
    subgraph Ciclo de Vida
    Store -->|Depreciación| Finance[Contabilidad]
    end
                `,
                layers: {
                    frontend: {
                        title: "Internal Ops UI",
                        icon: Layout,
                        color: "text-indigo-500",
                        items: [
                            { label: "Rutas", value: ["/warehouse/internal", "/fixed-assets"] },
                            { label: "Componentes", value: ["AssetAssignmentModal", "InternalProductCard"] }
                        ]
                    },
                    backend: {
                        title: "Internal Logic",
                        icon: Server,
                        color: "text-violet-600",
                        items: [
                            { label: "Asignación", value: "Relación Activo-Empleado (M:N)" },
                            { label: "Códigos", value: "Generación de Series Internas (INT-XXX)" }
                        ]
                    },
                    database: {
                        title: "Internal Storage",
                        icon: Database,
                        color: "text-purple-500",
                        items: [
                            { label: "Tablas", value: ["internal_products", "fixed_assets", "asset_assignments"] }
                        ]
                    }
                },
                details: [
                    {
                        title: "Control de Activos Fijos",
                        type: "info",
                        content: "Módulo especializado para laptops, mobiliario y herramientas. Permite trazar quién tiene qué equipo en todo momento."
                    }
                ]
            }
        ]
    },
    {
        id: "sales",
        name: "Ventas y Cotizaciones",
        description: "Gestión avanzada de cotizaciones con motor de PDF en tiempo real.",
        icon: ShoppingCart,
        subModules: [
            {
                title: "Gestión Comercial",
                description: "Pipeline de ventas, rutas de entrega y administración de estados.",
                mermaid: `
stateDiagram-v2
    [*] --> Borrador
    Borrador --> Enviado: Enviar Proforma
    Enviado --> Aprobado: Confirmación Cliente
    Enviado --> Rechazado: Desistimiento
    Enviado --> Expirado: Vencimiento
    Aprobado --> [*]
    Rechazado --> Borrador: Renegociar
                `,
                layers: {
                    frontend: {
                        title: "Sales UI",
                        icon: Layout,
                        color: "text-indigo-500",
                        items: [
                            { label: "Rutas", value: ["/quotations"] },
                            { label: "Formularios", value: ["MultiProductQuotationForm"] }
                        ]
                    },
                    backend: {
                        title: "Business Logic",
                        icon: Server,
                        color: "text-blue-600",
                        items: [
                            { label: "Cálculos", value: "Autocalculadora de IGV y Totales" },
                            { label: "Validaciones", value: "Stock vs Cotizado" }
                        ]
                    },
                    database: {
                        title: "Sales DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tablas", value: ["quotations", "quotation_items"] },
                            { label: "Maestros", value: "companies, entities" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Inteligencia Logística (Google Maps)",
                        type: "info",
                        content: "Integración con Google Maps API para calcular rutas de entrega precisas desde el almacén hasta el cliente. El sistema almacena distancia (KM) y tiempo estimado para calcular costos de flete automáticamente."
                    }
                ]
            },
            {
                title: "Motor de PDFs",
                description: "Sistema de generación de documentos legales vectoriales.",
                mermaid: `
flowchart LR
    Component[React Template] -->|"@react-pdf"| Stream[PDF Stream]
    Stream -->|Blob| Action{Acción}
    Action -->|View| Browser[Vista Previa]
    Action -->|Save| Storage[Supabase Storage]
    Action -->|Print| Printer[Impresora]
                `,
                layers: {
                    frontend: {
                        title: "Render Engine",
                        icon: FileText,
                        color: "text-red-500",
                        items: [
                            { label: "Core", value: "@react-pdf/renderer" },
                            { label: "Componentes", value: "<Document>, <Page>, <View>" }
                        ]
                    },
                    backend: {
                        title: "Asset Management",
                        icon: Server,
                        color: "text-orange-600",
                        items: [
                            { label: "Recursos", value: "Fuentes Custom, Logos, Firmas" },
                            { label: "Templates", value: "Diseños por Tipo de Cliente (Gob/Priv)" }
                        ]
                    },
                    database: {
                        title: "Archivos",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Bucket", value: "quotation-documents" },
                            { label: "Public URL", value: "Acceso temporal firmado" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Personalización Multi-Empresa",
                        type: "list",
                        items: [
                            "El motor selecciona dinámicamente la plantilla base (Header, Footer, Colores) según la empresa emisora (ARM, GALUR, etc.).",
                            "Soporta lógica condicional para tipos de cliente: Gobierno (Detracciones, SIAF) vs Privado (Términos comerciales estándar).",
                            "Generación de hash único para validación de originalidad."
                        ]
                    },
                    {
                        title: "React-PDF Integration",
                        type: "code",
                        content: "Renderizado de documentos PDF usando componentes React puros para total control de diseño.",
                        code: `// components/quotations/quotation-pdf-generator.tsx
return (
  <Document>
    <Page size="A4" style={styles.page}>
      <Header company={company} />
      <ItemsTable items={items} /> 
      <TermsAndConditions />
    </Page>
  </Document>
)`
                    }
                ]
            },
            {
                title: "Cierre y Venta Real",
                description: "Conversión de cotizaciones aprobadas en ventas efectivas y órdenes de despacho.",
                mermaid: `
graph TD
    Approve[Cotización Aprobada] -->|Click| Convert[Convertir a Venta]
    Convert -->|Insert| SaleTable[Tabla Sales]
    Convert -->|Trigger| Move[Generar Salida Almacén]
    Move -->|Update| Stock[Descontar Stock]
    SaleTable -->|Sync| CRM[Panel de Ventas]
                `,
                layers: {
                    frontend: {
                        title: "Conversion UI",
                        icon: Layout,
                        color: "text-emerald-500",
                        items: [
                            { label: "Acciones", value: ["Botón 'Generar Venta'"] },
                            { label: "Vistas", value: ["/sales/orders"] }
                        ]
                    },
                    backend: {
                        title: "Transaction Services",
                        icon: Server,
                        color: "text-green-600",
                        items: [
                            { label: "ACID", value: "Transacción Atómica (Venta + Movimiento)" },
                            { label: "Integridad", value: "Snapshot de precios al cierre" }
                        ]
                    },
                    database: {
                        title: "Sales Records",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tablas", value: ["sales", "sale_items"] },
                            { label: "Logs", value: "status_history" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Garantía de Integridad",
                        type: "warning",
                        content: "Al cerrar una venta, el sistema captura una 'foto' de los precios y condiciones en ese instante, desvinculándose de futuros cambios en el catálogo de productos para mantener la consistencia contable."
                    }
                ]
            }
        ]
    },
    {
        id: "hr",
        name: "Recursos Humanos",
        description: "Suite integral de gestión de talento, asistencia biométrica/geo y nómina.",
        icon: Users,
        subModules: [
            {
                title: "Gestión de Personal (Directorio)",
                description: "Administración centralizada de legajos digitales y perfiles de empleados.",
                mermaid: `
stateDiagram-v2
    [*] --> Activo
    Activo --> Vacaciones: Solicitud
    Vacaciones --> Activo: Retorno
    Activo --> Suspendido: Sanción
    Suspendido --> Activo: Retorno
    Activo --> Cesado: Baja
    Cesado --> [*]
                `,
                layers: {
                    frontend: {
                        title: "Personnel UI",
                        icon: Layout,
                        color: "text-pink-500",
                        items: [
                            { label: "Rutas", value: ["/hr/personnel"] },
                            { label: "Vistas", value: ["ProfileView", "DocumentManager"] }
                        ]
                    },
                    backend: {
                        title: "File System",
                        icon: Server,
                        color: "text-rose-500",
                        items: [
                            { label: "Storage", value: "Buckets privados por empleado" },
                            { label: "Permisos", value: "Solo RRHH y Jefes ven detalles" }
                        ]
                    },
                    database: {
                        title: "Staff DB",
                        icon: Database,
                        color: "text-red-500",
                        items: [
                            { label: "Tablas", value: ["profiles", "employees"] },
                            { label: "Metadatos", value: "departments, positions" }
                        ]
                    }
                }
            },
            {
                title: "Control de Asistencia (Geo-Fencing)",
                description: "Registro de marca con validación de ubicación GPS en tiempo real.",
                mermaid: `
flowchart TD
    User((Usuario)) -->|1. Intento Check-in| App
    App -->|2. Captura GPS| Device[Navegador/App]
    Device -->|3. Lat/Lng| Server
    Server -->|4. Comparar| Office{¿En Rango?}
    Office -->|"Si (<50m)"| Success[Registrar Asistencia]
    Office -->|No| Error[Bloquear: Fuera de Rango]
    Success -->|Calc| Late{¿Tardanza?}
                `,
                layers: {
                    frontend: {
                        title: "Attendance UI",
                        icon: MapPin,
                        color: "text-fuchsia-500",
                        items: [
                            { label: "Hook", value: "useGeolocation" },
                            { label: "Maps", value: "Google Maps Static Embed" }
                        ]
                    },
                    backend: {
                        title: "Geo-Validation",
                        icon: Server,
                        color: "text-purple-600",
                        items: [
                            { label: "Algoritmo", value: "Haversine Distance" },
                            { label: "Config", value: "Radio variable por sede" }
                        ]
                    },
                    database: {
                        title: "Logs DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tablas", value: ["attendance_logs"] },
                            { label: "Vistas", value: "daily_attendance_summary" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Seguridad de Ubicación",
                        type: "warning",
                        content: "Se bloquean intentos con coordenadas 'cacheadas' o de baja precisión (>100m). La hora del registro es siempre la del servidor (UTC) para evitar manipulaciones de reloj local."
                    }
                ]
            },
            {
                title: "Reclutamiento (ATS)",
                description: "Sistema de seguimiento de candidatos y gestión de procesos de selección.",
                mermaid: `
stateDiagram-v2
    [*] --> Nuevo
    Nuevo --> Entrevista: Agendar
    Entrevista --> Evaluacion: Feedback
    Evaluacion --> Oferta: Seleccionado
    Evaluacion --> Rechazado: Descartado
    Oferta --> Contratado: Acepta
    Contratado --> [*]: Migrar a Personal
                `,
                layers: {
                    frontend: {
                        title: "Recruitment Board",
                        icon: Layout,
                        color: "text-orange-500",
                        items: [
                            { label: "Rutas", value: ["/hr/recruitment"] },
                            { label: "Gestión", value: "Kanban Board de Candidatos" }
                        ]
                    },
                    backend: {
                        title: "Hiring Workflow",
                        icon: Server,
                        color: "text-amber-600",
                        items: [
                            { label: "Flow", value: "Transiciones de estado automáticas" },
                            { label: "Email", value: "Citaciones automáticas (ICS)" }
                        ]
                    },
                    database: {
                        title: "ATS DB",
                        icon: Database,
                        color: "text-yellow-600",
                        items: [
                            { label: "Tablas", value: ["job_postings", "candidates"] },
                            { label: "Relaciones", value: "interviews, feedback" }
                        ]
                    }
                }
            }
        ]
    },
    {
        id: "opendata",
        name: "Open Data & Scraping",
        description: "Inteligencia de mercado, monitoreo de competencia y análisis de contratos públicos.",
        icon: Globe,
        subModules: [
            {
                title: "Inteligencia de Mercado (Rankings)",
                description: "Tableros analíticos para entender el comportamiento de compras estatales.",
                mermaid: `
flowchart TD
    DB[(Open Data DB)] -->|Query| Stats[Calculadora Estadísticas]
    Stats -->|Agrupar| TopProducts[Top Productos]
    Stats -->|Agrupar| TopSuppliers[Top Proveedores]
    Stats -->|Agrupar| TopEntities[Top Entidades]
    
    TopProducts --> Viz[Recharts Radar/Bar]
    TopSuppliers --> Viz
    TopEntities --> Viz
    Viz --> Dashboard[Dashboard UI]
                `,
                layers: {
                    frontend: {
                        title: "Analytics UI",
                        icon: Layout,
                        color: "text-sky-500",
                        items: [
                            { label: "Vistas", value: ["/open-data/rankings"] },
                            { label: "Librería", value: "Recharts & Framer Motion" }
                        ]
                    },
                    backend: {
                        title: "Aggregation Engine",
                        icon: Server,
                        color: "text-blue-500",
                        items: [
                            { label: "Query", value: "PostgreSQL Aggregations (SUM, COUNT)" },
                            { label: "Performance", value: "Indices por RUC y Partida" }
                        ]
                    },
                    database: {
                        title: "Market DB",
                        icon: Database,
                        color: "text-indigo-500",
                        items: [
                            { label: "Source", value: "open_data_entries" },
                            { label: "Volume", value: "Optimizado para +1M registros" }
                        ]
                    }
                }
            },
            {
                title: "Alertas de Marca (Brand Watch)",
                description: "Sistema de vigilancia para detectar competidores o productos específicos en tiempo real.",
                mermaid: `
stateDiagram-v2
    [*] --> Vigilancia
    Vigilancia --> Deteccion: Nuevo Registro
    Deteccion --> Filtrado: Coincide Marca?
    Filtrado --> Alerta: SI
    Filtrado --> Ignorar: NO
    Alerta --> Notificacion: Email/Push
    Notificacion --> [*]
                `,
                layers: {
                    frontend: {
                        title: "Alerts Config",
                        icon: AlertTriangle,
                        color: "text-amber-500",
                        items: [
                            { label: "Gestión", value: ["/open-data/brand-alerts"] },
                            { label: "Input", value: "Keywords & RUCs monitorizados" }
                        ]
                    },
                    backend: {
                        title: "Matching Engine",
                        icon: Server,
                        color: "text-orange-500",
                        items: [
                            { label: "Trigger", value: "On Insert (Database Webhook)" },
                            { label: "Logic", value: "Fuzzy String Matching" }
                        ]
                    },
                    database: {
                        title: "Alerts DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Config", value: "brand_alert_rules" },
                            { label: "Logs", value: "alert_notifications_history" }
                        ]
                    }
                }
            },
            {
                title: "Motor de Ingesta (ETL & Scrapers)",
                description: "Pipeline automatizado para extracción de datos de Perú Compras y fuentes externas.",
                mermaid: `
flowchart LR
    Cron((Vercel Cron)) -->|Trigger| API[Webhooks API]
    API -->|Spawn| Puppeteer[Puppeteer Core]
    Puppeteer -->|Scrape| PeruCompras[Portal Público]
    PeruCompras -->|HTML| Parser[DOM Parser]
    Parser -->|JSON| Validator{Schema Valid?}
    Validator -->|Yes| Upsert[Supabase Upsert]
    Validator -->|No| Log[Error Log]
                `,
                layers: {
                    frontend: {
                        title: "Control Panel",
                        icon: Terminal,
                        color: "text-slate-600",
                        items: [
                            { label: "Status", value: "Monitor de Ejecución" },
                            { label: "Manual", value: "Trigger Button" }
                        ]
                    },
                    backend: {
                        title: "Scraping Core",
                        icon: Server,
                        color: "text-violet-600",
                        items: [
                            { label: "Runtime", value: "Edge Function Compatible" },
                            { label: "Browser", value: "Chromium headless (sparticuz)" }
                        ]
                    },
                    database: {
                        title: "Raw Data",
                        icon: Database,
                        color: "text-purple-600",
                        items: [
                            { label: "Staging", value: "raw_scrape_logs" },
                            { label: "Master", value: "open_data_entries" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Bypassing Anti-Bot",
                        type: "warning",
                        content: "Utiliza rotación de User-Agents y retrasos aleatorios para evitar bloqueos del portal de Perú Compras. El parser normaliza los datos (fechas, monedas) antes de la inserción."
                    }
                ]
            }
        ]
    },
    {
        id: "chat",
        name: "Chat & AI Assistant",
        description: "Plataforma de comunicación corporativa con agente IA (Atlix) integrado.",
        icon: MessageSquare,
        subModules: [
            {
                title: "Atlas Chat (Mensajería Realtime)",
                description: "Sistema de mensajería instantánea seguro con soporte para grupos y multimedia.",
                mermaid: `
sequenceDiagram
    participant User
    participant Client as React Client
    participant Realtime as Supabase Realtime
    participant DB as Postgres DB

    User->>Client: Escribe mensaje
    Client->>DB: INSERT message
    DB->>Realtime: Broadcast INSERT event
    Realtime-->>Client: Receive Event (New Message)
    Client->>User: Update UI
    Note right of Client: Optimistic Updates para UI instantánea
                `,
                layers: {
                    frontend: {
                        title: "Chat Interface",
                        icon: Layout,
                        color: "text-indigo-500",
                        items: [
                            { label: "Lib", value: "Supabase Realtime Client" },
                            { label: "State", value: "useChat Hook (Context API)" }
                        ]
                    },
                    backend: {
                        title: "Event Bus",
                        icon: Server,
                        color: "text-blue-500",
                        items: [
                            { label: "Channel", value: "public:conversations (Global)" },
                            { label: "Events", value: "INSERT, UPDATE (Typing indicators)" }
                        ]
                    },
                    database: {
                        title: "Chat Schema",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tablas", value: ["conversations", "messages", "participants"] },
                            { label: "Policies", value: "RLS: Solo participantes ven mensajes" }
                        ]
                    }
                }
            },
            {
                title: "AI Assistant (Atlix Agent)",
                description: "Agente inteligente potenciado por Gemini 2.0 con acceso a herramientas del sistema.",
                mermaid: `
flowchart TD
    UserInput[Usuario: Pregunta] --> API["/api/gemini/chat"]
    API --> Context[Construir Prompt + User Info]
    Context --> Router{Intent Analysis}
    
    Router -->|Inventario| DB1[(Products DB)]
    Router -->|Calendario| DB2[(Events DB)]
    Router -->|Info Pública| Google[Google Custom Search]
    
    DB1 --> Agregator
    DB2 --> Agregator
    Google --> Agregator
    
    Agregator --> Gemini[Gemini 2.0 Flash]
    Gemini --> Response[Respuesta Natural]
    Response --> UserUI[Chat UI]
                `,
                layers: {
                    frontend: {
                        title: "AI Integration",
                        icon: MessageSquare,
                        color: "text-violet-500",
                        items: [
                            { label: "Componente", value: "AtlixChatWidget (Global)" },
                            { label: "Features", value: "Markdown Rendering, Code Blocks" }
                        ]
                    },
                    backend: {
                        title: "Agent Logic",
                        icon: Cpu,
                        color: "text-purple-600",
                        items: [
                            { label: "Model", value: "Gemini 2.0 Flash Lite" },
                            { label: "Tools", value: "Stock Check, Calendar Insert, Web Search" }
                        ]
                    },
                    database: {
                        title: "Knowledge",
                        icon: Database,
                        color: "text-indigo-600",
                        items: [
                            { label: "Context", value: "User Profile, Department, Role" },
                            { label: "History", value: "In-memory session context" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Capacidades de Agente",
                        type: "list",
                        items: [
                            "Consulta de Stock: Puede verificar 'products' en tiempo real.",
                            "Gestión de Agenda: Puede insertar en 'calendar_events'.",
                            "Búsqueda Externa: Usa Google API para consultar Peru Compras y OSCE."
                        ]
                    }
                ]
            },
            {
                title: "Gestión de Archivos y Retención",
                description: "Manejo eficiente de adjuntos y políticas de privacidad.",
                mermaid: `
graph LR
    Upload[User Upload] -->|Client| Storage[Supabase Storage]
    Storage -->|URL| DB[Message Record]
    Cron[Retention Policy] -->|Diario| DB
    Cron -->|7+ días| Delete[Hard Delete]
    Delete --> CleanStorage[Eliminar Archivos Huérfanos]
                `,
                layers: {
                    frontend: {
                        title: "Media Handler",
                        icon: FileText,
                        color: "text-emerald-500",
                        items: [
                            { label: "Viewer", value: "Image Modal & PDF Preview" },
                            { label: "Upload", value: "Drag & Drop Zone" }
                        ]
                    },
                    backend: {
                        title: "Storage Logic",
                        icon: Server,
                        color: "text-green-600",
                        items: [
                            { label: "Bucket", value: "chat-attachments (Private)" },
                            { label: "Cleanup", value: "Auto-expire policy" }
                        ]
                    },
                    database: {
                        title: "Compliance",
                        icon: Database,
                        color: "text-teal-600",
                        items: [
                            { label: "Rule", value: "Retención máxima: 7 días" },
                            { label: "Scope", value: "Mensajes y Adjuntos (GDPR Friendly)" }
                        ]
                    }
                }
            }
        ]
    },
    {
        id: "support",
        name: "Soporte Técnico (Helpdesk)",
        description: "Sistema de tickets para gestión de incidencias IT y soporte operativo.",
        icon: LifeBuoy,
        subModules: [
            {
                title: "Gestión de Tickets",
                description: "Ciclo de vida completo de incidencias: Reporte > Asignación > Resolución.",
                mermaid: `
stateDiagram-v2
    [*] --> Recibido: Usuario crea ticket
    Recibido --> Asignado: Supervisor asigna agente
    Asignado --> EnProgreso: Agente inicia trabajo
    EnProgreso --> Resuelto: Agente soluciona
    Resuelto --> Cerrado: Usuario confirma
    Resuelto --> EnProgreso: Usuario rechaza solución
    Cerrado --> [*]
                `,
                layers: {
                    frontend: {
                        title: "Helpdesk UI",
                        icon: Ticket,
                        color: "text-blue-500",
                        items: [
                            { label: "Vistas", value: ["/support/new", "/support/[id]"] },
                            { label: "Components", value: "StatusBadge, PriorityIndicator" }
                        ]
                    },
                    backend: {
                        title: "Ticket Logic",
                        icon: Server,
                        color: "text-indigo-500",
                        items: [
                            { label: "Routing", value: "Auto-assign por categoría (Hardware/Software)" },
                            { label: "SLA", value: "Priorización por severidad (Crítica/Alta)" }
                        ]
                    },
                    database: {
                        title: "Support DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Tabla", value: "support_tickets" },
                            { label: "Relaciones", value: "assigned_to (users)" }
                        ]
                    }
                }
            },
            {
                title: "Dashboard & Métricas",
                description: "Visibilidad en tiempo real del estado de la mesa de ayuda.",
                mermaid: `
pie title Tickets por Estado
    "Abiertos" : 15
    "En Progreso" : 30
    "Resueltos" : 45
    "Cerrados" : 10
                `,
                layers: {
                    frontend: {
                        title: "Analytics Cards",
                        icon: Layout,
                        color: "text-sky-500",
                        items: [
                            { label: "KPIs", value: "Total, Abiertos, SLAs Vencidos" },
                            { label: "Filtros", value: "Por Prioridad y Categoría" }
                        ]
                    },
                    backend: {
                        title: "Stats Engine",
                        icon: Cpu,
                        color: "text-blue-600",
                        items: [
                            { label: "Aggregation", value: "Supabase count() queries" },
                            { label: "Performance", value: "Index on 'status'" }
                        ]
                    },
                    database: {
                        title: "Historical",
                        icon: Database,
                        color: "text-slate-600",
                        items: [
                            { label: "Logs", value: "ticket_audit_log (Cambios de estado)" }
                        ]
                    }
                }
            }
        ]
    },
    {
        id: "requests",
        name: "Gestión de Solicitudes",
        description: "Flujos de aprobación para permisos, horas extras y requerimientos de materiales.",
        icon: FileCheck,
        subModules: [
            {
                title: "Tipos de Requerimiento",
                description: "Soporte para múltiples flujos con formularios dinámicos.",
                mermaid: `
classDiagram
    class Request {
        +id
        +status
        +approve()
        +reject()
    }
    class Permission {
        +date_from
        +date_to
    }
    class Overtime {
        +hours
        +justification
    }
    class Equipment {
        +items[]
        +delivery_date
    }
    Request <|-- Permission
    Request <|-- Overtime
    Request <|-- Equipment
                `,
                layers: {
                    frontend: {
                        title: "Dynamic Forms",
                        icon: ClipboardCheck,
                        color: "text-emerald-500",
                        items: [
                            { label: "Tipos", value: ["Justificaciones", "Horas Extras", "Equipos"] },
                            { label: "UI", value: "Card grid con indicadores de estado de colores" }
                        ]
                    },
                    backend: {
                        title: "Form Handler",
                        icon: Server,
                        color: "text-green-600",
                        items: [
                            { label: "Validation", value: "Zod Schemas por tipo de solicitud" },
                            { label: "Uploads", value: "Adjuntos (Sustentos médicos, etc)" }
                        ]
                    },
                    database: {
                        title: "Requests DB",
                        icon: Database,
                        color: "text-teal-600",
                        items: [
                            { label: "Tabla", value: "employee_requests" },
                            { label: "JSONB", value: "detalles_especificos (flexible schema)" }
                        ]
                    }
                }
            },
            {
                title: "Workflow de Aprobación",
                description: "Motor de decisiones para validar solicitudes jerárquicamente.",
                mermaid: `
sequenceDiagram
    participant Empleado
    participant Sistema
    participant Jefe
    participant RRHH

    Empleado->>Sistema: Crea Solicitud
    Sistema->>Jefe: Notificación (Email)
    Jefe->>Sistema: Revisa y Aprueba
    Sistema->>RRHH: Notifica (2da Instancia)
    RRHH->>Sistema: Aprobación Final
    Sistema->>Empleado: Solicitud Aprobada
                `,
                layers: {
                    frontend: {
                        title: "Approval UI",
                        icon: CheckCircle,
                        color: "text-green-500",
                        items: [
                            { label: "Actions", value: "Approve/Reject buttons" },
                            { label: "Feedback", value: "Dialog para motivo de rechazo" }
                        ]
                    },
                    backend: {
                        title: "Notification Svc",
                        icon: Server,
                        color: "text-emerald-700",
                        items: [
                            { label: "Triggers", value: "Database Webhooks" },
                            { label: "Email", value: "Resend / SMTP Integration" }
                        ]
                    },
                    database: {
                        title: "Audit Trail",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Fields", value: "approved_at, approved_by, comments" }
                        ]
                    }
                }
            }
        ]
    },
    {
        id: "productivity",
        name: "Productividad (Tareas & Calendario)",
        description: "Herramientas de organización personal: Calendario corporativo y Kanban de tareas diarias.",
        icon: Calendar,
        subModules: [
            {
                title: "Calendario Corporativo",
                description: "Gestión de eventos, recordatorios y fechas importantes.",
                mermaid: `
flowchart LR
    Event[Evento] -->|Trigger| DateCheck{¿Es Hoy?}
    DateCheck -->|Si| Notif[Notificación Push]
    DateCheck -->|Mañana| Email[Recordatorio Email]
    
    User -->|CRUD| Interface[Calendar UI]
    Interface -->|Sync| DB[(Events DB)]
                `,
                layers: {
                    frontend: {
                        title: "Calendar UI",
                        icon: Calendar,
                        color: "text-purple-500",
                        items: [
                            { label: "Lib", value: "date-fns logic engine" },
                            { label: "Views", value: "Month Grid, Day Details" }
                        ]
                    },
                    backend: {
                        title: "Reminder Svc",
                        icon: Server,
                        color: "text-violet-500",
                        items: [
                            { label: "Check", value: "Frontend Effect (Client-side checks)" },
                            { label: "State", value: "notification_sent flag" }
                        ]
                    },
                    database: {
                        title: "Events Schema",
                        icon: Database,
                        color: "text-indigo-500",
                        items: [
                            { label: "Tabla", value: "calendar_events" },
                            { label: "Types", value: "personal, work, meeting" }
                        ]
                    }
                }
            },
            {
                title: "Pizarrones & Migración Automática",
                description: "Sistema Kanban con lógica de arrastre de tareas pendientes al día siguiente.",
                mermaid: `
stateDiagram-v2
    [*] --> Hoy: Crear Board
    Hoy --> Tarea: Nueva Tarea
    Tarea --> Pendiente
    Tarea --> Completada
    
    state "Migración Nocturna (Cron)" as Migration {
        Pendiente --> Migrada: 24h pasadas
        Migrada --> Mañana: Mover al nuevo Board
    }
                `,
                layers: {
                    frontend: {
                        title: "Kanban Board",
                        icon: Kanban,
                        color: "text-orange-500",
                        items: [
                            { label: "D&D", value: "@hello-pangea/dnd" },
                            { label: "Status", value: "Pending, In Progress, Done" }
                        ]
                    },
                    backend: {
                        title: "Migration Robot",
                        icon: Cpu,
                        color: "text-red-500",
                        items: [
                            { label: "Endpoint", value: "/api/migrate-pending-tasks" },
                            { label: "Trigger", value: "Auto-check on user login" }
                        ]
                    },
                    database: {
                        title: "Boards DB",
                        icon: Database,
                        color: "text-slate-600",
                        items: [
                            { label: "Hierarchy", value: "Board -> Tasks (1:N)" },
                            { label: "Tracking", value: "migrated_from / migrated_to links" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Auto-Migración",
                        type: "info",
                        content: "El sistema detecta automáticamente si hay tareas pendientes de días anteriores al iniciar sesión. Un proceso de 'Migración' mueve estas tareas al pizarrón del día actual para asegurar que nada se olvide."
                    }
                ]
            }
        ]
    },
    {
        id: "labeling",
        name: "Etiquetado y Serialización",
        description: "Gestión masiva de códigos, lotes y trazabilidad unitaria.",
        icon: Barcode,
        subModules: [
            {
                title: "Generación de Códigos",
                description: "Motor de creación de identificadores únicos (QR/Barra) para productos y activos.",
                mermaid: `
flowchart TD
    Input[Entrada Masiva] -->|SKU/Lote/Cant| Engine[Generador de Series]
    Engine -->|Validar| DB{¿Serie Única?}
    DB -->|No| Engine
    DB -->|Si| PDF[Renderizador PDF]
    PDF -->|Layout 5x5| Print[Archivo de Impresión]
    Print -->|ZPL/PDF| Device[Impresora Térmica]
                `,
                layers: {
                    frontend: {
                        title: "Label Designer",
                        icon: Tag,
                        color: "text-rose-500",
                        items: [
                            { label: "Preview", value: "Canvas API Rendering" },
                            { label: "Formats", value: "Code-128, EAN-13, QR" }
                        ]
                    },
                    backend: {
                        title: "Serialization Core",
                        icon: Server,
                        color: "text-red-500",
                        items: [
                            { label: "Algo", value: "NanoID / UUID v4" },
                            { label: "Batch", value: "Bulk Insert (10k+ records)" }
                        ]
                    },
                    database: {
                        title: "Codes DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Table", value: "product_serials" },
                            { label: "Trace", value: "status (Active/Void/Sold)" }
                        ]
                    }
                }
            },
            {
                title: "Control de Lotes (Lotización)",
                description: "Gestión de vencimientos y trazabilidad de grupos de productos.",
                mermaid: `
classDiagram
    class Batch {
        +batch_number
        +expiration_date
        +manufacture_date
        +quantity
    }
    class Movement {
        +type (IN/OUT)
        +quantity
        +ref_doc
    }
    Batch "1" *-- "many" Movement : history
    Batch -- Product : belongs_to
                `,
                layers: {
                    frontend: {
                        title: "Batch Manager",
                        icon: Package,
                        color: "text-orange-500",
                        items: [
                            { label: "Alerts", value: "Semáforo de Vencimiento" },
                            { label: "Scan", value: "USB/Bluetooth Scanner Input" }
                        ]
                    },
                    backend: {
                        title: "Inventory Logic",
                        icon: Cpu,
                        color: "text-amber-600",
                        items: [
                            { label: "Rule", value: "FEFO (First Expired, First Out)" },
                            { label: "Lock", value: "Cuarentena por control de calidad" }
                        ]
                    },
                    database: {
                        title: "Inventory DB",
                        icon: Database,
                        color: "text-slate-600",
                        items: [
                            { label: "Table", value: "inventory_batches" }
                        ]
                    }
                }
            },
            {
                title: "Gestor de Stickers y Medidas",
                description: "Configuración precisa de formatos de impresión para etiquetas adhesivas y térmicas.",
                mermaid: `
stateDiagram-v2
    [*] --> Config: Seleccionar Formato
    Config --> Preview: Ajustar Medidas (mm)
    Preview --> Render: Generar PDF/Canvas
    Render --> Spooler: Cola de Impresión
    Spooler --> Printer: Enviar RAW/Driver
    Printer --> [*]
                `,
                layers: {
                    frontend: {
                        title: "Print Layout Engine",
                        icon: Ruler,
                        color: "text-pink-500",
                        items: [
                            { label: "Formatos", value: ["50x25mm", "100x150mm", "A4 (3x11)"] },
                            { label: "DPI", value: "203/300 DPI Scaling Logic" }
                        ]
                    },
                    backend: {
                        title: "Media Service",
                        icon: Printer,
                        color: "text-fuchsia-600",
                        items: [
                            { label: "Lib", value: "PDFKit / React-PDF" },
                            { label: "Driver", value: "WebUSB / Browser Print API" }
                        ]
                    },
                    database: {
                        title: "Templates DB",
                        icon: Database,
                        color: "text-slate-500",
                        items: [
                            { label: "Table", value: "label_templates" },
                            { label: "Config", value: "JSON (width, height, gap, margins)" }
                        ]
                    }
                },
                details: [
                    {
                        title: "Especificaciones de Medios",
                        type: "list",
                        items: [
                            "Etiqueta Joyería: 50mm x 10mm (Cola de Rata)",
                            "Etiqueta Activo: 50mm x 25mm (Polipropileno)",
                            "Etiqueta Logística: 100mm x 150mm (A6 Térmico)",
                            "Soporte para calibración de GAP y Black Mark."
                        ]
                    }
                ]
            }
        ]
    }
]

// --- Components ---

// Enhanced Badge with logo support - Now with prominent logos
function TechBadge({ value }: { value: string }) {
    const logo = findTechLogo(value)

    // If has logo, show a more visual mini-card
    if (logo) {
        return (
            <div className="group flex flex-col items-center p-2.5 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 min-w-[72px]">
                <div className="relative w-7 h-7 mb-1.5 group-hover:scale-110 transition-transform duration-200">
                    <Image
                        src={logo}
                        alt={value}
                        fill
                        className="object-contain"
                    />
                </div>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                    {value}
                </span>
            </div>
        )
    }

    // No logo - compact badge
    return (
        <Badge
            variant="secondary"
            className="font-mono text-xs py-1 px-2 bg-slate-100 dark:bg-slate-800"
        >
            {value}
        </Badge>
    )
}

// Tech Value Display - For single values with prominent logos
function TechValueDisplay({ value }: { value: string }) {
    const logo = findTechLogo(value)

    if (logo) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                <div className="relative w-8 h-8 flex-shrink-0">
                    <Image
                        src={logo}
                        alt={value}
                        fill
                        className="object-contain"
                    />
                </div>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{value}</span>
            </div>
        )
    }

    return (
        <div className="font-mono text-sm bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 break-words">
            {value}
        </div>
    )
}

// Tech Stack Visual Showcase Component
function TechStackShowcase() {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Stack Tecnológico</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {techStackData.map((tech, index) => (
                    <motion.div
                        key={tech.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        className="group relative"
                    >
                        <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
                            <div className="relative w-10 h-10 mb-2">
                                <Image
                                    src={tech.logo}
                                    alt={tech.name}
                                    fill
                                    className="object-contain group-hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                                {tech.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {tech.category}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

function InfoCard({ layer }: { layer: TechLayer }) {
    return (
        <Card className="h-full border-l-4 border-l-current shadow-sm hover:shadow-md transition-shadow" style={{ color: "inherit", borderColor: "currentColor" }}>
            <div className="p-4 h-full bg-white dark:bg-slate-900 rounded-r-lg border border-slate-200 dark:border-slate-800 border-l-0 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <layer.icon className={`h-5 w-5 ${layer.color}`} />
                    <h4 className="font-semibold text-sm uppercase tracking-wider opacity-70">{layer.title}</h4>
                </div>
                <div className="space-y-4">
                    {layer.items.map((item, i) => (
                        <div key={i}>
                            <p className="text-xs font-medium text-slate-400 uppercase mb-2">{item.label}</p>
                            {Array.isArray(item.value) ? (
                                <div className="flex flex-wrap gap-2">
                                    {item.value.map((v, j) => (
                                        <TechBadge key={j} value={v} />
                                    ))}
                                </div>
                            ) : (
                                <TechValueDisplay value={item.value} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}

export default function TechnicalDocsPage() {
    const [selectedModule, setSelectedModule] = useState(modules[0])

    return (
        <RoleGuard requiredRoles={["admin"]}>
            <div className="p-4 md:p-6 w-full space-y-6 md:space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                            <Code className="h-8 w-8 text-slate-800 dark:text-slate-200" />
                            Especificaciones Técnicas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Vista de arquitectura interna, diagramas de flujo y componentes del sistema ATLAS.
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                <Lock className="w-3 h-3 mr-1" />
                                Admin Only
                            </span>
                        </p>
                    </div>
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Sidebar Navigation */}
                    <Card className="lg:col-span-3 xl:col-span-2 overflow-hidden h-fit lg:sticky lg:top-6">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-4">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Módulos del Sistema</CardTitle>
                        </CardHeader>
                        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible p-2 gap-2 lg:gap-0 lg:space-y-1">
                            {modules.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedModule(m)}
                                    className={`flex-shrink-0 lg:w-full flex items-center justify-start text-left gap-3 px-3 py-2 lg:py-3 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${selectedModule.id === m.id
                                        ? "bg-slate-900 text-white shadow-md dark:bg-blue-600"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <m.icon className={`h-4 w-4 ${selectedModule.id === m.id ? "text-white" : "text-slate-400"}`} />
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Content Area */}
                    <div className="lg:col-span-9 xl:col-span-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedModule.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Module Header */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <selectedModule.icon className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedModule.name}</h2>
                                        <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedModule.description}</p>
                                    </div>
                                </div>

                                {/* Tech Stack Showcase (only for Core module) */}
                                {selectedModule.id === "core" && (
                                    <TechStackShowcase />
                                )}

                                {/* SubModules Rendering */}
                                {selectedModule.subModules && (
                                    <div className="space-y-12 mb-12">
                                        {selectedModule.subModules.map((sub, index) => (
                                            <div key={index} className="space-y-6 pt-6 first:pt-0 border-t first:border-0 border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                                                    <div>
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{sub.title}</h3>
                                                        {sub.description && <p className="text-sm text-slate-500">{sub.description}</p>}
                                                    </div>
                                                </div>

                                                {/* SubModule Diagram */}
                                                {sub.mermaid && (
                                                    <div className="w-full space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                                <GitBranch className="h-3 w-3" />
                                                                Flujo
                                                            </h4>
                                                        </div>
                                                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden p-4 shadow-sm">
                                                            <MermaidDiagram chart={sub.mermaid} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SubModule Layers */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                        <Layers className="h-3 w-3" />
                                                        Capas Técnicas
                                                    </h4>
                                                    <div className="grid md:grid-cols-3 gap-4">
                                                        <div className={sub.layers.frontend.color}>
                                                            <InfoCard layer={sub.layers.frontend} />
                                                        </div>
                                                        <div className={sub.layers.backend.color}>
                                                            <InfoCard layer={sub.layers.backend} />
                                                        </div>
                                                        <div className={sub.layers.database.color}>
                                                            <InfoCard layer={sub.layers.database} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SubModule Details */}
                                                {sub.details && sub.details.length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                            <Cpu className="h-3 w-3" />
                                                            Detalles
                                                        </h4>
                                                        <div className="grid gap-3">
                                                            {sub.details.map((detail, dIdx) => (
                                                                <Card key={dIdx} className={`${detail.type === 'warning' ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                                    <CardHeader className="pb-2 p-4">
                                                                        <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                            {detail.title}
                                                                        </CardTitle>
                                                                    </CardHeader>
                                                                    <CardContent className="p-4 pt-0">
                                                                        {detail.content && <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{detail.content}</p>}

                                                                        {detail.type === 'list' && detail.items && (
                                                                            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 ml-2">
                                                                                {detail.items.map((item, i) => (
                                                                                    <li key={i}>{item}</li>
                                                                                ))}
                                                                            </ul>
                                                                        )}

                                                                        {detail.type === 'code' && detail.code && (
                                                                            <div className="mt-2 relative rounded-md bg-slate-950 p-3 font-mono text-[10px] text-slate-300 overflow-x-auto">
                                                                                <pre>{detail.code}</pre>
                                                                            </div>
                                                                        )}
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Legacy Rendering Fallback */}
                                {!selectedModule.subModules && (
                                    <>
                                        {/* Architecture Flow Diagram */}
                                        {selectedModule.mermaid && (
                                            <div className="w-full space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                        <GitBranch className="h-4 w-4" />
                                                        Flujo de Arquitectura
                                                    </h3>
                                                    <Badge variant="outline" className="text-[10px] font-mono">Mermaid.js Render</Badge>
                                                </div>
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden p-4 shadow-sm">
                                                    <MermaidDiagram chart={selectedModule.mermaid} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Technical Layers Grid */}
                                        {selectedModule.layers && (
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                    <Layers className="h-4 w-4" />
                                                    Capas Técnicas
                                                </h3>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div className={selectedModule.layers.frontend.color}>
                                                        <InfoCard layer={selectedModule.layers.frontend} />
                                                    </div>
                                                    <div className={selectedModule.layers.backend.color}>
                                                        <InfoCard layer={selectedModule.layers.backend} />
                                                    </div>
                                                    <div className={selectedModule.layers.database.color}>
                                                        <InfoCard layer={selectedModule.layers.database} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Deep Dive / Detailed Analysis Section */}
                                        {selectedModule.details && selectedModule.details.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                    <Cpu className="h-4 w-4" />
                                                    Análisis Profundo
                                                </h3>
                                                <div className="grid gap-4 md:grid-cols-1">
                                                    {selectedModule.details.map((detail, idx) => (
                                                        <Card key={idx} className={`${detail.type === 'warning' ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                                                    {detail.title}
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                {detail.content && <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{detail.content}</p>}

                                                                {detail.type === 'list' && detail.items && (
                                                                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-2">
                                                                        {detail.items.map((item, i) => (
                                                                            <li key={i}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}

                                                                {detail.type === 'code' && detail.code && (
                                                                    <div className="mt-2 relative rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                                                                        <pre>{detail.code}</pre>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </>
                                )}

                                {/* Additional Context Card (Example) */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                            <Cpu className="h-4 w-4" />
                                            Observaciones de Implementación
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                            La implementación de este módulo sigue los principios de <strong>Separation of Concerns</strong>.
                                            El Frontend se encarga exclusivamente de la presentación y captura de eventos, delegando la lógica de negocio compleja a Server Actions o Endpoints API.
                                            La Base de Datos utiliza <strong>Row Level Security (RLS)</strong> como capa final de protección, asegurando que ninguna consulta pueda exponer datos no autorizados, independientemente de la lógica de aplicación.
                                        </p>
                                    </CardContent>
                                </Card>

                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </RoleGuard>
    )
}
