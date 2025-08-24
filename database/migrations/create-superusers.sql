-- =====================================================================
-- REYAL Admin Super User Creation Script
-- =====================================================================
-- This script creates superuser accounts for the admin dashboard
-- Run this script in Supabase SQL Editor AFTER setting up the main database
-- 
-- SECURITY WARNING: 
-- - Only run this on secure environments
-- - Change default passwords immediately after first login
-- - Use strong, unique passwords for production
-- =====================================================================

-- Function to create an admin user with email verification
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT DEFAULT 'System Administrator',
  admin_phone TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  user_id UUID;
  result_message TEXT;
BEGIN
  -- Validate email format
  IF admin_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN 'ERROR: Invalid email format';
  END IF;

  -- Validate password strength (minimum 8 characters)
  IF LENGTH(admin_password) < 8 THEN
    RETURN 'ERROR: Password must be at least 8 characters long';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    RETURN 'ERROR: User with this email already exists';
  END IF;

  -- Generate a new UUID for the user
  user_id := gen_random_uuid();

  -- Insert into auth.users (Supabase auth table)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NOW(),
    '',
    '',
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', admin_full_name, 'email', admin_email),
    FALSE,
    NOW(),
    NOW(),
    admin_phone,
    CASE WHEN admin_phone IS NOT NULL THEN NOW() ELSE NULL END,
    '',
    '',
    NOW(),
    '',
    0,
    NOW(),
    '',
    NOW()
  );

  -- Insert into profiles table with admin privileges
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    is_admin,
    is_verified,
    credits,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    admin_email,
    admin_full_name,
    admin_phone,
    TRUE,  -- is_admin = true
    TRUE,  -- is_verified = true
    0.00,  -- initial credits
    NOW(),
    NOW()
  );

  result_message := 'SUCCESS: Admin user created successfully with ID: ' || user_id::TEXT;
  RETURN result_message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- CREATE DEFAULT SUPER ADMIN ACCOUNTS
-- =====================================================================
-- IMPORTANT: Change these credentials immediately after first use!

-- Create primary super admin (change email and password!)
SELECT create_admin_user(
  'admin@reyal.com',                    -- Change this email
  'SuperSecure123!',                    -- Change this password!
  'REYAL Super Administrator',
  '+1-555-0100'
);

-- Create backup admin account (change email and password!)
SELECT create_admin_user(
  'backup-admin@reyal.com',             -- Change this email
  'BackupSecure456!',                   -- Change this password!
  'REYAL Backup Administrator',
  '+1-555-0101'
);

-- =====================================================================
-- SECURITY AUDIT FUNCTIONS
-- =====================================================================

-- Function to list all admin users
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN,
  is_verified BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.is_admin,
    p.is_verified,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE p.is_admin = TRUE
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke admin privileges
CREATE OR REPLACE FUNCTION revoke_admin_privileges(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  result_message TEXT;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = target_email) THEN
    RETURN 'ERROR: User with email ' || target_email || ' not found';
  END IF;

  -- Revoke admin privileges
  UPDATE public.profiles 
  SET is_admin = FALSE, updated_at = NOW()
  WHERE email = target_email;

  result_message := 'SUCCESS: Admin privileges revoked for ' || target_email;
  RETURN result_message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant admin privileges to existing user
CREATE OR REPLACE FUNCTION grant_admin_privileges(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  result_message TEXT;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = target_email) THEN
    RETURN 'ERROR: User with email ' || target_email || ' not found';
  END IF;

  -- Grant admin privileges
  UPDATE public.profiles 
  SET is_admin = TRUE, is_verified = TRUE, updated_at = NOW()
  WHERE email = target_email;

  result_message := 'SUCCESS: Admin privileges granted to ' || target_email;
  RETURN result_message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- USAGE EXAMPLES
-- =====================================================================

-- To list all admin users:
-- SELECT * FROM list_admin_users();

-- To create a new admin user:
-- SELECT create_admin_user('new-admin@reyal.com', 'StrongPassword123!', 'New Admin Name', '+1-555-0102');

-- To grant admin privileges to an existing user:
-- SELECT grant_admin_privileges('existing-user@reyal.com');

-- To revoke admin privileges:
-- SELECT revoke_admin_privileges('former-admin@reyal.com');

-- =====================================================================
-- POST-SETUP SECURITY CHECKLIST
-- =====================================================================

/*
IMMEDIATE ACTIONS REQUIRED AFTER RUNNING THIS SCRIPT:

1. Change the default admin email addresses above
2. Change the default passwords to strong, unique passwords
3. Enable 2FA for all admin accounts (when available)
4. Verify that RLS policies are properly configured
5. Test admin login functionality
6. Document admin user credentials securely
7. Set up monitoring for admin access attempts
8. Regular security audits using list_admin_users()

PRODUCTION SECURITY MEASURES:

1. Use environment variables for sensitive data
2. Implement IP whitelisting for admin access
3. Set up audit logging for all admin actions
4. Regular password rotation policy
5. Backup and disaster recovery procedures
6. Monitor for suspicious admin activities
7. Implement session timeout for admin users
8. Use VPN or secure networks for admin access

REMEMBER: The security of your platform depends on proper admin account management!
*/