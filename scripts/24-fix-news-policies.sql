-- Verificar si la tabla news existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'news') THEN
    -- Crear la tabla news si no existe
    CREATE TABLE public.news (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      published BOOLEAN DEFAULT false,
      created_by UUID REFERENCES public.profiles(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Añadir comentario
    COMMENT ON TABLE public.news IS 'Tabla para almacenar noticias del sistema';
  END IF;
END $$;

-- Habilitar Row Level Security
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Todos pueden ver noticias publicadas" ON public.news;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear noticias" ON public.news;
DROP POLICY IF EXISTS "Los administradores pueden editar cualquier noticia" ON public.news;
DROP POLICY IF EXISTS "Los usuarios pueden editar sus propias noticias" ON public.news;
DROP POLICY IF EXISTS "Los administradores pueden eliminar cualquier noticia" ON public.news;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias noticias" ON public.news;

-- Crear políticas
-- Política para lectura: todos pueden ver noticias publicadas
CREATE POLICY "Todos pueden ver noticias publicadas"
ON public.news FOR SELECT
USING (published = true);

-- Política para inserción: usuarios autenticados pueden crear noticias
CREATE POLICY "Los usuarios autenticados pueden crear noticias"
ON public.news FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política para actualización: administradores pueden editar cualquier noticia
CREATE POLICY "Los administradores pueden editar cualquier noticia"
ON public.news FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política para actualización: usuarios pueden editar sus propias noticias
CREATE POLICY "Los usuarios pueden editar sus propias noticias"
ON public.news FOR UPDATE
USING (created_by = auth.uid());

-- Política para eliminación: administradores pueden eliminar cualquier noticia
CREATE POLICY "Los administradores pueden eliminar cualquier noticia"
ON public.news FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política para eliminación: usuarios pueden eliminar sus propias noticias
CREATE POLICY "Los usuarios pueden eliminar sus propias noticias"
ON public.news FOR DELETE
USING (created_by = auth.uid());

-- Crear un trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger a la tabla news
DROP TRIGGER IF EXISTS update_news_updated_at ON public.news;
CREATE TRIGGER update_news_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Verificar que la columna created_by se actualice automáticamente
CREATE OR REPLACE FUNCTION public.set_news_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger para establecer created_by
DROP TRIGGER IF EXISTS set_news_created_by ON public.news;
CREATE TRIGGER set_news_created_by
BEFORE INSERT ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.set_news_created_by();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Configuración de la tabla news completada con éxito';
END $$;
