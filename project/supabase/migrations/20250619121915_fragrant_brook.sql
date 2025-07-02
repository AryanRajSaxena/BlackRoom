/*
  # Fix user profile creation policy

  1. Security Changes
    - Add INSERT policy for users table to allow authenticated users to create their own profile
    - This resolves the RLS violation error when creating new user accounts

  The policy ensures that authenticated users can only insert records where the user ID matches their authentication ID.
*/

-- Add policy to allow authenticated users to insert their own user profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);