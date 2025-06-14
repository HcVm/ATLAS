-- Solución completa del problema del almacén
DO $$
DECLARE
    current_user_id uuid;
    first_company_id uuid;
    warehouse_dept_id uuid;
    tables_missing boolean := false;
    has_access boolean;
    brands_count int;
    categories_count int;
BEGIN
    RAISE NOTICE '=== SOLUCIONANDO PROBLEMA DEL ALMACÉN ===';
    
    -- 1. Verificar usuario
    SELECT auth.uid() INTO current_user_id;
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No hay usuario autenticado';
        RETURN;
    END IF;
    RAISE NOTICE '1. Usuario: %', current_user_id;
    
    -- 2. Crear tablas si no existen
    RAISE NOTICE '2. Verificando/creando tablas...';
    
    -- Tabla brands
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE NOTICE '   Creando tabla brands...';
        CREATE TABLE brands (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name varchar(100) NOT NULL,
            description text,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            color varchar(7) DEFAULT '#6B7280',
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
        
        -- Habilitar RLS
        ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
        tables_missing := true;
    END IF;
    
    -- Tabla product_categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE NOTICE '   Creando tabla product_categories...';
        CREATE TABLE product_categories (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name varchar(100) NOT NULL,
            description text,
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            color varchar(7) DEFAULT '#6B7280',
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
        
        ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
        tables_missing := true;
    END IF;
    
    -- Tabla products
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE '   Creando tabla products...';
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
            cost_price decimal(10,2),
            sale_price decimal(10,2),
            location varchar(100),
            is_active boolean DEFAULT true,
            created_at timestamptz DEFAULT NOW(),
            updated_at timestamptz DEFAULT NOW(),
            UNIQUE(code, company_id)
        );
        
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        tables_missing := true;
    END IF;
    
    -- Tabla inventory_movements
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE NOTICE '   Creando tabla inventory_movements...';
        CREATE TABLE inventory_movements (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            movement_type varchar(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
            quantity decimal(10,2) NOT NULL,
            previous_stock decimal(10,2) NOT NULL,
            new_stock decimal(10,2) NOT NULL,
            unit_cost decimal(10,2),
            total_cost decimal(10,2),
            reference_document varchar(100),
            destination varchar(200),
            supplier varchar(200),
            notes text,
            movement_date timestamptz DEFAULT NOW(),
            created_by uuid REFERENCES profiles(id),
            company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            created_at timestamptz DEFAULT NOW()
        );
        
        ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
        tables_missing := true;
    END IF;
    
    -- 3. Crear función has_warehouse_access si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_warehouse_access') THEN
        RAISE NOTICE '3. Creando función has_warehouse_access...';
        CREATE OR REPLACE FUNCTION has_warehouse_access()
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
        DECLARE
            user_role text;
            user_dept text;
        BEGIN
            SELECT p.role, d.name INTO user_role, user_dept
            FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.id = auth.uid();
            
            RETURN (
                user_role IN ('admin', 'supervisor') OR
                user_dept IN ('Almacén', 'Contabilidad')
            );
        END;
        $func$;
    END IF;
    
    -- 4. Crear políticas RLS
    RAISE NOTICE '4. Creando políticas RLS...';
    
    -- Políticas para brands
    DROP POLICY IF EXISTS "brands_select_policy" ON brands;
    CREATE POLICY "brands_select_policy" ON brands FOR SELECT
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
    CREATE POLICY "brands_insert_policy" ON brands FOR INSERT
        WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "brands_update_policy" ON brands;
    CREATE POLICY "brands_update_policy" ON brands FOR UPDATE
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    -- Políticas para product_categories
    DROP POLICY IF EXISTS "categories_select_policy" ON product_categories;
    CREATE POLICY "categories_select_policy" ON product_categories FOR SELECT
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "categories_insert_policy" ON product_categories;
    CREATE POLICY "categories_insert_policy" ON product_categories FOR INSERT
        WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    -- Políticas para products
    DROP POLICY IF EXISTS "products_select_policy" ON products;
    CREATE POLICY "products_select_policy" ON products FOR SELECT
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "products_insert_policy" ON products;
    CREATE POLICY "products_insert_policy" ON products FOR INSERT
        WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "products_update_policy" ON products;
    CREATE POLICY "products_update_policy" ON products FOR UPDATE
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    -- Políticas para inventory_movements
    DROP POLICY IF EXISTS "movements_select_policy" ON inventory_movements;
    CREATE POLICY "movements_select_policy" ON inventory_movements FOR SELECT
        USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    DROP POLICY IF EXISTS "movements_insert_policy" ON inventory_movements;
    CREATE POLICY "movements_insert_policy" ON inventory_movements FOR INSERT
        WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND has_warehouse_access());
    
    -- 5. Configurar usuario actual
    RAISE NOTICE '5. Configurando usuario...';
    
    SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
    SELECT id INTO warehouse_dept_id FROM departments WHERE company_id = first_company_id AND name = 'Almacén' LIMIT 1;
    
    UPDATE profiles SET
        company_id = first_company_id,
        department_id = warehouse_dept_id,
        role = 'admin',
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RAISE NOTICE '   Usuario asignado a empresa: %', first_company_id;
    RAISE NOTICE '   Usuario asignado a departamento: %', warehouse_dept_id;
    
    -- 6. Crear datos básicos si las tablas eran nuevas
    IF tables_missing THEN
        RAISE NOTICE '6. Creando datos básicos...';
        
        -- Crear marcas para cada empresa
        INSERT INTO brands (name, description, company_id, color)
        SELECT 
            CASE 
                WHEN c.code = 'ALGE' THEN 'VALHALLA'
                WHEN c.code = 'ARM' THEN 'WORLD LIFE'
                WHEN c.code = 'AMCO' THEN 'AMCO PRIME'
                WHEN c.code = 'GMC' THEN 'GMC CONSULTING'
                WHEN c.code = 'GALUR' THEN 'GALUR TECH'
            END,
            'Marca principal de la empresa',
            c.id,
            '#8B5CF6'
        FROM companies c;
        
        -- Crear segunda marca para cada empresa
        INSERT INTO brands (name, description, company_id, color)
        SELECT 
            CASE 
                WHEN c.code = 'ALGE' THEN 'ZEUS'
                WHEN c.code = 'ARM' THEN 'HOPE LIFE'
                WHEN c.code = 'AMCO' THEN 'AMCO SOLUTIONS'
                WHEN c.code = 'GMC' THEN 'GMC MANAGEMENT'
                WHEN c.code = 'GALUR' THEN 'GALUR INNOVATION'
            END,
            'Marca secundaria de la empresa',
            c.id,
            '#F59E0B'
        FROM companies c;
        
        -- Crear categorías básicas
        INSERT INTO product_categories (name, description, company_id, color)
        SELECT 
            'General',
            'Categoría general para productos',
            id,
            '#6B7280'
        FROM companies;
        
        INSERT INTO product_categories (name, description, company_id, color)
        SELECT 
            'Suplementos',
            'Productos suplementarios',
            id,
            '#10B981'
        FROM companies;
        
        RAISE NOTICE '   ✅ Datos básicos creados';
    END IF;
    
    -- 7. Verificar resultado
    RAISE NOTICE '7. Verificación final:';
    
    SELECT has_warehouse_access() INTO has_access;
    SELECT COUNT(*) INTO brands_count FROM brands;
    SELECT COUNT(*) INTO categories_count FROM product_categories;
    
    RAISE NOTICE '   Acceso al almacén: %', has_access;
    RAISE NOTICE '   Marcas disponibles: %', brands_count;
    RAISE NOTICE '   Categorías disponibles: %', categories_count;
    
    RAISE NOTICE '=== SOLUCIÓN COMPLETADA ===';
    RAISE NOTICE 'Recarga la página del navegador (Ctrl+F5) para ver los cambios.';
END $$;
