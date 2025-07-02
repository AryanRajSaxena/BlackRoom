/*
  # Leaderboard and Streak System Enhancement
  # Fixed version without infinite recursion

  1. Database Schema Updates
    - Add leaderboard columns to users table
    - Create supporting tables for statistics and activity logs
    - Add proper indexes for performance

  2. Point Calculation System
    - Functions to calculate user points and tiers
    - Streak tracking functionality
    - Leaderboard ranking system

  3. Security and Performance
    - RLS policies for new tables
    - Materialized view for leaderboard performance
    - Proper function permissions

  4. Safe Initialization
    - No recursive triggers
    - Manual update functions for controlled execution
*/

-- =====================================================
-- 1. DATABASE SCHEMA UPDATES
-- =====================================================

-- Add new columns to users table
DO $$
BEGIN
  -- Add phone column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text DEFAULT 'null';
  END IF;

  -- Add streak tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE users ADD COLUMN current_streak integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'longest_streak'
  ) THEN
    ALTER TABLE users ADD COLUMN longest_streak integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE users ADD COLUMN last_activity timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE users ADD COLUMN total_points integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'rank_position'
  ) THEN
    ALTER TABLE users ADD COLUMN rank_position integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tier'
  ) THEN
    ALTER TABLE users ADD COLUMN tier text DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'achievements'
  ) THEN
    ALTER TABLE users ADD COLUMN achievements text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- Add resolved_at column to events if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE events ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

-- =====================================================
-- 2. SUPPORTING TABLES
-- =====================================================

-- Create leaderboard statistics table
CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  weekly_earnings decimal(12,2) DEFAULT 0.00,
  weekly_bets integer DEFAULT 0,
  weekly_wins integer DEFAULT 0,
  monthly_earnings decimal(12,2) DEFAULT 0.00,
  monthly_bets integer DEFAULT 0,
  monthly_wins integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Create activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('bet_placed', 'bet_won', 'bet_lost', 'deposit', 'withdrawal', 'streak_bonus', 'achievement_earned')),
  points_earned integer DEFAULT 0,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_user_week ON leaderboard_stats(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_weekly_earnings ON leaderboard_stats(weekly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_monthly_earnings ON leaderboard_stats(monthly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_users_total_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_streak ON users(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- =====================================================
-- 4. POINT CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate user points (read-only, no updates)
CREATE OR REPLACE FUNCTION calculate_user_points_value(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_points integer := 0;
  bet_points integer := 0;
  win_points integer := 0;
  streak_bonus integer := 0;
  deposit_points integer := 0;
  user_data record;
BEGIN
  -- Get user data in one query
  SELECT 
    total_winnings,
    total_bets,
    current_streak
  INTO user_data
  FROM users
  WHERE id = user_uuid;

  IF user_data IS NULL THEN
    RETURN 0;
  END IF;

  -- Base points from total winnings (1 point per ₹100 won)
  win_points := COALESCE(FLOOR(user_data.total_winnings / 100), 0);

  -- Points from total bets placed (10 points per bet)
  bet_points := COALESCE(user_data.total_bets * 10, 0);

  -- Streak bonus (50 points per current streak level)
  streak_bonus := COALESCE(user_data.current_streak * 50, 0);

  -- Deposit activity points (1 point per ₹1000 deposited)
  SELECT COALESCE(FLOOR(SUM(amount) / 1000), 0)
  INTO deposit_points
  FROM transactions
  WHERE user_id = user_uuid AND type = 'deposit' AND status = 'completed';

  total_points := win_points + bet_points + streak_bonus + deposit_points;

  RETURN total_points;
END;
$$;

-- Function to determine tier based on points (read-only)
CREATE OR REPLACE FUNCTION calculate_user_tier(points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF points >= 100000 THEN
    RETURN 'Master';
  ELSIF points >= 50000 THEN
    RETURN 'Diamond';
  ELSIF points >= 25000 THEN
    RETURN 'Platinum';
  ELSIF points >= 10000 THEN
    RETURN 'Gold';
  ELSIF points >= 2500 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$;

-- =====================================================
-- 5. STREAK CALCULATION FUNCTION
-- =====================================================

-- Function to calculate current streak (read-only)
CREATE OR REPLACE FUNCTION calculate_user_streak(user_uuid uuid)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_streak_val integer := 0;
  longest_streak_val integer := 0;
  result record;
BEGIN
  -- Calculate current streak from recent bets
  WITH recent_bets AS (
    SELECT status, placed_at,
           ROW_NUMBER() OVER (ORDER BY placed_at DESC) as bet_order
    FROM bets
    WHERE user_id = user_uuid 
      AND status IN ('won', 'lost')
    ORDER BY placed_at DESC
    LIMIT 50
  ),
  streak_calc AS (
    SELECT 
      status,
      bet_order,
      CASE 
        WHEN status = 'won' THEN 1
        ELSE 0
      END as is_win
    FROM recent_bets
  )
  SELECT COUNT(*)
  INTO current_streak_val
  FROM (
    SELECT status, bet_order, is_win,
           SUM(CASE WHEN is_win = 0 THEN 1 ELSE 0 END) OVER (ORDER BY bet_order) as loss_group
    FROM streak_calc
  ) grouped
  WHERE loss_group = 0 AND is_win = 1;

  -- Calculate longest streak from all resolved bets
  WITH all_bets AS (
    SELECT status, placed_at,
           CASE WHEN status = 'won' THEN 1 ELSE 0 END as is_win
    FROM bets
    WHERE user_id = user_uuid 
      AND status IN ('won', 'lost')
    ORDER BY placed_at
  ),
  streak_groups AS (
    SELECT is_win,
           SUM(CASE WHEN is_win = 0 THEN 1 ELSE 0 END) OVER (ORDER BY placed_at) as group_id
    FROM all_bets
  ),
  win_streaks AS (
    SELECT group_id, COUNT(*) as streak_length
    FROM streak_groups
    WHERE is_win = 1
    GROUP BY group_id
  )
  SELECT COALESCE(MAX(streak_length), 0)
  INTO longest_streak_val
  FROM win_streaks;

  -- Ensure longest streak is at least current streak
  longest_streak_val := GREATEST(longest_streak_val, current_streak_val);

  SELECT current_streak_val as current_streak, longest_streak_val as longest_streak
  INTO result;

  RETURN result;
END;
$$;

-- =====================================================
-- 6. MANUAL UPDATE FUNCTIONS (NO TRIGGERS)
-- =====================================================

-- Function to manually update user points and tier
CREATE OR REPLACE FUNCTION update_user_leaderboard_data(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_points integer;
  new_tier text;
  streak_data record;
BEGIN
  -- Calculate new points
  new_points := calculate_user_points_value(user_uuid);
  
  -- Calculate new tier
  new_tier := calculate_user_tier(new_points);
  
  -- Calculate streak data
  SELECT * INTO streak_data FROM calculate_user_streak(user_uuid);
  
  -- Update user record (single update to avoid recursion)
  UPDATE users
  SET 
    total_points = new_points,
    tier = new_tier,
    current_streak = streak_data.current_streak,
    longest_streak = streak_data.longest_streak,
    last_activity = now(),
    updated_at = now()
  WHERE id = user_uuid;
END;
$$;

-- Function to update all user rankings
CREATE OR REPLACE FUNCTION update_all_leaderboard_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all users' points and tiers first
  UPDATE users
  SET 
    total_points = calculate_user_points_value(id),
    tier = calculate_user_tier(calculate_user_points_value(id)),
    updated_at = now();

  -- Update rankings based on total points
  WITH ranked_users AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, total_winnings DESC, created_at ASC) as new_rank
    FROM users
    WHERE total_points > 0
  )
  UPDATE users
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE users.id = ranked_users.id;

  -- Update weekly/monthly stats
  INSERT INTO leaderboard_stats (user_id, week_start, weekly_earnings, weekly_bets, weekly_wins)
  SELECT 
    u.id,
    date_trunc('week', CURRENT_DATE)::date,
    COALESCE(SUM(CASE WHEN t.type = 'bet_won' AND t.created_at >= date_trunc('week', CURRENT_DATE) THEN t.amount ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN b.placed_at >= date_trunc('week', CURRENT_DATE) THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN b.status = 'won' AND b.resolved_at >= date_trunc('week', CURRENT_DATE) THEN 1 END), 0)
  FROM users u
  LEFT JOIN transactions t ON u.id = t.user_id
  LEFT JOIN bets b ON u.id = b.user_id
  GROUP BY u.id
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    weekly_earnings = EXCLUDED.weekly_earnings,
    weekly_bets = EXCLUDED.weekly_bets,
    weekly_wins = EXCLUDED.weekly_wins,
    updated_at = now();
END;
$$;

-- =====================================================
-- 7. SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Leaderboard stats policies
CREATE POLICY "Users can read own leaderboard stats"
  ON leaderboard_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all leaderboard stats"
  ON leaderboard_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can manage leaderboard stats"
  ON leaderboard_stats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Activity log policies
CREATE POLICY "Users can read own activity log"
  ON user_activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all activity logs"
  ON user_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert activity logs"
  ON user_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 8. MATERIALIZED VIEW FOR PERFORMANCE
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS leaderboard_view;

-- Create materialized view for leaderboard performance
CREATE MATERIALIZED VIEW leaderboard_view AS
SELECT 
  u.id,
  u.name,
  u.total_points,
  u.rank_position,
  u.tier,
  u.current_streak,
  u.longest_streak,
  u.total_winnings,
  u.total_bets,
  u.balance,
  u.is_verified,
  u.achievements,
  u.created_at,
  COALESCE(ls.weekly_earnings, 0) as weekly_earnings,
  COALESCE(ls.monthly_earnings, 0) as monthly_earnings
FROM users u
LEFT JOIN leaderboard_stats ls ON u.id = ls.user_id 
  AND ls.week_start = date_trunc('week', CURRENT_DATE)::date
WHERE u.total_points >= 0
ORDER BY u.total_points DESC, u.total_winnings DESC, u.created_at ASC;

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_view_id ON leaderboard_view(id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_view_points ON leaderboard_view(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_view_tier ON leaderboard_view(tier);

-- Function to refresh leaderboard view
CREATE OR REPLACE FUNCTION refresh_leaderboard_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;
END;
$$;

-- =====================================================
-- 9. SIMPLE TRIGGER FOR ACTIVITY LOGGING ONLY
-- =====================================================

-- Simple trigger function that only logs activity (no updates)
CREATE OR REPLACE FUNCTION log_bet_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log when bet status changes to won or lost
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'active' THEN
    INSERT INTO user_activity_log (user_id, action_type, points_earned, description, metadata)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'won' THEN 'bet_won' ELSE 'bet_lost' END,
      CASE WHEN NEW.status = 'won' THEN 50 ELSE 0 END,
      format('Bet %s for ₹%s', NEW.status, NEW.amount),
      jsonb_build_object('bet_id', NEW.id, 'amount', NEW.amount, 'payout', NEW.payout)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create simple trigger for activity logging only
DROP TRIGGER IF EXISTS bet_activity_logger ON bets;
CREATE TRIGGER bet_activity_logger
  AFTER UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION log_bet_activity();

-- =====================================================
-- 10. INITIAL DATA SETUP
-- =====================================================

-- Initialize existing users with default values
UPDATE users 
SET 
  current_streak = COALESCE(current_streak, 0),
  longest_streak = COALESCE(longest_streak, 0),
  total_points = COALESCE(total_points, 0),
  rank_position = COALESCE(rank_position, 0),
  tier = COALESCE(tier, 'Bronze'),
  achievements = COALESCE(achievements, '{}'),
  is_verified = COALESCE(is_verified, false),
  last_activity = COALESCE(last_activity, COALESCE(updated_at, created_at))
WHERE current_streak IS NULL OR longest_streak IS NULL OR total_points IS NULL;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_user_points_value(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_tier(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_leaderboard_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_leaderboard_rankings() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard_view() TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON leaderboard_view TO authenticated;

-- =====================================================
-- 12. VERIFICATION
-- =====================================================

-- Log completion
DO $$
DECLARE
  table_count integer;
  function_count integer;
BEGIN
  -- Count essential tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('users', 'events', 'bets', 'transactions', 'leaderboard_stats', 'user_activity_log')
    AND table_schema = 'public';

  -- Count essential functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name IN ('calculate_user_points_value', 'calculate_user_tier', 'calculate_user_streak', 'update_user_leaderboard_data')
    AND routine_schema = 'public';

  RAISE NOTICE 'Leaderboard system setup complete. Tables: %, Functions: %', table_count, function_count;
END $$;