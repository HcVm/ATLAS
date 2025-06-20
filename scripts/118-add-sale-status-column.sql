-- Agregar columna de estado a la tabla sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_status VARCHAR(20) CHECK (sale_status IN ('conformidad', 'devengado', 'girado'));

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(sale_status);

-- Actualizar ventas existentes con estado por defecto
UPDATE sales SET sale_status = 'conformidad' WHERE sale_status IS NULL;

-- Comentario para documentación
COMMENT ON COLUMN sales.sale_status IS 'Estado de la venta: conformidad, devengado, girado';

-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'sale_status'
    ) THEN
        RAISE NOTICE 'Columna sale_status agregada exitosamente a la tabla sales';
    ELSE
        RAISE EXCEPTION 'Error: No se pudo agregar la columna sale_status';
    END IF;
END $$;
