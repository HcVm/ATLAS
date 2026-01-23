# Arquitectura del Sistema ATLAS

## 1. Visión General
ATLAS es una plataforma integral de gestión empresarial (ERP/BPM) diseñada para administrar documentos, recursos humanos, almacenes y ventas. El sistema está construido sobre una arquitectura **Serverless** moderna, priorizando la escalabilidad, el rendimiento y la mantenibilidad.

## 2. Stack Tecnológico

### Core
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) (Tipado estricto)
- **Runtime**: Node.js (con soporte para Edge Functions)

### Base de Datos & Backend
- **Plataforma**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Autenticación**: Supabase Auth (Integrado con RLS - Row Level Security)
- **Almacenamiento**: Supabase Storage

### Frontend & UI
- **Estilos**: Tailwind CSS
- **Componentes**: Radix UI + Shadcn/UI
- **Animaciones**: Framer Motion
- **Iconos**: Lucide React

### Infraestructura
- **Hosting**: Vercel
- **CI/CD**: Vercel Git Integration

## 3. Patrones de Diseño

### Server Components vs Client Components
El proyecto utiliza extensivamente el modelo de **React Server Components (RSC)**.
- **Server Components**: Se utilizan por defecto para la obtención de datos, acceso a base de datos y renderizado de contenido estático.
- **Client Components**: Se reservan para interactividad del usuario (formularios, listeners de eventos, hooks de estado).

### Gestión de Estado
- **Estado del Servidor**: Gestionado principalmente a través de llamadas directas a Supabase en Server Components y revalidación de caché.
- **Estado del Cliente**: 
  - `Context API`: Para estados globales críticos (`auth-context`, `company-context`).
  - `React Query` (o hooks nativos): Para mutaciones y datos dinámicos en cliente.

## 4. Seguridad
- **RLS (Row Level Security)**: Toda la lógica de autorización de datos reside en la base de datos PostgreSQL. El frontend solo consulta lo que el usuario tiene permitido ver.
- **Middleware**: Protección de rutas a nivel de Next.js para redirección y validación de sesiones.

## 5. Servicios Externos
- **Generación de PDF**: `pdf-lib` para generación de documentos en el servidor.
- **Scraping**: `puppeteer-core` + `@sparticuz/chromium` para extracción de datos (Noticias Perú Compras).
- **IA**: Integración con Google Gemini para asistentes y procesamiento de lenguaje natural.
