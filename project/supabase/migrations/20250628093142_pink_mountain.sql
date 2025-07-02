-- =====================================================
-- LEADERBOARD AND STREAK SYSTEM ENHANCEMENT
-- Database Audit and Enhancement Migration
-- =====================================================

-- =====================================================
-- 1. DATABASE CONNECTIVITY AND SCHEMA VERIFICATION
-- =====================================================

-- Verify all existing tables and add missing columns for leaderboard
DO $$
BEGIN
  -- Add phone column to users if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text DEFAULT 'null';
  END IF;

  -- Add streak tracking columns to users table
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
-- 2. LEADERBOARD SYSTEM IMPLEMENTATION
-- =====================================================

-- Create leaderboard statistics table for detailed tracking
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

-- Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('bet_placed', 'bet_won', 'bet_lost', 'deposit', 'withdrawal', 'streak_bonus', 'achievement_earned')),
  points_earned integer DEFAULT 0,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_user_week ON leaderboard_stats(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_weekly_earnings ON leaderboard_stats(weekly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_monthly_earnings ON leaderboard_stats(monthly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_users_total_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_streak ON users(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- =====================================================
-- 3. POINT CALCULATION SYSTEM
-- =====================================================

-- Function to calculate user points based on various activities
CREATE OR REPLACE FUNCTION calculate_user_points(user_uuid uuid)
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
BEGIN
  -- Base points from total winnings (1 point per ₹100 won)
  SELECT COALESCE(FLOOR(total_winnings / 100), 0)
  INTO win_points
  FROM users
  WHERE id = user_uuid;

  -- Points from total bets placed (10 points per bet)
  SELECT COALESCE(total_bets * 10, 0)
  INTO bet_points
  FROM users
  WHERE id = user_uuid;

  -- Streak bonus (50 points per current streak level)
  SELECT COALESCE(current_streak * 50, 0)
  INTO streak_bonus
  FROM users
  WHERE id = user_uuid;

  -- Deposit activity points (1 point per ₹1000 deposited)
  SELECT COALESCE(FLOOR(SUM(amount) / 1000), 0)
  INTO deposit_points
  FROM transactions
  WHERE user_id = user_uuid AND type = 'deposit' AND status = 'completed';

  total_points := win_points + bet_points + streak_bonus + deposit_points;

  RETURN total_points;
END;
$$;

-- Function to update user tier based on points
CREATE OR REPLACE FUNCTION update_user_tier(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_points integer;
  new_tier text;
BEGIN
  SELECT total_points INTO user_points
  FROM users
  WHERE id = user_uuid;

  -- Determine tier based on points
  IF user_points >= 100000 THEN
    new_tier := 'Master';
  ELSIF user_points >= 50000 THEN
    new_tier := 'Diamond';
  ELSIF user_points >= 25000 THEN
    new_tier := 'Platinum';
  ELSIF user_points >= 10000 THEN
    new_tier := 'Gold';
  ELSIF user_points >= 2500 THEN
    new_tier := 'Silver';
  ELSE
    new_tier := 'Bronze';
  END IF;

  -- Update user tier
  UPDATE users
  SET tier = new_tier, updated_at = now()
  WHERE id = user_uuid;

  RETURN new_tier;
END;
$$;

-- =====================================================
-- 4. STREAK TRACKING SYSTEM
-- =====================================================

-- Function to calculate and update user streaks
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_streak_val integer := 0;
  longest_streak_val integer := 0;
  last_bet_status text;
  consecutive_wins integer := 0;
BEGIN
  -- Get current streak values
  SELECT current_streak, longest_streak
  INTO current_streak_val, longest_streak_val
  FROM users
  WHERE id = user_uuid;

  -- Calculate current streak from recent bets
  WITH recent_bets AS (
    SELECT status, placed_at
    FROM bets
    WHERE user_id = user_uuid 
      AND status IN ('won', 'lost')
    ORDER BY placed_at DESC
    LIMIT 50
  ),
  streak_calculation AS (
    SELECT 
      status,
      ROW_NUMBER() OVER (ORDER BY placed_at DESC) as bet_order,
      CASE 
        WHEN status = 'won' AND LAG(status) OVER (ORDER BY placed_at DESC) = 'won' THEN 1
        WHEN status = 'won' AND ROW_NUMBER() OVER (ORDER BY placed_at DESC) = 1 THEN 1
        ELSE 0
      END as is_consecutive_win
    FROM recent_bets
  )
  SELECT COUNT(*)
  INTO consecutive_wins
  FROM streak_calculation
  WHERE bet_order <= (
    SELECT COALESCE(MIN(bet_order), 0)
    FROM streak_calculation
    WHERE is_consecutive_win = 0 AND bet_order > 1
  ) AND status = 'won';

  -- If no breaking point found, count all wins from the start
  IF consecutive_wins = 0 THEN
    WITH recent_wins AS (
      SELECT status
      FROM bets
      WHERE user_id = user_uuid 
        AND status IN ('won', 'lost')
      ORDER BY placed_at DESC
    )
    SELECT COUNT(*)
    INTO consecutive_wins
    FROM (
      SELECT status, ROW_NUMBER() OVER () as rn
      FROM recent_wins
    ) t
    WHERE rn <= (
      SELECT COALESCE(MIN(ROW_NUMBER() OVER ()), 999)
      FROM recent_wins
      WHERE status = 'lost'
    ) - 1 AND status = 'won';
  END IF;

  -- Update current streak
  current_streak_val := consecutive_wins;
  
  -- Update longest streak if current is higher
  IF current_streak_val > longest_streak_val THEN
    longest_streak_val := current_streak_val;
  END IF;

  -- Update user record
  UPDATE users
  SET 
    current_streak = current_streak_val,
    longest_streak = longest_streak_val,
    last_activity = now(),
    updated_at = now()
  WHERE id = user_uuid;

  -- Log streak achievement if significant
  IF current_streak_val > 0 AND current_streak_val % 5 = 0 THEN
    INSERT INTO user_activity_log (user_id, action_type, points_earned, description, metadata)
    VALUES (
      user_uuid,
      'streak_bonus',
      current_streak_val * 10,
      format('Achieved %s win streak!', current_streak_val),
      jsonb_build_object('streak_length', current_streak_val)
    );
  END IF;

  RETURN current_streak_val;
END;
$$;

-- =====================================================
-- 5. LEADERBOARD RANKING SYSTEM
-- =====================================================

-- Function to update all user rankings
CREATE OR REPLACE FUNCTION update_leaderboard_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total points for all users
  UPDATE users
  SET total_points = calculate_user_points(id);

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

  -- Update tiers for all users
  UPDATE users
  SET tier = update_user_tier(id);

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
-- 6. SECURITY ENHANCEMENTS
-- =====================================================

-- Enhanced RLS policies for new tables
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

CREATE POLICY "System can update leaderboard stats"
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

-- Enhanced user policies for new columns (avoid conflicts with existing policies)
DO $$
BEGIN
  -- Only create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admin Bet Resolution Policy'
  ) THEN
    CREATE POLICY "Admin Bet Resolution Policy"
      ON users
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.is_admin = true
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 7. AUTOMATED TRIGGERS AND FUNCTIONS
-- =====================================================

-- Trigger to update streaks when bets are resolved
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update streak when bet status changes to won or lost
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'active' THEN
    PERFORM update_user_streak(NEW.user_id);
    
    -- Log the activity
    INSERT INTO user_activity_log (user_id, action_type, points_earned, description, metadata)
    VALUES (
      NEW.user_id,
      NEW.status::text,
      CASE WHEN NEW.status = 'won' THEN 50 ELSE 0 END,
      format('Bet %s for ₹%s', NEW.status, NEW.amount),
      jsonb_build_object('bet_id', NEW.id, 'amount', NEW.amount, 'payout', NEW.payout)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for bet resolution
DROP TRIGGER IF EXISTS bet_resolution_streak_update ON bets;
CREATE TRIGGER bet_resolution_streak_update
  AFTER UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_streak();

-- Trigger to update points when user data changes
CREATE OR REPLACE FUNCTION trigger_update_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update total points
  NEW.total_points := calculate_user_points(NEW.id);
  
  -- Update tier
  NEW.tier := update_user_tier(NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS user_points_update ON users;
CREATE TRIGGER user_points_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_points();

-- =====================================================
-- 8. PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Create materialized view for leaderboard performance
DROP MATERIALIZED VIEW IF EXISTS leaderboard_view;
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
  ls.weekly_earnings,
  ls.monthly_earnings,
  CASE 
    WHEN u.total_points >= 100000 THEN 'Master'
    WHEN u.total_points >= 50000 THEN 'Diamond'
    WHEN u.total_points >= 25000 THEN 'Platinum'
    WHEN u.total_points >= 10000 THEN 'Gold'
    WHEN u.total_points >= 2500 THEN 'Silver'
    ELSE 'Bronze'
  END as calculated_tier
FROM users u
LEFT JOIN leaderboard_stats ls ON u.id = ls.user_id 
  AND ls.week_start = date_trunc('week', CURRENT_DATE)::date
WHERE u.total_points > 0
ORDER BY u.total_points DESC, u.total_winnings DESC, u.created_at ASC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_view_id ON leaderboard_view(id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_view_points ON leaderboard_view(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_view_tier ON leaderboard_view(tier);

-- Function to refresh leaderboard view
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;
END;
$$;

-- =====================================================
-- 9. INITIAL DATA POPULATION
-- =====================================================

-- Update existing users with initial streak and points data
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

-- Calculate initial points and rankings for existing users
SELECT update_leaderboard_rankings();

-- Refresh the materialized view
SELECT refresh_leaderboard();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_user_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_rankings() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard() TO authenticated;
GRANT SELECT ON leaderboard_view TO authenticated;

-- =====================================================
-- 10. FINAL VERIFICATION AND CLEANUP
-- =====================================================

-- Verify all tables exist and have proper structure
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
  WHERE routine_name IN ('calculate_user_points', 'update_user_tier', 'update_user_streak', 'update_leaderboard_rankings')
    AND routine_schema = 'public';

  -- Log verification results
  RAISE NOTICE 'Database audit complete. Tables: %, Functions: %', table_count, function_count;
  
  IF table_count < 6 THEN
    RAISE WARNING 'Some tables may be missing. Expected 6, found %', table_count;
  END IF;
  
  IF function_count < 4 THEN
    RAISE WARNING 'Some functions may be missing. Expected 4, found %', function_count;
  END IF;
END $$;