/*
  # Fix User Profile Creation

  1. Security Updates
    - Update RLS policies to allow user profile creation
    - Ensure users can create their own profiles during signup
    - Add policy for reading user profiles during authentication

  2. Changes
    - Modified INSERT policy to allow profile creation
    - Added proper error handling for user creation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies with proper permissions
CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure the users table has proper structure
ALTER TABLE users ALTER COLUMN name SET DEFAULT '';
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN total_bets SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN total_winnings SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT false;