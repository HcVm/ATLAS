-- Eliminar la función con CASCADE para eliminar también el trigger que depende de ella
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verificar si el tipo enum user_role existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
  END IF;
END$$;

-- Crear una función más simple para crear usuarios directamente
CREATE OR REPLACE FUNCTION admin_create_user_simple(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_role user_role;
BEGIN
  -- Convertir el rol de texto a enum
  BEGIN
    v_role := p_role::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user'::user_role;
  END;

  -- Crear el usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_user_meta_data
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    jsonb_build_object('full_name', p_full_name)
  )
  RETURNING id INTO v_user_id;
  
  -- Crear la identidad para el usuario
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email'
  );
  
  -- Crear el perfil manualmente
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
  )
  VALUES (
    v_user_id,
    p_email,
    p_full_name,
    v_role
  );
  
  RETURN v_user_id;
END;
$$;

-- Verificar si hay perfiles duplicados y eliminarlos
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN 
    SELECT id, COUNT(*) 
    FROM profiles 
    GROUP BY id 
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Encontrado perfil duplicado con ID: %', duplicate_record.id;
    
    -- Eliminar todos menos uno
    WITH ranked_duplicates AS (
      SELECT id, email, created_at, 
             ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
      FROM profiles
      WHERE id = duplicate_record.id
    )
    DELETE FROM profiles
    WHERE id IN (
      SELECT id FROM ranked_duplicates WHERE rn > 1
    );
    
    RAISE NOTICE 'Perfiles duplicados eliminados para ID: %', duplicate_record.id;
  END LOOP;
END $$;
