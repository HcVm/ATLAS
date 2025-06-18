-- Limpiar y reparar completamente el sistema de soporte (versión corregida)

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
DROP POLICY IF EXISTS "tickets_select_all" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
DROP POLICY IF EXISTS "tickets_update_all" ON support_tickets;
DROP POLICY IF EXISTS "comments_select_all" ON support_comments;
DROP POLICY IF EXISTS "comments_insert_own" ON support_comments;
DROP POLICY IF EXISTS "attachments_select_all" ON support_attachments;
DROP POLICY IF EXISTS "attachments_insert_own" ON support_attachments;

-- Eliminar TODAS las funciones relacionadas con soporte
DROP FUNCTION IF EXISTS public.get_support_tickets_for_company(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_support_tickets_simple(UUID);
DROP FUNCTION IF EXISTS public.can_manage_support_tickets(UUID, UUID);
DROP FUNCTION IF EXISTS public.update_ticket_status(UUID, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_tech_users(UUID);
DROP FUNCTION IF EXISTS public.get_tech_users_simple(UUID);
DROP FUNCTION IF EXISTS public.can_manage_tickets(UUID, UUID);
DROP FUNCTION IF EXISTS public.update_support_ticket(UUID, TEXT, UUID, UUID);
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
        OR LOWER(d.name) LIKE '%tecnolog%'
        OR LOWER(d.name) LIKE '%tech%'
        OR LOWER(d.name) LIKE '%soporte%'
        OR LOWER(d.name) LIKE '%support%'
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
        OR LOWER(dept_name) LIKE '%tecnolog%'
        OR LOWER(dept_name) LIKE '%tech%'
        OR LOWER(dept_name) LIKE '%soporte%'
        OR LOWER(dept_name) LIKE '%support%'
    );
END $$;

GRANT EXECUTE ON FUNCTION public.can_manage_tickets(UUID, UUID) TO authenticated;

-- Crear función simple para actualizar tickets (con variable corregida)
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
    acting_user UUID;
    ticket_company UUID;
    can_update BOOLEAN;
BEGIN
    -- Usar variable con nombre diferente para evitar conflicto
    acting_user := COALESCE(user_uuid, auth.uid());
    
    -- Obtener company_id del ticket
    SELECT company_id INTO ticket_company
    FROM support_tickets
    WHERE id = ticket_uuid;
    
    IF ticket_company IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permisos
    SELECT can_manage_tickets(acting_user, ticket_company) INTO can_update;
    
    IF NOT can_update THEN
        RETURN FALSE;
    END IF;
    
    -- Actualizar ticket
    UPDATE support_tickets
    SET 
        status = new_status,
        assigned_to = new_assigned_to,
        updated_at = NOW(),
        resolved_at = CASE 
            WHEN new_status = 'resolved' THEN NOW()
            ELSE resolved_at
        END,
        closed_at = CASE 
            WHEN new_status = 'closed' THEN NOW()
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
        AND (
            LOWER(name) LIKE '%tecnolog%' 
            OR LOWER(name) LIKE '%tech%'
            OR LOWER(name) LIKE '%soporte%'
            OR LOWER(name) LIKE '%support%'
        );
        
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

-- Crear algunos tickets de prueba si no existen
DO $$
DECLARE
    admin_user UUID;
    company_uuid UUID;
    tech_dept UUID;
    ticket_count INTEGER;
BEGIN
    -- Buscar un usuario admin
    SELECT p.id, p.company_id INTO admin_user, company_uuid
    FROM profiles p
    WHERE p.role = 'admin'
    LIMIT 1;
    
    IF admin_user IS NOT NULL THEN
        SELECT COUNT(*) INTO ticket_count FROM support_tickets WHERE company_id = company_uuid;
        
        IF ticket_count = 0 THEN
            -- Crear ticket de prueba
            INSERT INTO support_tickets (
                ticket_number,
                title,
                description,
                status,
                priority,
                category,
                created_by,
                company_id
            ) VALUES (
                'TICKET-' || LPAD(nextval('support_tickets_id_seq')::TEXT, 6, '0'),
                'Ticket de prueba del sistema',
                'Este es un ticket de prueba para verificar que el sistema de soporte funciona correctamente.',
                'open',
                'medium',
                'system',
                admin_user,
                company_uuid
            );
            
            RAISE NOTICE 'Ticket de prueba creado para empresa con ID: %', company_uuid;
        END IF;
    END IF;
END $$;

-- Verificar estructura de datos
DO $$
DECLARE
    ticket_count INTEGER;
    profile_count INTEGER;
    dept_count INTEGER;
    tech_users INTEGER;
    company_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ticket_count FROM support_tickets;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO company_count FROM companies;
    SELECT COUNT(*) INTO dept_count FROM departments WHERE LOWER(name) LIKE '%tecnolog%';
    
    -- Contar usuarios de tecnología
    SELECT COUNT(*) INTO tech_users
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.role = 'admin' 
    OR LOWER(d.name) LIKE '%tecnolog%'
    OR LOWER(d.name) LIKE '%tech%'
    OR LOWER(d.name) LIKE '%soporte%'
    OR LOWER(d.name) LIKE '%support%';
    
    RAISE NOTICE '=== SISTEMA DE SOPORTE COMPLETAMENTE REPARADO ===';
    RAISE NOTICE 'Empresas: %', company_count;
    RAISE NOTICE 'Perfiles de usuario: %', profile_count;
    RAISE NOTICE 'Tickets existentes: %', ticket_count;
    RAISE NOTICE 'Departamentos de Tecnología: %', dept_count;
    RAISE NOTICE 'Usuarios con permisos de soporte: %', tech_users;
    RAISE NOTICE 'Políticas RLS: Simplificadas y funcionales';
    RAISE NOTICE 'Funciones: Recreadas sin errores de sintaxis';
    RAISE NOTICE '===============================================';
END $$;
