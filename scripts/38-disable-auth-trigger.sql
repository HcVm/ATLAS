-- Desactivar completamente el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear una función para verificar el tipo de la columna role
CREATE OR REPLACE FUNCTION get_role_type()
RETURNS TEXT AS $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role';
    
    RETURN col_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
