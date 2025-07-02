/*
  # Create Admin User

  1. Changes
    - Insert admin user into users table if not exists
    - Set admin privileges and higher starting balance
    - Ensure admin can create events

  2. Security
    - Admin user has is_admin = true
    - Higher starting balance for testing
*/

-- Insert admin user if not exists
INSERT INTO users (id, name, balance, total_bets, total_winnings, is_admin, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
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
  balance = GREATEST(users.balance, 100000.00);

-- Ensure admin can manage all events
CREATE POLICY IF NOT EXISTS "Admins can manage all events"
  ON events
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

-- Ensure admin can manage all bet options
CREATE POLICY IF NOT EXISTS "Admins can manage all bet options"
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