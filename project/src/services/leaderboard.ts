/**
 * Leaderboard service for managing rankings, streaks, and user statistics
 */
import { supabase } from '../lib/supabase';

export interface LeaderboardUser {
  id: string;
  name: string;
  total_points: number;
  rank_position: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';
  current_streak: number;
  longest_streak: number;
  total_winnings: number;
  total_bets: number;
  balance: number;
  is_verified: boolean;
  achievements: string[];
  created_at: string;
  weekly_earnings: number;
  monthly_earnings: number;
}

export interface UserActivity {
  id: string;
  action_type: string;
  points_earned: number;
  description: string;
  metadata: any;
  created_at: string;
}

/**
 * Get leaderboard data with pagination - sorted by total_winnings by default
 */
export const getLeaderboard = async (
  limit: number = 100,
  offset: number = 0,
  sortBy: 'total_winnings' | 'weekly_earnings' | 'monthly_earnings' | 'current_streak' = 'total_winnings'
): Promise<LeaderboardUser[]> => {
  try {
    // First try the materialized view
    let { data, error } = await supabase
      .from('leaderboard_view')
      .select('*')
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1);

    // If materialized view fails, fall back to direct users table query
    if (error || !data) {
      console.warn('Leaderboard view failed, falling back to users table:', error);
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          total_points,
          rank_position,
          tier,
          current_streak,
          longest_streak,
          total_winnings,
          total_bets,
          balance,
          is_verified,
          achievements,
          created_at
        `)
        .order(sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

      if (usersError) {
        console.error('Error fetching from users table:', usersError);
        throw new Error(`Failed to fetch leaderboard: ${usersError.message}`);
      }

      // Map users data to leaderboard format with default values
      data = (usersData || []).map(user => ({
        ...user,
        weekly_earnings: 0,
        monthly_earnings: 0,
        current_streak: user.current_streak || 0,
        longest_streak: user.longest_streak || 0,
        total_points: user.total_points || 0,
        rank_position: user.rank_position || 0,
        tier: user.tier || 'Bronze',
        achievements: user.achievements || [],
        is_verified: user.is_verified || false
      }));
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getLeaderboard:', error);
    throw error;
  }
};

/**
 * Get user's current rank and position
 */
export const getUserRank = async (userId: string): Promise<{
  rank: number;
  totalUsers: number;
  percentile: number;
}> => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('rank_position, total_points')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user rank: ${userError.message}`);
    }

    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_points', 0);

    if (countError) {
      throw new Error(`Failed to count users: ${countError.message}`);
    }

    const totalUsers = count || 1;
    const percentile = totalUsers > 0 ? ((totalUsers - (user.rank_position || 0)) / totalUsers) * 100 : 0;

    return {
      rank: user.rank_position || 0,
      totalUsers,
      percentile: Math.round(percentile * 100) / 100
    };
  } catch (error) {
    console.error('Exception in getUserRank:', error);
    throw error;
  }
};

/**
 * Update user streak after bet resolution
 */
export const updateUserStreak = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('update_user_streak', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error updating user streak:', error);
      throw new Error(`Failed to update streak: ${error.message}`);
    }

    return data || 0;
  } catch (error) {
    console.error('Exception in updateUserStreak:', error);
    throw error;
  }
};

/**
 * Calculate and update user points
 */
export const updateUserPoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_user_points', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error calculating user points:', error);
      throw new Error(`Failed to calculate points: ${error.message}`);
    }

    return data || 0;
  } catch (error) {
    console.error('Exception in updateUserPoints:', error);
    throw error;
  }
};

/**
 * Refresh leaderboard rankings
 */
export const refreshLeaderboard = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('update_leaderboard_rankings');

    if (error) {
      console.error('Error refreshing leaderboard:', error);
      throw new Error(`Failed to refresh leaderboard: ${error.message}`);
    }

    // Also refresh the materialized view
    const { error: refreshError } = await supabase.rpc('refresh_leaderboard');

    if (refreshError) {
      console.error('Error refreshing leaderboard view:', refreshError);
      // Don't throw error for view refresh as it's not critical
    }
  } catch (error) {
    console.error('Exception in refreshLeaderboard:', error);
    throw error;
  }
};

/**
 * Get user activity log
 */
export const getUserActivity = async (
  userId: string,
  limit: number = 50
): Promise<UserActivity[]> => {
  try {
    const { data, error } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activity:', error);
      throw new Error(`Failed to fetch activity: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getUserActivity:', error);
    throw error;
  }
};

/**
 * Log user activity
 */
export const logUserActivity = async (
  userId: string,
  actionType: string,
  pointsEarned: number,
  description: string,
  metadata: any = {}
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_activity_log')
      .insert({
        user_id: userId,
        action_type: actionType,
        points_earned: pointsEarned,
        description,
        metadata
      });

    if (error) {
      console.error('Error logging user activity:', error);
      // Don't throw error for activity logging as it's not critical
    }
  } catch (error) {
    console.error('Exception in logUserActivity:', error);
    // Don't throw error for activity logging as it's not critical
  }
};

/**
 * Get tier requirements and benefits
 */
export const getTierInfo = () => {
  return {
    Bronze: { minPoints: 0, color: '#CD7F32', benefits: ['Basic features'] },
    Silver: { minPoints: 2500, color: '#C0C0C0', benefits: ['Priority support', '5% bonus on wins'] },
    Gold: { minPoints: 10000, color: '#FFD700', benefits: ['VIP support', '10% bonus on wins', 'Exclusive events'] },
    Platinum: { minPoints: 25000, color: '#E5E4E2', benefits: ['Personal account manager', '15% bonus on wins', 'Early access'] },
    Diamond: { minPoints: 50000, color: '#B9F2FF', benefits: ['Premium features', '20% bonus on wins', 'Custom limits'] },
    Master: { minPoints: 100000, color: '#FF4D4D', benefits: ['All features unlocked', '25% bonus on wins', 'Exclusive tournaments'] }
  };
};

/**
 * Get weekly leaderboard
 */
export const getWeeklyLeaderboard = async (limit: number = 50): Promise<LeaderboardUser[]> => {
  try {
    const { data, error } = await supabase
      .from('leaderboard_view')
      .select('*')
      .order('weekly_earnings', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching weekly leaderboard:', error);
      throw new Error(`Failed to fetch weekly leaderboard: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getWeeklyLeaderboard:', error);
    throw error;
  }
};

/**
 * Get monthly leaderboard
 */
export const getMonthlyLeaderboard = async (limit: number = 50): Promise<LeaderboardUser[]> => {
  try {
    const { data, error } = await supabase
      .from('leaderboard_view')
      .select('*')
      .order('monthly_earnings', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching monthly leaderboard:', error);
      throw new Error(`Failed to fetch monthly leaderboard: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getMonthlyLeaderboard:', error);
    throw error;
  }
};