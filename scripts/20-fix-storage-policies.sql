-- Crear políticas de seguridad para el almacenamiento de Supabase

-- 1. Permitir que usuarios autenticados puedan subir archivos a buckets específicos
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('images', 'news-images', 'public', 'media') AND
  auth.role() = 'authenticated'
);

-- 2. Permitir lectura pública de archivos en buckets específicos
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id IN ('images', 'news-images', 'public', 'media'));

-- 3. Permitir que usuarios autenticados actualicen sus propios archivos
CREATE POLICY "Allow authenticated users to update their files" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id IN ('images', 'news-images', 'public', 'media'));

-- 4. Permitir que usuarios autenticados eliminen sus propios archivos
CREATE POLICY "Allow authenticated users to delete their files" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Política más permisiva para administradores (opcional)
CREATE POLICY "Allow admins full access to storage" ON storage.objects
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
  )
);

-- Verificar que las políticas se crearon correctamente
DO $$
BEGIN
    RAISE NOTICE '=== POLÍTICAS DE ALMACENAMIENTO CREADAS ===';
    RAISE NOTICE '';
    
    -- Contar políticas creadas
    DECLARE
        policy_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO policy_count 
        FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage';
        
        RAISE NOTICE 'Total de políticas para storage.objects: %', policy_count;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Políticas creadas:';
    RAISE NOTICE '✅ Subida para usuarios autenticados';
    RAISE NOTICE '✅ Lectura pública';
    RAISE NOTICE '✅ Actualización para propietarios';
    RAISE NOTICE '✅ Eliminación para propietarios';
    RAISE NOTICE '✅ Acceso completo para administradores';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora deberías poder subir imágenes sin problemas.';
END $$;
