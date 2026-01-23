# Estructura del Proyecto

## Directorios Principales

```
p:/ATLAS/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rutas de autenticación (login, register)
│   ├── (dashboard)/        # Rutas principales del panel de control (protegidas)
│   ├── (presentation)/     # Landing page y rutas públicas
│   ├── api/                # Endpoints API (Route Handlers)
│   └── layout.tsx          # Layout raíz
├── attributes/             # Definiciones de atributos y constantes globales
├── components/             # Componentes de React
│   ├── ui/                 # Componentes base reutilizables (Botones, Inputs)
│   ├── layout/             # Componentes estructurales (Sidebar, Header)
│   └── [feature]/          # Componentes específicos por funcionalidad (ej. documents, sales)
├── lib/                    # Lógica de negocio y utilidades
│   ├── services/           # Servicios encapsulados (scraping, workers)
│   ├── supabase.ts         # Cliente de Supabase
│   └── utils.ts            # Funciones de utilidad generales
├── public/                 # Archivos estáticos
└── types/                  # Definiciones de tipos TypeScript globales
```

## Convenciones de Código

### Nombramiento de Archivos
- **Rutas**: `kebab-case` (ej. `create-document/page.tsx`)
- **Componentes**: `kebab-case` para archivos (ej. `user-card.tsx`), `PascalCase` para exportaciones.
- **Utilidades**: `camelCase` o `kebab-case`.

### Estructura de Componentes
Se prefiere la colocación (colocation) de componentes específicos cerca de las páginas que los utilizan, mientras que los componentes genéricos residen en `components/ui`.

```tsx
// Ejemplo de estructura de componente
"use client" // Solo si es necesario

import { useState } from "react"
// Importaciones locales

interface Props {
  // Definición de props
}

export function ComponentName({ prop1 }: Props) {
  // Hooks
  // Lógica
  
  return (
    // JSX
  )
}
```

### Manejo de Base de Datos
- Las consultas a base de datos deben ser tipadas usando `Database` generado desde `lib/database.types.ts`.
- Preferir `createServerClient` en Server Components y Route Handlers.
- Preferir `createBrowserClient` en Client Components.
