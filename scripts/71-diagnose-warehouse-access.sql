-- Diagnóstico completo del acceso al almacén
DO $$
DECLARE
    current_user_id uuid;
    user_profile RECORD;
    warehouse_tables_exist boolean := true;
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE ACCESO AL ALMACÉN ===';
    
    -- 1. Verificar usuario actual
    SELECT auth.uid() INTO current_user_id;
    RAISE NOTICE '1. Usuario actual ID: %', COALESCE(current_user_id::text, 'NULL - No autenticado');
    
    -- 2. Verificar perfil del usuario
    IF current_user_id IS NOT NULL THEN
        SELECT * INTO user_profile 
        FROM profiles 
        WHERE id = current_user_id;
        
        IF FOUND THEN
            RAISE NOTICE '2. Perfil encontrado:';
            RAISE NOTICE '   - Email: %', user_profile.email;
            RAISE NOTICE '   - Rol: %', user_profile.role;
            RAISE NOTICE '   - Empresa ID: %', COALESCE(user_profile.company_id::text, 'NULL');
            RAISE NOTICE '   - Departamento ID: %', COALESCE(user_profile.department_id::text, 'NULL');
        ELSE
            RAISE NOTICE '2. ❌ No se encontró perfil para el usuario';
        END IF;
    END IF;
    
    -- 3. Verificar existencia de tablas del almacén
    RAISE NOTICE '3. Verificando tablas del almacén:';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE NOTICE '   ❌ Tabla brands no existe';
        warehouse_tables_exist := false;
    ELSE
        RAISE NOTICE '   ✅ Tabla brands existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE NOTICE '   ❌ Tabla product_categories no existe';
        warehouse_tables_exist := false;
    ELSE
        RAISE NOTICE '   ✅ Tabla product_categories existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   ❌ Tabla products no existe';
        warehouse_tables_exist := false;
    ELSE
        RAISE NOTICE '   ✅ Tabla products existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE NOTICE '   ❌ Tabla inventory_movements no existe';
        warehouse_tables_exist := false;
    ELSE
        RAISE NOTICE '   ✅ Tabla inventory_movements existe';
    END IF;
    
    -- 4. Verificar función has_warehouse_access
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_warehouse_access') THEN
        RAISE NOTICE '4. ✅ Función has_warehouse_access existe';
        
        -- Probar la función si el usuario está autenticado
        IF current_user_id IS NOT NULL THEN
            DECLARE
                has_access boolean;
            BEGIN
                SELECT has_warehouse_access() INTO has_access;
                RAISE NOTICE '   - Usuario tiene acceso al almacén: %', has_access;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ❌ Error al ejecutar has_warehouse_access(): %', SQLERRM;
            END;
        END IF;
    ELSE
        RAISE NOTICE '4. ❌ Función has_warehouse_access no existe';
    END IF;
    
    -- 5. Verificar políticas RLS
    RAISE NOTICE '5. Verificando políticas RLS:';
    
    IF warehouse_tables_exist THEN
        -- Verificar políticas en brands
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands') THEN
            RAISE NOTICE '   ✅ Políticas RLS en brands configuradas';
        ELSE
            RAISE NOTICE '   ❌ No hay políticas RLS en brands';
        END IF;
        
        -- Verificar políticas en products
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products') THEN
            RAISE NOTICE '   ✅ Políticas RLS en products configuradas';
        ELSE
            RAISE NOTICE '   ❌ No hay políticas RLS en products';
        END IF;
    END IF;
    
    -- 6. Contar datos existentes
    IF warehouse_tables_exist THEN
        RAISE NOTICE '6. Datos existentes:';
        DECLARE
            brands_count int;
            categories_count int;
            products_count int;
            movements_count int;
        BEGIN
            SELECT COUNT(*) INTO brands_count FROM brands;
            SELECT COUNT(*) INTO categories_count FROM product_categories;
            SELECT COUNT(*) INTO products_count FROM products;
            SELECT COUNT(*) INTO movements_count FROM inventory_movements;
            
            RAISE NOTICE '   - Marcas: %', brands_count;
            RAISE NOTICE '   - Categorías: %', categories_count;
            RAISE NOTICE '   - Productos: %', products_count;
            RAISE NOTICE '   - Movimientos: %', movements_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Error al contar datos: %', SQLERRM;
        END;
    END IF;
    
    -- 7. Verificar empresas y departamentos
    RAISE NOTICE '7. Verificando estructura básica:';
    DECLARE
        companies_count int;
        departments_count int;
        warehouse_depts_count int;
    BEGIN
        SELECT COUNT(*) INTO companies_count FROM companies;
        SELECT COUNT(*) INTO departments_count FROM departments;
        SELECT COUNT(*) INTO warehouse_depts_count FROM departments WHERE name IN ('Almacén', 'Contabilidad');
        
        RAISE NOTICE '   - Empresas: %', companies_count;
        RAISE NOTICE '   - Departamentos totales: %', departments_count;
        RAISE NOTICE '   - Departamentos de almacén/contabilidad: %', warehouse_depts_count;
    END;
    
    RAISE NOTICE '=== FIN DEL DIAGNÓSTICO ===';
END $$;
