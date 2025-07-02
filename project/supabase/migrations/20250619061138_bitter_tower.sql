/*
  # Betting Platform Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - User ID from Supabase Auth
      - `name` (text) - User's display name
      - `balance` (decimal) - Current wallet balance
      - `total_bets` (integer) - Total number of bets placed
      - `total_winnings` (decimal) - Total amount won
      - `is_admin` (boolean) - Admin privileges
      - `created_at` (timestamp) - Account creation time
      - `updated_at` (timestamp) - Last update time

    - `events`
      - `id` (uuid, primary key) - Event ID
      - `title` (text) - Event title
      - `description` (text) - Event description
      - `category` (text) - Event category
      - `created_by` (uuid) - Creator user ID
      - `expires_at` (timestamp) - Event expiry time
      - `status` (text) - Event status (active, closed, resolved)
      - `total_pool` (decimal) - Total betting pool
      - `participant_count` (integer) - Number of participants
      - `winning_option_id` (uuid) - Winning option (nullable)
      - `created_at` (timestamp) - Creation time
      - `updated_at` (timestamp) - Last update time

    - `bet_options`
      - `id` (uuid, primary key) - Option ID
      - `event_id` (uuid) - Associated event
      - `label` (text) - Option label
      - `odds` (decimal) - Betting odds
      - `total_bets` (decimal) - Total amount bet on this option
      - `bettors` (integer) - Number of bettors
      - `created_at` (timestamp) - Creation time

    - `bets`
      - `id` (uuid, primary key) - Bet ID
      - `event_id` (uuid) - Associated event
      - `user_id` (uuid) - Bettor user ID
      - `option_id` (uuid) - Selected option
      - `amount` (decimal) - Bet amount
      - `status` (text) - Bet status (active, won, lost)
      - `payout` (decimal) - Payout amount (nullable)
      - `placed_at` (timestamp) - Bet placement time
      - `resolved_at` (timestamp) - Bet resolution time (nullable)

    - `transactions`
      - `id` (uuid, primary key) - Transaction ID
      - `user_id` (uuid) - User ID
      - `type` (text) - Transaction type
      - `amount` (decimal) - Transaction amount
      - `description` (text) - Transaction description
      - `status` (text) - Transaction status
      - `payment_method` (text) - Payment method (nullable)
      - `transaction_id` (text) - External transaction ID (nullable)
      - `event_id` (uuid) - Associated event (nullable)
      - `bet_id` (uuid) - Associated bet (nullable)
      - `created_at` (timestamp) - Transaction time

    - `payment_methods`
      - `id` (uuid, primary key) - Payment method ID
      - `user_id` (uuid) - User ID
      - `type` (text) - Method type (upi, card, netbanking, wallet)
      - `name` (text) - Display name
      - `details` (text) - Method details
      - `is_default` (boolean) - Default method flag
      - `created_at` (timestamp) - Creation time

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admins to manage events
    - Add policies for public read access to events and options

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for complex queries
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  balance decimal(12,2) NOT NULL DEFAULT 0.00,
  total_bets integer NOT NULL DEFAULT 0,
  total_winnings decimal(12,2) NOT NULL DEFAULT 0.00,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved')),
  total_pool decimal(12,2) NOT NULL DEFAULT 0.00,
  participant_count integer NOT NULL DEFAULT 0,
  winning_option_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bet_options table
CREATE TABLE IF NOT EXISTS bet_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  label text NOT NULL,
  odds decimal(4,2) NOT NULL CHECK (odds > 1.0),
  total_bets decimal(12,2) NOT NULL DEFAULT 0.00,
  bettors integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  option_id uuid REFERENCES bet_options(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  payout decimal(12,2),
  placed_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost', 'refund')),
  amount decimal(12,2) NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method text,
  transaction_id text,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  bet_id uuid REFERENCES bets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('upi', 'card', 'netbanking', 'wallet')),
  name text NOT NULL,
  details text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for winning_option_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_winning_option_id_fkey'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_winning_option_id_fkey 
    FOREIGN KEY (winning_option_id) REFERENCES bet_options(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON events(expires_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_bet_options_event_id ON bet_options(event_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_event_id ON bets(event_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Anyone can read active events"
  ON events
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR created_by = auth.uid());

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

CREATE POLICY "Admins can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Bet options policies
CREATE POLICY "Anyone can read bet options"
  ON bet_options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Event creators can manage bet options"
  ON bet_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Bets policies
CREATE POLICY "Users can read own bets"
  ON bets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can place bets"
  ON bets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators can read bets on their events"
  ON bets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Transactions policies
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Payment methods policies
CREATE POLICY "Users can manage own payment methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();