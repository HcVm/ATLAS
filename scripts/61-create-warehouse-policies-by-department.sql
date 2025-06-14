-- Crear políticas de almacén basadas en departamentos, no en roles nuevos

-- Verificar que las tablas existen antes de crear políticas
DO $$
BEGIN
    -- Verificar tabla brands
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        -- Habilitar RLS
        ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
        
        -- Crear políticas para brands
        DROP POLICY IF EXISTS "Users can view brands from their company" ON brands;
        CREATE POLICY "Users can view brands from their company" ON brands
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Warehouse staff can manage brands" ON brands;
        CREATE POLICY "Warehouse staff can manage brands" ON brands
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = brands.company_id
                    AND (
                        p.role IN ('admin', 'supervisor') 
                        OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
                    )
                )
            );
        
        RAISE NOTICE 'Políticas para brands creadas exitosamente';
    ELSE
        RAISE NOTICE 'Tabla brands no existe, saltando políticas';
    END IF;

    -- Verificar tabla product_categories
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view categories from their company" ON product_categories;
        CREATE POLICY "Users can view categories from their company" ON product_categories
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Warehouse staff can manage categories" ON product_categories;
        CREATE POLICY "Warehouse staff can manage categories" ON product_categories
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = product_categories.company_id
                    AND (
                        p.role IN ('admin', 'supervisor') 
                        OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
                    )
                )
            );
        
        RAISE NOTICE 'Políticas para product_categories creadas exitosamente';
    END IF;

    -- Verificar tabla products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view products from their company" ON products;
        CREATE POLICY "Users can view products from their company" ON products
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Warehouse staff can manage products" ON products;
        CREATE POLICY "Warehouse staff can manage products" ON products
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = products.company_id
                    AND (
                        p.role IN ('admin', 'supervisor') 
                        OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
                    )
                )
            );
        
        RAISE NOTICE 'Políticas para products creadas exitosamente';
    END IF;

    -- Verificar tabla inventory_movements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view inventory movements from their company" ON inventory_movements;
        CREATE POLICY "Users can view inventory movements from their company" ON inventory_movements
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Warehouse staff can create inventory movements" ON inventory_movements;
        CREATE POLICY "Warehouse staff can create inventory movements" ON inventory_movements
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = inventory_movements.company_id
                    AND (
                        p.role IN ('admin', 'supervisor') 
                        OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
                    )
                )
            );

        DROP POLICY IF EXISTS "Warehouse staff can update inventory movements" ON inventory_movements;
        CREATE POLICY "Warehouse staff can update inventory movements" ON inventory_movements
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    LEFT JOIN departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() 
                    AND p.company_id = inventory_movements.company_id
                    AND (
                        p.role IN ('admin', 'supervisor') 
                        OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
                    )
                )
            );

        DROP POLICY IF EXISTS "Admins can delete inventory movements" ON inventory_movements;
        CREATE POLICY "Admins can delete inventory movements" ON inventory_movements
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid() 
                    AND p.company_id = inventory_movements.company_id
                    AND p.role IN ('admin', 'supervisor')
                )
            );
        
        RAISE NOTICE 'Políticas para inventory_movements creadas exitosamente';
    END IF;
END $$;

-- Crear función auxiliar para verificar permisos de almacén
CREATE OR REPLACE FUNCTION has_warehouse_access(user_id UUID, target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.id = user_id 
        AND p.company_id = target_company_id
        AND (
            p.role IN ('admin', 'supervisor') 
            OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Políticas de almacén basadas en departamentos configuradas exitosamente' as resultado;
