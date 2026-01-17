CREATE OR REPLACE FUNCTION get_open_data_rankings(
  p_type text,
  p_limit integer,
  p_date_start text,
  p_date_end text DEFAULT NULL,
  p_acuerdo text DEFAULT NULL,
  p_categoria text DEFAULT NULL,
  p_catalogo text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  IF p_type = 'productos' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(descripcion_ficha_producto, 'Sin descripción') as descripcion,
        COALESCE(marca_ficha_producto, 'Sin marca') as marca,
        COALESCE(categoria, 'Sin categoría') as categoria,
        COALESCE(catalogo, 'Sin catálogo') as catalogo,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT razon_social_entidad) as entidades_compradoras,
        COUNT(DISTINCT razon_social_proveedor) as proveedores_vendedores,
        COALESCE(AVG(NULLIF(precio_unitario, 0)), 0) as precio_promedio
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1, 2, 3, 4
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  ELSIF p_type = 'categorias' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(categoria, 'Sin categoría') as categoria,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT descripcion_ficha_producto) as productos_unicos,
        COUNT(DISTINCT razon_social_entidad) as entidades_compradoras,
        COUNT(DISTINCT razon_social_proveedor) as proveedores_vendedores
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  ELSIF p_type = 'catalogos' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(catalogo, 'Sin catálogo') as catalogo,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT descripcion_ficha_producto) as productos_unicos,
        COUNT(DISTINCT razon_social_entidad) as entidades_compradoras,
        COUNT(DISTINCT razon_social_proveedor) as proveedores_vendedores
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  ELSIF p_type = 'marcas' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(marca_ficha_producto, 'Sin marca') as marca,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT descripcion_ficha_producto) as productos_unicos,
        COUNT(DISTINCT razon_social_entidad) as entidades_compradoras,
        COUNT(DISTINCT razon_social_proveedor) as proveedores_vendedores
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  ELSIF p_type = 'proveedores' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(razon_social_proveedor, 'Sin proveedor') as razon_social,
        COALESCE(ruc_proveedor, 'Sin RUC') as ruc,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT descripcion_ficha_producto) as productos_unicos,
        COUNT(DISTINCT razon_social_entidad) as entidades_clientes,
        COUNT(DISTINCT marca_ficha_producto) as marcas
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1, 2
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  ELSIF p_type = 'entidades' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT
        COALESCE(razon_social_entidad, 'Sin entidad') as razon_social,
        COALESCE(ruc_entidad, 'Sin RUC') as ruc,
        COALESCE(unidad_ejecutora, 'Sin unidad') as unidad_ejecutora,
        ROUND(SUM(monto_total_entrega)) as monto_total,
        ROUND(SUM(cantidad_entrega)) as cantidad_total,
        COUNT(*) as numero_ordenes,
        COUNT(DISTINCT descripcion_ficha_producto) as productos_unicos,
        COUNT(DISTINCT razon_social_proveedor) as proveedores_vendedores,
        COUNT(DISTINCT marca_ficha_producto) as marcas
      FROM open_data_entries
      WHERE fecha_publicacion >= p_date_start
        AND (p_date_end IS NULL OR fecha_publicacion <= p_date_end)
        AND (p_acuerdo IS NULL OR codigo_acuerdo_marco = p_acuerdo)
        AND (p_categoria IS NULL OR categoria = p_categoria)
        AND (p_catalogo IS NULL OR catalogo = p_catalogo)
        AND estado_orden_electronica = 'ACEPTADA'
      GROUP BY 1, 2, 3
      ORDER BY monto_total DESC
      LIMIT p_limit
    ) t;

  END IF;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
