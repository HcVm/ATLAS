-- Script para corregir todos los campos de autenticación
-- Este script inicializa correctamente todos los campos obligatorios de auth.users
-- y actualiza los usuarios existentes para corregir campos problemáticos

-- Verificar si el tipo enum user_role existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
    END IF;
END$$;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS admin_create_user_simple(text, text, text, text);

-- Crear la función actualizada con todos los campos obligatorios
CREATE OR REPLACE FUNCTION admin_create_user_simple(
    p_email text,
    p_password text,
    p_name text,
    p_role text DEFAULT 'user'
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
    v_now timestamp with time zone;
BEGIN
    -- Generar un UUID para el usuario
    v_user_id := gen_random_uuid();
    
    -- Obtener la hora actual para varios campos de timestamp
    v_now := NOW();
    
    -- Hashear la contraseña con el algoritmo Blowfish (compatible con Supabase)
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    
    -- Insertar el usuario en auth.users con TODOS los campos obligatorios
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        confirmation_token,
        recovery_token,
        is_sso_user
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        v_now,
        v_now,
        v_now,
        v_now,
        '{"provider":"email","providers":["email"]}',
        '{"name":"' || p_name || '"}',
        'authenticated',
        'authenticated',
        '',
        '',
        FALSE
    );
    
    -- Insertar la identidad en auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email,
        v_now,
        v_now,
        v_now
    );
    
    -- Insertar el perfil en public.profiles
    INSERT INTO public.profiles (
        id,
        updated_at,
        username,
        full_name,
        avatar_url,
        role
    ) VALUES (
        v_user_id,
        v_now,
        p_email,
        p_name,
        NULL,
        p_role::user_role
    );
    
    RETURN v_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en admin_create_user_simple: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar usuarios existentes para corregir campos problemáticos
DO $$
DECLARE
    v_count int;
    v_now timestamp with time zone := NOW();
BEGIN
    -- Actualizar confirmation_token y recovery_token para evitar errores NULL
    UPDATE auth.users
    SET 
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        created_at = COALESCE(created_at, v_now),
        updated_at = COALESCE(updated_at, v_now),
        last_sign_in_at = COALESCE(last_sign_in_at, v_now),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'),
        aud = COALESCE(aud, 'authenticated'),
        role = COALESCE(role, 'authenticated'),
        is_sso_user = COALESCE(is_sso_user, FALSE)
    WHERE 
        confirmation_token IS NULL 
        OR recovery_token IS NULL
        OR email_confirmed_at IS NULL
        OR created_at IS NULL
        OR updated_at IS NULL
        OR last_sign_in_at IS NULL
        OR raw_app_meta_data IS NULL
        OR raw_user_meta_data IS NULL
        OR aud IS NULL
        OR role IS NULL
        OR is_sso_user IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizados % usuarios con campos NULL', v_count;
    
    -- Actualizar provider_id en identidades
    UPDATE auth.identities
    SET 
        provider_id = auth.users.email,
        created_at = COALESCE(auth.identities.created_at, v_now),
        updated_at = COALESCE(auth.identities.updated_at, v_now),
        last_sign_in_at = COALESCE(auth.identities.last_sign_in_at, v_now)
    FROM auth.users
    WHERE auth.identities.user_id = auth.users.id
    AND (auth.identities.provider_id IS NULL 
         OR auth.identities.created_at IS NULL
         OR auth.identities.updated_at IS NULL
         OR auth.identities.last_sign_in_at IS NULL);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizadas % identidades con campos NULL', v_count;
    
    -- Verificar si quedan usuarios con confirmation_token NULL
    SELECT COUNT(*) INTO v_count
    FROM auth.users
    WHERE confirmation_token IS NULL;
    
    RAISE NOTICE 'Usuarios restantes con confirmation_token NULL: %', v_count;
    
    -- Verificar si quedan usuarios con created_at NULL
    SELECT COUNT(*) INTO v_count
    FROM auth.users
    WHERE created_at IS NULL;
    
    RAISE NOTICE 'Usuarios restantes con created_at NULL: %', v_count;
    
    -- Verificar si quedan identidades con provider_id NULL
    SELECT COUNT(*) INTO v_count
    FROM auth.identities
    WHERE provider_id IS NULL;
    
    RAISE NOTICE 'Identidades restantes con provider_id NULL: %', v_count;
END$$;

-- Mostrar mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Script completado. Todos los campos de autenticación han sido corregidos.';
END$$;
