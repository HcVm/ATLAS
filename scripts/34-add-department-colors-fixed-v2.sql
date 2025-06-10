-- Agregar columna de color a la tabla departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6B7280';

-- Actualizar departamentos con nombres específicos
UPDATE departments SET color = 
  CASE 
    WHEN name ILIKE '%recursos humanos%' OR name ILIKE '%rrhh%' OR name ILIKE '%personal%' THEN '#EF4444'
    WHEN name ILIKE '%contabilidad%' OR name ILIKE '%finanzas%' OR name ILIKE '%contable%' THEN '#10B981'
    WHEN name ILIKE '%sistemas%' OR name ILIKE '%tecnolog%' OR name ILIKE '%informatic%' OR name ILIKE '%ti%' THEN '#3B82F6'
    WHEN name ILIKE '%legal%' OR name ILIKE '%juridic%' OR name ILIKE '%abogad%' THEN '#8B5CF6'
    WHEN name ILIKE '%marketing%' OR name ILIKE '%mercadeo%' OR name ILIKE '%publicidad%' THEN '#F59E0B'
    WHEN name ILIKE '%ventas%' OR name ILIKE '%comercial%' OR name ILIKE '%cliente%' THEN '#06B6D4'
    WHEN name ILIKE '%operacion%' OR name ILIKE '%produccion%' OR name ILIKE '%manufactur%' THEN '#84CC16'
    WHEN name ILIKE '%administracion%' OR name ILIKE '%gerencia%' OR name ILIKE '%direccion%' THEN '#DC2626'
    WHEN name ILIKE '%compras%' OR name ILIKE '%adquisicion%' OR name ILIKE '%procurement%' THEN '#7C3AED'
    WHEN name ILIKE '%calidad%' OR name ILIKE '%control%' OR name ILIKE '%auditoria%' THEN '#059669'
    WHEN name ILIKE '%logistica%' OR name ILIKE '%almacen%' OR name ILIKE '%inventario%' THEN '#D97706'
    WHEN name ILIKE '%seguridad%' OR name ILIKE '%vigilancia%' OR name ILIKE '%proteccion%' THEN '#374151'
    ELSE color
  END
WHERE color = '#6B7280' OR color IS NULL;

-- Crear array de colores para departamentos restantes
DO $$
DECLARE
    dept_record RECORD;
    colors TEXT[] := ARRAY[
        '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', 
        '#F59E0B', '#06B6D4', '#84CC16', '#EC4899',
        '#14B8A6', '#F97316', '#A855F7', '#6366F1'
    ];
    color_index INTEGER := 1;
BEGIN
    -- Actualizar departamentos que aún no tienen color específico
    FOR dept_record IN 
        SELECT id FROM departments 
        WHERE color = '#6B7280' OR color IS NULL 
        ORDER BY created_at
    LOOP
        UPDATE departments 
        SET color = colors[color_index]
        WHERE id = dept_record.id;
        
        -- Rotar al siguiente color
        color_index := color_index + 1;
        IF color_index > array_length(colors, 1) THEN
            color_index := 1;
        END IF;
    END LOOP;
END $$;

-- Verificar los colores asignados
SELECT id, name, color FROM departments ORDER BY name;
