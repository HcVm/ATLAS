-- Instrucciones para configurar el almacenamiento de imágenes en Supabase

-- NOTA: Los buckets de almacenamiento no se pueden crear directamente desde SQL
-- Deben crearse desde la interfaz de Supabase o usando la API

DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURACIÓN DE ALMACENAMIENTO PARA NOTICIAS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Para configurar el almacenamiento de imágenes:';
    RAISE NOTICE '';
    RAISE NOTICE '1. OPCIÓN AUTOMÁTICA:';
    RAISE NOTICE '   - Ve a /storage-setup en tu aplicación';
    RAISE NOTICE '   - Haz clic en "Crear Bucket news-images"';
    RAISE NOTICE '';
    RAISE NOTICE '2. OPCIÓN MANUAL:';
    RAISE NOTICE '   - Ve a Storage en el dashboard de Supabase';
    RAISE NOTICE '   - Crea un nuevo bucket llamado "news-images"';
    RAISE NOTICE '   - Configuración recomendada:';
    RAISE NOTICE '     * Público: Sí';
    RAISE NOTICE '     * Tipos de archivo: image/png, image/jpeg, image/gif, image/webp';
    RAISE NOTICE '     * Tamaño máximo: 5MB (5242880 bytes)';
    RAISE NOTICE '';
    RAISE NOTICE '3. POLÍTICAS DE ACCESO:';
    RAISE NOTICE '   - Lectura pública: Permitir a todos ver las imágenes';
    RAISE NOTICE '   - Escritura: Solo usuarios autenticados pueden subir';
    RAISE NOTICE '';
    RAISE NOTICE 'Una vez configurado, las noticias podrán incluir imágenes.';
    RAISE NOTICE '';
    
    -- Verificar que la tabla news existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news') THEN
        RAISE NOTICE '✅ La tabla news está lista para almacenar URLs de imágenes';
    ELSE
        RAISE NOTICE '❌ La tabla news no existe. Ejecuta primero los scripts de creación de tablas.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FIN DE INSTRUCCIONES ===';
END $$;
