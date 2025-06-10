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
    
    -- Política para leer documentos (público y autenticados)
    BEGIN
        -- Primero eliminamos la política anterior si existe, para evitar errores al cambiarla
        DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
        DROP POLICY IF EXISTS "Allow public and authenticated read access to documents" ON storage.objects; -- En caso de que ya exista con el nuevo nombre

        CREATE POLICY "Allow public and authenticated read access to documents" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id IN ('documents', 'files', 'attachments'));
        RAISE NOTICE '✅ Política de lectura pública y autenticada creada/actualizada';
    EXCEPTION
        WHEN OTHERS THEN -- Captura genérica por si DROP POLICY falla porque no existe, etc.
            RAISE NOTICE '⚠️ Error al crear/actualizar política de lectura: %', SQLERRM;
            -- Intentar crearla de todas formas por si el error fue por el DROP
            BEGIN
                CREATE POLICY "Allow public and authenticated read access to documents" ON storage.objects
                FOR SELECT TO anon, authenticated
                USING (bucket_id IN ('documents', 'files', 'attachments'));
                RAISE NOTICE '✅ Política de lectura pública y autenticada creada (segundo intento)';
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE '⚠️ Política de lectura pública y autenticada ya existe (segundo intento)';
            END;
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
