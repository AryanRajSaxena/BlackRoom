/*
  # Fix Event Fetching and RLS Policies

  1. Security Updates
    - Fix RLS policies to allow proper event fetching
    - Ensure events created by admin are visible to all users
    - Fix bet options visibility
    - Add proper policies for event management

  2. Changes
    - Update event policies to allow reading all active events
    - Fix bet options policies for proper visibility
    - Ensure admin can manage all events and options
    - Add policies for event statistics updates
*/

-- Drop and recreate event policies for better visibility
DROP POLICY IF EXISTS "Anyone can read active events" ON events;
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can update own events" ON events;

-- Allow everyone to read all events (not just active ones)
CREATE POLICY "Everyone can read all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to create events
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

-- Allow admins to update any event
CREATE POLICY "Admins can update any event"
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

-- Allow event creators to update their own events
CREATE POLICY "Event creators can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Fix bet options policies
DROP POLICY IF EXISTS "Anyone can read bet options" ON bet_options;
DROP POLICY IF EXISTS "Event creators can manage bet options" ON bet_options;
DROP POLICY IF EXISTS "Admins can manage bet options" ON bet_options;
DROP POLICY IF EXISTS "Admins can manage all bet options" ON bet_options;

-- Allow everyone to read bet options
CREATE POLICY "Everyone can read bet options"
  ON bet_options
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage all bet options
CREATE POLICY "Admins can manage all bet options"
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

-- Allow event creators to manage bet options for their events
CREATE POLICY "Event creators can manage their bet options"
  ON bet_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Add policy to allow updating event statistics when bets are placed
CREATE POLICY "System can update event stats"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policy to allow updating bet option statistics
CREATE POLICY "System can update bet option stats"
  ON bet_options
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a function to refresh event statistics
CREATE OR REPLACE FUNCTION refresh_event_statistics(event_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_pool_amount decimal(12,2);
  participant_count_val integer;
BEGIN
  -- Calculate total pool and participant count from bets
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(DISTINCT user_id)
  INTO total_pool_amount, participant_count_val
  FROM bets
  WHERE event_id = event_uuid AND status = 'active';

  -- Update event statistics
  UPDATE events
  SET 
    total_pool = total_pool_amount,
    participant_count = participant_count_val,
    updated_at = now()
  WHERE id = event_uuid;

  -- Update bet option statistics
  UPDATE bet_options
  SET 
    total_bets = COALESCE((
      SELECT SUM(amount)
      FROM bets
      WHERE option_id = bet_options.id AND status = 'active'
    ), 0),
    bettors = COALESCE((
      SELECT COUNT(DISTINCT user_id)
      FROM bets
      WHERE option_id = bet_options.id AND status = 'active'
    ), 0)
  WHERE event_id = event_uuid;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION refresh_event_statistics(uuid) TO authenticated;