-- Debug simple para ver qué está pasando
DO $$
DECLARE
    current_user_id uuid;
    user_info RECORD;
    company_info RECORD;
    dept_info RECORD;
BEGIN
    RAISE NOTICE '=== DEBUG SIMPLE ===';
    
    -- 1. Usuario actual
    SELECT auth.uid() INTO current_user_id;
    RAISE NOTICE '1. Usuario ID: %', COALESCE(current_user_id::text, 'NULL');
    
    -- 2. Información del perfil
    IF current_user_id IS NOT NULL THEN
        SELECT * INTO user_info FROM profiles WHERE id = current_user_id;
        IF FOUND THEN
            RAISE NOTICE '2. Perfil:';
            RAISE NOTICE '   - Email: %', user_info.email;
            RAISE NOTICE '   - Nombre: %', user_info.full_name;
            RAISE NOTICE '   - Rol: %', user_info.role;
            RAISE NOTICE '   - Empresa ID: %', COALESCE(user_info.company_id::text, 'NULL');
            RAISE NOTICE '   - Departamento ID: %', COALESCE(user_info.department_id::text, 'NULL');
            
            -- 3. Información de la empresa
            IF user_info.company_id IS NOT NULL THEN
                SELECT * INTO company_info FROM companies WHERE id = user_info.company_id;
                IF FOUND THEN
                    RAISE NOTICE '3. Empresa: % (%)', company_info.name, company_info.code;
                ELSE
                    RAISE NOTICE '3. ❌ Empresa no encontrada';
                END IF;
            END IF;
            
            -- 4. Información del departamento
            IF user_info.department_id IS NOT NULL THEN
                SELECT * INTO dept_info FROM departments WHERE id = user_info.department_id;
                IF FOUND THEN
                    RAISE NOTICE '4. Departamento: %', dept_info.name;
                ELSE
                    RAISE NOTICE '4. ❌ Departamento no encontrado';
                END IF;
            END IF;
        ELSE
            RAISE NOTICE '2. ❌ No se encontró perfil';
        END IF;
    END IF;
    
    -- 5. Verificar tablas del almacén
    RAISE NOTICE '5. Tablas del almacén:';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE NOTICE '   ✅ brands existe';
    ELSE
        RAISE NOTICE '   ❌ brands NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE NOTICE '   ✅ product_categories existe';
    ELSE
        RAISE NOTICE '   ❌ product_categories NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   ✅ products existe';
    ELSE
        RAISE NOTICE '   ❌ products NO existe';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE NOTICE '   ✅ inventory_movements existe';
    ELSE
        RAISE NOTICE '   ❌ inventory_movements NO existe';
    END IF;
    
    -- 6. Verificar función has_warehouse_access
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_warehouse_access') THEN
        RAISE NOTICE '6. ✅ Función has_warehouse_access existe';
        
        -- Probar la función
        IF current_user_id IS NOT NULL THEN
            BEGIN
                DECLARE
                    access_result boolean;
                BEGIN
                    SELECT has_warehouse_access() INTO access_result;
                    RAISE NOTICE '   Resultado: %', access_result;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '   ❌ Error: %', SQLERRM;
                END;
            END;
        END IF;
    ELSE
        RAISE NOTICE '6. ❌ Función has_warehouse_access NO existe';
    END IF;
    
    -- 7. Contar datos si las tablas existen
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
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
            
            RAISE NOTICE '7. Datos:';
            RAISE NOTICE '   - Marcas: %', brands_count;
            RAISE NOTICE '   - Categorías: %', categories_count;
            RAISE NOTICE '   - Productos: %', products_count;
            RAISE NOTICE '   - Movimientos: %', movements_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '7. ❌ Error contando datos: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '=== FIN DEBUG ===';
END $$;
