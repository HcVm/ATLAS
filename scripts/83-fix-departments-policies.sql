-- Arreglar políticas de departamentos para que sean visibles

DO $$
BEGIN
    RAISE NOTICE 'Arreglando políticas de departamentos...';
    
    -- Eliminar políticas existentes de departments
    DROP POLICY IF EXISTS "departments_select_policy" ON departments;
    DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
    DROP POLICY IF EXISTS "departments_update_policy" ON departments;
    DROP POLICY IF EXISTS "departments_delete_policy" ON departments;
    DROP POLICY IF EXISTS "departments_select_simple" ON departments;
    DROP POLICY IF EXISTS "departments_insert_simple" ON departments;
    DROP POLICY IF EXISTS "departments_update_simple" ON departments;
    DROP POLICY IF EXISTS "departments_delete_simple" ON departments;
    
    -- Crear políticas simples para departments
    CREATE POLICY "departments_select_simple" ON departments
        FOR SELECT USING (true);
    
    CREATE POLICY "departments_insert_simple" ON departments
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "departments_update_simple" ON departments
        FOR UPDATE USING (true);
    
    CREATE POLICY "departments_delete_simple" ON departments
        FOR DELETE USING (true);
    
    -- Arreglar políticas de almacén también - eliminar todas las existentes primero
    DROP POLICY IF EXISTS "brands_select_policy" ON brands;
    DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
    DROP POLICY IF EXISTS "brands_update_policy" ON brands;
    DROP POLICY IF EXISTS "brands_delete_policy" ON brands;
    DROP POLICY IF EXISTS "brands_select_simple" ON brands;
    DROP POLICY IF EXISTS "brands_insert_simple" ON brands;
    DROP POLICY IF EXISTS "brands_update_simple" ON brands;
    DROP POLICY IF EXISTS "brands_delete_simple" ON brands;
    
    DROP POLICY IF EXISTS "product_categories_select_policy" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_insert_policy" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_update_policy" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_delete_policy" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_select_simple" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_insert_simple" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_update_simple" ON product_categories;
    DROP POLICY IF EXISTS "product_categories_delete_simple" ON product_categories;
    
    DROP POLICY IF EXISTS "products_select_policy" ON products;
    DROP POLICY IF EXISTS "products_insert_policy" ON products;
    DROP POLICY IF EXISTS "products_update_policy" ON products;
    DROP POLICY IF EXISTS "products_delete_policy" ON products;
    DROP POLICY IF EXISTS "products_select_simple" ON products;
    DROP POLICY IF EXISTS "products_insert_simple" ON products;
    DROP POLICY IF EXISTS "products_update_simple" ON products;
    DROP POLICY IF EXISTS "products_delete_simple" ON products;
    
    DROP POLICY IF EXISTS "inventory_movements_select_policy" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_insert_policy" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_update_policy" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_delete_policy" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_select_simple" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_insert_simple" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_update_simple" ON inventory_movements;
    DROP POLICY IF EXISTS "inventory_movements_delete_simple" ON inventory_movements;
    
    -- Crear políticas simples para brands
    CREATE POLICY "brands_select_simple" ON brands
        FOR SELECT USING (true);
    
    CREATE POLICY "brands_insert_simple" ON brands
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "brands_update_simple" ON brands
        FOR UPDATE USING (true);
    
    CREATE POLICY "brands_delete_simple" ON brands
        FOR DELETE USING (true);
    
    -- Crear políticas simples para product_categories
    CREATE POLICY "product_categories_select_simple" ON product_categories
        FOR SELECT USING (true);
    
    CREATE POLICY "product_categories_insert_simple" ON product_categories
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "product_categories_update_simple" ON product_categories
        FOR UPDATE USING (true);
    
    CREATE POLICY "product_categories_delete_simple" ON product_categories
        FOR DELETE USING (true);
    
    -- Crear políticas simples para products
    CREATE POLICY "products_select_simple" ON products
        FOR SELECT USING (true);
    
    CREATE POLICY "products_insert_simple" ON products
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "products_update_simple" ON products
        FOR UPDATE USING (true);
    
    CREATE POLICY "products_delete_simple" ON products
        FOR DELETE USING (true);
    
    -- Crear políticas simples para inventory_movements
    CREATE POLICY "inventory_movements_select_simple" ON inventory_movements
        FOR SELECT USING (true);
    
    CREATE POLICY "inventory_movements_insert_simple" ON inventory_movements
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "inventory_movements_update_simple" ON inventory_movements
        FOR UPDATE USING (true);
    
    CREATE POLICY "inventory_movements_delete_simple" ON inventory_movements
        FOR DELETE USING (true);
    
    RAISE NOTICE 'Políticas arregladas exitosamente!';
    
END $$;

-- Verificar que todo esté funcionando
SELECT 'Departamentos totales:' as info, COUNT(*) as cantidad FROM departments
UNION ALL
SELECT 'Departamentos ASIGNAR:', COUNT(*) FROM departments WHERE name = 'ASIGNAR'
UNION ALL
SELECT 'Empresas totales:', COUNT(*) FROM companies
UNION ALL
SELECT 'Marcas totales:', COUNT(*) FROM brands
UNION ALL
SELECT 'Categorías totales:', COUNT(*) FROM product_categories;
