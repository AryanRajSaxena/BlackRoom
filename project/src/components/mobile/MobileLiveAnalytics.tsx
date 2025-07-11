import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  BarChart3, 
  PieChart,
  DollarSign,
  Users,
  TrendingDown,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getEventAnalytics, 
  getRealTimeBettingStats, 
  subscribeToEventUpdates,
  getBettingInsights,
  type AnalyticsDataPoint,
  type EventAnalyticsData
} from '../../services/analyticsService';

interface MobileLiveAnalyticsProps {
  eventId: string;
}

export const MobileLiveAnalytics: React.FC<MobileLiveAnalyticsProps> = ({ eventId }) => {
  const [dataPoints, setDataPoints] = useState<AnalyticsDataPoint[]>([]);
  const [options, setOptions] = useState<Array<{
    id: string;
    label: string;
    totalBets: number;
    color: string;
    odds: number;
    bettors: number;
  }>>([]);
  const [totalPool, setTotalPool] = useState(0);
  const [insights, setInsights] = useState<EventAnalyticsData['insights'] | null>(null);
  const [bettingVelocity, setBettingVelocity] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { isDarkMode } = useTheme();

  // Debug logging
  console.log('[MobileLiveAnalytics] Component mounted with eventId:', eventId);
  console.log('[MobileLiveAnalytics] Current state:', {
    loading,
    error,
    dataPointsCount: dataPoints.length,
    optionsCount: options.length,
    totalPool
  });

  // Cache recent data for analytics (last 6 hours for mobile)
  const recentData = useMemo(() => dataPoints.slice(-6), [dataPoints]);

  // Enhanced mobile analytics calculations
  const analytics = useMemo(() => {
    console.log('[MobileLiveAnalytics] Calculating analytics with recentData:', recentData.length);
    
    if (recentData.length < 3 || options.length === 0) {
      return { 
        volatility: 'Low', 
        trend: 'Stable', 
        momentum: 0,
        avgVelocity: 0,
        trendStrength: 0,
        leadingOption: null,
        percentageChange: 0
      };
    }
    
    // Get the most active option
    const leadingOption = options.reduce((prev, current) => 
      (current.totalBets > prev.totalBets) ? current : prev
    );
    
    if (!leadingOption) {
      return { 
        volatility: 'Low', 
        trend: 'Stable', 
        momentum: 0,
        avgVelocity: 0,
        trendStrength: 0,
        leadingOption: null,
        percentageChange: 0
      };
    }
    
    // Extract data series for leading option
    const series = recentData.map(point => point.percentages[leadingOption.id] || 0);
    
    // Calculate volatility using standard deviation
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
    const squaredDiffs = series.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / series.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate momentum
    const latestMomentum = recentData[recentData.length - 1]?.momentum?.[leadingOption.id] || 0;
    
    // Calculate average betting velocity
    const avgVelocity = recentData.reduce((sum, point) => 
      sum + (point.bettingVelocity || 0), 0) / recentData.length;
    
    // Calculate percentage change over recent period
    const firstValue = series[0] || 0;
    const lastValue = series[series.length - 1] || 0;
    const percentageChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    // Simple trend calculation for mobile
    const isRising = latestMomentum > 1;
    const isFalling = latestMomentum < -1;
    
    const result = { 
      volatility: stdDev > 10 ? 'High' : stdDev > 5 ? 'Medium' : 'Low',
      trend: isRising ? 'Rising' : isFalling ? 'Falling' : 'Stable',
      momentum: latestMomentum,
      avgVelocity,
      trendStrength: Math.abs(latestMomentum),
      leadingOption,
      percentageChange
    };
    
    console.log('[MobileLiveAnalytics] Analytics calculated:', result);
    return result;
  }, [recentData, options]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[MobileLiveAnalytics] Loading data for event:', eventId);
        
        if (!eventId) {
          throw new Error('No event ID provided');
        }
        
        const analyticsData = await getEventAnalytics(eventId);
        
        console.log('[MobileLiveAnalytics] Analytics data received:', analyticsData);
        
        setOptions(analyticsData.options);
        setTotalPool(analyticsData.totalPool);
        setDataPoints(analyticsData.historicalData);
        setInsights(analyticsData.insights);
        setLastUpdate(new Date());
        
        console.log('[MobileLiveAnalytics] Data loaded successfully:', {
          optionsCount: analyticsData.options.length,
          dataPointsCount: analyticsData.historicalData.length,
          totalPool: analyticsData.totalPool
        });
        
      } catch (err) {
        console.error('[MobileLiveAnalytics] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadInitialData();
    } else {
      console.warn('[MobileLiveAnalytics] No eventId provided');
      setError('No event ID provided');
      setLoading(false);
    }
  }, [eventId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!eventId || options.length === 0) {
      console.log('[MobileLiveAnalytics] Skipping real-time setup - missing eventId or options');
      return;
    }

    console.log('[MobileLiveAnalytics] Setting up real-time subscription for event:', eventId);
    
    const handleRealTimeUpdate = (update: any) => {
      console.log('[MobileLiveAnalytics] Real-time update received:', update);
      
      const newDataPoint: AnalyticsDataPoint = {
        timestamp: update.timestamp || new Date(),
        percentages: update.percentages || {},
        totalPool: update.totalPool || 0,
        bettingVelocity: update.bettingVelocity || 0,
        momentum: update.momentum || {}
      };

      setDataPoints(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 6 hours for mobile performance
        const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
        return updated.filter(point => point.timestamp >= cutoff);
      });

      setTotalPool(update.totalPool || 0);
      setBettingVelocity(update.bettingVelocity || 0);
      setLastUpdate(new Date());
    };

    let unsubscribe: (() => void) | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      // Subscribe to real-time updates
      unsubscribe = subscribeToEventUpdates(eventId, handleRealTimeUpdate);

      // Set up mobile-optimized polling (every 45 seconds for battery efficiency)
      pollInterval = setInterval(async () => {
        try {
          console.log('[MobileLiveAnalytics] Polling for updates...');
          const stats = await getRealTimeBettingStats(eventId);
          handleRealTimeUpdate(stats);
        } catch (error) {
          console.error('[MobileLiveAnalytics] Error polling for updates:', error);
        }
      }, 45000);
    } catch (error) {
      console.error('[MobileLiveAnalytics] Error setting up real-time updates:', error);
    }

    return () => {
      console.log('[MobileLiveAnalytics] Cleaning up subscriptions');
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [eventId, options.length]);

  // Animation loop for live effects
  useEffect(() => {
    let isActive = true;
    
    const animate = () => {
      if (!isActive) return;
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    return () => {
      isActive = false;
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTrendIcon = () => {
    if (analytics.trend === 'Rising') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (analytics.trend === 'Falling') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  // Calculate current percentages for display
  const calculateCurrentPercentages = () => {
    if (dataPoints.length === 0 || options.length === 0) {
      console.log('[MobileLiveAnalytics] No data available for percentages calculation');
      return [];
    }
    
    const latestData = dataPoints[dataPoints.length - 1];
    const result = options.map((option, index) => ({
      ...option,
      percentage: latestData.percentages[option.id] || 0,
      momentum: latestData.momentum?.[option.id] || 0,
      color: option.color || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'][index % 4]
    }));
    
    console.log('[MobileLiveAnalytics] Current percentages calculated:', result);
    return result;
  };

  const currentAnalytics = calculateCurrentPercentages();
  const availablePool = totalPool * 0.85;

  // Add a debug section in development
  const isDebug = process.env.NODE_ENV === 'development';

  // Loading state
  if (loading) {
    console.log('[MobileLiveAnalytics] Rendering loading state');
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-32 mb-4"></div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-40 mb-4"></div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-48"></div>
        </div>
        {isDebug && (
          <div className="bg-blue-50 p-2 rounded text-xs">
            Debug: Loading analytics for event {eventId}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    console.log('[MobileLiveAnalytics] Rendering error state:', error);
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
              Analytics Unavailable
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
            {isDebug && (
              <div className="mt-2 text-xs text-red-600">
                Debug Info: EventID: {eventId}, Options: {options.length}, DataPoints: {dataPoints.length}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (options.length === 0 || dataPoints.length === 0) {
    console.log('[MobileLiveAnalytics] Rendering no data state');
    return (
      <div className="p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              No Analytics Data
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              {options.length === 0 ? 'No betting options found for this event.' : 'No historical data available yet.'}
            </p>
            {isDebug && (
              <div className="mt-2 text-xs text-yellow-600">
                Debug: Options: {options.length}, DataPoints: {dataPoints.length}, Pool: {totalPool}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  console.log('[MobileLiveAnalytics] Rendering main component');

  return (
    <div className="space-y-4 pb-6">
      {/* Debug panel in development */}
      {isDebug && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
          <strong>Debug Info:</strong> EventID: {eventId} | Options: {options.length} | 
          DataPoints: {dataPoints.length} | Pool: {formatCurrency(totalPool)} | 
          Analytics: {analytics.trend}
        </div>
      )}

      {/* Live Status Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-900 dark:text-white">Live Analytics</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {insights && (
              <>
                <Target className="w-4 h-4 text-purple-500" />
                <span>Peak: {insights.peakBettingHour}:00</span>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Last updated: {formatTime(lastUpdate)} • Next update in {Math.max(0, 45 - Math.floor((Date.now() - lastUpdate.getTime()) / 1000))}s
        </div>
      </div>

      {/* Live Pool Distribution Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-500" />
          Live Betting Distribution
          {analytics.trend !== 'Stable' && (
            <div className={`text-xs px-2 py-1 rounded-full ${
              analytics.trend === 'Rising' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {analytics.trend}
            </div>
          )}
        </h4>
        
        {/* Mobile-optimized bar chart */}
        <div className="space-y-3">
          {currentAnalytics.map((option, index) => {
            const previousValue = dataPoints.length > 1 
              ? dataPoints[dataPoints.length - 2]?.percentages[option.id] || 0
              : option.percentage;
            const change = option.percentage - previousValue;
            
            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    ></div>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {option.label}
                    </span>
                    {Math.abs(option.momentum) > 1 && (
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        option.momentum > 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {option.momentum > 0 ? '↗' : '↘'}{Math.abs(option.momentum).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {option.percentage.toFixed(1)}%
                    </span>
                    {change !== 0 && (
                      <span className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Animated progress bar with momentum effect */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ 
                      width: `${Math.max(option.percentage, 2)}%`,
                      backgroundColor: option.color,
                      filter: Math.abs(option.momentum) > 2 ? 'brightness(1.2)' : 'none'
                    }}
                  >
                    {/* Enhanced shine effect for active options */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                      style={{ 
                        animation: Math.abs(option.momentum) > 1 ? 'pulse 1.5s infinite' : 'none',
                        animationDelay: `${index * 200}ms`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{formatCurrency(option.totalBets)}</span>
                  <span>{option.bettors} bettors</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* Enhanced Pool Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Pool Overview
          {dataPoints.length > 1 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              +{(((totalPool / dataPoints[0].totalPool) - 1) * 100).toFixed(1)}% growth
            </span>
          )}
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white/50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalPool)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Pool</div>
            {dataPoints.length > 1 && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                +{formatCurrency(totalPool - dataPoints[0].totalPool)}
              </div>
            )}
          </div>
          
          <div className="text-center bg-white/50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(availablePool)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Available (85%)</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Winner pool
            </div>
          </div>
          
          <div className="text-center bg-white/50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalPool * 0.15)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Platform Fee</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              15% of pool
            </div>
          </div>
          
          <div className="text-center bg-white/50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {options.reduce((sum, opt) => sum + opt.bettors, 0)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Bets</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Across all options
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Live Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          Live Statistics
          <div className="ml-auto flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              bettingVelocity > analytics.avgVelocity ? 'bg-green-500' : 'bg-yellow-500'
            } animate-pulse`}></div>
            <span className="text-xs text-slate-500">{analytics.avgVelocity.toFixed(1)} bets/hr</span>
          </div>
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              {getTrendIcon()}
              <span className="text-xs text-slate-600 dark:text-slate-400">Market Trend</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {analytics.trend}
              {analytics.momentum !== 0 && (
                <span className={`text-xs ml-1 ${analytics.momentum > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {analytics.momentum > 0 ? '+' : ''}{analytics.momentum.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Leading Option</span>
            </div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {analytics.leadingOption?.label || 'N/A'}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Volatility</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {analytics.volatility}
              {typeof analytics.volatility === 'string' && analytics.volatility !== 'Low' && (
                <span className="text-xs text-orange-500 ml-1">±{analytics.trendStrength.toFixed(1)}%</span>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Betting Rate</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {bettingVelocity} bets/hr
              {bettingVelocity > analytics.avgVelocity && (
                <span className="text-xs text-green-500 ml-1">↑</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Market Insights Panel */}
      {insights && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-purple-200/50 dark:border-purple-700/50">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Market Insights
            {insights.lastMajorShift && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                Last shift: {formatTime(insights.lastMajorShift)}
              </span>
            )}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
              <span className="text-slate-600 dark:text-slate-400 block text-xs">Trending Option</span>
              <div className="font-semibold text-purple-600 dark:text-purple-400">
                {insights.trendingOption}
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
              <span className="text-slate-600 dark:text-slate-400 block text-xs">Peak Activity</span>
              <div className="font-semibold text-slate-900 dark:text-white">
                {insights.peakBettingHour}:00 - {insights.peakBettingHour + 1}:00
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
              <span className="text-slate-600 dark:text-slate-400 block text-xs">Market Score</span>
              <div className="font-semibold text-slate-900 dark:text-white">
                {insights.volatilityScore.toFixed(0)}/100
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
              <span className="text-slate-600 dark:text-slate-400 block text-xs">Avg Velocity</span>
              <div className="font-semibold text-slate-900 dark:text-white">
                {insights.totalBettingVelocity.toFixed(1)} bets/hr
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Live Data • Updates every 45s
          </span>
        </div>
      </div>
    </div>
  );
};

export default MobileLiveAnalytics;