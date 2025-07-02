/**
 * Event management service with database integration
 */
import { supabase } from '../lib/supabase';
import { Event, BetOption } from '../types';

/**
 * Fetch all events with their options from database
 */
export const fetchEvents = async (): Promise<Event[]> => {
  try {
    console.log('Fetching events from database...');
    
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        bet_options!bet_options_event_id_fkey (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    console.log('Raw events data:', data);

    if (!data || data.length === 0) {
      console.log('No events found in database');
      return [];
    }

    const events = data.map(event => {
      console.log('Processing event:', event.id, event.title);
      
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        createdBy: event.created_by,
        createdAt: new Date(event.created_at),
        expiresAt: new Date(event.expires_at),
        status: event.status,
        totalPool: event.total_pool || 0,
        participantCount: event.participant_count || 0,
        options: (event.bet_options || []).map((option: any) => ({
          id: option.id,
          label: option.label,
          odds: option.odds,
          totalBets: option.total_bets || 0,
          bettors: option.bettors || 0
        })),
        winningOption: event.winning_option_id
      };
    });

    console.log('Processed events:', events.length);
    return events;
  } catch (error) {
    console.error('Exception in fetchEvents:', error);
    throw error;
  }
};

/**
 * Create a new event with options
 */
export const createEvent = async (eventData: {
  title: string;
  description: string;
  category: string;
  createdBy: string;
  expiresAt: Date;
  options: Array<{ label: string; odds: number }>;
}): Promise<Event> => {
  try {
    console.log('Creating event:', eventData.title);

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        created_by: eventData.createdBy,
        expires_at: eventData.expiresAt.toISOString(),
        status: 'active',
        total_pool: 0,
        participant_count: 0
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creating event:', eventError);
      throw new Error(`Failed to create event: ${eventError.message}`);
    }

    console.log('Event created:', event.id);

    // Create bet options
    const optionsData = eventData.options.map(option => ({
      event_id: event.id,
      label: option.label,
      odds: option.odds,
      total_bets: 0,
      bettors: 0
    }));

    const { data: options, error: optionsError } = await supabase
      .from('bet_options')
      .insert(optionsData)
      .select();

    if (optionsError) {
      console.error('Error creating bet options:', optionsError);
      throw new Error(`Failed to create bet options: ${optionsError.message}`);
    }

    console.log('Bet options created:', options.length);

    const createdEvent: Event = {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      createdBy: event.created_by,
      createdAt: new Date(event.created_at),
      expiresAt: new Date(event.expires_at),
      status: event.status,
      totalPool: event.total_pool || 0,
      participantCount: event.participant_count || 0,
      options: options.map(option => ({
        id: option.id,
        label: option.label,
        odds: option.odds,
        totalBets: option.total_bets || 0,
        bettors: option.bettors || 0
      }))
    };

    console.log('Event creation completed:', createdEvent.id);
    return createdEvent;
  } catch (error) {
    console.error('Exception in createEvent:', error);
    throw error;
  }
};

/**
 * Resolve an event by setting the winning option
 */
export const resolveEvent = async (
  eventId: string,
  winningOptionId: string
): Promise<void> => {
  try {
    console.log('Resolving event:', eventId, 'with winning option:', winningOptionId);

    // Update event status and winning option
    const { error: eventError } = await supabase
      .from('events')
      .update({
        status: 'resolved',
        winning_option_id: winningOptionId
      })
      .eq('id', eventId);

    if (eventError) {
      console.error('Error resolving event:', eventError);
      throw new Error(`Failed to resolve event: ${eventError.message}`);
    }

    // Get all bets for this event
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'active');

    if (betsError) {
      console.error('Error fetching event bets:', betsError);
      throw new Error(`Failed to fetch event bets: ${betsError.message}`);
    }

    // Get event details for payout calculation
    const { data: event, error: eventDetailsError } = await supabase
      .from('events')
      .select('total_pool')
      .eq('id', eventId)
      .single();

    if (eventDetailsError) {
      console.error('Error fetching event details:', eventDetailsError);
      throw new Error(`Failed to fetch event details: ${eventDetailsError.message}`);
    }

    // Get winning option details
    const { data: winningOption, error: winningOptionError } = await supabase
      .from('bet_options')
      .select('total_bets')
      .eq('id', winningOptionId)
      .single();

    if (winningOptionError) {
      console.error('Error fetching winning option:', winningOptionError);
      throw new Error(`Failed to fetch winning option: ${winningOptionError.message}`);
    }

    // Calculate payouts for winning bets
    const houseEdge = 0.05;
    const totalWinningsPool = event.total_pool * (1 - houseEdge);
    const winningBets = bets.filter(bet => bet.option_id === winningOptionId);
    const losingBets = bets.filter(bet => bet.option_id !== winningOptionId);

    console.log(`Processing ${winningBets.length} winning bets and ${losingBets.length} losing bets`);

    // Process winning bets
    for (const bet of winningBets) {
      const userShare = bet.amount / winningOption.total_bets;
      const userWinnings = totalWinningsPool * userShare;
      const payout = Math.max(bet.amount, userWinnings); // Ensure at least bet amount is returned

      await resolveBetPayout(bet.id, true, payout);
    }

    // Process losing bets
    for (const bet of losingBets) {
      await resolveBetPayout(bet.id, false);
    }

    console.log('Event resolution completed');
  } catch (error) {
    console.error('Exception in resolveEvent:', error);
    throw error;
  }
};

/**
 * Helper function to resolve individual bet payouts
 */
const resolveBetPayout = async (
  betId: string,
  isWinner: boolean,
  payout?: number
): Promise<void> => {
  try {
    const status = isWinner ? 'won' : 'lost';
    
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
      console.error('Error resolving bet:', betError);
      throw new Error(`Failed to resolve bet: ${betError.message}`);
    }

    if (isWinner && payout) {
      // Update user balance and winnings
      const { error: userError } = await supabase
        .from('users')
        .update({
          balance: supabase.sql`balance + ${payout}`,
          total_winnings: supabase.sql`total_winnings + ${payout - bet.amount}`
        })
        .eq('id', bet.user_id);

      if (userError) {
        console.error('Error updating user winnings:', userError);
        throw new Error(`Failed to update user winnings: ${userError.message}`);
      }

      // Create winning transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: bet.user_id,
          type: 'bet_won',
          amount: payout,
          description: `Bet won - payout received`,
          status: 'completed',
          bet_id: betId
        });
    } else {
      // Create losing transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: bet.user_id,
          type: 'bet_lost',
          amount: -bet.amount,
          description: `Bet lost`,
          status: 'completed',
          bet_id: betId
        });
    }
  } catch (error) {
    console.error('Exception in resolveBetPayout:', error);
    throw error;
  }
};

/**
 * Get a single event by ID
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        bet_options!bet_options_event_id_fkey (*)
      `)
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event by ID:', error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      status: data.status,
      totalPool: data.total_pool || 0,
      participantCount: data.participant_count || 0,
      options: (data.bet_options || []).map((option: any) => ({
        id: option.id,
        label: option.label,
        odds: option.odds,
        totalBets: option.total_bets || 0,
        bettors: option.bettors || 0
      })),
      winningOption: data.winning_option_id
    };
  } catch (error) {
    console.error('Exception in getEventById:', error);
    return null;
  }
};

/**
 * Update event statistics after a bet is placed
 */
export const updateEventStatistics = async (eventId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('refresh_event_statistics', {
      event_uuid: eventId
    });

    if (error) {
      console.error('Error updating event statistics:', error);
      // Don't throw error, just log it as this is not critical
    }
  } catch (error) {
    console.error('Exception in updateEventStatistics:', error);
    // Don't throw error, just log it as this is not critical
  }
};