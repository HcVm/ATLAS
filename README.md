# Sistema de Seguimiento de Documentos

Un sistema completo de gestión y seguimiento de documentos construido con Next.js, Supabase y TypeScript.

## 🚀 Características

- **Autenticación completa** con roles (admin, supervisor, usuario)
- **Gestión de documentos** con QR codes y seguimiento de movimientos
- **Sistema de noticias** con soporte para imágenes
- **Gestión de departamentos y usuarios**
- **Dashboard con estadísticas**
- **Interfaz responsive** con modo oscuro

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🛠️ Instalación Local

### 1. Clonar el repositorio
\`\`\`bash
git clone <repository-url>
cd document-tracking-system
\`\`\`

### 2. Instalar dependencias
\`\`\`bash
npm install
# o
yarn install
\`\`\`

### 3. Configurar variables de entorno
\`\`\`bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar .env.local con tus credenciales de Supabase
\`\`\`

### 4. Configurar Supabase

#### Crear proyecto en Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la URL y las claves API

#### Configurar variables de entorno:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
\`\`\`

### 5. Ejecutar scripts de base de datos

Ejecuta los scripts SQL en orden desde la carpeta `scripts/`:

\`\`\`sql
-- 1. Crear tablas
scripts/01-create-tables.sql

-- 2. Configurar políticas RLS
scripts/02-create-policies.sql

-- 3. Datos iniciales
scripts/03-seed-data.sql

-- 4. Configurar autenticación
scripts/05-create-auth-trigger.sql

-- Y así sucesivamente...
\`\`\`

### 6. Iniciar el servidor de desarrollo
\`\`\`bash
npm run dev
# o
yarn dev
\`\`\`

### 7. Configurar el sistema

1. Ve a `http://localhost:3000/admin-setup`
2. Crea tu primer usuario administrador
3. Configura departamentos y usuarios adicionales

## 🔧 Configuración Adicional

### Storage (Opcional)
Si necesitas subir archivos:
1. Ve a `/storage-setup`
2. Configura los buckets de Supabase
3. Ejecuta los scripts de storage

### Problemas Comunes

#### Error HTTP 431
Si recibes este error al ejecutar localmente:
- Verifica que las variables de entorno no sean demasiado largas
- Usa solo las variables esenciales en `.env.local`

#### Dropdowns no funcionan
- Asegúrate de que Radix UI esté instalado correctamente
- Verifica que no haya conflictos de CSS

## 📁 Estructura del Proyecto

\`\`\`
├── app/                    # App Router de Next.js
│   ├── (dashboard)/       # Rutas del dashboard
│   ├── login/             # Autenticación
│   └── api/               # API routes
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes de UI (shadcn)
│   └── layout/           # Componentes de layout
├── lib/                  # Utilidades y configuración
├── scripts/              # Scripts SQL para la base de datos
└── styles/               # Estilos globales
\`\`\`

## 🎯 Uso

### Crear Documentos
1. Ve a "Documentos" → "Nuevo Documento"
2. Completa la información requerida
3. El sistema generará automáticamente un QR code

### Seguimiento de Movimientos
1. Escanea el QR del documento
2. Registra el movimiento (entrada/salida)
3. Ve el historial completo en la vista del documento

### Gestión de Usuarios
1. Solo administradores pueden gestionar usuarios
2. Asigna roles y departamentos
3. Los usuarios ven solo documentos de su departamento

## 🔐 Roles y Permisos

- **Admin**: Acceso completo al sistema
- **Supervisor**: Gestión de documentos y usuarios de su departamento
- **Usuario**: Solo visualización y creación de documentos

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Otras Plataformas
- Netlify
- Railway
- Render

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
