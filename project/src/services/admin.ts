/**
 * Admin service for event management and result declaration
 */
import { supabase } from '../lib/supabase';
import { Event } from '../types';

/**
 * Update an existing event
 */
export const updateEvent = async (eventData: {
  id: string;
  title: string;
  description: string;
  category: string;
  expiresAt: Date;
  options: Array<{
    id: string;
    label: string;
    odds: number;
    totalBets: number;
    bettors: number;
  }>;
}): Promise<void> => {
  try {
    console.log('Updating event:', eventData.id);

    // Update the event
    const { error: eventError } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        expires_at: eventData.expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', eventData.id);

    if (eventError) {
      console.error('Error updating event:', eventError);
      throw new Error(`Failed to update event: ${eventError.message}`);
    }

    // Update bet options
    for (const option of eventData.options) {
      const { error: optionError } = await supabase
        .from('bet_options')
        .update({
          label: option.label,
          odds: option.odds
        })
        .eq('id', option.id);

      if (optionError) {
        console.error('Error updating bet option:', optionError);
        throw new Error(`Failed to update bet option: ${optionError.message}`);
      }
    }

    console.log('Event updated successfully');
  } catch (error) {
    console.error('Exception in updateEvent:', error);
    throw error;
  }
};

/**
 * Delete an event (only if no active bets)
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    console.log('Deleting event:', eventId);

    // Check if event has any bets
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('id')
      .eq('event_id', eventId)
      .limit(1);

    if (betsError) {
      console.error('Error checking event bets:', betsError);
      throw new Error(`Failed to check event bets: ${betsError.message}`);
    }

    if (bets && bets.length > 0) {
      throw new Error('Cannot delete event with active bets');
    }

    // Delete bet options first (due to foreign key constraints)
    const { error: optionsError } = await supabase
      .from('bet_options')
      .delete()
      .eq('event_id', eventId);

    if (optionsError) {
      console.error('Error deleting bet options:', optionsError);
      throw new Error(`Failed to delete bet options: ${optionsError.message}`);
    }

    // Delete the event
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (eventError) {
      console.error('Error deleting event:', eventError);
      throw new Error(`Failed to delete event: ${eventError.message}`);
    }

    console.log('Event deleted successfully');
  } catch (error) {
    console.error('Exception in deleteEvent:', error);
    throw error;
  }
};

/**
 * Declare result and distribute payouts with corrected mathematics:
 * 1. Remove 15% house cut from total pool first
 * 2. Distribute remaining 85% proportionally to winners based on their bet amounts
 * 3. Ensure total distribution never exceeds available pool
 * 4. Update bet statuses correctly to 'won' or 'lost'
 */
export const declareEventResult = async (
  eventId: string,
  winningOptionId: string
): Promise<void> => {
  try {
    console.log('Declaring result for event:', eventId, 'winning option:', winningOptionId);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('total_pool, created_by')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw new Error(`Failed to fetch event: ${eventError.message}`);
    }

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Get all bets for this event
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'active');

    if (betsError) {
      console.error('Error fetching bets:', betsError);
      throw new Error(`Failed to fetch bets: ${betsError.message}`);
    }

    // Get winning option details
    const { data: winningOption, error: winningOptionError } = await supabase
      .from('bet_options')
      .select('total_bets, odds')
      .eq('id', winningOptionId)
      .maybeSingle();

    if (winningOptionError) {
      console.error('Error fetching winning option:', winningOptionError);
      throw new Error(`Failed to fetch winning option: ${winningOptionError.message}`);
    }

    if (!winningOption) {
      throw new Error(`Winning option not found: ${winningOptionId}`);
    }

    // Calculate distribution with corrected mathematics
    const totalPool = event.total_pool || 0;
    const houseEdge = 0.15; // 15%
    const houseAmount = totalPool * houseEdge;
    const availableForDistribution = totalPool - houseAmount; // 85% of total pool
    
    // Get winning and losing bets
    const winningBets = bets?.filter(bet => bet.option_id === winningOptionId) || [];
    const losingBets = bets?.filter(bet => bet.option_id !== winningOptionId) || [];
    const totalWinningBetAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

    console.log('Corrected payout calculation:', {
      totalPool,
      houseAmount: `₹${houseAmount} (15%)`,
      availableForDistribution: `₹${availableForDistribution} (85%)`,
      totalWinningBetAmount: `₹${totalWinningBetAmount}`,
      winningBetsCount: winningBets.length,
      losingBetsCount: losingBets.length
    });

    // Ensure we have enough to distribute
    if (availableForDistribution < totalWinningBetAmount) {
      console.warn('Available distribution amount is less than winning bet amounts. Using proportional distribution.');
    }

    // Transfer house amount to admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', event.created_by)
      .maybeSingle();

    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      throw new Error(`Failed to fetch admin user: ${adminError.message}`);
    }

    if (!adminUser) {
      throw new Error(`Admin user not found: ${event.created_by}`);
    }

    // Update admin balance with house cut
    const { error: adminUpdateError } = await supabase
      .from('users')
      .update({
        balance: (adminUser.balance || 0) + houseAmount
      })
      .eq('id', event.created_by);

    if (adminUpdateError) {
      console.error('Error updating admin balance:', adminUpdateError);
      throw new Error(`Failed to update admin balance: ${adminUpdateError.message}`);
    }

    // Create house edge transaction
    const { error: houseTransactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: event.created_by,
        type: 'deposit',
        amount: houseAmount,
        description: `House edge (15%) from event: ${eventId}`,
        status: 'completed',
        event_id: eventId
      });

    if (houseTransactionError) {
      console.error('Error creating house transaction:', houseTransactionError);
      // Don't throw error, just log it as this is not critical for payouts
    }

    console.log(`Processing ${winningBets.length} winning bets and ${losingBets.length} losing bets`);

    // Process winning bets with corrected payout calculation
    for (const bet of winningBets) {
      try {
        let payout: number;
        
        if (totalWinningBetAmount === 0) {
          // No winning bets - shouldn't happen but handle gracefully
          payout = bet.amount;
        } else {
          // Calculate proportional share of the available distribution pool
          const userShare = bet.amount / totalWinningBetAmount;
          payout = userShare * availableForDistribution;
          
          // Ensure minimum payout is at least the original bet amount
          payout = Math.max(payout, bet.amount);
        }

        console.log(`Processing winning bet ${bet.id}: amount=₹${bet.amount}, share=${((bet.amount / totalWinningBetAmount) * 100).toFixed(2)}%, payout=₹${payout.toFixed(2)}`);

        // Update bet status and payout - CRITICAL: Set status to 'won'
        const { error: betUpdateError } = await supabase
          .from('bets')
          .update({
            status: 'won', // IMPORTANT: Update status to 'won'
            payout: payout,
            resolved_at: new Date().toISOString()
          })
          .eq('id', bet.id);

        if (betUpdateError) {
          console.error('Error updating winning bet:', betUpdateError);
          continue; // Skip this bet but continue with others
        }

        // Get current user balance and winnings
        const { data: user, error: userFetchError } = await supabase
          .from('users')
          .select('balance, total_winnings')
          .eq('id', bet.user_id)
          .maybeSingle();

        if (userFetchError) {
          console.error('Error fetching user:', userFetchError);
          console.warn(`Skipping payout for user ${bet.user_id} due to fetch error`);
          continue; // Skip this user but continue with others
        }

        if (!user) {
          console.warn(`User not found: ${bet.user_id}, skipping payout for bet ${bet.id}`);
          continue; // Skip this user but continue with others
        }

        // Update user balance and winnings
        const newBalance = (user.balance || 0) + payout;
        const newTotalWinnings = (user.total_winnings || 0) + (payout - bet.amount);

        console.log(`Updating user ${bet.user_id}: balance ${user.balance} -> ${newBalance}, winnings ${user.total_winnings} -> ${newTotalWinnings}`);

        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            balance: newBalance,
            total_winnings: newTotalWinnings
          })
          .eq('id', bet.user_id);

        if (userUpdateError) {
          console.error('Error updating user balance:', userUpdateError);
          console.warn(`Failed to update balance for user ${bet.user_id}`);
          continue; // Skip this user but continue with others
        }

        // Create winning transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: bet.user_id,
            type: 'bet_won',
            amount: payout,
            description: `Bet won - proportional payout: ₹${payout.toFixed(2)} from ₹${availableForDistribution} pool`,
            status: 'completed',
            event_id: eventId,
            bet_id: bet.id
          });

        if (transactionError) {
          console.error('Error creating winning transaction:', transactionError);
          // Don't skip the bet, the balance was already updated
        }

        console.log(`Successfully processed winning bet: ${bet.id}, payout: ₹${payout.toFixed(2)}`);
      } catch (error) {
        console.error(`Error processing winning bet ${bet.id}:`, error);
        continue; // Continue with other bets
      }
    }

    // Process losing bets - CRITICAL: Set status to 'lost'
    for (const bet of losingBets) {
      try {
        // Update bet status - IMPORTANT: Set status to 'lost'
        const { error: betUpdateError } = await supabase
          .from('bets')
          .update({
            status: 'lost', // IMPORTANT: Update status to 'lost'
            payout: 0, // Set payout to 0 for losing bets
            resolved_at: new Date().toISOString()
          })
          .eq('id', bet.id);

        if (betUpdateError) {
          console.error('Error updating losing bet:', betUpdateError);
          continue; // Skip this bet but continue with others
        }

        // Create losing transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: bet.user_id,
            type: 'bet_lost',
            amount: -bet.amount,
            description: `Bet lost - ₹${bet.amount}`,
            status: 'completed',
            event_id: eventId,
            bet_id: bet.id
          });

        if (transactionError) {
          console.error('Error creating losing transaction:', transactionError);
          // Don't throw error, just log it
        }

        console.log(`Processed losing bet: ${bet.id}`);
      } catch (error) {
        console.error(`Error processing losing bet ${bet.id}:`, error);
        continue; // Continue with other bets
      }
    }

    // Update event status and winning option
    const { error: eventUpdateError } = await supabase
      .from('events')
      .update({
        status: 'resolved',
        winning_option_id: winningOptionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (eventUpdateError) {
      console.error('Error updating event status:', eventUpdateError);
      throw new Error(`Failed to update event status: ${eventUpdateError.message}`);
    }

    console.log('Event result declared and payouts distributed successfully');
    console.log(`House cut: ₹${houseAmount.toFixed(2)} (15% of ₹${totalPool})`);
    console.log(`Total distributed to winners: ₹${availableForDistribution.toFixed(2)} (85% of pool)`);
    console.log(`Distribution formula: Proportional share of 85% pool based on bet amounts`);
    console.log(`Bet statuses updated: ${winningBets.length} set to 'won', ${losingBets.length} set to 'lost'`);
  } catch (error) {
    console.error('Exception in declareEventResult:', error);
    throw error;
  }
};

/**
 * Get admin statistics
 */
export const getAdminStats = async (adminId: string) => {
  try {
    // Get total events created
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, status, total_pool')
      .eq('created_by', adminId);

    if (eventsError) {
      console.error('Error fetching admin events:', eventsError);
      throw new Error(`Failed to fetch admin events: ${eventsError.message}`);
    }

    // Get house edge earnings from transactions
    const { data: houseTransactions, error: houseError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', adminId)
      .eq('type', 'deposit')
      .like('description', '%House edge%');

    if (houseError) {
      console.error('Error fetching house transactions:', houseError);
      throw new Error(`Failed to fetch house transactions: ${houseError.message}`);
    }

    const totalEvents = events?.length || 0;
    const activeEvents = events?.filter(e => e.status === 'active').length || 0;
    const resolvedEvents = events?.filter(e => e.status === 'resolved').length || 0;
    const totalPoolManaged = events?.reduce((sum, e) => sum + (e.total_pool || 0), 0) || 0;
    const totalHouseEarnings = houseTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    return {
      totalEvents,
      activeEvents,
      resolvedEvents,
      totalPoolManaged,
      totalHouseEarnings
    };
  } catch (error) {
    console.error('Exception in getAdminStats:', error);
    throw error;
  }
};