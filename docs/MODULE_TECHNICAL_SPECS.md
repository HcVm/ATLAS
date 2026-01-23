# Especificación Técnica por Módulos

Este documento detalla la implementación técnica de cada módulo del sistema ATLAS, desglosando componentes de frontend, lógica de backend y estructura de datos.

---

## 1. Módulo de Autenticación y Usuarios

###  Frontend (UI/UX)
- **Rutas**: `/login`, `/register`, `/auth/*`, `/users`
- **Componentes Clave**:
  - `components/layout/sidebar.tsx`: Control de navegación según roles.
  - `components/layout/user-nav.tsx`: Menú de usuario y logout.
  - `components/role-guard.tsx`: HOC/Componente para proteger secciones por rol.
- **Estado**: `lib/auth-context.tsx` (Manejo de sesión de Supabase).

### 🔄 Backend (Lógica)
- **Middleware**: `middleware.ts` para protección de rutas y actualización de cookies de sesión.
- **Server Actions**: Gestión de login/logout server-side.
- **Admin Utilities**: `lib/supabase-admin.ts` para gestión de usuarios privilegiada (bypassing RLS para creación de usuarios por admins).

### 🗄️ Base de Datos
- **Tablas**:
  - `auth.users`: (Sistema interno de Supabase) Credenciales y sesiones.
  - `public.profiles`: Datos extendidos (nombre, empresa, departamento).
  - `public.departments`: Catálogo de departamentos.
- **Seguridad**: RLS policies que permiten a los usuarios ver su propio perfil y a administradores/RRHH ver todos.

---

## 2. Gestión Documental (Documents)

### 🖥️ Frontend
- **Rutas**: `/documentation`, `/documents/*`
- **Componentes Clave**:
  - `app/(dashboard)/documents/page.tsx`: Tabla principal de documentos.
  - `components/documents/create-document-form.tsx`: Formulario complejo con subida de adjuntos.
  - `components/qr-code-display.tsx`: Generación visual de códigos QR.

### 🔄 Backend
- **Generación de Códigos**: Lógica autoincremental de códigos (Ej: `EMP-LOG-2024-001`).
- **Storage**: Bucket `documents` en Supabase para almacenar PDFs y adjuntos.
- **APIs**:
  - `/api/documents/[id]/qr`: Endpoint para metadatos de escaneo.

### 🗄️ Base de Datos
- **Tablas**:
  - `documents`: Registro principal (código, tipo, estado).
  - `document_versions`: Control de versiones de archivos.
  - `document_movements`: Trazabilidad / derivación de documentos entre áreas.

---

## 3. Almacén e Inventario (Warehouse)

### 🖥️ Frontend
- **Rutas**: `/warehouse`, `/internal-warehouse`
- **Componentes Clave**:
  - `components/warehouse/product-card.tsx`: Visualización de items.
  - `components/warehouse/movement-history.tsx`: Historial de entradas/salidas.
  - `components/warehouse/scanner-modal.tsx`: Interfaz para escáner de código de barras.

### 🔄 Backend
- **Lógica de Negocio**:
  - Validación de stock negativo (impedido por Constraints o Triggers en DB).
  - Cálculo de Kárdex.
- **Reportes**: `lib/product-report-generator.ts` para generación de reportes de inventario en PDF.

### 🗄️ Base de Datos
- **Tablas**:
  - `products`: Catálogo maestro de productos (SKU, nombre, stock actual).
  - `movements`: Registro transaccional de cada cambio de stock (entrada, salida, ajuste).
  - `categories`: Clasificación de productos.

---

## 4. Comercial y Ventas (Sales & Quotations)

### 🖥️ Frontend
- **Rutas**: `/sales`, `/sales-quotations`
- **Componentes Clave**:
  - `components/quotations/quote-builder.tsx`: Constructor visual de cotizaciones.
  - `components/sales/pipeline-board.tsx`: Vista Kanban de oportunidades.

### 🔄 Backend
- **Generación de Documentos**: `lib/pdf-generator.ts` para crear PDFs de cotizaciones formales.
- **Flujos**: Conversión de `quotation` -> `sale` (Genera movimiento de salida de almacén).

### 🗄️ Base de Datos
- **Tablas**:
  - `quotations`: Cabecera de cotizaciones.
  - `quotation_items`: Detalle de productos en cotización.
  - `clients`: Directorio de clientes/prospectos.
  - `sales`: Registro de ventas cerradas.

---

## 5. Recursos Humanos (HR)

### 🖥️ Frontend
- **Rutas**: `/hr`, `/attendance`
- **Componentes Clave**:
  - `components/hr/employee-profile.tsx`: Legajo digital.
  - `components/attendance/check-in-button.tsx`: Geolocalización y marca de asistencia.

### 🔄 Backend
- **Procesos**:
  - Cálculo de horas trabajadas.
  - Gestión de contratos y vencimientos.

### 🗄️ Base de Datos
- **Tablas**:
  - `employees`: Datos sensibles del personal (salario, cuenta bancaria).
  - `attendance_logs`: Registros de entrada/salida/refrigerio con coordenadas.
  - `contracts`: Historial de contratos y adjuntos PDF.

---

## 6. Integraciones y Open Data

### 🖥️ Frontend
- **Rutas**: `/open-data`
- **Vistas**: Tablas de análisis de competidores y noticias scrapeadas.

### 🔄 Backend
- **Servicios**:
  - `lib/services/news-scraper.ts`: Scraper de Puppeteer (Serverless) para noticias de Perú Compras.
  - `app/api/webhooks/scrape-news`: Endpoint cronjob para ejecución periódica.

### 🗄️ Base de Datos
- **Tablas**:
  - `market_data`: Datos importados de fuentes externas.
  - `news`: Noticias cacheadas y procesadas.
  - `brand_alerts`: Configuraciones de monitoreo de marcas.

---

## 7. Chat y Comunicaciones

### 🖥️ Frontend
- **Rutas**: Dashboard global (Floating Chat)
- **Componentes**: `components/atlas-assistant.tsx` (Interfaz de Chatbox).
- **Tiempo Real**: Suscripción a cambios de Supabase (Realtime).

### 🔄 Backend
- **IA**: Integración con Google Gemini para respuestas automatizadas.
- **RAG**: Búsqueda semántica en base de conocimiento (opcional/futuro).

### 🗄️ Base de Datos
- **Tablas**:
  - `chat_messages`: Historial de mensajes.
  - `chat_participants`: Miembros de conversaciones.
