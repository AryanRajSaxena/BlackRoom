/*
  # Fix user signup RLS policy

  1. Security Updates
    - Update INSERT policy for users table to allow proper user profile creation during signup
    - Ensure authenticated users can create their own profile with proper validation

  2. Changes
    - Modify the INSERT policy to be less restrictive while maintaining security
    - Allow authenticated users to insert their profile when the ID matches their auth UID
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON users;

-- Create a new INSERT policy that allows authenticated users to create their profile
CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure we have a policy that allows users to insert when they don't have a profile yet
CREATE POLICY "Allow profile creation on signup"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND 
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );