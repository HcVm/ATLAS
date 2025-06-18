-- Corregir función get_tech_users y verificar su creación

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS get_tech_users(UUID);
DROP FUNCTION IF EXISTS public.get_tech_users(UUID);

-- Verificar que la tabla profiles y departments existen y tienen las columnas necesarias
DO $$
BEGIN
    -- Verificar estructura de tablas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department_id') THEN
        RAISE EXCEPTION 'La columna department_id no existe en la tabla profiles';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'name') THEN
        RAISE EXCEPTION 'La columna name no existe en la tabla departments';
    END IF;
    
    RAISE NOTICE 'Estructura de tablas verificada correctamente';
END $$;

-- Crear función get_tech_users con manejo de errores
CREATE OR REPLACE FUNCTION public.get_tech_users(target_company_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log para debugging
    RAISE NOTICE 'Buscando usuarios de Tecnología para empresa: %', target_company_id;
    
    -- Verificar que la empresa existe
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
        RAISE NOTICE 'Empresa no encontrada: %', target_company_id;
        RETURN;
    END IF;
    
    -- Retornar usuarios del departamento de Tecnología
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.full_name, p.email) as full_name,
        p.email,
        p.avatar_url
    FROM profiles p
    INNER JOIN departments d ON p.department_id = d.id
    WHERE p.company_id = target_company_id
      AND d.name = 'Tecnología'
      AND p.id IS NOT NULL
    ORDER BY COALESCE(p.full_name, p.email);
    
    -- Log del resultado
    GET DIAGNOSTICS target_company_id = ROW_COUNT;
    RAISE NOTICE 'Encontrados % usuarios de Tecnología', target_company_id;
    
END $$;

-- Verificar que la función se creó correctamente
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_tech_users'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'Función get_tech_users creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error: La función get_tech_users no se pudo crear';
    END IF;
END $$;

-- Crear función alternativa más simple para debugging
CREATE OR REPLACE FUNCTION public.get_tech_users_simple(target_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'full_name', COALESCE(p.full_name, p.email),
            'email', p.email,
            'avatar_url', p.avatar_url
        )
    )
    INTO result
    FROM profiles p
    INNER JOIN departments d ON p.department_id = d.id
    WHERE p.company_id = target_company_id
      AND d.name = 'Tecnología';
    
    RETURN COALESCE(result, '[]'::JSON);
END $$;

-- Verificar que existen usuarios en departamentos de Tecnología
DO $$
DECLARE
    company_record RECORD;
    tech_dept_id UUID;
    user_count INTEGER;
BEGIN
    FOR company_record IN SELECT id, name FROM companies LOOP
        -- Buscar o crear departamento de Tecnología
        SELECT id INTO tech_dept_id
        FROM departments 
        WHERE company_id = company_record.id AND name = 'Tecnología';
        
        IF tech_dept_id IS NULL THEN
            INSERT INTO departments (company_id, name, description, color)
            VALUES (
                company_record.id, 
                'Tecnología', 
                'Departamento de Tecnología e Informática',
                '#3B82F6'
            )
            RETURNING id INTO tech_dept_id;
            
            RAISE NOTICE 'Creado departamento de Tecnología para empresa: %', company_record.name;
        END IF;
        
        -- Contar usuarios en el departamento
        SELECT COUNT(*) INTO user_count
        FROM profiles 
        WHERE company_id = company_record.id AND department_id = tech_dept_id;
        
        RAISE NOTICE 'Empresa %: % usuarios en Tecnología', company_record.name, user_count;
        
        -- Si no hay usuarios, sugerir asignar algunos
        IF user_count = 0 THEN
            RAISE NOTICE 'SUGERENCIA: Asigna usuarios al departamento de Tecnología en empresa %', company_record.name;
        END IF;
    END LOOP;
END $$;

-- Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION public.get_tech_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tech_users_simple(UUID) TO authenticated;

-- Test de la función (comentado para evitar errores si no hay datos)
/*
DO $$
DECLARE
    test_company_id UUID;
    test_result RECORD;
BEGIN
    -- Obtener una empresa para testing
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NOT NULL THEN
        RAISE NOTICE 'Probando función con empresa: %', test_company_id;
        
        FOR test_result IN SELECT * FROM get_tech_users(test_company_id) LOOP
            RAISE NOTICE 'Usuario encontrado: % (%)', test_result.full_name, test_result.email;
        END LOOP;
    END IF;
END $$;
*/

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '=== FUNCIÓN get_tech_users CORREGIDA ===';
    RAISE NOTICE 'Función creada en esquema public';
    RAISE NOTICE 'Permisos otorgados a authenticated';
    RAISE NOTICE 'Función alternativa get_tech_users_simple disponible';
    RAISE NOTICE 'Verificar que hay usuarios en departamentos de Tecnología';
    RAISE NOTICE '=====================================';
END $$;
