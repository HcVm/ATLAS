-- Corregir acceso del usuario al almacén
DO $$
DECLARE
    current_user_id uuid;
    first_company_id uuid;
    warehouse_dept_id uuid;
    admin_profile RECORD;
BEGIN
    RAISE NOTICE '=== CORRIGIENDO ACCESO AL ALMACÉN ===';
    
    -- 1. Obtener usuario actual
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No hay usuario autenticado. Debes estar logueado.';
        RETURN;
    END IF;
    
    RAISE NOTICE '1. Usuario actual: %', current_user_id;
    
    -- 2. Obtener primera empresa
    SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
    
    IF first_company_id IS NULL THEN
        RAISE NOTICE '❌ No hay empresas en la base de datos';
        RETURN;
    END IF;
    
    RAISE NOTICE '2. Primera empresa ID: %', first_company_id;
    
    -- 3. Obtener departamento de almacén de esa empresa
    SELECT id INTO warehouse_dept_id 
    FROM departments 
    WHERE company_id = first_company_id AND name = 'Almacén' 
    LIMIT 1;
    
    IF warehouse_dept_id IS NULL THEN
        RAISE NOTICE '❌ No existe departamento de Almacén en la primera empresa';
        RETURN;
    END IF;
    
    RAISE NOTICE '3. Departamento de Almacén ID: %', warehouse_dept_id;
    
    -- 4. Actualizar perfil del usuario
    UPDATE profiles 
    SET 
        company_id = first_company_id,
        department_id = warehouse_dept_id,
        role = 'admin',
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RAISE NOTICE '4. ✅ Perfil actualizado';
    
    -- 5. Verificar el perfil actualizado
    SELECT * INTO admin_profile FROM profiles WHERE id = current_user_id;
    
    RAISE NOTICE '5. Perfil verificado:';
    RAISE NOTICE '   - Email: %', admin_profile.email;
    RAISE NOTICE '   - Rol: %', admin_profile.role;
    RAISE NOTICE '   - Empresa: %', admin_profile.company_id;
    RAISE NOTICE '   - Departamento: %', admin_profile.department_id;
    
    -- 6. Probar acceso al almacén
    DECLARE
        has_access boolean;
    BEGIN
        SELECT has_warehouse_access() INTO has_access;
        RAISE NOTICE '6. ✅ Acceso al almacén: %', has_access;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '6. ❌ Error al verificar acceso: %', SQLERRM;
    END;
    
    -- 7. Crear algunos datos de prueba si no existen
    IF NOT EXISTS (SELECT 1 FROM brands LIMIT 1) THEN
        RAISE NOTICE '7. Creando datos de prueba...';
        
        -- Crear categorías básicas
        INSERT INTO product_categories (name, description, company_id, color)
        SELECT 
            'Categoría General',
            'Categoría por defecto para productos',
            id,
            '#6B7280'
        FROM companies;
        
        RAISE NOTICE '   ✅ Categorías creadas';
    ELSE
        RAISE NOTICE '7. Ya existen datos, no se crean datos de prueba';
    END IF;
    
    RAISE NOTICE '=== CORRECCIÓN COMPLETADA ===';
    RAISE NOTICE 'Ahora deberías poder acceder al módulo de almacén.';
    RAISE NOTICE 'Recarga la página del navegador para ver los cambios.';
END $$;
