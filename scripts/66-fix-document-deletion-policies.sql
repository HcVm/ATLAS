-- Script para arreglar las políticas de eliminación de documentos
-- y otros problemas relacionados

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO POLÍTICAS DE ELIMINACIÓN ===';
    
    -- Verificar políticas existentes para documents
    RAISE NOTICE 'Políticas actuales para la tabla documents:';
    
    -- Mostrar políticas existentes
    FOR rec IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'documents'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '- %: % (%) - %', rec.policyname, rec.cmd, rec.permissive, rec.qual;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CREANDO/ACTUALIZANDO POLÍTICAS DE ELIMINACIÓN ===';
    
    -- Eliminar política de eliminación existente si existe
    DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
    
    -- Crear nueva política de eliminación más permisiva
    CREATE POLICY "documents_delete_policy" ON documents
        FOR DELETE
        USING (
            -- Admins pueden eliminar cualquier documento de su empresa (o todas si es super admin)
            (auth.jwt() ->> 'role' = 'admin' AND (
                company_id = (auth.jwt() ->> 'company_id')::uuid OR
                auth.jwt() ->> 'company_id' IS NULL
            ))
            OR
            -- Supervisores pueden eliminar documentos de su empresa
            (auth.jwt() ->> 'role' = 'supervisor' AND 
             company_id = (auth.jwt() ->> 'company_id')::uuid)
            OR
            -- Usuarios pueden eliminar solo documentos que crearon
            (created_by = (auth.jwt() ->> 'sub')::uuid AND
             company_id = (auth.jwt() ->> 'company_id')::uuid)
        );
    
    RAISE NOTICE '✓ Política de eliminación de documentos actualizada';
    
    -- Verificar políticas para document_movements
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando políticas para document_movements...';
    
    -- Crear política de eliminación para movimientos (en cascada con documentos)
    DROP POLICY IF EXISTS "document_movements_delete_policy" ON document_movements;
    
    CREATE POLICY "document_movements_delete_policy" ON document_movements
        FOR DELETE
        USING (
            -- Admins pueden eliminar movimientos
            (auth.jwt() ->> 'role' = 'admin' AND (
                EXISTS (
                    SELECT 1 FROM documents d 
                    WHERE d.id = document_movements.document_id 
                    AND (d.company_id = (auth.jwt() ->> 'company_id')::uuid OR
                         auth.jwt() ->> 'company_id' IS NULL)
                )
            ))
            OR
            -- Supervisores pueden eliminar movimientos de su empresa
            (auth.jwt() ->> 'role' = 'supervisor' AND 
             EXISTS (
                SELECT 1 FROM documents d 
                WHERE d.id = document_movements.document_id 
                AND d.company_id = (auth.jwt() ->> 'company_id')::uuid
             ))
            OR
            -- Usuarios pueden eliminar movimientos de documentos que crearon
            (EXISTS (
                SELECT 1 FROM documents d 
                WHERE d.id = document_movements.document_id 
                AND d.created_by = (auth.jwt() ->> 'sub')::uuid
                AND d.company_id = (auth.jwt() ->> 'company_id')::uuid
            ))
        );
    
    RAISE NOTICE '✓ Política de eliminación de movimientos actualizada';
    
    -- Verificar políticas para document_attachments
    RAISE NOTICE '';
    RAISE NOTICE 'Verificando políticas para document_attachments...';
    
    DROP POLICY IF EXISTS "document_attachments_delete_policy" ON document_attachments;
    
    CREATE POLICY "document_attachments_delete_policy" ON document_attachments
        FOR DELETE
        USING (
            -- Misma lógica que documentos
            (auth.jwt() ->> 'role' = 'admin' AND (
                EXISTS (
                    SELECT 1 FROM documents d 
                    WHERE d.id = document_attachments.document_id 
                    AND (d.company_id = (auth.jwt() ->> 'company_id')::uuid OR
                         auth.jwt() ->> 'company_id' IS NULL)
                )
            ))
            OR
            (auth.jwt() ->> 'role' = 'supervisor' AND 
             EXISTS (
                SELECT 1 FROM documents d 
                WHERE d.id = document_attachments.document_id 
                AND d.company_id = (auth.jwt() ->> 'company_id')::uuid
             ))
            OR
            (EXISTS (
                SELECT 1 FROM documents d 
                WHERE d.id = document_attachments.document_id 
                AND d.created_by = (auth.jwt() ->> 'sub')::uuid
                AND d.company_id = (auth.jwt() ->> 'company_id')::uuid
            ))
        );
    
    RAISE NOTICE '✓ Política de eliminación de adjuntos actualizada';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO FUNCIÓN DE ELIMINACIÓN EN CASCADA ===';
    
    -- Crear función para eliminar documento con todas sus dependencias
    CREATE OR REPLACE FUNCTION delete_document_cascade(doc_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        doc_exists BOOLEAN;
        user_can_delete BOOLEAN;
    BEGIN
        -- Verificar si el documento existe
        SELECT EXISTS(SELECT 1 FROM documents WHERE id = doc_id) INTO doc_exists;
        
        IF NOT doc_exists THEN
            RAISE EXCEPTION 'Documento no encontrado';
        END IF;
        
        -- Verificar permisos (simplificado para la función)
        SELECT EXISTS(
            SELECT 1 FROM documents d
            WHERE d.id = doc_id
            AND (
                -- Admin de la empresa o super admin
                (auth.jwt() ->> 'role' = 'admin' AND (
                    d.company_id = (auth.jwt() ->> 'company_id')::uuid OR
                    auth.jwt() ->> 'company_id' IS NULL
                ))
                OR
                -- Supervisor de la empresa
                (auth.jwt() ->> 'role' = 'supervisor' AND 
                 d.company_id = (auth.jwt() ->> 'company_id')::uuid)
                OR
                -- Creador del documento
                (d.created_by = (auth.jwt() ->> 'sub')::uuid AND
                 d.company_id = (auth.jwt() ->> 'company_id')::uuid)
            )
        ) INTO user_can_delete;
        
        IF NOT user_can_delete THEN
            RAISE EXCEPTION 'No tienes permisos para eliminar este documento';
        END IF;
        
        -- Eliminar en orden (las políticas RLS se encargan de los permisos)
        DELETE FROM document_attachments WHERE document_id = doc_id;
        DELETE FROM document_movements WHERE document_id = doc_id;
        DELETE FROM documents WHERE id = doc_id;
        
        RETURN TRUE;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error al eliminar documento: %', SQLERRM;
    END;
    $$;
    
    RAISE NOTICE '✓ Función delete_document_cascade creada';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    -- Mostrar políticas finales
    RAISE NOTICE 'Políticas de eliminación configuradas:';
    FOR rec IN 
        SELECT tablename, policyname, cmd
        FROM pg_policies 
        WHERE tablename IN ('documents', 'document_movements', 'document_attachments')
        AND cmd = 'DELETE'
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '- %.%: %', rec.tablename, rec.policyname, rec.cmd;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Políticas de eliminación configuradas correctamente';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTA: Si el botón de eliminar sigue sin funcionar,';
    RAISE NOTICE 'verifica que el frontend esté usando la función delete_document_cascade()';
    RAISE NOTICE 'o que las políticas RLS estén habilitadas correctamente.';
    
END $$;
