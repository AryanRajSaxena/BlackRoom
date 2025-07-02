/*
  # Fix Users Table RLS Policies

  1. Security Changes
    - Drop conflicting INSERT policies on users table
    - Create a single, clear INSERT policy that allows authenticated users to create their own profile
    - Ensure the policy works correctly with the signup flow

  2. Policy Details
    - Remove duplicate INSERT policies that may be causing conflicts
    - Add a single INSERT policy that allows users to insert their own data when auth.uid() matches the id
    - Keep existing SELECT and UPDATE policies intact
*/

-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a single, clear INSERT policy for user profile creation
CREATE POLICY "Users can create own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the SELECT policy allows users to read their own data
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure the UPDATE policy allows users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);