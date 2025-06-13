-- Función para obtener el tipo de una columna
CREATE OR REPLACE FUNCTION get_column_type(p_table_name text, p_column_name text)
RETURNS text AS $$
DECLARE
    column_type text;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name;
    
    RETURN column_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_column_type(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_column_type(text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_column_type(text, text) TO service_role;
