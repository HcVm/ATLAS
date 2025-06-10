-- Verificar perfiles existentes
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    COUNT(*) OVER (PARTITION BY id) as duplicate_count
FROM profiles
ORDER BY id, created_at;

-- Eliminar perfiles duplicados (mantener el más reciente)
WITH duplicates AS (
    SELECT 
        id,
        email,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
    FROM profiles
)
DELETE FROM profiles 
WHERE (id, email) IN (
    SELECT id, email 
    FROM duplicates 
    WHERE rn > 1
);

-- Verificar que no hay duplicados
SELECT 
    'Perfiles después de limpieza:' as info,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT id) as unique_users
FROM profiles;

-- Mostrar perfiles restantes
SELECT 
    id,
    email,
    full_name,
    role,
    department_id
FROM profiles
ORDER BY created_at;
