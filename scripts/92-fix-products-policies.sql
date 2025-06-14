-- Limpiar todas las políticas de products
DROP POLICY IF EXISTS "Allow all authenticated users to view products" ON products;
DROP POLICY IF EXISTS "Allow admins to manage products" ON products;
DROP POLICY IF EXISTS "products_select_simple" ON products;
DROP POLICY IF EXISTS "products_insert_simple" ON products;
DROP POLICY IF EXISTS "products_update_simple" ON products;
DROP POLICY IF EXISTS "products_delete_simple" ON products;
DROP POLICY IF EXISTS "Users can view products from their company" ON products;
DROP POLICY IF EXISTS "Warehouse staff can manage products" ON products;

-- Crear políticas más simples y claras
CREATE POLICY "products_select_policy" ON products
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "products_insert_policy" ON products
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "products_update_policy" ON products
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "products_delete_policy" ON products
    FOR DELETE USING (
        auth.role() = 'authenticated'
    );

-- Verificar que RLS esté habilitado
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Mostrar políticas finales
SELECT 'Políticas de products después de la limpieza:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY cmd, policyname;

-- Verificar estructura de la tabla
SELECT 'Estructura de la tabla products:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
