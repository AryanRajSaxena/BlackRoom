import { supabase } from '../lib/supabase';

// Email-based authentication
export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: null
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

// Phone-based authentication
export const signUpWithPhone = async (phone: string, name: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      data: {
        name,
        is_new_user: true
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signInWithPhone = async (phone: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone
  });

  if (error) throw error;
  return data;
};

export const verifyOTP = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  });

  if (error) throw error;
  return data;
};

export const resendOTP = async (phone: string) => {
  const { data, error } = await supabase.auth.resend({
    type: 'sms',
    phone
  });

  if (error) throw error;
  return data;
};

// Common auth functions
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};

// Get user profile with proper error handling
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception in getUserProfile:', error);
    return null;
  }
};

// Create user profile with updated initial balance (100 tokens instead of 10,000)
export const createUserProfile = async (userId: string, name: string, phone?: string) => {
  try {
    // Check if this is the admin user
    const isAdmin = name === 'Admin';
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: name || 'User',
        phone: phone || null,
        balance: isAdmin ? 100000 : 100, // 100 tokens for new users, 100,000 for admin
        total_bets: 0,
        total_winnings: 0,
        is_admin: isAdmin,
        current_streak: 0,
        longest_streak: 0,
        total_points: 0,
        rank_position: 0,
        tier: 'Bronze',
        achievements: [],
        is_verified: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
    
    // Update leaderboard data for new user
    try {
      const { updateUserPoints, updateUserStreak } = await import('./leaderboard');
      await updateUserPoints(userId);
      await updateUserStreak(userId);
    } catch (leaderboardError) {
      console.warn('Failed to update leaderboard data for new user:', leaderboardError);
      // Don't throw error as user creation was successful
    }
    
    return data;
  } catch (error) {
    console.error('Exception in createUserProfile:', error);
    throw error;
  }
};

// Update user phone number for UPI integration
export const updateUserPhone = async (userId: string, phone: string) => {
  const { data, error } = await supabase
    .from('users')
    .update({ phone })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Check if user is admin
export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Create admin user function (for setup)
export const ensureAdminUser = async () => {
  try {
    // Check if admin user exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true)
      .maybeSingle();

    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    // If no admin exists, create one with a fixed ID
    const adminId = '00000000-0000-0000-0000-000000000001';
    const { data: adminUser, error } = await supabase
      .from('users')
      .upsert({
        id: adminId,
        name: 'Admin',
        balance: 100000,
        total_bets: 0,
        total_winnings: 0,
        is_admin: true,
        current_streak: 0,
        longest_streak: 0,
        total_points: 0,
        rank_position: 0,
        tier: 'Bronze',
        achievements: [],
        is_verified: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user:', error);
      return null;
    }

    console.log('Admin user created successfully');
    return adminUser;
  } catch (error) {
    console.error('Exception in ensureAdminUser:', error);
    return null;
  }
};