-- Reparar completamente el sistema de soporte

-- Deshabilitar RLS temporalmente para limpiar
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_comments_select_policy" ON support_comments;
DROP POLICY IF EXISTS "support_comments_insert_policy" ON support_comments;
DROP POLICY IF EXISTS "support_attachments_select_policy" ON support_attachments;
DROP POLICY IF EXISTS "support_attachments_insert_policy" ON support_attachments;

-- Eliminar funciones problemáticas
DROP FUNCTION IF EXISTS public.get_support_tickets_for_company(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_support_tickets_simple(UUID);
DROP FUNCTION IF EXISTS public.can_manage_support_tickets(UUID, UUID);
DROP FUNCTION IF EXISTS public.update_ticket_status(UUID, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_tech_users(UUID);
DROP FUNCTION IF EXISTS public.debug_user_support_access();

-- Crear políticas RLS simples y funcionales

-- SUPPORT_TICKETS: Políticas simples
CREATE POLICY "tickets_select_all" ON support_tickets
    FOR SELECT USING (true);

CREATE POLICY "tickets_insert_own" ON support_tickets
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "tickets_update_all" ON support_tickets
    FOR UPDATE USING (true);

-- SUPPORT_COMMENTS: Políticas simples
CREATE POLICY "comments_select_all" ON support_comments
    FOR SELECT USING (true);

CREATE POLICY "comments_insert_own" ON support_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- SUPPORT_ATTACHMENTS: Políticas simples
CREATE POLICY "attachments_select_all" ON support_attachments
    FOR SELECT USING (true);

CREATE POLICY "attachments_insert_own" ON support_attachments
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Habilitar RLS nuevamente
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Crear función simple para obtener usuarios de tecnología
CREATE OR REPLACE FUNCTION public.get_tech_users_simple(company_uuid UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(p.full_name, p.email) as full_name,
        p.email,
        p.avatar_url
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.company_id = company_uuid
    AND (
        p.role = 'admin' 
        OR d.name = 'Tecnología'
        OR d.name = 'tecnologia'
        OR d.name = 'TECNOLOGIA'
    );
END $$;

GRANT EXECUTE ON FUNCTION public.get_tech_users_simple(UUID) TO authenticated;

-- Crear función simple para verificar permisos
CREATE OR REPLACE FUNCTION public.can_manage_tickets(user_uuid UUID, company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    dept_name TEXT;
BEGIN
    SELECT p.role, COALESCE(d.name, '') 
    INTO user_role, dept_name
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = user_uuid AND p.company_id = company_uuid;
    
    RETURN (
        user_role = 'admin' 
        OR dept_name ILIKE '%tecnolog%'
    );
END $$;

GRANT EXECUTE ON FUNCTION public.can_manage_tickets(UUID, UUID) TO authenticated;

-- Crear función simple para actualizar tickets
CREATE OR REPLACE FUNCTION public.update_support_ticket(
    ticket_uuid UUID,
    new_status TEXT,
    new_assigned_to UUID DEFAULT NULL,
    user_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user UUID;
    ticket_company UUID;
    can_update BOOLEAN;
    update_data JSONB;
BEGIN
    current_user := COALESCE(user_uuid, auth.uid());
    
    -- Obtener company_id del ticket
    SELECT company_id INTO ticket_company
    FROM support_tickets
    WHERE id = ticket_uuid;
    
    IF ticket_company IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permisos
    SELECT can_manage_tickets(current_user, ticket_company) INTO can_update;
    
    IF NOT can_update THEN
        RETURN FALSE;
    END IF;
    
    -- Preparar datos de actualización
    update_data := jsonb_build_object(
        'status', new_status,
        'assigned_to', new_assigned_to,
        'updated_at', NOW()
    );
    
    -- Agregar timestamps según el estado
    IF new_status = 'resolved' THEN
        update_data := update_data || jsonb_build_object('resolved_at', NOW());
    ELSIF new_status = 'closed' THEN
        update_data := update_data || jsonb_build_object('closed_at', NOW());
    END IF;
    
    -- Actualizar ticket
    UPDATE support_tickets
    SET 
        status = (update_data->>'status')::TEXT,
        assigned_to = CASE 
            WHEN update_data->>'assigned_to' = 'null' THEN NULL
            ELSE (update_data->>'assigned_to')::UUID
        END,
        updated_at = (update_data->>'updated_at')::TIMESTAMPTZ,
        resolved_at = CASE 
            WHEN update_data ? 'resolved_at' THEN (update_data->>'resolved_at')::TIMESTAMPTZ
            ELSE resolved_at
        END,
        closed_at = CASE 
            WHEN update_data ? 'closed_at' THEN (update_data->>'closed_at')::TIMESTAMPTZ
            ELSE closed_at
        END
    WHERE id = ticket_uuid;
    
    RETURN FOUND;
END $$;

GRANT EXECUTE ON FUNCTION public.update_support_ticket(UUID, TEXT, UUID, UUID) TO authenticated;

-- Verificar que existan departamentos de Tecnología
DO $$
DECLARE
    company_rec RECORD;
    dept_count INTEGER;
BEGIN
    FOR company_rec IN SELECT id, name FROM companies LOOP
        SELECT COUNT(*) INTO dept_count
        FROM departments 
        WHERE company_id = company_rec.id 
        AND name ILIKE '%tecnolog%';
        
        IF dept_count = 0 THEN
            INSERT INTO departments (company_id, name, description, color)
            VALUES (
                company_rec.id, 
                'Tecnología', 
                'Departamento de Tecnología y Soporte', 
                '#3B82F6'
            )
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Departamento de Tecnología creado para empresa: %', company_rec.name;
        END IF;
    END LOOP;
END $$;

-- Verificar estructura de datos
DO $$
DECLARE
    ticket_count INTEGER;
    profile_count INTEGER;
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ticket_count FROM support_tickets;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO dept_count FROM departments WHERE name ILIKE '%tecnolog%';
    
    RAISE NOTICE '=== SISTEMA DE SOPORTE REPARADO ===';
    RAISE NOTICE 'Tickets existentes: %', ticket_count;
    RAISE NOTICE 'Perfiles de usuario: %', profile_count;
    RAISE NOTICE 'Departamentos de Tecnología: %', dept_count;
    RAISE NOTICE 'Políticas RLS: Simplificadas y funcionales';
    RAISE NOTICE 'Funciones: Recreadas y optimizadas';
    RAISE NOTICE '=====================================';
END $$;
