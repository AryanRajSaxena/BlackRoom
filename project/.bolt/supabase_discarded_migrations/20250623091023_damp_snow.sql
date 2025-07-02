/*
  # Fix Transaction RLS Policy for Admin Money Distribution

  1. Security Updates
    - Update transaction INSERT policy to allow admins to create transactions for any user
    - This enables proper money distribution when results are declared

  2. Changes
    - Drop existing restrictive transaction INSERT policy
    - Create new policy allowing users to create their own transactions OR admins to create any transaction
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;

-- Create new policy that allows users to create their own transactions OR admins to create any transaction
CREATE POLICY "Users can create own transactions or admins can create any"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );