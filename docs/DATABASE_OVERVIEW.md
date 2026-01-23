# Guía de Base de Datos

ATLAS utiliza **Supabase (PostgreSQL)** como motor de base de datos. La integridad de los datos y las reglas de acceso se gestionan a nivel de base de datos.

## Esquema y Tipos
El proyecto utiliza tipos generados automáticamente para garantizar la seguridad de tipos en TypeScript.
**Archivo de referencia**: `lib/database.types.ts`

> **Nota**: No editar este archivo manualmente. Ejecutar `npm run gen:types` para actualizarlo después de cambios en la DB.

## Tablas Principales (Core)

### `profiles`
Almacena la información extendida de los usuarios.
- `id`: FK a `auth.users`
- `role`: Roles de acceso (admin, supervisor, user)
- `department_id`: FK a departamento
- `company_id`: FK a empresa principal

### `companies`
Entidades legales o sedes gestionadas por el sistema.
- Multitenancy lógico: Muchos recursos están vinculados a una `company_id`.

### `documents`
Registro central de documentos generados o subidos.
- `code`: Identificador único (autogenerado o manual)
- `type`: Tipo de documento (oficio, carta, informe)
- `status`: Estado del flujo (borrador, emitido, anulado)

## Tablas de Módulos

### Inventario (`products`, `movements`)
Control de stock y trazabilidad de ítems.
- `movements` registra entradas y salidas para auditoría.

### Ventas (`sales`, `quotations`, `clients`)
Gestión comercial.
- `quotations` permite generar PDFs de cotizaciones.
- `sales` vincula cotizaciones aprobadas con movimientos de inventario.

## Seguridad (RLS)
Todas las tablas tienen habilitado Row Level Security.
- **Lectura**: Generalmente permitida a usuarios autenticados de la misma compañía/departamento.
- **Escritura**: Restringida por Rol o Propiedad del registro.
