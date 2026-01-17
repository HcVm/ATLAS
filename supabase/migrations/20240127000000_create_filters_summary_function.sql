CREATE OR REPLACE FUNCTION get_filters_summary(filter_type text)
RETURNS TABLE (value text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
    IF filter_type = 'acuerdos' THEN
        RETURN QUERY
        SELECT codigo_acuerdo_marco::text as value, count(*) as count
        FROM open_data_entries
        WHERE codigo_acuerdo_marco IS NOT NULL
        GROUP BY codigo_acuerdo_marco
        ORDER BY count DESC;
    ELSIF filter_type = 'categorias' THEN
        RETURN QUERY
        SELECT categoria::text as value, count(*) as count
        FROM open_data_entries
        WHERE categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY count DESC;
    ELSIF filter_type = 'catalogos' THEN
        RETURN QUERY
        SELECT catalogo::text as value, count(*) as count
        FROM open_data_entries
        WHERE catalogo IS NOT NULL
        GROUP BY catalogo
        ORDER BY count DESC;
    END IF;
END;
$$;
