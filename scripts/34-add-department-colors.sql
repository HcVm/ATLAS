-- Agregar columna de color a la tabla departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6B7280';

-- Actualizar departamentos existentes con colores únicos
UPDATE departments SET color = CASE 
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
  ELSE 
    CASE (ROW_NUMBER() OVER (ORDER BY created_at)) % 12
      WHEN 1 THEN '#EF4444'  -- Red
      WHEN 2 THEN '#10B981'  -- Green
      WHEN 3 THEN '#3B82F6'  -- Blue
      WHEN 4 THEN '#8B5CF6'  -- Purple
      WHEN 5 THEN '#F59E0B'  -- Amber
      WHEN 6 THEN '#06B6D4'  -- Cyan
      WHEN 7 THEN '#84CC16'  -- Lime
      WHEN 8 THEN '#EC4899'  -- Pink
      WHEN 9 THEN '#14B8A6'  -- Teal
      WHEN 10 THEN '#F97316' -- Orange
      WHEN 11 THEN '#A855F7' -- Violet
      ELSE '#6366F1'         -- Indigo
    END
END
WHERE color = '#6B7280' OR color IS NULL;

-- Verificar los colores asignados
SELECT id, name, color FROM departments ORDER BY name;
