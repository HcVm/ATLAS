-- =====================================================
-- ARREGLAR NOMBRES DE COLUMNAS DEL ALMACÉN
-- =====================================================

-- Verificar estructura actual de products
SELECT 'Verificando estructura de products...' as status;

-- Arreglar nombres de columnas en products si es necesario
DO $$
BEGIN
    -- Cambiar unit_cost a cost_price si existe unit_cost
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'unit_cost'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products RENAME COLUMN unit_cost TO cost_price;
    END IF;

    -- Verificar que current_stock existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'current_stock'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN current_stock INTEGER DEFAULT 0;
    END IF;

    -- Verificar que minimum_stock existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'minimum_stock'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN minimum_stock INTEGER DEFAULT 0;
    END IF;

    -- Verificar que barcode existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'barcode'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN barcode VARCHAR(100);
    END IF;

    -- Verificar que notes existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'notes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN notes TEXT;
    END IF;

    -- Verificar que created_by existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'created_by'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

END $$;

-- Verificar estructura de inventory_movements
DO $$
BEGIN
    -- Verificar que movement_date existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_movements ADD COLUMN movement_date TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Verificar que reason existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reason'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_movements ADD COLUMN reason VARCHAR(200);
    END IF;

END $$;

-- Mostrar estructura final
SELECT 'Estructura final de products:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Estructura final de inventory_movements:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'inventory_movements' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Columnas del almacen arregladas correctamente' as resultado;
