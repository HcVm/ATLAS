-- Arreglar todas las políticas RLS para que sean más permisivas
DO $$
BEGIN
    RAISE NOTICE 'Eliminando políticas restrictivas y creando políticas permisivas...';
    
    -- Eliminar políticas existentes que pueden estar causando problemas
    DROP POLICY IF EXISTS "Users can view departments of their company" ON departments;
    DROP POLICY IF EXISTS "Users can view companies" ON companies;
    DROP POLICY IF EXISTS "Users can view profiles of their company" ON profiles;
    
    -- Crear políticas más permisivas para departments
    CREATE POLICY "Allow all authenticated users to view departments" ON departments
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow admins to manage departments" ON departments
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    -- Crear políticas más permisivas para companies
    CREATE POLICY "Allow all authenticated users to view companies" ON companies
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow admins to manage companies" ON companies
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    -- Crear políticas más permisivas para profiles
    CREATE POLICY "Allow users to view all profiles" ON profiles
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow users to update their own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);
    
    CREATE POLICY "Allow admins to manage all profiles" ON profiles
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    -- Políticas para las tablas del almacén (muy permisivas para debug)
    DROP POLICY IF EXISTS "warehouse_brands_select" ON brands;
    DROP POLICY IF EXISTS "warehouse_categories_select" ON product_categories;
    DROP POLICY IF EXISTS "warehouse_products_select" ON products;
    DROP POLICY IF EXISTS "warehouse_movements_select" ON inventory_movements;
    
    CREATE POLICY "Allow all authenticated users to view brands" ON brands
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow all authenticated users to view categories" ON product_categories
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow all authenticated users to view products" ON products
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow all authenticated users to view movements" ON inventory_movements
        FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Allow admins to manage brands" ON brands
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    CREATE POLICY "Allow admins to manage categories" ON product_categories
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    CREATE POLICY "Allow admins to manage products" ON products
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    CREATE POLICY "Allow admins to manage movements" ON inventory_movements
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('admin', 'supervisor')
            )
        );
    
    RAISE NOTICE 'Políticas RLS actualizadas exitosamente.';
    RAISE NOTICE 'Ahora todos los usuarios autenticados pueden ver los datos básicos.';
    RAISE NOTICE 'Solo admins y supervisores pueden modificar datos.';
END $$;
