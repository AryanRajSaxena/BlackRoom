/*
  # Fix User Table RLS Policies

  1. Changes
    - Drop the conflicting "Allow profile creation on signup" policy
    - Keep the simpler "Users can create own profile" policy
    - This allows authenticated users to create their own profile during signup

  2. Security
    - Users can only create profiles with their own auth.uid()
    - Users can only read/update their own data
    - Maintains security while fixing signup issues
*/

-- Drop the problematic policy that's causing the signup issue
DROP POLICY IF EXISTS "Allow profile creation on signup" ON users;

-- The existing "Users can create own profile" policy should handle profile creation
-- Let's make sure it's properly configured
DROP POLICY IF EXISTS "Users can create own profile" ON users;

CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);