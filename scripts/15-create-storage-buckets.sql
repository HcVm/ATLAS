-- Verificar si el bucket de imágenes existe y crearlo si no
DO $$
BEGIN
    -- No podemos verificar directamente si un bucket existe en SQL
    -- Pero podemos intentar crear uno y manejar el error si ya existe
    
    -- Nota: Este script es informativo, ya que la creación de buckets
    -- debe hacerse desde la interfaz de Supabase o usando la API
    
    RAISE NOTICE 'Para crear buckets de almacenamiento en Supabase:';
    RAISE NOTICE '1. Ve a la sección Storage en el dashboard de Supabase';
    RAISE NOTICE '2. Crea un nuevo bucket llamado "images"';
    RAISE NOTICE '3. Configura los permisos del bucket para permitir:';
    RAISE NOTICE '   - Lectura pública (para mostrar imágenes)';
    RAISE NOTICE '   - Escritura para usuarios autenticados';
    
    -- Verificar que las políticas RLS están habilitadas para las tablas
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando políticas RLS para la tabla news:';
    
    IF EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE tablename = 'news' AND schemaname = 'public'
    ) THEN
        RAISE NOTICE 'La tabla news existe';
        
        IF EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'news' AND schemaname = 'public'
        ) THEN
            RAISE NOTICE 'La tabla news tiene políticas RLS configuradas';
        ELSE
            RAISE NOTICE 'La tabla news no tiene políticas RLS configuradas';
        END IF;
    ELSE
        RAISE NOTICE 'La tabla news no existe';
    END IF;
END $$;
