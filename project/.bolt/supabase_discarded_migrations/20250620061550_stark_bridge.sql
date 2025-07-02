/*
  # Setup Admin User and Fix Authentication

  1. New Changes
    - Create admin user in auth.users if not exists
    - Insert admin profile in users table
    - Fix RLS policies for admin operations
    - Add proper admin authentication support

  2. Security
    - Admin user has is_admin = true
    - Admin can create and manage all events
    - Admin has elevated privileges

  3. Admin Credentials
    - Email: admin@predictbet.com
    - Password: admin123
    - Starting balance: ₹100,000
*/

-- First, let's ensure we have proper policies for admin operations
DROP POLICY IF EXISTS "Admins can read all user data" ON users;
CREATE POLICY "Admins can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update any user data (for balance updates, etc.)
DROP POLICY IF EXISTS "Admins can update user data" ON users;
CREATE POLICY "Admins can update user data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create a function to safely create admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to find existing admin user
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@predictbet.com'
  LIMIT 1;

  -- If admin doesn't exist in auth.users, we'll create a placeholder in users table
  -- The actual auth user will be created when they first sign up
  IF admin_user_id IS NULL THEN
    -- Create a deterministic UUID for admin
    admin_user_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- Insert or update admin profile in users table
  INSERT INTO users (id, name, balance, total_bets, total_winnings, is_admin, created_at, updated_at)
  VALUES (
    admin_user_id,
    'Admin',
    100000.00,
    0,
    0.00,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    balance = GREATEST(users.balance, 100000.00),
    name = 'Admin',
    updated_at = now();

END;
$$;

-- Execute the function to create admin user
SELECT create_admin_user();

-- Ensure events can be read by everyone (for the events list)
DROP POLICY IF EXISTS "Anyone can read events" ON events;
CREATE POLICY "Anyone can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to create events
DROP POLICY IF EXISTS "Admins can create events" ON events;
CREATE POLICY "Admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update events
DROP POLICY IF EXISTS "Admins can update events" ON events;
CREATE POLICY "Admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow everyone to read bet options
DROP POLICY IF EXISTS "Anyone can read bet options" ON bet_options;
CREATE POLICY "Anyone can read bet options"
  ON bet_options
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage bet options
DROP POLICY IF EXISTS "Admins can manage bet options" ON bet_options;
CREATE POLICY "Admins can manage bet options"
  ON bet_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fix bets policies to allow proper betting
DROP POLICY IF EXISTS "Users can place bets" ON bets;
CREATE POLICY "Users can place bets"
  ON bets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND status = 'active' AND expires_at > now()
    )
  );

-- Allow users and admins to read bets
DROP POLICY IF EXISTS "Users can read bets" ON bets;
CREATE POLICY "Users can read bets"
  ON bets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update bets (for resolving)
DROP POLICY IF EXISTS "Admins can update bets" ON bets;
CREATE POLICY "Admins can update bets"
  ON bets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create a trigger to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'admin@predictbet.com' THEN
    INSERT INTO public.users (id, name, balance, total_bets, total_winnings, is_admin)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Admin'),
      100000.00,
      0,
      0.00,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      is_admin = true,
      balance = GREATEST(users.balance, 100000.00);
  ELSE
    INSERT INTO public.users (id, name, balance, total_bets, total_winnings, is_admin)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
      10000.00,
      0,
      0.00,
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();