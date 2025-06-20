-- Crear funciones RPC para que los administradores puedan acceder a datos de ventas y cotizaciones por empresa

-- Función para obtener ventas por empresa (para administradores)
CREATE OR REPLACE FUNCTION get_sales_by_company(target_company_id UUID)
RETURNS TABLE (
    id UUID,
    sale_number TEXT,
    sale_date DATE,
    entity_id UUID,
    entity_name TEXT,
    entity_ruc TEXT,
    entity_executing_unit TEXT,
    quotation_code TEXT,
    exp_siaf TEXT,
    quantity INTEGER,
    product_id UUID,
    product_name TEXT,
    product_code TEXT,
    product_description TEXT,
    product_brand TEXT,
    ocam TEXT,
    physical_order TEXT,
    project_meta TEXT,
    final_destination TEXT,
    warehouse_manager TEXT,
    payment_method TEXT,
    unit_price_with_tax DECIMAL,
    total_sale DECIMAL,
    delivery_date DATE,
    delivery_term TEXT,
    observations TEXT,
    sale_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    profiles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Verificar que el usuario actual sea admin
    SELECT role INTO current_user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los administradores pueden usar esta función';
    END IF;
    
    -- Retornar las ventas de la empresa especificada
    RETURN QUERY
    SELECT 
        s.id,
        s.sale_number,
        s.sale_date,
        s.entity_id,
        s.entity_name,
        s.entity_ruc,
        s.entity_executing_unit,
        s.quotation_code,
        s.exp_siaf,
        s.quantity,
        s.product_id,
        s.product_name,
        s.product_code,
        s.product_description,
        s.product_brand,
        s.ocam,
        s.physical_order,
        s.project_meta,
        s.final_destination,
        s.warehouse_manager,
        s.payment_method,
        s.unit_price_with_tax,
        s.total_sale,
        s.delivery_date,
        s.delivery_term,
        s.observations,
        s.sale_status,
        s.created_at,
        jsonb_build_object('full_name', p.full_name) as profiles
    FROM sales s
    LEFT JOIN profiles p ON s.created_by = p.id
    WHERE s.company_id = target_company_id
    ORDER BY s.sale_date DESC;
END;
$$;

-- Función para obtener cotizaciones por empresa (para administradores)
CREATE OR REPLACE FUNCTION get_quotations_by_company(target_company_id UUID)
RETURNS TABLE (
    id UUID,
    quotation_date DATE,
    quotation_number TEXT,
    entity_name TEXT,
    entity_ruc TEXT,
    delivery_location TEXT,
    unique_code TEXT,
    product_description TEXT,
    product_brand TEXT,
    quantity INTEGER,
    platform_unit_price_with_tax DECIMAL,
    platform_total DECIMAL,
    supplier_unit_price_with_tax DECIMAL,
    supplier_total DECIMAL,
    offer_unit_price_with_tax DECIMAL,
    offer_total_with_tax DECIMAL,
    final_unit_price_with_tax DECIMAL,
    budget_ceiling DECIMAL,
    status TEXT,
    valid_until DATE,
    created_by UUID,
    route_origin_address TEXT,
    route_destination_address TEXT,
    route_distance_km DECIMAL,
    route_duration_minutes INTEGER,
    route_google_maps_url TEXT,
    route_created_at TIMESTAMP WITH TIME ZONE,
    route_created_by UUID,
    reference_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    company_id UUID,
    profiles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Verificar que el usuario actual sea admin
    SELECT role INTO current_user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Solo los administradores pueden usar esta función';
    END IF;
    
    -- Retornar las cotizaciones de la empresa especificada
    RETURN QUERY
    SELECT 
        q.id,
        q.quotation_date,
        q.quotation_number,
        q.entity_name,
        q.entity_ruc,
        q.delivery_location,
        q.unique_code,
        q.product_description,
        q.product_brand,
        q.quantity,
        q.platform_unit_price_with_tax,
        q.platform_total,
        q.supplier_unit_price_with_tax,
        q.supplier_total,
        q.offer_unit_price_with_tax,
        q.offer_total_with_tax,
        q.final_unit_price_with_tax,
        q.budget_ceiling,
        q.status,
        q.valid_until,
        q.created_by,
        q.route_origin_address,
        q.route_destination_address,
        q.route_distance_km,
        q.route_duration_minutes,
        q.route_google_maps_url,
        q.route_created_at,
        q.route_created_by,
        q.reference_image_url,
        q.created_at,
        q.updated_at,
        q.company_id,
        jsonb_build_object('full_name', p.full_name) as profiles
    FROM quotations q
    LEFT JOIN profiles p ON q.created_by = p.id
    WHERE q.company_id = target_company_id
    ORDER BY q.quotation_date DESC;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_sales_by_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quotations_by_company(UUID) TO authenticated;

-- Verificar que las funciones se crearon correctamente
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name IN ('get_sales_by_company', 'get_quotations_by_company');

RAISE NOTICE 'Funciones RPC para administradores creadas exitosamente';
