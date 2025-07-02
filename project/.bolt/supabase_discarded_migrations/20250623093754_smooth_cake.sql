/*
  # Fix Payout Distribution Policies

  1. Security Updates
    - Allow admins to update user balances during payout distribution
    - Allow admins to create transactions on behalf of users during payouts
    - Ensure proper policies for bet resolution

  2. Changes
    - Update user table policies to allow admin balance updates
    - Update transaction policies for admin-created payouts
    - Update bet policies for admin resolution
    - Add policies for payout distribution process
*/

-- Allow admins to update user balances during payouts
DROP POLICY IF EXISTS "Admins can update user balances for payouts" ON users;
CREATE POLICY "Admins can update user balances for payouts"
  ON users
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

-- Allow admins to update bet status during resolution
DROP POLICY IF EXISTS "Admins can resolve bets" ON bets;
CREATE POLICY "Admins can resolve bets"
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

-- Ensure admins can create payout transactions for any user
DROP POLICY IF EXISTS "Admins can create payout transactions" ON transactions;
CREATE POLICY "Admins can create payout transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to read all transactions for verification
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
CREATE POLICY "Admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );