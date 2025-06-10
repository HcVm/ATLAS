-- Verificar y corregir la estructura de la tabla news
DO $$
BEGIN
    -- Verificar si la tabla news existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'news') THEN
        -- Crear la tabla news si no existe
        CREATE TABLE news (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            published BOOLEAN DEFAULT false,
            created_by UUID REFERENCES profiles(id) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabla news creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla news ya existe';
    END IF;

    -- Verificar si la columna image_url existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'news' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE news ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Columna image_url añadida a la tabla news';
    END IF;

    -- Verificar si la columna published existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'news' AND column_name = 'published'
    ) THEN
        ALTER TABLE news ADD COLUMN published BOOLEAN DEFAULT false;
        RAISE NOTICE 'Columna published añadida a la tabla news';
    END IF;

    -- Crear índices para mejorar el rendimiento
    CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
    CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);
    CREATE INDEX IF NOT EXISTS idx_news_created_by ON news(created_by);

END $$;

-- Crear políticas RLS para la tabla news
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan leer noticias publicadas
DROP POLICY IF EXISTS "Anyone can read published news" ON news;
CREATE POLICY "Anyone can read published news" ON news
    FOR SELECT USING (published = true);

-- Política para que admin y supervisor puedan leer todas las noticias
DROP POLICY IF EXISTS "Admin and supervisor can read all news" ON news;
CREATE POLICY "Admin and supervisor can read all news" ON news
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );

-- Política para que admin y supervisor puedan crear noticias
DROP POLICY IF EXISTS "Admin and supervisor can create news" ON news;
CREATE POLICY "Admin and supervisor can create news" ON news
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );

-- Política para que admin y supervisor puedan actualizar noticias
DROP POLICY IF EXISTS "Admin and supervisor can update news" ON news;
CREATE POLICY "Admin and supervisor can update news" ON news
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );

-- Política para que admin y supervisor puedan eliminar noticias
DROP POLICY IF EXISTS "Admin and supervisor can delete news" ON news;
CREATE POLICY "Admin and supervisor can delete news" ON news
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );
