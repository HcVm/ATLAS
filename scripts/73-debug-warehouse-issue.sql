-- Debug completo del problema del almacén
DO $$
DECLARE
    current_user_id uuid;
    user_profile RECORD;
    company_record RECORD;
    dept_record RECORD;
BEGIN
    RAISE NOTICE '=== DEBUG COMPLETO DEL ALMACÉN ===';
    
    -- 1. Usuario actual
    SELECT auth.uid() INTO current_user_id;
    RAISE NOTICE '1. Usuario ID: %', COALESCE(current_user_id::text, 'NULL - NO AUTENTICADO');
    
    -- 2. Perfil del usuario
    IF current_user_id IS NOT NULL THEN
        SELECT * INTO user_profile FROM profiles WHERE id = current_user_id;
        IF FOUND THEN
            RAISE NOTICE '2. Perfil:';
            RAISE NOTICE '   Email: %', user_profile.email;
            RAISE NOTICE '   Rol: %', user_profile.role;
            RAISE NOTICE '   Empresa ID: %', COALESCE(user_profile.company_id::text, 'NULL');
            RAISE NOTICE '   Departamento ID: %', COALESCE(user_profile.department_id::text, 'NULL');
            
            -- Información de la empresa
            IF user_profile.company_id IS NOT NULL THEN
                SELECT * INTO company_record FROM companies WHERE id = user_profile.company_id;
                IF FOUND THEN
                    RAISE NOTICE '   Empresa: % (%)', company_record.name, company_record.code;
                ELSE
                    RAISE NOTICE '   ❌ Empresa no encontrada';
                END IF;
            END IF;
            
            -- Información del departamento
            IF user_profile.department_id IS NOT NULL THEN
                SELECT * INTO dept_record FROM departments WHERE id = user_profile.department_id;
                IF FOUND THEN
                    RAISE NOTICE '   Departamento: %', dept_record.name;
                ELSE
                    RAISE NOTICE '   ❌ Departamento no encontrado';
                END IF;
            END IF;
        ELSE
            RAISE NOTICE '2. ❌ Perfil no encontrado';
        END IF;
    END IF;
    
    -- 3. Verificar tablas del almacén
    RAISE NOTICE '3. Tablas del almacén:';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE NOTICE '   ✅ brands existe';
        DECLARE brands_count int;
        BEGIN
            SELECT COUNT(*) INTO brands_count FROM brands;
            RAISE NOTICE '      Registros: %', brands_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '      ❌ Error al contar: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ❌ brands NO EXISTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE NOTICE '   ✅ product_categories existe';
        DECLARE categories_count int;
        BEGIN
            SELECT COUNT(*) INTO categories_count FROM product_categories;
            RAISE NOTICE '      Registros: %', categories_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '      ❌ Error al contar: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ❌ product_categories NO EXISTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   ✅ products existe';
        DECLARE products_count int;
        BEGIN
            SELECT COUNT(*) INTO products_count FROM products;
            RAISE NOTICE '      Registros: %', products_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '      ❌ Error al contar: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ❌ products NO EXISTE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE NOTICE '   ✅ inventory_movements existe';
        DECLARE movements_count int;
        BEGIN
            SELECT COUNT(*) INTO movements_count FROM inventory_movements;
            RAISE NOTICE '      Registros: %', movements_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '      ❌ Error al contar: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '   ❌ inventory_movements NO EXISTE';
    END IF;
    
    -- 4. Verificar función has_warehouse_access
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_warehouse_access') THEN
        RAISE NOTICE '4. ✅ Función has_warehouse_access existe';
        IF current_user_id IS NOT NULL THEN
            DECLARE has_access boolean;
            BEGIN
                SELECT has_warehouse_access() INTO has_access;
                RAISE NOTICE '   Acceso: %', has_access;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '   ❌ Error: %', SQLERRM;
            END;
        END IF;
    ELSE
        RAISE NOTICE '4. ❌ Función has_warehouse_access NO EXISTE';
    END IF;
    
    -- 5. Verificar políticas RLS
    RAISE NOTICE '5. Políticas RLS:';
    DECLARE policy_count int;
    BEGIN
        SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename IN ('brands', 'product_categories', 'products', 'inventory_movements');
        RAISE NOTICE '   Políticas encontradas: %', policy_count;
        
        -- Mostrar políticas específicas
        FOR policy_count IN 
            SELECT COUNT(*) FROM pg_policies WHERE tablename = 'brands'
        LOOP
            RAISE NOTICE '   brands: % políticas', policy_count;
        END LOOP;
        
        FOR policy_count IN 
            SELECT COUNT(*) FROM pg_policies WHERE tablename = 'products'
        LOOP
            RAISE NOTICE '   products: % políticas', policy_count;
        END LOOP;
    END;
    
    -- 6. Estructura básica
    RAISE NOTICE '6. Estructura básica:';
    DECLARE 
        companies_count int;
        departments_count int;
        warehouse_depts int;
    BEGIN
        SELECT COUNT(*) INTO companies_count FROM companies;
        SELECT COUNT(*) INTO departments_count FROM departments;
        SELECT COUNT(*) INTO warehouse_depts FROM departments WHERE name IN ('Almacén', 'Contabilidad');
        
        RAISE NOTICE '   Empresas: %', companies_count;
        RAISE NOTICE '   Departamentos: %', departments_count;
        RAISE NOTICE '   Depts Almacén/Contabilidad: %', warehouse_depts;
    END;
    
    RAISE NOTICE '=== FIN DEBUG ===';
END $$;
