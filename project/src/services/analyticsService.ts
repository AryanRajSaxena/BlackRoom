import { supabase } from '../lib/supabase';

export interface BetOption {
  id: string;
  event_id: string;
  label: string;
  total_bets: number;
  bettors: number;
  color?: string;
}

export interface BettingEvent {
  id: string;
  title: string;
  total_pool: number;
  participant_count: number;
  updated_at: string;
  status: string;
}

export interface BetData {
  id: string;
  event_id: string;
  option_id: string;
  amount: number;
  placed_at: string;
  user_id: string;
}

// Updated interfaces to match your new structure
export interface AnalyticsDataPoint {
  timestamp: string; // Changed from Date to string to match your format
  percentages: Record<string, number>; // Updated to use Record<string, number>
  totalPool: number;
  participantCount: number;
  totalBets?: { [optionId: string]: number }; // Optional for backward compatibility
  bettorsCount?: { [optionId: string]: number }; // Optional for backward compatibility
  velocity?: number; // Optional - bets per hour
  bettingVelocity?: number; // Optional - alias for velocity
  momentum?: { [optionId: string]: number }; // Optional
}

// Updated option metadata interface
export interface OptionMetadata {
  id: string;
  label: string;
  color: string;
}

export interface EventAnalyticsData {
  event: BettingEvent;
  options: BetOption[];
  currentPercentages: { [optionId: string]: number };
  historicalData: AnalyticsDataPoint[];
  totalPool: number;
  insights: {
    leadingOption: string;
    volatility: 'Low' | 'Medium' | 'High';
    trend: 'Rising' | 'Falling' | 'Stable';
    peakBettingHour: number;
    peakBettingTime: string;
    averageVelocity: number;
    totalBettingVelocity: number;
    volatilityScore: number;
    trendingOption: string;
    lastMajorShift?: Date;
  };
}

export interface LiveAnalyticsData {
  event: BettingEvent;
  options: BetOption[];
  currentPercentages: { [optionId: string]: number };
  historicalData: AnalyticsDataPoint[];
  insights: {
    leadingOption: string;
    volatility: 'Low' | 'Medium' | 'High';
    trend: 'Rising' | 'Falling' | 'Stable';
    peakBettingTime: string;
    averageVelocity: number;
  };
}

// Updated getEventAnalytics function with your improved logic
export const getEventAnalytics = async (eventId: string): Promise<EventAnalyticsData> => {
  try {
    console.log('[Analytics] Loading data for event:', eventId);

    // Get bets data with your optimized query
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('option_id, amount, placed_at, user_id')
      .eq('event_id', eventId)
      .order('placed_at', { ascending: true });

    if (betsError) throw new Error(`Bets error: ${betsError.message}`);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw new Error(`Event not found: ${eventError.message}`);

    // Get bet options for this event
    const { data: optionsData, error: optionsError } = await supabase
      .from('bet_options')
      .select('*')
      .eq('event_id', eventId)
      .order('label');

    if (optionsError) throw new Error(`Options error: ${optionsError.message}`);

    // Generate historical data using your improved algorithm
    const { historicalData, options } = await generateOptimizedHistoricalData(eventId, bets, optionsData);

    // Calculate current percentages
    const totalPool = event.total_pool || 0;
    const currentPercentages: { [optionId: string]: number } = {};
    
    optionsData.forEach(option => {
      if (totalPool > 0) {
        currentPercentages[option.id] = (option.total_bets / totalPool) * 100;
      } else {
        currentPercentages[option.id] = 0;
      }
    });

    // Calculate enhanced insights
    const insights = calculateEnhancedInsights(optionsData, historicalData, bets);

    // Add colors to options with your color scheme
    const optionsWithColors = optionsData.map((option, index) => ({
      ...option,
      color: getOptionColor(index)
    }));

    return {
      event,
      options: optionsWithColors,
      currentPercentages,
      historicalData,
      totalPool,
      insights
    };

  } catch (error) {
    console.error('[Analytics] Error loading event analytics:', error);
    throw error;
  }
};

// Updated generateOptimizedHistoricalData using your minute-based grouping
const generateOptimizedHistoricalData = async (
  eventId: string,
  bets: any[],
  optionsData: any[]
): Promise<{ historicalData: AnalyticsDataPoint[], options: OptionMetadata[] }> => {
  
  // Group bets by minute and option (your algorithm)
  const timeMap: Record<string, Record<string, number>> = {};
  const optionSet = new Set<string>();

  bets.forEach(({ placed_at, option_id, amount }) => {
    const timeKey = new Date(placed_at).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    optionSet.add(option_id);
    if (!timeMap[timeKey]) timeMap[timeKey] = {};
    if (!timeMap[timeKey][option_id]) timeMap[timeKey][option_id] = 0;
    timeMap[timeKey][option_id] += amount;
  });

  const timeBuckets = Object.keys(timeMap).sort();
  const historicalData: AnalyticsDataPoint[] = [];

  // Build cumulative data for each time bucket
  let cumulativeData: Record<string, number> = {};
  
  for (const time of timeBuckets) {
    const poolPerOption = timeMap[time];
    
    // Update cumulative totals
    Object.keys(poolPerOption).forEach(optionId => {
      if (!cumulativeData[optionId]) cumulativeData[optionId] = 0;
      cumulativeData[optionId] += poolPerOption[optionId];
    });

    const total = Object.values(cumulativeData).reduce((sum, val) => sum + val, 0);
    const percentages: Record<string, number> = {};

    // Calculate percentages based on cumulative data
    Object.keys(cumulativeData).forEach(optionId => {
      percentages[optionId] = total > 0 ? +(cumulativeData[optionId] / total * 100).toFixed(2) : 0;
    });

    // Ensure all options have a percentage (even if 0)
    optionsData.forEach(option => {
      if (!(option.id in percentages)) {
        percentages[option.id] = 0;
      }
    });

    // Get current event data
    const { data: currentEvent } = await supabase
      .from('events')
      .select('total_pool, participant_count')
      .eq('id', eventId)
      .single();

    historicalData.push({
      timestamp: time + ':00',
      percentages,
      totalPool: currentEvent?.total_pool || total,
      participantCount: currentEvent?.participant_count || 0,
      totalBets: cumulativeData,
      velocity: 0 // Will be calculated separately if needed
    });
  }

  // Generate option metadata with your color scheme
  const optionColors = [
    '#16a34a', // green
    '#dc2626', // red
    '#facc15', // yellow
    '#3b82f6', // blue
    '#8b5cf6'  // purple
  ];

  const options: OptionMetadata[] = optionsData.map((opt, idx) => ({
    id: opt.id,
    label: opt.label,
    color: optionColors[idx % optionColors.length]
  }));

  return { historicalData, options };
};

// Real-time betting stats function
export const getRealTimeBettingStats = async (eventId: string) => {
  try {
    console.log('[Analytics] Getting real-time stats for event:', eventId);

    // Get fresh event data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Get fresh bet options data
    const { data: options, error: optionsError } = await supabase
      .from('bet_options')
      .select('*')
      .eq('event_id', eventId);

    if (optionsError) throw optionsError;

    // Get recent bets (last hour for velocity calculation)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentBets, error: recentBetsError } = await supabase
      .from('bets')
      .select('*')
      .eq('event_id', eventId)
      .gte('placed_at', oneHourAgo);

    if (recentBetsError) throw recentBetsError;

    // Calculate current percentages
    const totalPool = event.total_pool || 0;
    const percentages: Record<string, number> = {};
    const momentum: { [optionId: string]: number } = {};
    
    options.forEach(option => {
      if (totalPool > 0) {
        percentages[option.id] = +(option.total_bets / totalPool * 100).toFixed(2);
      } else {
        percentages[option.id] = 0;
      }
      
      // Calculate momentum based on recent betting activity
      const recentBetsForOption = recentBets.filter(bet => bet.option_id === option.id);
      const recentAmount = recentBetsForOption.reduce((sum, bet) => sum + bet.amount, 0);
      momentum[option.id] = recentAmount > 0 ? (recentAmount / (option.total_bets || 1)) * 100 : 0;
    });

    const bettingVelocity = recentBets.length; // bets per hour

    return {
      timestamp: new Date().toISOString(),
      percentages,
      totalPool,
      participantCount: event.participant_count || 0,
      bettingVelocity,
      momentum,
      options: options.map((option, index) => ({
        ...option,
        color: getOptionColor(index)
      }))
    };

  } catch (error) {
    console.error('[Analytics] Error getting real-time stats:', error);
    throw error;
  }
};

// Betting insights function
export const getBettingInsights = async (eventId: string) => {
  try {
    const analyticsData = await getEventAnalytics(eventId);
    return analyticsData.insights;
  } catch (error) {
    console.error('[Analytics] Error getting betting insights:', error);
    throw error;
  }
};

// Calculate enhanced insights from data
const calculateEnhancedInsights = (
  options: BetOption[], 
  historicalData: AnalyticsDataPoint[], 
  bets: BetData[]
) => {
  if (options.length === 0) {
    return {
      leadingOption: 'No options available',
      volatility: 'Low' as const,
      trend: 'Stable' as const,
      peakBettingHour: 0,
      peakBettingTime: '0:00',
      averageVelocity: 0,
      totalBettingVelocity: 0,
      volatilityScore: 0,
      trendingOption: 'No options available',
      lastMajorShift: undefined
    };
  }

  // Find leading option
  const leadingOption = options.reduce((prev, current) => 
    current.total_bets > prev.total_bets ? current : prev
  );

  // Calculate volatility based on percentage changes
  let volatility: 'Low' | 'Medium' | 'High' = 'Low';
  let volatilityScore = 0;
  
  if (historicalData.length > 1) {
    const changes = historicalData.slice(1).map((point, index) => {
      const prevPoint = historicalData[index];
      const leadingPercentage = point.percentages[leadingOption.id] || 0;
      const prevLeadingPercentage = prevPoint.percentages[leadingOption.id] || 0;
      return Math.abs(leadingPercentage - prevLeadingPercentage);
    });

    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    volatilityScore = Math.min(100, avgChange * 10);
    volatility = avgChange > 10 ? 'High' : avgChange > 5 ? 'Medium' : 'Low';
  }

  // Calculate trend
  let trend: 'Rising' | 'Falling' | 'Stable' = 'Stable';
  if (historicalData.length > 2) {
    const recent = historicalData.slice(-3);
    const leadingPercentages = recent.map(point => point.percentages[leadingOption.id] || 0);
    const firstPercentage = leadingPercentages[0];
    const lastPercentage = leadingPercentages[leadingPercentages.length - 1];
    
    const change = lastPercentage - firstPercentage;
    trend = change > 2 ? 'Rising' : change < -2 ? 'Falling' : 'Stable';
  }

  // Find peak betting hour
  const hourlyBets = new Array(24).fill(0);
  bets.forEach(bet => {
    const hour = new Date(bet.placed_at).getHours();
    hourlyBets[hour]++;
  });
  const peakHour = hourlyBets.indexOf(Math.max(...hourlyBets));

  // Calculate average velocity
  const velocities = historicalData.filter(point => point.velocity !== undefined).map(point => point.velocity!);
  const averageVelocity = velocities.length > 0 ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0;

  // Find trending option (most recent activity)
  const latestData = historicalData[historicalData.length - 1];
  const trendingOption = options.reduce((prev, current) => {
    const prevPercentage = latestData?.percentages[prev.id] || 0;
    const currentPercentage = latestData?.percentages[current.id] || 0;
    return currentPercentage > prevPercentage ? current : prev;
  });

  // Find last major shift (>5% change in leading option)
  let lastMajorShift: Date | undefined;
  for (let i = historicalData.length - 1; i > 0; i--) {
    const current = historicalData[i].percentages[leadingOption.id] || 0;
    const previous = historicalData[i - 1].percentages[leadingOption.id] || 0;
    if (Math.abs(current - previous) > 5) {
      lastMajorShift = new Date(historicalData[i].timestamp);
      break;
    }
  }

  return {
    leadingOption: leadingOption.label,
    volatility,
    trend,
    peakBettingHour: peakHour,
    peakBettingTime: `${peakHour}:00`,
    averageVelocity,
    totalBettingVelocity: averageVelocity,
    volatilityScore,
    trendingOption: trendingOption.label,
    lastMajorShift
  };
};

// Get option colors (updated with your color scheme)
const getOptionColor = (index: number): string => {
  const colors = [
    '#16a34a', // green
    '#dc2626', // red
    '#facc15', // yellow  
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#06B6D4', // cyan
    '#F97316', // orange
    '#84CC16'  // lime
  ];
  return colors[index % colors.length];
};

// Updated subscribeToEventUpdates with your implementation
export const subscribeToEventUpdates = (eventId: string, callback: (data: any) => void) => {
  console.log('[Realtime] Setting up subscription for event:', eventId);
  
  return supabase
    .channel('realtime_bets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bets',
        filter: `event_id=eq.${eventId}`,
      },
      async () => {
        console.log('[Realtime] Bet change detected, triggering update');
        try {
          // Get fresh analytics data and pass to callback
          const freshData = await getRealTimeBettingStats(eventId);
          callback(freshData);
        } catch (error) {
          console.error('[Realtime] Error handling update:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bet_options',
        filter: `event_id=eq.${eventId}`,
      },
      async () => {
        console.log('[Realtime] Bet option change detected');
        try {
          const freshData = await getRealTimeBettingStats(eventId);
          callback(freshData);
        } catch (error) {
          console.error('[Realtime] Error handling option update:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`,
      },
      async () => {
        console.log('[Realtime] Event change detected');
        try {
          const freshData = await getRealTimeBettingStats(eventId);
          callback(freshData);
        } catch (error) {
          console.error('[Realtime] Error handling event update:', error);
        }
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });
};

// Trigger manual analytics update (call after placing bet)
export const triggerAnalyticsUpdate = async (eventId: string) => {
  try {
    console.log('[Analytics] Triggering manual update for event:', eventId);
    
    const freshData = await getRealTimeBettingStats(eventId);
    
    // Broadcast to realtime channel
    const channel = supabase.channel('realtime_bets');
    await channel.send({
      type: 'broadcast',
      event: 'analytics_update',
      payload: { 
        eventId, 
        data: freshData,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('[Analytics] Manual update broadcasted successfully');
    return freshData;
    
  } catch (error) {
    console.error('[Analytics] Error triggering manual update:', error);
    throw error;
  }
};

// Legacy type exports for backward compatibility
// Removed duplicate export type to fix export conflict error

// Export the function with the exact signature you provided
// Removed duplicate export of getEventAnalytics to fix identifier conflict

// (Removed duplicate subscribeToEventUpdates export to fix error)