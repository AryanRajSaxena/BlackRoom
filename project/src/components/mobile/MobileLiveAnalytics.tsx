import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  LineChart,
  Timer,
  Sparkles,
  Eye
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getEventAnalytics, 
  subscribeToEventUpdates,
  type AnalyticsDataPoint,
  type OptionMetadata
} from '../../services/analyticsService';

interface MobileLiveAnalyticsProps {
  eventId: string;
}

export const MobileLiveAnalytics: React.FC<MobileLiveAnalyticsProps> = ({ eventId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Updated state to match web view structure
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [options, setOptions] = useState<OptionMetadata[]>([]);
  const [totalPool, setTotalPool] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  // Professional animation loop
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

  // Cache recent data for mobile optimization (last 12 hours for better graph)
  const recentData = useMemo(() => analyticsData.slice(-12), [analyticsData]);

  // Calculate current percentages from latest data point
  const currentPercentages = useMemo(() => {
    if (analyticsData.length === 0) return {};
    const latestData = analyticsData[analyticsData.length - 1];
    return latestData.percentages;
  }, [analyticsData]);

  // Enhanced insights calculation
  const insights = useMemo(() => {
    if (analyticsData.length === 0 || options.length === 0) {
      return {
        leadingOption: 'N/A',
        volatility: 'Low',
        trend: 'Stable',
        averageVelocity: 0,
        momentum: 0,
        trendStrength: 0,
        percentageChange: 0,
        peakActivity: 'No data'
      };
    }

    const latestData = analyticsData[analyticsData.length - 1];
    const leadingOptionId = Object.keys(latestData.percentages).reduce((a, b) => 
      latestData.percentages[a] > latestData.percentages[b] ? a : b
    );
    const leadingOption = options.find(opt => opt.id === leadingOptionId);

    // Advanced trend calculation
    let trend = 'Stable';
    let momentum = 0;
    let percentageChange = 0;

    if (analyticsData.length > 1) {
      const prevData = analyticsData[analyticsData.length - 2];
      const currentPerc = latestData.percentages[leadingOptionId] || 0;
      const prevPerc = prevData.percentages[leadingOptionId] || 0;
      momentum = currentPerc - prevPerc;
      
      if (momentum > 2) trend = 'Rising';
      else if (momentum < -2) trend = 'Falling';
    }

    // Calculate percentage change over period
    if (recentData.length > 1) {
      const firstValue = recentData[0].percentages[leadingOptionId] || 0;
      const lastValue = recentData[recentData.length - 1].percentages[leadingOptionId] || 0;
      percentageChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    }

    // Calculate volatility
    const series = recentData.map(point => point.percentages[leadingOptionId] || 0);
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
    const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length;
    const stdDev = Math.sqrt(variance);

    // Find peak activity time
    const timeRanges = ['Morning', 'Afternoon', 'Evening', 'Night'];
    const peakActivity = timeRanges[Math.floor(Math.random() * timeRanges.length)]; // Simplified

    return {
      leadingOption: leadingOption?.label || 'N/A',
      volatility: stdDev > 10 ? 'High' : stdDev > 5 ? 'Medium' : 'Low',
      trend,
      averageVelocity: recentData.reduce((sum, point) => sum + (point.bettingVelocity || 0), 0) / recentData.length,
      momentum,
      trendStrength: Math.abs(momentum),
      percentageChange,
      peakActivity
    };
  }, [analyticsData, options, recentData]);

  // Load initial data
  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      
      try {
        if (!eventId) {
          throw new Error('No event ID provided');
        }
        
        const { historicalData, options } = await getEventAnalytics(eventId);
        
        setAnalyticsData(historicalData);
        setOptions(options.map(opt => ({
          ...opt,
          color: opt.color ?? '#8884d8' // Provide a default color if undefined
        })));
        
        if (historicalData.length > 0) {
          const latestData = historicalData[historicalData.length - 1];
          setTotalPool(latestData.totalPool || 0);
        }
        
        setLastUpdate(new Date());
        setIsLive(true);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadAnalytics();
    } else {
      setError('No event ID provided');
      setLoading(false);
    }
  }, [eventId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!eventId) return;

    const subscription = subscribeToEventUpdates(eventId, async () => {
      try {
        const { historicalData, options } = await getEventAnalytics(eventId);
        setAnalyticsData(historicalData);
        setOptions(options.map(opt => ({
          ...opt,
          color: opt.color ?? '#8884d8'
        })));
        
        if (historicalData.length > 0) {
          const latestData = historicalData[historicalData.length - 1];
          setTotalPool(latestData.totalPool || 0);
        }
        
        setLastUpdate(new Date());
        setIsLive(true);
      } catch (error) {
        console.error('Error handling real-time update:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [eventId]);

  // Professional Canvas Graph Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || analyticsData.length === 0 || options.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with device pixel ratio for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Theme colors
    const bgColor = isDarkMode ? '#0F172A' : '#FFFFFF';
    const gridColor = isDarkMode ? '#334155' : '#E2E8F0';
    const textColor = isDarkMode ? '#94A3B8' : '#64748B';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const timeSteps = Math.min(6, recentData.length);
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding.left + (chartWidth * i) / timeSteps;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw Y-axis labels
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight * i) / 4;
      const percentage = 100 - (i * 25);
      ctx.fillText(`${percentage}%`, padding.left - 5, y + 3);
    }

    // Draw time labels
    ctx.textAlign = 'center';
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding.left + (chartWidth * i) / timeSteps;
      const dataIndex = Math.floor((recentData.length - 1) * i / timeSteps);
      const dataPoint = recentData[dataIndex];
      if (dataPoint) {
        const time = new Date(dataPoint.timestamp);
        const label = time.getHours().toString().padStart(2, '0') + ':' + 
                     time.getMinutes().toString().padStart(2, '0');
        ctx.fillText(label, x, height - 10);
      }
    }

    // Enhanced line drawing with gradients
    const drawLine = (points: { x: number; y: number }[], color: string, optionIndex: number) => {
      if (points.length < 2) return;

      // Create gradient for area fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, color + '30');
      gradient.addColorStop(1, color + '10');

      // Draw filled area
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const previous = points[i - 1];
        const controlX = (previous.x + current.x) / 2;
        
        ctx.bezierCurveTo(
          controlX, previous.y,
          controlX, current.y,
          current.x, current.y
        );
      }
      
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
      ctx.lineTo(points[0].x, padding.top + chartHeight);
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const previous = points[i - 1];
        const controlX = (previous.x + current.x) / 2;
        
        ctx.bezierCurveTo(
          controlX, previous.y,
          controlX, current.y,
          current.x, current.y
        );
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw animated points
      const latestPoint = points[points.length - 1];
      if (latestPoint) {
        const pulseScale = 1 + Math.sin(animationFrame * 0.1 + optionIndex * 0.5) * 0.2;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(latestPoint.x, latestPoint.y, 6 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = color + '40';
        ctx.fill();
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(latestPoint.x, latestPoint.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        // White center
        ctx.beginPath();
        ctx.arc(latestPoint.x, latestPoint.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
      }
    };

    // Calculate time range for X-axis
    const timestamps = recentData.map(d => new Date(d.timestamp).getTime());
    const timeMin = Math.min(...timestamps);
    const timeMax = Math.max(...timestamps);

    // Draw lines for each option
    options.forEach((option, optionIndex) => {
      const points = recentData.map((data) => {
        const time = new Date(data.timestamp).getTime();
        const percent = data.percentages[option.id] || 0;
        const x = padding.left + ((time - timeMin) / (timeMax - timeMin)) * chartWidth;
        const y = padding.top + chartHeight - (percent / 100) * chartHeight;
        return { x, y };
      });
      
      drawLine(points, option.color, optionIndex);
    });

    // Draw live indicator
    if (isLive) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(width - 15, 15, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', width - 25, 19);
    }

  }, [analyticsData, options, animationFrame, isDarkMode, isLive, recentData]);

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
    if (insights.trend === 'Rising') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (insights.trend === 'Falling') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  // Calculate current analytics for display
  const calculateCurrentAnalytics = () => {
    if (analyticsData.length === 0 || options.length === 0) return [];
    
    const latestData = analyticsData[analyticsData.length - 1];
    return options.map((option) => {
      const percentage = latestData.percentages[option.id] || 0;
      
      let momentum = 0;
      if (analyticsData.length > 1) {
        const prevData = analyticsData[analyticsData.length - 2];
        const prevPercentage = prevData.percentages[option.id] || 0;
        momentum = percentage - prevPercentage;
      }

      return {
        id: option.id,
        label: option.label,
        percentage,
        momentum,
        color: option.color,
        totalBets: Math.round((totalPool * percentage) / 100),
        bettors: Math.round((latestData.participantCount || 0) * (percentage / 100))
      };
    });
  };

  const currentAnalytics = calculateCurrentAnalytics();

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-2xl h-32 mb-4"></div>
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl h-64 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Analytics Unavailable
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (options.length === 0 || analyticsData.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              No Analytics Data
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Waiting for betting data to display analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Professional Header with Live Status */}
      <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-blue-500/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Live Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time betting insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isLive && (
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                LIVE
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Updated {formatTime(lastUpdate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Eye className="w-4 h-4 text-purple-500" />
            <span>{analyticsData.length} data points</span>
          </div>
        </div>
      </div>

      {/* Professional Line Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-500" />
            Betting Trends
          </h4>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last {recentData.length} periods
          </div>
        </div>
        
        {/* Canvas Graph */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-2 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg"
            style={{ height: '200px' }}
          />
        </div>

        {/* Professional Legend */}
        <div className="flex flex-wrap gap-3">
          {options.map((option) => {
            const currentPercentage = currentPercentages[option.id] || 0;
            const analytics = currentAnalytics.find(a => a.id === option.id);
            
            return (
              <div 
                key={option.id} 
                className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 border transition-all ${
                  hoveredOption === option.id 
                    ? 'border-blue-300 dark:border-blue-600 shadow-md transform scale-105' 
                    : 'border-transparent'
                }`}
                onMouseEnter={() => setHoveredOption(option.id)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <div 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: option.color }}
                ></div>
                <div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {option.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentPercentage.toFixed(1)}%
                    </span>
                    {analytics?.momentum && Math.abs(analytics.momentum) > 0.5 && (
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        analytics.momentum > 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {analytics.momentum > 0 ? '↗' : '↘'}{Math.abs(analytics.momentum).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Distribution Bars */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-slate-700/50">
        <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-500" />
          Current Distribution
          {insights.trend !== 'Stable' && (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              insights.trend === 'Rising' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {insights.trend}
            </span>
          )}
        </h4>
        
        <div className="space-y-4">
          {currentAnalytics.map((option, index) => (
            <div key={option.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: option.color }}
                  ></div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {option.label}
                    </span>
                    {Math.abs(option.momentum) > 1 && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                        option.momentum > 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {option.momentum > 0 ? '↗' : '↘'} {Math.abs(option.momentum).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {option.percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(option.totalBets)}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="relative">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ 
                      width: `${Math.max(option.percentage, 3)}%`,
                      backgroundColor: option.color,
                      boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3)`
                    }}
                  >
                    {/* Animated shine effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-pulse"
                      style={{ 
                        animation: Math.abs(option.momentum) > 1 ? 'shimmer 2s infinite' : 'none',
                        animationDelay: `${index * 300}ms`
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Percentage label inside bar */}
                {option.percentage > 10 && (
                  <div 
                    className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-white"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {option.percentage.toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{option.bettors} participants</span>
                <span>Pool share: {((option.totalBets / totalPool) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Professional Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pool Overview */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200/50 dark:border-green-700/50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">Total Pool</span>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(totalPool)}
          </div>
          <div className="text-xs text-green-700 dark:text-green-400 mt-1">
            Winner takes {formatCurrency(totalPool * 0.85)}
          </div>
        </div>

        {/* Market Trend */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50">
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon()}
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Market Trend</span>
          </div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {insights.trend}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            {insights.momentum !== 0 && (
              <>Momentum: {insights.momentum > 0 ? '+' : ''}{insights.momentum.toFixed(1)}%</>
            )}
          </div>
        </div>

        {/* Leading Option */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-4 border border-purple-200/50 dark:border-purple-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">Leading</span>
          </div>
          <div className="text-lg font-bold text-purple-900 dark:text-purple-100 truncate">
            {insights.leadingOption}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-400 mt-1">
            Market leader
          </div>
        </div>

        {/* Activity Level */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-4 border border-orange-200/50 dark:border-orange-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">Activity</span>
          </div>
          <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
            {insights.volatility}
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">
            Market volatility
          </div>
        </div>
      </div>

      {/* Professional Live Indicator */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <Sparkles className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            {isLive ? 'Live Updates Active' : 'Offline Mode'}
          </span>
        </div>
      </div>

      {/* Add required CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
};

export default MobileLiveAnalytics;