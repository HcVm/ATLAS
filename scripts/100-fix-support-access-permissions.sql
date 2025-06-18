-- Corregir permisos de acceso y gestión de tickets de soporte

-- Primero, verificar y corregir las políticas existentes
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_comments_select_policy" ON support_comments;
DROP POLICY IF EXISTS "support_comments_insert_policy" ON support_comments;
DROP POLICY IF EXISTS "support_attachments_select_policy" ON support_attachments;
DROP POLICY IF EXISTS "support_attachments_insert_policy" ON support_attachments;

-- POLÍTICAS PARA SUPPORT_TICKETS

-- 1. Ver tickets: Usuarios pueden ver tickets donde:
--    - Son el creador del ticket, O
--    - Son admin, O  
--    - Pertenecen al departamento de Tecnología de la misma empresa
CREATE POLICY "support_tickets_select_policy" ON support_tickets
    FOR SELECT USING (
        -- El usuario es el creador del ticket
        created_by = auth.uid() OR
        -- O es admin de la misma empresa
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.company_id = support_tickets.company_id
            AND p.role = 'admin'
        ) OR
        -- O pertenece al departamento de Tecnología de la misma empresa
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() 
            AND p.company_id = support_tickets.company_id
            AND d.name = 'Tecnología'
        ) OR
        -- O está asignado al ticket
        assigned_to = auth.uid()
    );

-- 2. Crear tickets: Cualquier usuario autenticado de la empresa
CREATE POLICY "support_tickets_insert_policy" ON support_tickets
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
    );

-- 3. Actualizar tickets: Admins y departamento de Tecnología
CREATE POLICY "support_tickets_update_policy" ON support_tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() 
            AND p.company_id = support_tickets.company_id
            AND (p.role = 'admin' OR d.name = 'Tecnología')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() 
            AND p.company_id = support_tickets.company_id
            AND (p.role = 'admin' OR d.name = 'Tecnología')
        )
    );

-- POLÍTICAS PARA SUPPORT_COMMENTS

-- 1. Ver comentarios: Misma lógica que ver tickets
CREATE POLICY "support_comments_select_policy" ON support_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_comments.ticket_id 
            AND (
                -- Es el creador del ticket
                st.created_by = auth.uid() OR
                -- O es admin de la empresa
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND p.role = 'admin'
                ) OR
                -- O es del departamento de Tecnología
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND d.name = 'Tecnología'
                ) OR
                -- O está asignado al ticket
                st.assigned_to = auth.uid()
            )
        )
    );

-- 2. Crear comentarios: Cualquier usuario que pueda ver el ticket
CREATE POLICY "support_comments_insert_policy" ON support_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_comments.ticket_id 
            AND (
                -- Es el creador del ticket
                st.created_by = auth.uid() OR
                -- O es admin de la empresa
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND p.role = 'admin'
                ) OR
                -- O es del departamento de Tecnología
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND d.name = 'Tecnología'
                ) OR
                -- O está asignado al ticket
                st.assigned_to = auth.uid()
            )
        )
    );

-- POLÍTICAS PARA SUPPORT_ATTACHMENTS

-- 1. Ver adjuntos: Misma lógica que comentarios
CREATE POLICY "support_attachments_select_policy" ON support_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_attachments.ticket_id 
            AND (
                -- Es el creador del ticket
                st.created_by = auth.uid() OR
                -- O es admin de la empresa
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND p.role = 'admin'
                ) OR
                -- O es del departamento de Tecnología
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND d.name = 'Tecnología'
                ) OR
                -- O está asignado al ticket
                st.assigned_to = auth.uid()
            )
        )
    );

-- 2. Crear adjuntos: Cualquier usuario que pueda ver el ticket
CREATE POLICY "support_attachments_insert_policy" ON support_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_attachments.ticket_id 
            AND (
                -- Es el creador del ticket
                st.created_by = auth.uid() OR
                -- O es admin de la empresa
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND p.role = 'admin'
                ) OR
                -- O es del departamento de Tecnología
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = st.company_id
                    AND d.name = 'Tecnología'
                ) OR
                -- O está asignado al ticket
                st.assigned_to = auth.uid()
            )
        )
    );

-- Crear función para verificar si un usuario puede gestionar tickets
CREATE OR REPLACE FUNCTION can_manage_support_tickets(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.id = user_id 
        AND p.company_id = company_id
        AND (p.role = 'admin' OR d.name = 'Tecnología')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear función para obtener tickets con permisos
CREATE OR REPLACE FUNCTION get_support_tickets_for_user(user_id UUID)
RETURNS TABLE (
    id UUID,
    ticket_number TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    category TEXT,
    created_by UUID,
    assigned_to UUID,
    company_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    creator_name TEXT,
    creator_avatar TEXT,
    assigned_name TEXT,
    assigned_avatar TEXT,
    can_manage BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.ticket_number,
        st.title,
        st.description,
        st.status,
        st.priority,
        st.category,
        st.created_by,
        st.assigned_to,
        st.company_id,
        st.created_at,
        st.updated_at,
        st.resolved_at,
        st.closed_at,
        creator.full_name as creator_name,
        creator.avatar_url as creator_avatar,
        assigned.full_name as assigned_name,
        assigned.avatar_url as assigned_avatar,
        can_manage_support_tickets(user_id, st.company_id) as can_manage
    FROM support_tickets st
    LEFT JOIN profiles creator ON st.created_by = creator.id
    LEFT JOIN profiles assigned ON st.assigned_to = assigned.id
    WHERE 
        -- El usuario puede ver este ticket
        st.created_by = user_id OR
        st.assigned_to = user_id OR
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = user_id 
            AND p.company_id = st.company_id
            AND (p.role = 'admin' OR d.name = 'Tecnología')
        )
    ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que todos los usuarios tengan acceso a su company_id
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN 
        SELECT id, email, company_id, department_id 
        FROM profiles 
        WHERE company_id IS NULL
    LOOP
        RAISE NOTICE 'Usuario sin company_id: % (email: %)', profile_record.id, profile_record.email;
    END LOOP;
    
    -- Verificar departamentos de Tecnología
    FOR profile_record IN 
        SELECT c.name as company_name, COUNT(d.id) as tech_depts
        FROM companies c
        LEFT JOIN departments d ON c.id = d.company_id AND d.name = 'Tecnología'
        GROUP BY c.id, c.name
    LOOP
        IF profile_record.tech_depts = 0 THEN
            RAISE NOTICE 'Empresa sin departamento de Tecnología: %', profile_record.company_name;
        END IF;
    END LOOP;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '=== PERMISOS DE SOPORTE CORREGIDOS ===';
    RAISE NOTICE 'Políticas RLS actualizadas para mejor acceso';
    RAISE NOTICE 'Personal de Tecnología puede gestionar todos los tickets';
    RAISE NOTICE 'Usuarios pueden ver y comentar sus propios tickets';
    RAISE NOTICE 'Función de gestión de permisos creada';
    RAISE NOTICE '=====================================';
END $$;
