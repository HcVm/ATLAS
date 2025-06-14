-- =====================================================
-- SCRIPT DE LIMPIEZA COMPLETA Y RECREACIÓN DE ESTRUCTURA BÁSICA
-- =====================================================

DO $$
DECLARE
    admin_user_id UUID;
    alge_company_id UUID;
    arm_company_id UUID;
    dept_record RECORD;
    profile_columns TEXT;
BEGIN
    RAISE NOTICE '🧹 INICIANDO LIMPIEZA COMPLETA DE BASE DE DATOS...';
    
    -- =====================================================
    -- PASO 0: VERIFICAR ESTRUCTURA DE PROFILES
    -- =====================================================
    
    SELECT string_agg(column_name, ', ') INTO profile_columns
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND table_schema = 'public';
    
    RAISE NOTICE '📋 Columnas en profiles: %', profile_columns;
    
    -- =====================================================
    -- PASO 1: IDENTIFICAR Y PRESERVAR USUARIO ADMIN
    -- =====================================================
    
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email ILIKE '%admin%' OR email ILIKE '%test%'
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION '❌ No se encontró usuario administrador para preservar';
    END IF;
    
    RAISE NOTICE '✅ Usuario admin preservado: %', admin_user_id;
    
    -- =====================================================
    -- PASO 2: ELIMINAR DATOS EN ORDEN CORRECTO (RESPETANDO FK)
    -- =====================================================
    
    RAISE NOTICE '🗑️ Eliminando datos existentes...';
    
    -- Eliminar movimientos de inventario (si existen)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        DELETE FROM inventory_movements;
        RAISE NOTICE '   ✓ inventory_movements eliminados';
    END IF;
    
    -- Eliminar productos (si existen)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        DELETE FROM products;
        RAISE NOTICE '   ✓ products eliminados';
    END IF;
    
    -- Eliminar categorías de productos (si existen)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        DELETE FROM product_categories;
        RAISE NOTICE '   ✓ product_categories eliminadas';
    END IF;
    
    -- Eliminar marcas (si existen)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        DELETE FROM brands;
        RAISE NOTICE '   ✓ brands eliminadas';
    END IF;
    
    -- Eliminar notificaciones
    DELETE FROM notifications;
    RAISE NOTICE '   ✓ notifications eliminadas';
    
    -- Eliminar movimientos de documentos
    DELETE FROM document_movements;
    RAISE NOTICE '   ✓ document_movements eliminados';
    
    -- Eliminar documentos
    DELETE FROM documents;
    RAISE NOTICE '   ✓ documents eliminados';
    
    -- Eliminar noticias
    DELETE FROM news;
    RAISE NOTICE '   ✓ news eliminadas';
    
    -- Eliminar perfiles (excepto admin) - usando la columna correcta
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        DELETE FROM profiles WHERE user_id != admin_user_id;
        RAISE NOTICE '   ✓ profiles eliminados (excepto admin) - usando user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
        DELETE FROM profiles WHERE id != admin_user_id;
        RAISE NOTICE '   ✓ profiles eliminados (excepto admin) - usando id';
    ELSE
        RAISE NOTICE '   ⚠️ No se pudo determinar la columna de profiles para el usuario';
    END IF;
    
    -- Eliminar usuarios de auth (excepto admin)
    DELETE FROM auth.users WHERE id != admin_user_id;
    RAISE NOTICE '   ✓ auth.users eliminados (excepto admin)';
    
    -- Eliminar departamentos
    DELETE FROM departments;
    RAISE NOTICE '   ✓ departments eliminados';
    
    -- Eliminar empresas
    DELETE FROM companies;
    RAISE NOTICE '   ✓ companies eliminadas';
    
    -- =====================================================
    -- PASO 3: RECREAR EMPRESAS
    -- =====================================================
    
    RAISE NOTICE '🏢 Recreando empresas...';
    
    -- Crear ALGE PERUVIAN
    INSERT INTO companies (id, name, description, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'ALGE PERUVIAN',
        'Empresa peruana especializada en productos de calidad',
        NOW(),
        NOW()
    ) RETURNING id INTO alge_company_id;
    
    -- Crear ARM CORPORATIONS
    INSERT INTO companies (id, name, description, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'ARM CORPORATIONS',
        'Corporación internacional de productos especializados',
        NOW(),
        NOW()
    ) RETURNING id INTO arm_company_id;
    
    RAISE NOTICE '   ✓ ALGE PERUVIAN creada: %', alge_company_id;
    RAISE NOTICE '   ✓ ARM CORPORATIONS creada: %', arm_company_id;
    
    -- =====================================================
    -- PASO 4: RECREAR DEPARTAMENTOS ESTÁNDAR
    -- =====================================================
    
    RAISE NOTICE '🏛️ Recreando departamentos estándar...';
    
    -- Departamentos para ALGE PERUVIAN
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Administración', 'Departamento de administración general', alge_company_id, '#F97316', NOW(), NOW()),
    (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario', alge_company_id, '#10B981', NOW(), NOW()),
    (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', alge_company_id, '#3B82F6', NOW(), NOW()),
    (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', alge_company_id, '#EF4444', NOW(), NOW()),
    (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', alge_company_id, '#84CC16', NOW(), NOW()),
    (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', alge_company_id, '#8B5CF6', NOW(), NOW()),
    (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', alge_company_id, '#06B6D4', NOW(), NOW()),
    (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', alge_company_id, '#7C3AED', NOW(), NOW());
    
    -- Departamentos para ARM CORPORATIONS
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Administración', 'Departamento de administración general', arm_company_id, '#F97316', NOW(), NOW()),
    (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario', arm_company_id, '#10B981', NOW(), NOW()),
    (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', arm_company_id, '#3B82F6', NOW(), NOW()),
    (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', arm_company_id, '#EF4444', NOW(), NOW()),
    (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', arm_company_id, '#84CC16', NOW(), NOW()),
    (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', arm_company_id, '#8B5CF6', NOW(), NOW()),
    (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', arm_company_id, '#06B6D4', NOW(), NOW()),
    (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', arm_company_id, '#7C3AED', NOW(), NOW());
    
    RAISE NOTICE '   ✓ 16 departamentos creados (8 por empresa)';
    
    -- =====================================================
    -- PASO 5: RECREAR MARCAS
    -- =====================================================
    
    RAISE NOTICE '🏷️ Recreando marcas...';
    
    -- Marcas para ALGE PERUVIAN
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
    (gen_random_uuid(), 'VALHALLA', 'Marca premium de ALGE PERUVIAN', alge_company_id, '#1F2937', NOW(), NOW()),
    (gen_random_uuid(), 'ZEUS', 'Marca especializada de ALGE PERUVIAN', alge_company_id, '#7C2D12', NOW(), NOW());
    
    -- Marcas para ARM CORPORATIONS
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
    (gen_random_uuid(), 'WORLD LIFE', 'Marca internacional de ARM CORPORATIONS', arm_company_id, '#065F46', NOW(), NOW()),
    (gen_random_uuid(), 'HOPE LIFE', 'Marca especializada de ARM CORPORATIONS', arm_company_id, '#7C2D12', NOW(), NOW());
    
    RAISE NOTICE '   ✓ 4 marcas creadas (2 por empresa)';
    
    -- =====================================================
    -- PASO 6: ACTUALIZAR PERFIL DEL ADMIN
    -- =====================================================
    
    RAISE NOTICE '👤 Actualizando perfil del administrador...';
    
    -- Asignar admin a ALGE PERUVIAN y departamento de Administración
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        UPDATE profiles 
        SET 
            company_id = alge_company_id,
            department_id = (SELECT id FROM departments WHERE name = 'Administración' AND company_id = alge_company_id LIMIT 1),
            role = 'admin',
            updated_at = NOW()
        WHERE user_id = admin_user_id;
        RAISE NOTICE '   ✓ Admin actualizado usando user_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
        UPDATE profiles 
        SET 
            company_id = alge_company_id,
            department_id = (SELECT id FROM departments WHERE name = 'Administración' AND company_id = alge_company_id LIMIT 1),
            role = 'admin',
            updated_at = NOW()
        WHERE id = admin_user_id;
        RAISE NOTICE '   ✓ Admin actualizado usando id';
    END IF;
    
    -- =====================================================
    -- PASO 7: VERIFICAR RESULTADO FINAL
    -- =====================================================
    
    RAISE NOTICE '📊 VERIFICANDO ESTRUCTURA FINAL...';
    
    RAISE NOTICE '   📈 Empresas: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE '   🏛️ Departamentos: %', (SELECT COUNT(*) FROM departments);
    RAISE NOTICE '   🏷️ Marcas: %', (SELECT COUNT(*) FROM brands);
    RAISE NOTICE '   👥 Usuarios: %', (SELECT COUNT(*) FROM auth.users);
    RAISE NOTICE '   👤 Perfiles: %', (SELECT COUNT(*) FROM profiles);
    
    -- Mostrar estructura por empresa
    FOR dept_record IN 
        SELECT c.name as company_name, COUNT(d.id) as dept_count, COUNT(b.id) as brand_count
        FROM companies c
        LEFT JOIN departments d ON c.id = d.company_id
        LEFT JOIN brands b ON c.id = b.company_id
        GROUP BY c.id, c.name
        ORDER BY c.name
    LOOP
        RAISE NOTICE '   🏢 %: % departamentos, % marcas', 
            dept_record.company_name, dept_record.dept_count, dept_record.brand_count;
    END LOOP;
    
    RAISE NOTICE '✅ BASE DE DATOS LIMPIA Y ESTRUCTURA BÁSICA RECREADA';
    RAISE NOTICE '🚀 Lista para instalar módulo de almacén (scripts 68 y 69)';
    
END $$;
