-- Verificar si la extensión pgcrypto está instalada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Actualizar la función para usar el formato correcto de contraseñas
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
  -- Generar un nuevo UUID para el usuario
  v_user_id := gen_random_uuid();
  
  -- Convertir el rol de texto a enum
  BEGIN
    v_role := p_role::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user'::user_role;
  END;

  -- Crear el usuario en auth.users con el formato correcto de contraseña
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_user_meta_data
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),  -- Usar el algoritmo Blowfish para hashear la contraseña
    NOW(),
    'authenticated',
    'authenticated',
    jsonb_build_object('full_name', p_full_name)
  );
  
  -- Crear la identidad para el usuario
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    p_email  -- Usar el email como provider_id
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
EXCEPTION WHEN OTHERS THEN
  -- Registrar el error para depuración
  RAISE NOTICE 'Error en admin_create_user_simple: %', SQLERRM;
  -- Re-lanzar la excepción
  RAISE;
END;
$$;

-- Actualizar las contraseñas de los usuarios existentes para que puedan iniciar sesión
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  -- Buscar usuarios con contraseñas que no tienen el formato correcto
  FOR user_rec IN 
    SELECT id, email, encrypted_password 
    FROM auth.users 
    WHERE encrypted_password NOT LIKE '$2a$%'
  LOOP
    -- Actualizar la contraseña con un valor predeterminado (temporal)
    -- Nota: Esto establecerá la contraseña como 'password123' para todos los usuarios afectados
    UPDATE auth.users 
    SET encrypted_password = crypt('password123', gen_salt('bf'))
    WHERE id = user_rec.id;
    
    RAISE NOTICE 'Actualizada contraseña para usuario %: %', user_rec.email, user_rec.id;
  END LOOP;
END;
$$;

-- Verificar si hay usuarios con problemas en la tabla auth.identities
DO $$
DECLARE
  identity_rec RECORD;
BEGIN
  -- Buscar identidades con provider_id nulo
  FOR identity_rec IN 
    SELECT i.id, i.user_id, u.email 
    FROM auth.identities i
    JOIN auth.users u ON i.user_id = u.id
    WHERE i.provider_id IS NULL
  LOOP
    -- Actualizar el provider_id con el email del usuario
    UPDATE auth.identities 
    SET provider_id = identity_rec.email
    WHERE id = identity_rec.id;
    
    RAISE NOTICE 'Actualizado provider_id para identidad %: %', identity_rec.id, identity_rec.email;
  END LOOP;
END;
$$;

-- Mostrar mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE 'Script de corrección de contraseñas ejecutado correctamente.';
  RAISE NOTICE 'Los usuarios existentes ahora tienen la contraseña "password123".';
  RAISE NOTICE 'Por favor, pídales que cambien su contraseña después de iniciar sesión.';
END;
$$;
