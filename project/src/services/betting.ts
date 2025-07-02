/**
 * Betting service with accurate return calculations and 15% house edge
 * Fixed to use 85% of total pool for odds calculations
 */
import { supabase } from '../lib/supabase';
import { Event, BetOption, Bet } from '../types';

export interface BetCalculation {
  potentialReturn: number;
  potentialProfit: number;
  impliedProbability: number;
  poolShare: number;
  effectiveOdds: number;
  maxBetAmount: number;
  houseEdge: number;
  availablePool: number; // 85% of total pool
}

/**
 * Calculate dynamic odds based on 85% pool distribution (after house edge)
 * Formula: odds = (available_pool - option_pool) / option_pool + 1
 * This ensures that less popular options have higher odds
 */
const calculateDynamicOdds = (totalPool: number, optionPool: number): number => {
  if (totalPool === 0 || optionPool === 0) return 2.0; // Default odds for new options
  
  // Use 85% of total pool (after 15% house edge)
  const availablePool = totalPool * 0.85;
  
  if (availablePool === optionPool) return 1.1; // Minimum odds when only this option has bets
  
  const otherOptionsPool = availablePool - optionPool;
  if (otherOptionsPool <= 0) return 1.1; // Safety check
  
  const odds = (otherOptionsPool / optionPool) + 1;
  
  // Ensure minimum odds of 1.1 and maximum of 50
  return Math.max(1.1, Math.min(50, odds));
};

/**
 * Calculate potential returns for a bet with corrected 85% pool formula
 */
export const calculateBetReturns = (
  event: Event,
  optionId: string,
  betAmount: number,
  isAdmin: boolean = false
): BetCalculation => {
  const option = event.options.find(opt => opt.id === optionId);
  if (!option) {
    throw new Error('Invalid betting option');
  }

  const houseEdge = 0.15; // 15% house edge
  const currentTotalPool = event.totalPool;
  
  // Calculate available pool (85% of total)
  const availablePool = currentTotalPool * 0.85;
  
  // Calculate maximum bet amount (20% of total pool, unlimited for admin)
  const maxBetAmount = isAdmin ? Infinity : Math.max(100, currentTotalPool * 0.20);
  
  if (betAmount > maxBetAmount && !isAdmin) {
    throw new Error(`Maximum bet amount is ₹${maxBetAmount.toFixed(0)}`);
  }

  // New pool sizes after this bet
  const newTotalPool = currentTotalPool + betAmount;
  const newOptionPool = option.totalBets + betAmount;
  const newAvailablePool = newTotalPool * 0.85;
  
  // Calculate dynamic odds for this option after the bet using 85% pool
  const effectiveOdds = calculateDynamicOdds(newTotalPool, newOptionPool);
  
  // Calculate potential return using corrected formula:
  // User gets: bet_amount * odds (from the 85% pool after house cut)
  const potentialReturn = betAmount * effectiveOdds;
  
  // Ensure minimum return (user gets at least their bet back)
  const finalReturn = Math.max(potentialReturn, betAmount);
  const finalOdds = finalReturn / betAmount;

  // Calculate other metrics
  const potentialProfit = finalReturn - betAmount;
  const impliedProbability = 1 / finalOdds;
  const poolShare = newOptionPool / newTotalPool;

  return {
    potentialReturn: Math.round(finalReturn * 100) / 100,
    potentialProfit: Math.round(potentialProfit * 100) / 100,
    impliedProbability: Math.round(impliedProbability * 10000) / 100, // Percentage
    poolShare: Math.round(poolShare * 10000) / 100, // Percentage
    effectiveOdds: Math.round(finalOdds * 100) / 100,
    maxBetAmount: isAdmin ? Infinity : Math.round(maxBetAmount),
    houseEdge: houseEdge * 100, // Percentage
    availablePool: Math.round(newAvailablePool * 100) / 100
  };
};

/**
 * Place a bet with proper database updates and dynamic odds calculation
 */
export const placeBet = async (
  userId: string,
  eventId: string,
  optionId: string,
  amount: number
): Promise<{ bet: any; transaction: any }> => {
  // Check if user is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('balance, total_bets, is_admin')
    .eq('id', userId)
    .single();

  if (userError) throw new Error('Failed to fetch user data');
  if (user.balance < amount && !user.is_admin) throw new Error('Insufficient balance');

  // Get event data to check bet limits
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('total_pool')
    .eq('id', eventId)
    .single();

  if (eventError) throw new Error('Failed to fetch event data');

  // Check bet limits for non-admin users
  if (!user.is_admin) {
    const maxBetAmount = Math.max(100, eventData.total_pool * 0.20);
    if (amount > maxBetAmount) {
      throw new Error(`Maximum bet amount is ₹${maxBetAmount.toFixed(0)} (20% of current pool)`);
    }
  }

  // Create the bet record
  const { data: bet, error: betError } = await supabase
    .from('bets')
    .insert({
      event_id: eventId,
      user_id: userId,
      option_id: optionId,
      amount: amount,
      status: 'active'
    })
    .select()
    .single();

  if (betError) throw new Error('Failed to place bet');

  // Update user balance and stats
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      balance: user.balance - amount,
      total_bets: user.total_bets + 1
    })
    .eq('id', userId);

  if (userUpdateError) throw new Error('Failed to update user balance');

  // Create transaction record
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'bet_placed',
      amount: -amount,
      description: `Bet placed on event`,
      status: 'completed',
      event_id: eventId,
      bet_id: bet.id
    })
    .select()
    .single();

  if (transactionError) throw new Error('Failed to create transaction');

  // Update event and option statistics
  await updateEventStatistics(eventId, optionId, amount);

  // Update dynamic odds for all options in this event
  await updateDynamicOdds(eventId);

  return { bet, transaction };
};

/**
 * Update dynamic odds for all options in an event using 85% pool calculation
 */
const updateDynamicOdds = async (eventId: string) => {
  try {
    // Get current event and options data
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('total_pool')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event for odds update:', eventError);
      return;
    }

    const { data: options, error: optionsError } = await supabase
      .from('bet_options')
      .select('id, total_bets')
      .eq('event_id', eventId);

    if (optionsError || !options) {
      console.error('Error fetching options for odds update:', optionsError);
      return;
    }

    console.log(`[updateDynamicOdds] Updating odds for event ${eventId}:`, {
      totalPool: eventData.total_pool,
      availablePool: eventData.total_pool * 0.85,
      optionsCount: options.length
    });

    // Update odds for each option using 85% pool calculation
    for (const option of options) {
      const newOdds = calculateDynamicOdds(eventData.total_pool, option.total_bets);
      
      console.log(`[updateDynamicOdds] Option ${option.id}: pool=${option.total_bets}, odds=${newOdds.toFixed(2)}`);
      
      const { error: updateError } = await supabase
        .from('bet_options')
        .update({ odds: newOdds })
        .eq('id', option.id);

      if (updateError) {
        console.error(`Error updating odds for option ${option.id}:`, updateError);
      }
    }

    console.log(`[updateDynamicOdds] Successfully updated odds for ${options.length} options`);
  } catch (error) {
    console.error('Exception in updateDynamicOdds:', error);
  }
};

/**
 * Update event and option statistics
 */
const updateEventStatistics = async (
  eventId: string,
  optionId: string,
  betAmount: number
) => {
  try {
    // Get current event statistics
    const { data: event, error: eventFetchError } = await supabase
      .from('events')
      .select('total_pool, participant_count')
      .eq('id', eventId)
      .single();

    if (eventFetchError) throw new Error('Failed to fetch event statistics');

    // Update event statistics
    const { error: eventError } = await supabase
      .from('events')
      .update({
        total_pool: event.total_pool + betAmount,
        participant_count: event.participant_count + 1
      })
      .eq('id', eventId);

    if (eventError) throw new Error('Failed to update event statistics');

    // Get current option statistics
    const { data: option, error: optionFetchError } = await supabase
      .from('bet_options')
      .select('total_bets, bettors')
      .eq('id', optionId)
      .single();

    if (optionFetchError) throw new Error('Failed to fetch option statistics');

    // Update option statistics
    const { error: optionError } = await supabase
      .from('bet_options')
      .update({
        total_bets: option.total_bets + betAmount,
        bettors: option.bettors + 1
      })
      .eq('id', optionId);

    if (optionError) throw new Error('Failed to update option statistics');

    console.log(`[updateEventStatistics] Updated event ${eventId} and option ${optionId}:`, {
      newTotalPool: event.total_pool + betAmount,
      newOptionPool: option.total_bets + betAmount,
      availablePool: (event.total_pool + betAmount) * 0.85
    });
  } catch (error) {
    console.error('Exception in updateEventStatistics:', error);
    throw error;
  }
};

/**
 * Get real-time odds for an event (for dashboard updates)
 */
export const getRealTimeOdds = async (eventId: string): Promise<BetOption[]> => {
  try {
    const { data: options, error } = await supabase
      .from('bet_options')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');

    if (error) {
      console.error('Error fetching real-time odds:', error);
      throw new Error(`Failed to fetch odds: ${error.message}`);
    }

    return options || [];
  } catch (error) {
    console.error('Exception in getRealTimeOdds:', error);
    throw error;
  }
};

/**
 * Resolve a bet when event concludes with corrected payout formula
 */
export const resolveBet = async (
  betId: string,
  isWinner: boolean,
  winningOptionOdds: number,
  userBetAmount: number
): Promise<void> => {
  const status = isWinner ? 'won' : 'lost';
  let payout = 0;

  if (isWinner) {
    payout = userBetAmount * winningOptionOdds;
    payout = Math.max(payout, userBetAmount);
  }

  // Log the update attempt
  console.log('[resolveBet] Updating bet:', {
    betId,
    status,
    payout: isWinner ? payout : null,
    resolved_at: new Date().toISOString()
  });

  const { data: bet, error: betError } = await supabase
    .from('bets')
    .update({
      status,
      payout: isWinner ? payout : null,
      resolved_at: new Date().toISOString()
    })
    .eq('id', betId)
    .select('user_id, amount')
    .single();

  if (betError) {
    console.error('[resolveBet] Failed to resolve bet:', betError);
    throw new Error('Failed to resolve bet: ' + betError.message);
  }
  if (!bet) {
    console.error('[resolveBet] No bet returned after update for betId:', betId);
    throw new Error('No bet returned after update');
  }

  if (isWinner && payout) {
    // Get current user balance and winnings
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('balance, total_winnings')
      .eq('id', bet.user_id)
      .single();

    if (userFetchError) {
      console.error('[resolveBet] Failed to fetch user data:', userFetchError);
      throw new Error('Failed to fetch user data: ' + userFetchError.message);
    }

    // Update user balance and winnings
    const { error: userError } = await supabase
      .from('users')
      .update({
        balance: user.balance + payout,
        total_winnings: user.total_winnings + (payout - bet.amount)
      })
      .eq('id', bet.user_id);

    if (userError) {
      console.error('[resolveBet] Failed to update user winnings:', userError);
      throw new Error('Failed to update user winnings: ' + userError.message);
    }

    // Create winning transaction
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: bet.user_id,
        type: 'bet_won',
        amount: payout,
        description: `Bet won - payout received`,
        status: 'completed',
        bet_id: betId
      });

    if (txnError) {
      console.error('[resolveBet] Failed to create winning transaction:', txnError);
      throw new Error('Failed to create winning transaction: ' + txnError.message);
    }
  } else {
    // Create losing transaction record
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: bet.user_id,
        type: 'bet_lost',
        amount: -bet.amount,
        description: `Bet lost`,
        status: 'completed',
        bet_id: betId
      });

    if (txnError) {
      console.error('[resolveBet] Failed to create losing transaction:', txnError);
      throw new Error('Failed to create losing transaction: ' + txnError.message);
    }
  }
};

/**
 * Get user's betting statistics
 */
export const getUserBettingStats = async (userId: string) => {
  const { data: stats, error } = await supabase
    .from('users')
    .select('total_bets, total_winnings, balance')
    .eq('id', userId)
    .single();

  if (error) throw new Error('Failed to fetch user stats');

  // Get additional calculated stats
  const { data: bets } = await supabase
    .from('bets')
    .select('amount, status, payout')
    .eq('user_id', userId);

  const activeBets = bets?.filter(bet => bet.status === 'active') || [];
  const wonBets = bets?.filter(bet => bet.status === 'won') || [];
  const lostBets = bets?.filter(bet => bet.status === 'lost') || [];

  const totalBetAmount = bets?.reduce((sum, bet) => sum + bet.amount, 0) || 0;
  const totalActiveBetAmount = activeBets.reduce((sum, bet) => sum + bet.amount, 0);
  const winRate = stats.total_bets > 0 ? (wonBets.length / stats.total_bets) * 100 : 0;
  const averageBetSize = stats.total_bets > 0 ? totalBetAmount / stats.total_bets : 0;
  const netProfit = stats.total_winnings - totalBetAmount;

  return {
    ...stats,
    activeBetsCount: activeBets.length,
    totalActiveBetAmount,
    winRate: Math.round(winRate * 100) / 100,
    averageBetSize: Math.round(averageBetSize * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    wonBetsCount: wonBets.length,
    lostBetsCount: lostBets.length
  };
};

/**
 * Get betting history for time-based analytics
 */
export const getBettingHistory = async (eventId: string) => {
  const { data: bets, error } = await supabase
    .from('bets')
    .select(`
      amount,
      option_id,
      placed_at,
      bet_options!inner(label)
    `)
    .eq('event_id', eventId)
    .order('placed_at', { ascending: true });

  if (error) throw new Error('Failed to fetch betting history');

  return bets || [];
};

/**
 * Subscribe to real-time odds updates for an event
 */
export const subscribeToOddsUpdates = (
  eventId: string,
  callback: (options: BetOption[]) => void
) => {
  const subscription = supabase
    .channel(`odds-${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bet_options',
        filter: `event_id=eq.${eventId}`
      },
      async () => {
        try {
          const options = await getRealTimeOdds(eventId);
          callback(options);
        } catch (error) {
          console.error('Error in odds subscription callback:', error);
        }
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from real-time odds updates
 */
export const unsubscribeFromOddsUpdates = (subscription: any) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};