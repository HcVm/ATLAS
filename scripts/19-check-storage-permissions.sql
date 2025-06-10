-- Script para verificar y configurar permisos de almacenamiento

DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DE PERMISOS DE ALMACENAMIENTO ===';
    RAISE NOTICE '';
    
    -- Verificar si existen políticas para storage
    RAISE NOTICE 'Verificando políticas de almacenamiento:';
    
    -- Verificar si existen políticas para objetos de almacenamiento
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        RAISE NOTICE '✅ Existen políticas para objetos de almacenamiento';
        
        -- Contar políticas
        DECLARE
            policy_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO policy_count 
            FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage';
            
            RAISE NOTICE 'Número de políticas: %', policy_count;
        END;
    ELSE
        RAISE NOTICE '⚠️ No se encontraron políticas para objetos de almacenamiento';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIONES RECOMENDADAS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. VERIFICAR PERMISOS EN SUPABASE:';
    RAISE NOTICE '   - Ve a Storage > Policies en el dashboard de Supabase';
    RAISE NOTICE '   - Asegúrate de que existan políticas que permitan:';
    RAISE NOTICE '     * Lectura pública para todos los buckets';
    RAISE NOTICE '     * Escritura para usuarios autenticados';
    RAISE NOTICE '';
    RAISE NOTICE '2. CREAR POLÍTICAS BÁSICAS:';
    RAISE NOTICE '   Si no existen políticas, puedes crear las siguientes:';
    RAISE NOTICE '';
    
    -- Mostrar ejemplos de políticas
    RAISE NOTICE 'Ejemplo de políticas para permitir lectura pública:';
    RAISE NOTICE 'CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id = ''images'' OR bucket_id = ''news-images'');';
    RAISE NOTICE '';
    RAISE NOTICE 'Ejemplo de políticas para permitir escritura a usuarios autenticados:';
    RAISE NOTICE 'CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated USING (bucket_id = ''images'' OR bucket_id = ''news-images'');';
    RAISE NOTICE '';
    
    -- Verificar si el usuario actual tiene permisos para crear buckets
    RAISE NOTICE '3. VERIFICAR PERMISOS DEL USUARIO:';
    RAISE NOTICE '   - El usuario debe tener permisos para crear buckets y subir archivos';
    RAISE NOTICE '   - Asegúrate de que el usuario esté autenticado y tenga el rol adecuado';
    RAISE NOTICE '';
    
    -- Mostrar información sobre buckets
    RAISE NOTICE '4. CREAR BUCKETS MANUALMENTE:';
    RAISE NOTICE '   - Ve a Storage > New Bucket en el dashboard de Supabase';
    RAISE NOTICE '   - Crea un bucket llamado "news-images" o "images"';
    RAISE NOTICE '   - Marca el bucket como público';
    RAISE NOTICE '';
    
    RAISE NOTICE '=== FIN DE DIAGNÓSTICO ===';
END $$;

-- Mostrar información del usuario actual si está disponible
SELECT 
    'Usuario actual (si está autenticado):' as info,
    auth.uid() as user_id;

-- Mostrar usuarios admin/supervisor que pueden crear noticias
SELECT 
    'Usuarios con permisos para crear noticias:' as info,
    email,
    full_name,
    role
FROM profiles 
WHERE role IN ('admin', 'supervisor')
ORDER BY role, email;
