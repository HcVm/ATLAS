-- Habilitar RLS en las nuevas tablas
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Primero, agregar los nuevos roles al enum user_role
DO $$ 
BEGIN
    -- Verificar si el enum user_role existe, si no, crearlo
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'supervisor', 'almacen', 'contabilidad');
    ELSE
        -- Agregar nuevos valores al enum existente si no existen
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Ignorar si ya existe
        END;
        
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'almacen';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Ignorar si ya existe
        END;
        
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'contabilidad';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Ignorar si ya existe
        END;
    END IF;
END $$;

-- Actualizar la columna role en profiles para usar el enum (si no lo está usando ya)
-- Solo si la columna no es del tipo enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role' 
        AND data_type = 'character varying'
    ) THEN
        -- Cambiar el tipo de la columna role a usar el enum
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
    END IF;
END $$;

-- Políticas para brands
CREATE POLICY "Users can view brands from their company" ON brands
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins and supervisors can manage brands" ON brands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor')
            AND company_id = brands.company_id
        )
    );

-- Políticas para product_categories
CREATE POLICY "Users can view categories from their company" ON product_categories
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins and supervisors can manage categories" ON product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor')
            AND company_id = product_categories.company_id
        )
    );

-- Políticas para products
CREATE POLICY "Users can view products from their company" ON products
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Warehouse staff can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor', 'almacen', 'contabilidad')
            AND company_id = products.company_id
        )
    );

-- Políticas para inventory_movements
CREATE POLICY "Users can view inventory movements from their company" ON inventory_movements
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Warehouse staff can create inventory movements" ON inventory_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor', 'almacen', 'contabilidad')
            AND company_id = inventory_movements.company_id
        )
    );

CREATE POLICY "Warehouse staff can update inventory movements" ON inventory_movements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor', 'almacen', 'contabilidad')
            AND company_id = inventory_movements.company_id
        )
    );

CREATE POLICY "Admins can delete inventory movements" ON inventory_movements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'supervisor')
            AND company_id = inventory_movements.company_id
        )
    );

-- Crear función para verificar permisos de almacén
CREATE OR REPLACE FUNCTION has_warehouse_access(user_id UUID, target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND company_id = target_company_id
        AND role IN ('admin', 'supervisor', 'almacen', 'contabilidad')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentar las políticas
COMMENT ON POLICY "Users can view brands from their company" ON brands IS 'Permite a los usuarios ver las marcas de su empresa';
COMMENT ON POLICY "Admins and supervisors can manage brands" ON brands IS 'Permite a admins y supervisores gestionar marcas';
COMMENT ON POLICY "Users can view categories from their company" ON product_categories IS 'Permite a los usuarios ver las categorías de su empresa';
COMMENT ON POLICY "Admins and supervisors can manage categories" ON product_categories IS 'Permite a admins y supervisores gestionar categorías';
COMMENT ON POLICY "Users can view products from their company" ON products IS 'Permite a los usuarios ver los productos de su empresa';
COMMENT ON POLICY "Warehouse staff can manage products" ON products IS 'Permite al personal de almacén gestionar productos';
COMMENT ON POLICY "Users can view inventory movements from their company" ON inventory_movements IS 'Permite a los usuarios ver los movimientos de su empresa';
COMMENT ON POLICY "Warehouse staff can create inventory movements" ON inventory_movements IS 'Permite al personal de almacén crear movimientos';
COMMENT ON POLICY "Warehouse staff can update inventory movements" ON inventory_movements IS 'Permite al personal de almacén actualizar movimientos';
COMMENT ON POLICY "Admins can delete inventory movements" ON inventory_movements IS 'Permite a admins eliminar movimientos';
