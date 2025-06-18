-- Corregir las políticas RLS para el sistema de soporte
-- El problema es que estamos referenciando auth.users en lugar de profiles

-- Primero, eliminar las tablas existentes para recrearlas correctamente
DROP TABLE IF EXISTS support_attachments CASCADE;
DROP TABLE IF EXISTS support_comments CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS update_support_ticket_updated_at() CASCADE;

-- Crear tabla de tickets de soporte (corregida)
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('hardware', 'software', 'network', 'email', 'system', 'other')),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(company_id, ticket_number)
);

-- Crear tabla de comentarios de soporte (corregida)
CREATE TABLE support_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de adjuntos de soporte (corregida)
CREATE TABLE support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES support_comments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear función para generar número de ticket automáticamente
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    company_name TEXT;
    year_suffix TEXT;
    next_number INTEGER;
    ticket_num TEXT;
BEGIN
    -- Obtener el nombre de la empresa (primeras 4 letras en mayúsculas)
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 4)) 
    INTO company_name 
    FROM companies 
    WHERE id = NEW.company_id;
    
    -- Si no se puede obtener el nombre, usar 'COMP'
    IF company_name IS NULL OR company_name = '' THEN
        company_name := 'COMP';
    END IF;
    
    -- Obtener los últimos 2 dígitos del año actual
    year_suffix := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
    
    -- Obtener el siguiente número secuencial para esta empresa y año
    SELECT COALESCE(MAX(CAST(RIGHT(ticket_number, 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM support_tickets
    WHERE company_id = NEW.company_id
    AND ticket_number LIKE company_name || '-' || year_suffix || '-%';
    
    -- Generar el número de ticket con formato: COMP-24-0001
    ticket_num := company_name || '-' || year_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    NEW.ticket_number := ticket_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar número de ticket automáticamente
CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_support_ticket_updated_at_trigger
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_comments_ticket_id ON support_comments(ticket_id);
CREATE INDEX idx_support_attachments_ticket_id ON support_attachments(ticket_id);

-- Habilitar RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para support_tickets (simplificadas y corregidas)

-- Política para ver tickets: usuarios pueden ver tickets de su empresa
CREATE POLICY "support_tickets_select_policy" ON support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
    );

-- Política para crear tickets: usuarios pueden crear tickets en su empresa
CREATE POLICY "support_tickets_insert_policy" ON support_tickets
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = support_tickets.company_id
        )
    );

-- Política para actualizar tickets: solo admins y departamento de Tecnología
CREATE POLICY "support_tickets_update_policy" ON support_tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() 
            AND p.company_id = support_tickets.company_id
            AND (p.role = 'admin' OR d.name = 'Tecnología')
        )
    );

-- Políticas RLS para support_comments

-- Ver comentarios: usuarios pueden ver comentarios de tickets de su empresa
CREATE POLICY "support_comments_select_policy" ON support_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_comments.ticket_id 
            AND st.company_id = p.company_id
        )
    );

-- Crear comentarios: usuarios pueden comentar en tickets de su empresa
CREATE POLICY "support_comments_insert_policy" ON support_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_comments.ticket_id 
            AND st.company_id = p.company_id
        )
    );

-- Políticas RLS para support_attachments

-- Ver adjuntos: usuarios pueden ver adjuntos de tickets de su empresa
CREATE POLICY "support_attachments_select_policy" ON support_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_attachments.ticket_id 
            AND st.company_id = p.company_id
        )
    );

-- Crear adjuntos: usuarios pueden subir adjuntos a tickets de su empresa
CREATE POLICY "support_attachments_insert_policy" ON support_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN profiles p ON p.id = auth.uid()
            WHERE st.id = support_attachments.ticket_id 
            AND st.company_id = p.company_id
        )
    );

-- Crear bucket de storage para adjuntos de soporte si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Limpiar políticas de storage existentes
DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their support attachments" ON storage.objects;

-- Políticas de storage para adjuntos de soporte
CREATE POLICY "support_storage_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'support-attachments' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "support_storage_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'support-attachments'
    );

CREATE POLICY "support_storage_delete_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'support-attachments' AND
        auth.uid() IS NOT NULL
    );

-- Verificar que existe el departamento de Tecnología en cada empresa
DO $$
DECLARE
    company_record RECORD;
    tech_dept_id UUID;
BEGIN
    FOR company_record IN SELECT id, name FROM companies LOOP
        -- Verificar si ya existe el departamento de Tecnología
        SELECT id INTO tech_dept_id
        FROM departments
        WHERE company_id = company_record.id AND name = 'Tecnología';
        
        -- Si no existe, crearlo
        IF tech_dept_id IS NULL THEN
            INSERT INTO departments (name, description, company_id, color)
            VALUES (
                'Tecnología',
                'Departamento de soporte técnico y sistemas',
                company_record.id,
                '#3B82F6'
            );
            
            RAISE NOTICE 'Departamento de Tecnología creado para empresa: %', company_record.name;
        END IF;
    END LOOP;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '=== SISTEMA DE SOPORTE CORREGIDO ===';
    RAISE NOTICE 'Tablas recreadas: support_tickets, support_comments, support_attachments';
    RAISE NOTICE 'Referencias corregidas: profiles en lugar de auth.users';
    RAISE NOTICE 'Políticas RLS simplificadas y funcionales';
    RAISE NOTICE 'Bucket de storage configurado: support-attachments';
    RAISE NOTICE 'Departamentos de Tecnología verificados';
    RAISE NOTICE '=====================================';
END $$;
