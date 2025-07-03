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
    console.log('[getLeaderboard] Fetching leaderboard data...');
    
    // First, ensure all users have proper leaderboard data
    await updateAllUsersLeaderboardData();
    
    // Try the materialized view first
    let { data, error } = await supabase
      .from('leaderboard_view')
      .select('*')
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1);

    // If materialized view fails, fall back to direct users table query
    if (error || !data) {
      console.warn('[getLeaderboard] Leaderboard view failed, falling back to users table:', error);
      
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
        console.error('[getLeaderboard] Error fetching from users table:', usersError);
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

    console.log(`[getLeaderboard] Successfully fetched ${data?.length || 0} users`);
    return data || [];
  } catch (error) {
    console.error('[getLeaderboard] Exception:', error);
    throw error;
  }
};

/**
 * Update leaderboard data for all users to ensure new users appear
 */
const updateAllUsersLeaderboardData = async (): Promise<void> => {
  try {
    console.log('[updateAllUsersLeaderboardData] Updating all users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, total_winnings, total_bets, current_streak, longest_streak');

    if (usersError) {
      console.error('[updateAllUsersLeaderboardData] Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('[updateAllUsersLeaderboardData] No users found');
      return;
    }

    // Update each user's leaderboard data
    for (const user of users) {
      await updateUserLeaderboardData(user.id);
    }

    // Update rankings
    await updateLeaderboardRankings();
    
    console.log(`[updateAllUsersLeaderboardData] Updated ${users.length} users`);
  } catch (error) {
    console.error('[updateAllUsersLeaderboardData] Exception:', error);
  }
};

/**
 * Update individual user's leaderboard data
 */
const updateUserLeaderboardData = async (userId: string): Promise<void> => {
  try {
    // Calculate streak data
    const streakData = await calculateUserStreak(userId);
    
    // Calculate points based on winnings and activity
    const pointsData = await calculateUserPoints(userId);
    
    // Update user record
    const { error } = await supabase
      .from('users')
      .update({
        current_streak: streakData.current_streak,
        longest_streak: streakData.longest_streak,
        total_points: pointsData,
        tier: calculateTier(pointsData),
        last_activity: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error(`[updateUserLeaderboardData] Error updating user ${userId}:`, error);
    }
  } catch (error) {
    console.error(`[updateUserLeaderboardData] Exception for user ${userId}:`, error);
  }
};

/**
 * Calculate user streak from bet history
 */
const calculateUserStreak = async (userId: string): Promise<{ current_streak: number; longest_streak: number }> => {
  try {
    const { data: bets, error } = await supabase
      .from('bets')
      .select('status, placed_at')
      .eq('user_id', userId)
      .in('status', ['won', 'lost'])
      .order('placed_at', { ascending: false })
      .limit(50);

    if (error || !bets) {
      return { current_streak: 0, longest_streak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (from most recent)
    for (const bet of bets) {
      if (bet.status === 'won') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (const bet of bets.reverse()) {
      if (bet.status === 'won') {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return {
      current_streak: currentStreak,
      longest_streak: Math.max(longestStreak, currentStreak)
    };
  } catch (error) {
    console.error('[calculateUserStreak] Exception:', error);
    return { current_streak: 0, longest_streak: 0 };
  }
};

/**
 * Calculate user points based on activity
 */
const calculateUserPoints = async (userId: string): Promise<number> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('total_winnings, total_bets, current_streak')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return 0;
    }

    // Points calculation:
    // - 1 point per ₹100 won
    // - 10 points per bet placed
    // - 50 points per current streak level
    const winPoints = Math.floor((user.total_winnings || 0) / 100);
    const betPoints = (user.total_bets || 0) * 10;
    const streakPoints = (user.current_streak || 0) * 50;

    return winPoints + betPoints + streakPoints;
  } catch (error) {
    console.error('[calculateUserPoints] Exception:', error);
    return 0;
  }
};

/**
 * Calculate tier based on points
 */
const calculateTier = (points: number): string => {
  if (points >= 100000) return 'Master';
  if (points >= 50000) return 'Diamond';
  if (points >= 25000) return 'Platinum';
  if (points >= 10000) return 'Gold';
  if (points >= 2500) return 'Silver';
  return 'Bronze';
};

/**
 * Update leaderboard rankings
 */
const updateLeaderboardRankings = async (): Promise<void> => {
  try {
    // Get all users sorted by total winnings
    const { data: users, error } = await supabase
      .from('users')
      .select('id, total_winnings, total_points')
      .order('total_winnings', { ascending: false });

    if (error || !users) {
      console.error('[updateLeaderboardRankings] Error fetching users:', error);
      return;
    }

    // Update rank positions
    for (let i = 0; i < users.length; i++) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ rank_position: i + 1 })
        .eq('id', users[i].id);

      if (updateError) {
        console.error(`[updateLeaderboardRankings] Error updating rank for user ${users[i].id}:`, updateError);
      }
    }

    console.log(`[updateLeaderboardRankings] Updated rankings for ${users.length} users`);
  } catch (error) {
    console.error('[updateLeaderboardRankings] Exception:', error);
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
      .select('rank_position, total_winnings')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user rank: ${userError.message}`);
    }

    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('total_winnings', 0);

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
    const streakData = await calculateUserStreak(userId);
    
    const { error } = await supabase
      .from('users')
      .update({
        current_streak: streakData.current_streak,
        longest_streak: streakData.longest_streak,
        last_activity: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user streak:', error);
      throw new Error(`Failed to update streak: ${error.message}`);
    }

    return streakData.current_streak;
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
    const points = await calculateUserPoints(userId);
    
    const { error } = await supabase
      .from('users')
      .update({
        total_points: points,
        tier: calculateTier(points)
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user points:', error);
      throw new Error(`Failed to update points: ${error.message}`);
    }

    return points;
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
    await updateAllUsersLeaderboardData();
    
    // Refresh the materialized view if it exists
    const { error } = await supabase.rpc('refresh_leaderboard_view');
    if (error) {
      console.warn('Failed to refresh materialized view:', error);
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