-- Instrucciones para configurar manualmente las políticas de storage
-- Script: 122-configure-storage-policies-manual.sql
-- ESTE SCRIPT ES SOLO INFORMATIVO - LAS POLÍTICAS DEBEN CONFIGURARSE EN EL DASHBOARD

/*
CONFIGURACIÓN MANUAL REQUERIDA EN EL DASHBOARD DE SUPABASE:

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a Storage > Policies
3. Selecciona el bucket "images"
4. Crea las siguientes políticas:

POLÍTICA 1 - Ver imágenes de productos:
- Nombre: "Allow viewing product images"
- Operación: SELECT
- Target roles: authenticated
- USING expression: bucket_id = 'images' AND name LIKE 'products/%'

POLÍTICA 2 - Subir imágenes de productos:
- Nombre: "Allow uploading product images"  
- Operación: INSERT
- Target roles: authenticated
- WITH CHECK expression: bucket_id = 'images' AND name LIKE 'products/%'

POLÍTICA 3 - Actualizar imágenes de productos:
- Nombre: "Allow updating product images"
- Operación: UPDATE
- Target roles: authenticated
- USING expression: bucket_id = 'images' AND name LIKE 'products/%'

POLÍTICA 4 - Eliminar imágenes de productos:
- Nombre: "Allow deleting product images"
- Operación: DELETE
- Target roles: authenticated
- USING expression: bucket_id = 'images' AND name LIKE 'products/%'

ALTERNATIVA - Si prefieres políticas más permisivas temporalmente:
Puedes crear una política general para todo el bucket "images":
- USING/WITH CHECK: bucket_id = 'images'
- Esto permitirá acceso a todas las carpetas dentro de images/

VERIFICACIÓN:
Después de configurar las políticas, verifica que puedes:
1. Subir archivos a la carpeta products/ desde la aplicación
2. Ver las imágenes subidas
3. Eliminar imágenes cuando sea necesario
*/

-- Verificar que la columna fue agregada correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'image_url';

-- Verificar índices relacionados con image_url
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'products' 
AND indexname LIKE '%image%';
