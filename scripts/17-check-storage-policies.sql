-- Verificar y mostrar información sobre las políticas de almacenamiento

DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE ALMACENAMIENTO ===';
    RAISE NOTICE '';
    
    -- Verificar si existen buckets (esto no funcionará en SQL, pero es informativo)
    RAISE NOTICE 'Para verificar buckets de almacenamiento:';
    RAISE NOTICE '1. Ve a /storage-setup en tu aplicación';
    RAISE NOTICE '2. O ve a Storage en el dashboard de Supabase';
    RAISE NOTICE '';
    
    -- Verificar políticas RLS en tablas relacionadas
    RAISE NOTICE 'Verificando políticas RLS:';
    
    -- Verificar tabla news
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla news existe';
        
        -- Verificar si RLS está habilitado
        IF EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = 'news' AND n.nspname = 'public' AND c.relrowsecurity = true
        ) THEN
            RAISE NOTICE '✅ RLS habilitado en tabla news';
        ELSE
            RAISE NOTICE '⚠️ RLS no habilitado en tabla news';
        END IF;
        
        -- Contar políticas
        DECLARE
            policy_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO policy_count 
            FROM pg_policies 
            WHERE tablename = 'news' AND schemaname = 'public';
            
            RAISE NOTICE 'Políticas en tabla news: %', policy_count;
        END;
    ELSE
        RAISE NOTICE '❌ Tabla news no existe';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIONES RECOMENDADAS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. CREAR BUCKET MANUALMENTE:';
    RAISE NOTICE '   - Ve a Storage > Create bucket en Supabase';
    RAISE NOTICE '   - Nombre: cualquiera (ej: "images", "media")';
    RAISE NOTICE '   - Público: Sí';
    RAISE NOTICE '';
    RAISE NOTICE '2. EL CÓDIGO ACTUALIZADO:';
    RAISE NOTICE '   - Intenta múltiples buckets automáticamente';
    RAISE NOTICE '   - Funciona sin imagen si falla la subida';
    RAISE NOTICE '   - Muestra advertencias claras al usuario';
    RAISE NOTICE '';
    RAISE NOTICE '3. VERIFICAR PERMISOS:';
    RAISE NOTICE '   - El usuario debe tener rol admin o supervisor';
    RAISE NOTICE '   - Las políticas RLS deben permitir la operación';
    RAISE NOTICE '';
    
END $$;

-- Mostrar información del usuario actual si está disponible
SELECT 
    'Usuario actual (si está autenticado):' as info,
    auth.uid() as user_id;

-- Mostrar usuarios admin/supervisor
SELECT 
    'Usuarios con permisos para crear noticias:' as info,
    email,
    full_name,
    role
FROM profiles 
WHERE role IN ('admin', 'supervisor')
ORDER BY role, email;
