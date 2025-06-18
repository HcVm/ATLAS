-- Corregir filtrado de tickets por empresa para admins

-- Primero, verificar la estructura actual
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUCTURA DE TICKETS ===';
    
    -- Verificar columnas en support_tickets
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'company_id') THEN
        RAISE NOTICE '✓ Columna company_id existe en support_tickets';
    ELSE
        RAISE EXCEPTION '✗ Columna company_id NO existe en support_tickets';
    END IF;
    
    -- Verificar datos de ejemplo
    RAISE NOTICE 'Tickets existentes por empresa:';
    FOR rec IN 
        SELECT 
            c.name as company_name,
            COUNT(st.id) as ticket_count
        FROM companies c
        LEFT JOIN support_tickets st ON c.id = st.company_id
        GROUP BY c.id, c.name
        ORDER BY c.name
    LOOP
        RAISE NOTICE '  %: % tickets', rec.company_name, rec.ticket_count;
    END LOOP;
END $$;

-- Corregir políticas RLS para mejor filtrado por empresa
DROP POLICY IF EXISTS "Users can view support tickets" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;

-- Política mejorada para visualización de tickets
CREATE POLICY "support_tickets_view_policy" ON support_tickets
    FOR SELECT
    USING (
        -- El usuario puede ver el ticket si:
        -- 1. Es el creador del ticket
        created_by = auth.uid()
        OR
        -- 2. Está asignado al ticket
        assigned_to = auth.uid()
        OR
        -- 3. Es admin de la misma empresa
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.company_id = support_tickets.company_id
            AND p.role = 'admin'
        )
        OR
        -- 4. Es del departamento de Tecnología de la misma empresa
        EXISTS (
            SELECT 1 FROM profiles p
            INNER JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid()
            AND p.company_id = support_tickets.company_id
            AND d.name = 'Tecnología'
        )
    );

-- Función para obtener tickets con filtros mejorados
CREATE OR REPLACE FUNCTION public.get_support_tickets_for_company(
    target_company_id UUID,
    user_id UUID DEFAULT NULL
)
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
    creator_name TEXT,
    creator_email TEXT,
    assigned_name TEXT,
    assigned_email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    user_company_id UUID;
    user_role TEXT;
    user_dept_name TEXT;
    can_view_all BOOLEAN := FALSE;
BEGIN
    -- Usar el user_id proporcionado o el actual
    current_user_id := COALESCE(user_id, auth.uid());
    
    -- Obtener información del usuario actual
    SELECT p.company_id, p.role, d.name
    INTO user_company_id, user_role, user_dept_name
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = current_user_id;
    
    -- Verificar si el usuario puede ver todos los tickets de la empresa
    can_view_all := (
        user_role = 'admin' 
        OR user_dept_name = 'Tecnología'
    ) AND user_company_id = target_company_id;
    
    RAISE NOTICE 'Usuario %: empresa=%, rol=%, dept=%, puede_ver_todos=%', 
        current_user_id, user_company_id, user_role, user_dept_name, can_view_all;
    
    -- Retornar tickets según permisos
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
        COALESCE(creator.full_name, creator.email) as creator_name,
        creator.email as creator_email,
        COALESCE(assigned.full_name, assigned.email) as assigned_name,
        assigned.email as assigned_email
    FROM support_tickets st
    LEFT JOIN profiles creator ON st.created_by = creator.id
    LEFT JOIN profiles assigned ON st.assigned_to = assigned.id
    WHERE st.company_id = target_company_id
    AND (
        can_view_all 
        OR st.created_by = current_user_id 
        OR st.assigned_to = current_user_id
    )
    ORDER BY st.created_at DESC;
    
END $$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_support_tickets_for_company(UUID, UUID) TO authenticated;

-- Función para debugging - obtener información del usuario actual
CREATE OR REPLACE FUNCTION public.debug_user_support_access()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    SELECT json_build_object(
        'user_id', current_user_id,
        'profile', (
            SELECT json_build_object(
                'id', p.id,
                'email', p.email,
                'full_name', p.full_name,
                'role', p.role,
                'company_id', p.company_id,
                'department_id', p.department_id,
                'company_name', c.name,
                'department_name', d.name
            )
            FROM profiles p
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = current_user_id
        ),
        'companies_with_tickets', (
            SELECT json_agg(
                json_build_object(
                    'company_id', c.id,
                    'company_name', c.name,
                    'ticket_count', (
                        SELECT COUNT(*) FROM support_tickets st WHERE st.company_id = c.id
                    )
                )
            )
            FROM companies c
        )
    ) INTO result;
    
    RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.debug_user_support_access() TO authenticated;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '=== FILTRADO DE TICKETS POR EMPRESA CORREGIDO ===';
    RAISE NOTICE 'Políticas RLS actualizadas';
    RAISE NOTICE 'Función get_support_tickets_for_company creada';
    RAISE NOTICE 'Función debug_user_support_access disponible';
    RAISE NOTICE 'Los admins ahora pueden ver tickets de su empresa seleccionada';
    RAISE NOTICE '================================================';
END $$;
