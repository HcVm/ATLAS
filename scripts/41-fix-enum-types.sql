-- Verificar si el tipo enum user_role existe y crearlo si no existe
DO $$
BEGIN
    -- Verificar si el tipo enum user_role existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Crear el tipo enum user_role
        CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
        RAISE NOTICE 'Tipo enum user_role creado correctamente';
    ELSE
        RAISE NOTICE 'El tipo enum user_role ya existe';
    END IF;
    
    -- Verificar si el tipo enum document_status existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        -- Crear el tipo enum document_status
        CREATE TYPE document_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
        RAISE NOTICE 'Tipo enum document_status creado correctamente';
    ELSE
        RAISE NOTICE 'El tipo enum document_status ya existe';
    END IF;
END $$;

-- Verificar la estructura de la tabla profiles
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Verificar si la columna role existe en la tabla profiles
    SELECT data_type INTO column_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role';
    
    IF column_type IS NULL THEN
        -- La columna no existe, agregarla
        ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user'::user_role;
        RAISE NOTICE 'Columna role agregada a la tabla profiles';
    ELSIF column_type != 'USER-DEFINED' THEN
        -- La columna existe pero no es del tipo correcto
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING 'user'::user_role;
        RAISE NOTICE 'Tipo de columna role actualizado a user_role';
    ELSE
        RAISE NOTICE 'La columna role ya existe y es del tipo correcto';
    END IF;
END $$;

-- Desactivar y recrear el trigger de creación de usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recrear la función del trigger con el tipo correcto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    'user'::user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para crear usuarios manualmente (para administradores)
CREATE OR REPLACE FUNCTION admin_create_user_complete(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role user_role DEFAULT 'user'::user_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Generar un UUID para el usuario
  v_user_id := gen_random_uuid();
  
  -- Insertar en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    jsonb_build_object('full_name', p_full_name),
    NOW(),
    NOW()
  );
  
  -- Insertar en auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW()
  );
  
  -- Insertar en profiles (el trigger debería hacer esto, pero lo hacemos manualmente por seguridad)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN v_user_id;
END;
$$;
