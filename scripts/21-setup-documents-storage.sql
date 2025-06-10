-- Configurar almacenamiento para documentos

DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURACIÓN DE ALMACENAMIENTO PARA DOCUMENTOS ===';
    RAISE NOTICE '';
    
    -- Crear políticas para el bucket de documentos
    RAISE NOTICE 'Creando políticas para almacenamiento de documentos...';
    
    -- Política para subir documentos (usuarios autenticados)
    BEGIN
        CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id IN ('documents', 'files', 'attachments') AND
          auth.role() = 'authenticated'
        );
        RAISE NOTICE '✅ Política de subida creada';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Política de subida ya existe';
    END;
    
    -- Política para leer documentos (usuarios autenticados)
    BEGIN
        CREATE POLICY "Allow authenticated users to read documents" ON storage.objects
        FOR SELECT TO authenticated
        USING (bucket_id IN ('documents', 'files', 'attachments'));
        RAISE NOTICE '✅ Política de lectura creada';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Política de lectura ya existe';
    END;
    
    -- Política para actualizar documentos (propietarios)
    BEGIN
        CREATE POLICY "Allow users to update their documents" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id IN ('documents', 'files', 'attachments') AND
          auth.uid()::text = (storage.foldername(name))[1]
        )
        WITH CHECK (bucket_id IN ('documents', 'files', 'attachments'));
        RAISE NOTICE '✅ Política de actualización creada';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Política de actualización ya existe';
    END;
    
    -- Política para eliminar documentos (propietarios)
    BEGIN
        CREATE POLICY "Allow users to delete their documents" ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id IN ('documents', 'files', 'attachments') AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
        RAISE NOTICE '✅ Política de eliminación creada';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ Política de eliminación ya existe';
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SIGUIENTE PASO:';
    RAISE NOTICE 'Ve a Storage en el dashboard de Supabase y crea un bucket llamado "documents"';
    RAISE NOTICE 'O usa la página /storage-setup para crear el bucket automáticamente';
    RAISE NOTICE '';
    
END $$;

-- Verificar políticas existentes para documentos
SELECT 
    'Políticas de almacenamiento para documentos:' as info,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%document%'
ORDER BY policyname;
