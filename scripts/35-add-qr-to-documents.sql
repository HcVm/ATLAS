-- Agregar columna para código QR en la tabla de documentos
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Agregar comentario para documentar la columna
COMMENT ON COLUMN documents.qr_code IS 'Código QR del documento almacenado como data URL';

-- Crear índice para búsquedas más rápidas (opcional)
CREATE INDEX IF NOT EXISTS idx_documents_qr_code ON documents(qr_code) WHERE qr_code IS NOT NULL;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' AND column_name = 'qr_code';
