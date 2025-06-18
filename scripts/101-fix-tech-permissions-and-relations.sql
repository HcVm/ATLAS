-- Corregir permisos de Tecnología y relaciones de tablas

-- Verificar y corregir las foreign keys entre profiles y departments
DO $$
BEGIN
    -- Verificar si existe la foreign key correcta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_department_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        -- Agregar la foreign key si no existe
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id);
    END IF;
END $$;

-- Crear vista para simplificar consultas de usuarios de Tecnología
CREATE OR REPLACE VIEW tech_users_view AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.company_id,
    p.department_id,
    d.name as department_name
FROM profiles p
INNER JOIN departments d ON p.department_id = d.id
WHERE d.name = 'Tecnología';

-- Función mejorada para verificar si un usuario puede gestionar tickets
CREATE OR REPLACE FUNCTION can_manage_support_tickets(user_id UUID, ticket_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
    can_manage BOOLEAN := FALSE;
BEGIN
    -- Obtener información del usuario
    SELECT p.role, p.company_id, d.name as department_name
    INTO user_profile
    FROM profiles p
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = user_id;
    
    -- Si no se encuentra el usuario, no puede gestionar
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Si se especifica company_id, verificar que coincida
    IF ticket_company_id IS NOT NULL AND user_profile.company_id != ticket_company_id THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar si es admin o del departamento de Tecnología
    IF user_profile.role = 'admin' OR user_profile.department_name = 'Tecnología' THEN
        can_manage := TRUE;
    END IF;
    
    RETURN can_manage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios del departamento de Tecnología
CREATE OR REPLACE FUNCTION get_tech_users(company_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.avatar_url
    FROM profiles p
    INNER JOIN departments d ON p.department_id = d.id
    WHERE p.company_id = company_id
    AND d.name = 'Tecnología'
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar política de actualización de tickets para ser más clara
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;

CREATE POLICY "support_tickets_update_policy" ON support_tickets
    FOR UPDATE USING (
        -- Solo admins y personal de Tecnología de la misma empresa pueden actualizar
        can_manage_support_tickets(auth.uid(), company_id)
    ) WITH CHECK (
        -- Misma verificación para el check
        can_manage_support_tickets(auth.uid(), company_id)
    );

-- Crear función para actualizar estado de ticket con validaciones
CREATE OR REPLACE FUNCTION update_ticket_status(
    ticket_id UUID,
    new_status TEXT,
    new_assigned_to UUID DEFAULT NULL,
    updated_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    ticket_record RECORD;
    can_update BOOLEAN := FALSE;
BEGIN
    -- Obtener información del ticket
    SELECT * INTO ticket_record
    FROM support_tickets
    WHERE id = ticket_id;
    
    -- Verificar que el ticket existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket no encontrado';
    END IF;
    
    -- Verificar permisos
    SELECT can_manage_support_tickets(updated_by, ticket_record.company_id) INTO can_update;
    
    IF NOT can_update THEN
        RAISE EXCEPTION 'No tienes permisos para actualizar este ticket';
    END IF;
    
    -- Validar estado
    IF new_status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
        RAISE EXCEPTION 'Estado inválido';
    END IF;
    
    -- Actualizar ticket
    UPDATE support_tickets 
    SET 
        status = new_status,
        assigned_to = CASE 
            WHEN new_assigned_to = '00000000-0000-0000-0000-000000000000'::UUID THEN NULL 
            ELSE new_assigned_to 
        END,
        updated_at = NOW(),
        resolved_at = CASE WHEN new_status = 'resolved' THEN NOW() ELSE resolved_at END,
        closed_at = CASE WHEN new_status = 'closed' THEN NOW() ELSE closed_at END
    WHERE id = ticket_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que existen departamentos de Tecnología
DO $$
DECLARE
    company_record RECORD;
    dept_count INTEGER;
BEGIN
    FOR company_record IN SELECT id, name FROM companies LOOP
        SELECT COUNT(*) INTO dept_count
        FROM departments 
        WHERE company_id = company_record.id AND name = 'Tecnología';
        
        IF dept_count = 0 THEN
            INSERT INTO departments (company_id, name, description, color)
            VALUES (
                company_record.id, 
                'Tecnología', 
                'Departamento de Tecnología e Informática',
                '#3B82F6'
            );
            RAISE NOTICE 'Creado departamento de Tecnología para empresa: %', company_record.name;
        END IF;
    END LOOP;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '=== PERMISOS DE TECNOLOGÍA CORREGIDOS ===';
    RAISE NOTICE 'Personal de Tecnología puede cambiar estados';
    RAISE NOTICE 'Relaciones entre tablas corregidas';
    RAISE NOTICE 'Funciones auxiliares creadas';
    RAISE NOTICE 'Vista tech_users_view disponible';
    RAISE NOTICE '========================================';
END $$;
