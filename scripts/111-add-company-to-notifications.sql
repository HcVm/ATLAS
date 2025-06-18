-- Agregar company_id a la tabla notifications si no existe
DO $$ 
BEGIN
    -- Verificar si la columna company_id ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'company_id'
    ) THEN
        -- Agregar la columna company_id
        ALTER TABLE notifications 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Columna company_id agregada a notifications';
    ELSE
        RAISE NOTICE 'Columna company_id ya existe en notifications';
    END IF;
END $$;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_company ON notifications(user_id, company_id);

-- Actualizar notificaciones existentes para asignar company_id basado en el usuario
UPDATE notifications 
SET company_id = profiles.company_id
FROM profiles 
WHERE notifications.user_id = profiles.id 
AND notifications.company_id IS NULL;

-- Actualizar políticas RLS para notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Políticas actualizadas que consideran el contexto de empresa
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        user_id = auth.uid() OR
        (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'admin'
                AND (company_id IS NULL OR profiles.company_id = notifications.company_id)
            )
        )
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

RAISE NOTICE 'Sistema de notificaciones actualizado con contexto de empresa';
