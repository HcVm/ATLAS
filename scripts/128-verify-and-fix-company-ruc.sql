-- Verificar y corregir el campo RUC en las empresas
-- Script para asegurar que todas las empresas tengan RUC

-- 1. Verificar estructura actual de la tabla companies
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- 2. Verificar si existe el campo ruc
DO $$
BEGIN
    -- Agregar campo ruc si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'ruc'
    ) THEN
        ALTER TABLE companies ADD COLUMN ruc VARCHAR(11);
        RAISE NOTICE 'Campo ruc agregado a la tabla companies';
    ELSE
        RAISE NOTICE 'Campo ruc ya existe en la tabla companies';
    END IF;
END $$;

-- 3. Verificar empresas sin RUC
SELECT id, name, ruc, code
FROM companies 
WHERE ruc IS NULL OR ruc = '';

-- 4. Actualizar empresas sin RUC con valores por defecto (solo para testing)
-- NOTA: En producción, estos valores deben ser proporcionados por el usuario
UPDATE companies 
SET ruc = CASE 
    WHEN name ILIKE '%test%' OR name ILIKE '%demo%' THEN '12345678901'
    WHEN name ILIKE '%empresa%' THEN '20123456789'
    ELSE '10' || LPAD(id::text, 8, '0') || '1'
END
WHERE ruc IS NULL OR ruc = '';

-- 5. Verificar que todas las empresas ahora tengan RUC
SELECT 
    COUNT(*) as total_companies,
    COUNT(CASE WHEN ruc IS NOT NULL AND ruc != '' THEN 1 END) as companies_with_ruc,
    COUNT(CASE WHEN ruc IS NULL OR ruc = '' THEN 1 END) as companies_without_ruc
FROM companies;

-- 6. Mostrar todas las empresas con sus RUCs
SELECT id, name, ruc, code, created_at
FROM companies 
ORDER BY created_at DESC;

-- 7. Verificar que los usuarios tengan acceso a empresas con RUC
SELECT 
    p.id,
    p.full_name,
    p.role,
    c.name as company_name,
    c.ruc as company_ruc
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.role != 'admin'
ORDER BY p.full_name;

-- 8. Crear índice en el campo RUC para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_companies_ruc ON companies(ruc);

-- 9. Agregar constraint para validar formato de RUC (opcional)
-- Descomenta la siguiente línea si quieres validar el formato de RUC peruano
-- ALTER TABLE companies ADD CONSTRAINT chk_ruc_format CHECK (ruc ~ '^[0-9]{11}$');

COMMIT;
