-- Verificar y arreglar el acceso del usuario al almacén

-- 1. Verificar usuario actual
SELECT 'Usuario actual:' as info, auth.uid() as user_id;

-- 2. Verificar perfil del usuario
SELECT 'Perfil del usuario:' as info;
SELECT id, email, full_name, role, company_id, department_id 
FROM profiles 
WHERE id = auth.uid();

-- 3. Si el usuario no tiene company_id, asignarlo a la primera empresa
UPDATE profiles 
SET company_id = (SELECT id FROM companies LIMIT 1),
    updated_at = NOW()
WHERE id = auth.uid() 
AND company_id IS NULL;

-- 4. Si el usuario no tiene department_id, asignarlo al departamento de Almacén
UPDATE profiles 
SET department_id = (
    SELECT d.id 
    FROM departments d 
    WHERE d.name = 'Almacén' 
    AND d.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    LIMIT 1
),
updated_at = NOW()
WHERE id = auth.uid() 
AND department_id IS NULL;

-- 5. Verificar estado final del usuario
SELECT 'Estado final del usuario:' as info;
SELECT p.id, p.email, p.full_name, p.role, 
       c.name as company_name, 
       d.name as department_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.id = auth.uid();

-- 6. Eliminar políticas existentes y crear nuevas más permisivas
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

DROP POLICY IF EXISTS "inventory_movements_select_policy" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_policy" ON inventory_movements;

DROP POLICY IF EXISTS "product_categories_select_policy" ON product_categories;
DROP POLICY IF EXISTS "brands_select_policy" ON brands;

-- Crear políticas más simples y permisivas
CREATE POLICY "products_select_simple" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = products.company_id
        )
    );

CREATE POLICY "products_insert_simple" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = products.company_id
        )
    );

CREATE POLICY "products_update_simple" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = products.company_id
        )
    );

CREATE POLICY "inventory_movements_select_simple" ON inventory_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = inventory_movements.company_id
        )
    );

CREATE POLICY "inventory_movements_insert_simple" ON inventory_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = inventory_movements.company_id
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "product_categories_select_simple" ON product_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = product_categories.company_id
        )
    );

CREATE POLICY "brands_select_simple" ON brands
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = brands.company_id
        )
    );

-- 7. Verificar que las políticas funcionan
SELECT 'Verificando acceso a productos:' as info;
SELECT COUNT(*) as productos_visibles FROM products;

SELECT 'Verificando acceso a categorías:' as info;
SELECT COUNT(*) as categorias_visibles FROM product_categories;

SELECT 'Verificando acceso a marcas:' as info;
SELECT COUNT(*) as marcas_visibles FROM brands;

SELECT 'Configuración completada exitosamente' as resultado;
