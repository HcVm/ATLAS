-- =====================================================
-- POLÍTICAS RLS PARA MÓDULO DE ALMACÉN (VERSIÓN LIMPIA)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Función para verificar acceso al almacén
CREATE OR REPLACE FUNCTION has_warehouse_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles p
        JOIN departments d ON p.department_id = d.id
        WHERE p.user_id = user_id 
        AND p.company_id = company_id
        AND (
            p.role::text IN ('admin', 'supervisor') 
            OR d.name IN ('Almacén', 'Contabilidad')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA PRODUCT_CATEGORIES
-- =====================================================

DROP POLICY IF EXISTS "product_categories_select_policy" ON product_categories;
CREATE POLICY "product_categories_select_policy" ON product_categories
    FOR SELECT USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "product_categories_insert_policy" ON product_categories;
CREATE POLICY "product_categories_insert_policy" ON product_categories
    FOR INSERT WITH CHECK (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "product_categories_update_policy" ON product_categories;
CREATE POLICY "product_categories_update_policy" ON product_categories
    FOR UPDATE USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "product_categories_delete_policy" ON product_categories;
CREATE POLICY "product_categories_delete_policy" ON product_categories
    FOR DELETE USING (
        has_warehouse_access(auth.uid(), company_id)
    );

-- =====================================================
-- POLÍTICAS PARA PRODUCTS
-- =====================================================

DROP POLICY IF EXISTS "products_select_policy" ON products;
CREATE POLICY "products_select_policy" ON products
    FOR SELECT USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "products_insert_policy" ON products;
CREATE POLICY "products_insert_policy" ON products
    FOR INSERT WITH CHECK (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "products_update_policy" ON products;
CREATE POLICY "products_update_policy" ON products
    FOR UPDATE USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "products_delete_policy" ON products;
CREATE POLICY "products_delete_policy" ON products
    FOR DELETE USING (
        has_warehouse_access(auth.uid(), company_id)
    );

-- =====================================================
-- POLÍTICAS PARA INVENTORY_MOVEMENTS
-- =====================================================

DROP POLICY IF EXISTS "inventory_movements_select_policy" ON inventory_movements;
CREATE POLICY "inventory_movements_select_policy" ON inventory_movements
    FOR SELECT USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "inventory_movements_insert_policy" ON inventory_movements;
CREATE POLICY "inventory_movements_insert_policy" ON inventory_movements
    FOR INSERT WITH CHECK (
        has_warehouse_access(auth.uid(), company_id)
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "inventory_movements_update_policy" ON inventory_movements;
CREATE POLICY "inventory_movements_update_policy" ON inventory_movements
    FOR UPDATE USING (
        has_warehouse_access(auth.uid(), company_id)
    );

DROP POLICY IF EXISTS "inventory_movements_delete_policy" ON inventory_movements;
CREATE POLICY "inventory_movements_delete_policy" ON inventory_movements
    FOR DELETE USING (
        has_warehouse_access(auth.uid(), company_id)
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role::text IN ('admin', 'supervisor')
        )
    );

RAISE NOTICE '✅ POLÍTICAS RLS PARA ALMACÉN CREADAS EXITOSAMENTE';
RAISE NOTICE '🔐 Acceso basado en roles (admin, supervisor) y departamentos (Almacén, Contabilidad)';
RAISE NOTICE '🏢 Filtrado automático por empresa';
RAISE NOTICE '👤 Movimientos vinculados al usuario que los crea';
</sql>

Ahora tienes 3 scripts completos:

## 🧹 **Script 67**: Limpieza completa y recreación
- Elimina todos los datos respetando foreign keys
- Recrea 2 empresas, 16 departamentos, 4 marcas
- Mantiene solo el usuario admin

## 📦 **Script 68**: Tablas de almacén (versión limpia)
- Crea tablas: `product_categories`, `products`, `inventory_movements`
- Incluye triggers automáticos para actualizar stock
- Crea 5 categorías básicas por empresa

## 🔐 **Script 69**: Políticas RLS (versión limpia)
- Acceso basado en roles y departamentos
- Filtrado automático por empresa
- Permisos específicos por operación

Ejecuta los 3 scripts en orden y tendrás una base de datos completamente limpia y funcional con el módulo de almacén.
