# Guía de Instalación y Despliegue

## Requisitos Previos
- Node.js v18.17 o superior
- NPM o PNPM
- Variables de entorno configuradas (ver `.env.example`)

## Desarrollo Local

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd ATLAS
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   # o
   pnpm install
   ```

3. **Configurar variables de entorno**
   Crear un archivo `.env.local` en la raíz:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   # ...otras variables específicas
   ```

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

## Scripts Disponibles

- `npm run dev`: Inicia el entorno de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia la versión compilada.
- `npm run lint`: Ejecuta el linter para verificar calidad de código.
- **`npm run gen:types`**: Genera los tipos de TypeScript desde Supabase (requiere login en CLI de Supabase).

## Despliegue en Vercel

Este proyecto está optimizado para Vercel.

1. Conectar el repositorio a Vercel.
2. Configurar las variables de entorno en el panel de Vercel.
3. El despliegue se activará automáticamente con cada push a `main`.

### Notas sobre Serverless
- Las funciones de API (como scraping o generación de PDFs) tienen un tiempo límite de ejecución (default 10s-60s según plan).
- Para procesos largos, considerar el uso de Edge Functions o dividir la lógica.
