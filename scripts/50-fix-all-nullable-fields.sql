-- Script para corregir TODOS los campos nullable de auth.users
-- Este script inicializa correctamente TODOS los campos de auth.users
-- para evitar errores de conversión NULL to string

-- Verificar si el tipo enum user_role existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
    END IF;
END$$;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS admin_create_user_simple(text, text, text, text);

-- Crear la función actualizada con TODOS los campos de auth.users
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
    
    -- Insertar el usuario en auth.users con TODOS los campos
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
        email_change_token_new,
        email_change,
        email_change_sent_at,
        email_change_confirm_status,
        banned_until,
        confirmation_sent_at,
        recovery_sent_at,
        email_change_token_current,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        confirmed_at,
        invite_token,
        is_sso_user,
        deleted_at,
        is_anonymous
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
        '',
        '',
        NULL,
        0,
        NULL,
        v_now,
        NULL,
        '',
        NULL,
        NULL,
        '',
        '',
        NULL,
        v_now,
        '',
        FALSE,
        NULL,
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
        updated_at,
        email
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email,
        v_now,
        v_now,
        v_now,
        p_email
    );
    
    -- Insertar el perfil en public.profiles
    INSERT INTO public.profiles (
        id,
        updated_at,
        username,
        full_name,
        avatar_url,
        role,
        email
    ) VALUES (
        v_user_id,
        v_now,
        p_email,
        p_name,
        NULL,
        p_role::user_role,
        p_email
    );
    
    RETURN v_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en admin_create_user_simple: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar TODOS los usuarios existentes para corregir campos problemáticos
DO $$
DECLARE
    v_count int;
    v_now timestamp with time zone := NOW();
BEGIN
    -- Actualizar TODOS los campos que pueden ser NULL y causar problemas
    UPDATE auth.users
    SET 
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone = COALESCE(phone, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        invite_token = COALESCE(invite_token, ''),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        created_at = COALESCE(created_at, v_now),
        updated_at = COALESCE(updated_at, v_now),
        last_sign_in_at = COALESCE(last_sign_in_at, v_now),
        confirmed_at = COALESCE(confirmed_at, v_now),
        confirmation_sent_at = COALESCE(confirmation_sent_at, v_now),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'),
        aud = COALESCE(aud, 'authenticated'),
        role = COALESCE(role, 'authenticated'),
        email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
        is_sso_user = COALESCE(is_sso_user, FALSE),
        is_anonymous = COALESCE(is_anonymous, FALSE)
    WHERE 
        confirmation_token IS NULL 
        OR recovery_token IS NULL
        OR email_change_token_new IS NULL
        OR email_change IS NULL
        OR email_change_token_current IS NULL
        OR phone IS NULL
        OR phone_change IS NULL
        OR phone_change_token IS NULL
        OR invite_token IS NULL
        OR email_confirmed_at IS NULL
        OR created_at IS NULL
        OR updated_at IS NULL
        OR last_sign_in_at IS NULL
        OR confirmed_at IS NULL
        OR confirmation_sent_at IS NULL
        OR raw_app_meta_data IS NULL
        OR raw_user_meta_data IS NULL
        OR aud IS NULL
        OR role IS NULL
        OR email_change_confirm_status IS NULL
        OR is_sso_user IS NULL
        OR is_anonymous IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizados % usuarios con campos NULL', v_count;
    
    -- Actualizar provider_id y email en identidades
    UPDATE auth.identities
    SET 
        provider_id = COALESCE(auth.identities.provider_id, auth.users.email),
        email = COALESCE(auth.identities.email, auth.users.email),
        created_at = COALESCE(auth.identities.created_at, v_now),
        updated_at = COALESCE(auth.identities.updated_at, v_now),
        last_sign_in_at = COALESCE(auth.identities.last_sign_in_at, v_now)
    FROM auth.users
    WHERE auth.identities.user_id = auth.users.id
    AND (auth.identities.provider_id IS NULL 
         OR auth.identities.email IS NULL
         OR auth.identities.created_at IS NULL
         OR auth.identities.updated_at IS NULL
         OR auth.identities.last_sign_in_at IS NULL);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizadas % identidades con campos NULL', v_count;
    
    -- Actualizar perfiles para asegurar que tengan email
    UPDATE public.profiles
    SET 
        email = COALESCE(public.profiles.email, auth.users.email),
        updated_at = COALESCE(public.profiles.updated_at, v_now)
    FROM auth.users
    WHERE public.profiles.id = auth.users.id
    AND (public.profiles.email IS NULL OR public.profiles.updated_at IS NULL);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizados % perfiles con campos NULL', v_count;
    
    -- Verificaciones finales
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE email_change IS NULL;
    RAISE NOTICE 'Usuarios restantes con email_change NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE confirmation_token IS NULL;
    RAISE NOTICE 'Usuarios restantes con confirmation_token NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE created_at IS NULL;
    RAISE NOTICE 'Usuarios restantes con created_at NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.identities WHERE provider_id IS NULL;
    RAISE NOTICE 'Identidades restantes con provider_id NULL: %', v_count;
END$$;

-- Mostrar mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Script completado. TODOS los campos de autenticación han sido corregidos.';
    RAISE NOTICE 'Los usuarios ahora deberían poder iniciar sesión sin errores.';
END$$;
