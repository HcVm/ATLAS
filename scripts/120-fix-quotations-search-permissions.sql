-- Verificar y corregir permisos para búsqueda de productos en cotizaciones
-- Script: 120-fix-quotations-search-permissions.sql

-- Verificar que la tabla products tenga los permisos correctos para búsqueda
DO $$
BEGIN
    -- Verificar si existe la política de lectura para products
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Users can view products from their company'
    ) THEN
        -- Crear política de lectura para products si no existe
        CREATE POLICY "Users can view products from their company" ON products
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles 
                    WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

-- Asegurar que RLS esté habilitado en products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Verificar que la tabla brands tenga permisos correctos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brands' 
        AND policyname = 'Users can view brands from their company'
    ) THEN
        CREATE POLICY "Users can view brands from their company" ON brands
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles 
                    WHERE id = auth.uid()
                )
            );
    END IF;
END $$;

-- Asegurar que RLS esté habilitado en brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Crear función auxiliar para debug de búsqueda de productos
CREATE OR REPLACE FUNCTION debug_product_search(product_code TEXT)
RETURNS TABLE(
    found_products BIGINT,
    user_company_id UUID,
    product_details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO user_company_id 
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Contar productos encontrados
    SELECT COUNT(*) INTO found_products
    FROM products p
    WHERE p.company_id = user_company_id
    AND p.code = product_code
    AND p.is_active = true;
    
    -- Obtener detalles del producto si existe
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'code', p.code,
            'name', p.name,
            'description', p.description,
            'sale_price', p.sale_price,
            'is_active', p.is_active,
            'company_id', p.company_id
        )
    ) INTO product_details
    FROM products p
    WHERE p.company_id = user_company_id
    AND p.code = product_code;
    
    RETURN NEXT;
END;
$$;

-- Otorgar permisos para la función de debug
GRANT EXECUTE ON FUNCTION debug_product_search(TEXT) TO authenticated;

-- Comentario de finalización
COMMENT ON FUNCTION debug_product_search IS 'Función para debuggear búsqueda de productos en cotizaciones';
