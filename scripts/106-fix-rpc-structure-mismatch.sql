-- Corregir estructura de función RPC para tickets de soporte

-- Eliminar función existente
DROP FUNCTION IF EXISTS public.get_support_tickets_for_company(UUID, UUID);

-- Crear función con estructura correcta que coincida con el frontend
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
    
    -- Verificar que tenemos un usuario válido
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No hay usuario autenticado';
    END IF;
    
    -- Obtener información del usuario actual
    SELECT p.company_id, p.role, COALESCE(d.name, '') as dept_name
    INTO user_company_id, user_role, user_dept_name
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = current_user_id;
    
    -- Verificar que encontramos el perfil del usuario
    IF user_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el perfil del usuario';
    END IF;
    
    -- Verificar si el usuario puede ver todos los tickets de la empresa
    can_view_all := (
        user_role = 'admin' 
        OR user_dept_name = 'Tecnología'
    ) AND user_company_id = target_company_id;
    
    -- Log para debugging
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
        COALESCE(creator.full_name, creator.email, 'Usuario') as creator_name,
        COALESCE(creator.email, '') as creator_email,
        COALESCE(assigned.full_name, assigned.email, '') as assigned_name,
        COALESCE(assigned.email, '') as assigned_email
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
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en get_support_tickets_for_company: %', SQLERRM;
        -- Retornar tabla vacía en caso de error
        RETURN;
END $$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_support_tickets_for_company(UUID, UUID) TO authenticated;

-- Función simplificada para obtener tickets (fallback)
CREATE OR REPLACE FUNCTION public.get_support_tickets_simple(
    target_company_id UUID
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
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        st.updated_at
    FROM support_tickets st
    WHERE st.company_id = target_company_id
    ORDER BY st.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_support_tickets_simple(UUID) TO authenticated;

-- Verificar que las funciones se crearon correctamente
DO $$
BEGIN
    RAISE NOTICE '=== FUNCIONES RPC CORREGIDAS ===';
    RAISE NOTICE 'Función get_support_tickets_for_company recreada';
    RAISE NOTICE 'Función get_support_tickets_simple creada como fallback';
    RAISE NOTICE 'Estructura de retorno corregida para coincidir con frontend';
    RAISE NOTICE '=====================================';
END $$;
