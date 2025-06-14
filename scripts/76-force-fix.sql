-- Forzar corrección completa
DO $$
DECLARE
    current_user_id uuid;
    first_company_id uuid;
    almacen_dept_id uuid;
BEGIN
    RAISE NOTICE '=== FORZANDO CORRECCIÓN ===';
    
    -- 1. Obtener usuario actual
    SELECT auth.uid() INTO current_user_id;
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No hay usuario autenticado';
        RETURN;
    END IF;
    
    -- 2. Obtener primera empresa
    SELECT id INTO first_company_id FROM companies ORDER BY name LIMIT 1;
    IF first_company_id IS NULL THEN
        RAISE NOTICE '❌ No hay empresas';
        RETURN;
    END IF;
    
    -- 3. Obtener departamento de almacén
    SELECT id INTO almacen_dept_id 
    FROM departments 
    WHERE company_id = first_company_id AND name = 'Almacén' 
    LIMIT 1;
    
    -- 4. Actualizar usuario para que tenga acceso completo
    UPDATE profiles SET
        company_id = first_company_id,
        department_id = almacen_dept_id,
        role = 'admin',
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RAISE NOTICE '1. ✅ Usuario actualizado';
    
    -- 5. Crear tablas del almacén si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        CREATE TABLE brands (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name varchar(100) NOT NULL,
            description text,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            color varchar(7) DEFAULT '#3B82F6',
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
        ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '2. ✅ Tabla brands creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        CREATE TABLE product_categories (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name varchar(100) NOT NULL,
            description text,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            color varchar(7) DEFAULT '#10B981',
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
        ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '3. ✅ Tabla product_categories creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE TABLE products (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            code varchar(50) NOT NULL,
            name varchar(200) NOT NULL,
            description text,
            brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
            category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            unit_of_measure varchar(20) DEFAULT 'unidad',
            current_stock decimal(10,2) DEFAULT 0,
            minimum_stock decimal(10,2) DEFAULT 0,
            unit_cost decimal(10,2),
            sale_price decimal(10,2),
            location varchar(100),
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(code, company_id)
        );
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '4. ✅ Tabla products creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        CREATE TABLE inventory_movements (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            movement_type varchar(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
            quantity decimal(10,2) NOT NULL,
            unit_cost decimal(10,2),
            total_cost decimal(10,2),
            reference_document varchar(100),
            destination varchar(200),
            supplier varchar(200),
            reason varchar(200),
            notes text,
            movement_date timestamptz DEFAULT NOW(),
            created_by uuid REFERENCES profiles(id),
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            created_at timestamptz DEFAULT NOW()
        );
        ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '5. ✅ Tabla inventory_movements creada';
    END IF;
    
    -- 6. Crear función simple de acceso
    CREATE OR REPLACE FUNCTION has_warehouse_access()
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
        -- Por ahora, dar acceso a todos los usuarios autenticados
        RETURN auth.uid() IS NOT NULL;
    END;
    $func$;
    
    RAISE NOTICE '6. ✅ Función has_warehouse_access creada (acceso abierto)';
    
    -- 7. Crear políticas muy permisivas
    DROP POLICY IF EXISTS "brands_policy" ON brands;
    CREATE POLICY "brands_policy" ON brands FOR ALL
        USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "categories_policy" ON product_categories;
    CREATE POLICY "categories_policy" ON product_categories FOR ALL
        USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "products_policy" ON products;
    CREATE POLICY "products_policy" ON products FOR ALL
        USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "movements_policy" ON inventory_movements;
    CREATE POLICY "movements_policy" ON inventory_movements FOR ALL
        USING (true) WITH CHECK (true);
    
    RAISE NOTICE '7. ✅ Políticas permisivas creadas';
    
    -- 8. Insertar datos de prueba
    INSERT INTO brands (name, description, company_id, color)
    SELECT 'VALHALLA', 'Marca de prueba', id, '#8B5CF6'
    FROM companies
    ON CONFLICT (name, company_id) DO NOTHING;
    
    INSERT INTO product_categories (name, description, company_id, color)
    SELECT 'General', 'Categoría de prueba', id, '#10B981'
    FROM companies
    ON CONFLICT (name, company_id) DO NOTHING;
    
    RAISE NOTICE '8. ✅ Datos de prueba insertados';
    
    RAISE NOTICE '=== CORRECCIÓN FORZADA COMPLETADA ===';
    RAISE NOTICE 'Recarga la página completamente (Ctrl+F5)';
END $$;
