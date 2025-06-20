-- Agregar columna image_url a la tabla products
-- Script: 121-add-image-url-to-products.sql

-- Agregar columna image_url a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Crear índice para image_url si es necesario
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url) WHERE image_url IS NOT NULL;

-- Función para generar URL pública de imagen de producto
CREATE OR REPLACE FUNCTION get_product_image_url(image_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF image_path IS NULL OR image_path = '' THEN
        RETURN NULL;
    END IF;
    
    -- Retornar URL pública del storage
    RETURN concat(
        current_setting('app.settings.supabase_url', true),
        '/storage/v1/object/public/images/',
        image_path
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN image_path; -- Retornar el path original si hay error
END;
$$;

-- Otorgar permisos para la función
GRANT EXECUTE ON FUNCTION get_product_image_url(TEXT) TO authenticated;

-- Comentarios
COMMENT ON COLUMN products.image_url IS 'URL o path de la imagen del producto en storage';
COMMENT ON FUNCTION get_product_image_url IS 'Genera URL pública para imagen de producto';

-- Actualizar trigger de updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a products si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_products_updated_at'
    ) THEN
        CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Mensaje informativo sobre storage
DO $$
BEGIN
    RAISE NOTICE 'Columna image_url agregada exitosamente a la tabla products';
    RAISE NOTICE 'IMPORTANTE: Configurar manualmente las políticas de storage en el dashboard de Supabase:';
    RAISE NOTICE '1. Ir a Storage > Policies en el dashboard de Supabase';
    RAISE NOTICE '2. Crear políticas para el bucket "images" con path "products/*"';
    RAISE NOTICE '3. Permitir SELECT, INSERT, UPDATE, DELETE para usuarios autenticados';
END $$;
