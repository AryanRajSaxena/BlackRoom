import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, Activity, Clock, BarChart3, TrendingDown, Zap, Users, Target } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getEventAnalytics, 
  getRealTimeBettingStats, 
  subscribeToEventUpdates,
  getBettingInsights,
  type AnalyticsDataPoint,
  type EventAnalyticsData
} from '../services/analyticsService';

interface LiveAnalyticsGraphProps {
  eventId: string;
}

export const LiveAnalyticsGraph: React.FC<LiveAnalyticsGraphProps> = ({
  eventId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: AnalyticsDataPoint; index: number } | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { isDarkMode } = useTheme();

  // Throttle mouse move events
  const throttleRef = useRef<number | null>(null);

  // Cache recent data for analytics
  const recentData = useMemo(() => dataPoints.slice(-24), [dataPoints]);

  // Enhanced analytics calculations
  const analytics = useMemo(() => {
    if (recentData.length < 5) return { 
      volatility: 'Low', 
      trend: 'Stable', 
      momentum: 0,
      avgVelocity: 0,
      trendStrength: 0
    };
    
    // Get the most active option
    const mainOption = options.reduce((prev, current) => 
      (current.totalBets > prev.totalBets) ? current : prev
    );
    
    if (!mainOption) return { 
      volatility: 'Low', 
      trend: 'Stable', 
      momentum: 0,
      avgVelocity: 0,
      trendStrength: 0
    };
    
    // Extract data series for main option
    const series = recentData.map(point => point.percentages[mainOption.id] || 0);
    
    // Calculate volatility using standard deviation
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
    const squaredDiffs = series.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / series.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate momentum using the new momentum data
    const latestMomentum = recentData[recentData.length - 1]?.momentum?.[mainOption.id] || 0;
    
    // Calculate average betting velocity
    const avgVelocity = recentData.reduce((sum, point) => 
      sum + (point.bettingVelocity || 0), 0) / recentData.length;
    
    // Calculate trend using linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    series.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const n = series.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate trend strength (how consistent the trend is)
    const trendStrength = Math.abs(slope) * 100; // Convert to percentage
    
    return { 
      volatility: stdDev, 
      trend: slope > 0.1 ? 'Rising' : slope < -0.1 ? 'Falling' : 'Stable',
      momentum: latestMomentum,
      avgVelocity,
      trendStrength
    };
  }, [recentData, options]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[LiveAnalytics] Loading data for event:', eventId);
        const analyticsData = await getEventAnalytics(eventId);
        
        setOptions(analyticsData.options);
        setTotalPool(analyticsData.totalPool);
        setDataPoints(analyticsData.historicalData);
        setInsights(analyticsData.insights);
        
        // Load additional insights
        try {
          const additionalInsights = await getBettingInsights(eventId);
          console.log('[LiveAnalytics] Additional insights loaded:', additionalInsights);
        } catch (insightError) {
          console.warn('[LiveAnalytics] Could not load additional insights:', insightError);
        }
        
        console.log('[LiveAnalytics] Loaded:', {
          options: analyticsData.options.length,
          dataPoints: analyticsData.historicalData.length,
          totalPool: analyticsData.totalPool,
          insights: analyticsData.insights
        });
        
      } catch (err) {
        console.error('[LiveAnalytics] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadInitialData();
    }
  }, [eventId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!eventId || options.length === 0) return;

    console.log('[LiveAnalytics] Setting up real-time subscription for event:', eventId);
    
    const handleRealTimeUpdate = (update: any) => {
      console.log('[LiveAnalytics] Real-time update received:', update);
      
      // Add new data point with enhanced data structure
      const newDataPoint: AnalyticsDataPoint = {
        timestamp: update.timestamp,
        percentages: update.percentages,
        totalPool: update.totalPool,
        bettingVelocity: update.bettingVelocity || 0,
        momentum: update.momentum || {}
      };

      setDataPoints(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 24 hours of data
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return updated.filter(point => point.timestamp >= cutoff);
      });

      setTotalPool(update.totalPool);
      setBettingVelocity(update.bettingVelocity || 0);
    };

    // Subscribe to real-time updates
    const unsubscribe = subscribeToEventUpdates(eventId, handleRealTimeUpdate);

    // Set up periodic polling as fallback
    const pollInterval = setInterval(async () => {
      try {
        const stats = await getRealTimeBettingStats(eventId);
        handleRealTimeUpdate(stats);
      } catch (error) {
        console.error('[LiveAnalytics] Error polling for updates:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      console.log('[LiveAnalytics] Cleaning up subscriptions');
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [eventId, options.length]);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    let isActive = true;

    const animate = () => {
      if (!isActive) return;
      setAnimationFrame(prev => prev + 1);
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      isActive = false;
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Enhanced canvas drawing with velocity indicators
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0 || options.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 40, bottom: 60, left: 50 }; // Increased bottom for velocity bars
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom - 30; // Reserve space for velocity

    // Theme colors
    const bgColor = isDarkMode ? '#1A1A1A' : '#F8FAFC';
    const gridColor = isDarkMode ? '#333333' : '#E2E8F0';
    const textColor = isDarkMode ? '#888888' : '#64748B';
    const axisColor = isDarkMode ? '#555555' : '#94A3B8';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines (percentage)
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines (time)
    for (let i = 0; i <= 24; i += 4) {
      const x = padding.left + (chartWidth * i) / 24;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw Y-axis labels (percentages)
    ctx.fillStyle = textColor;
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10;
      const percentage = 100 - (i * 10);
      ctx.fillText(`${percentage}%`, padding.left - 10, y + 4);
    }

    // Draw X-axis labels (time)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 24; i += 4) {
      const x = padding.left + (chartWidth * i) / 24;
      const hoursAgo = 24 - i;
      const label = hoursAgo === 0 ? 'Now' : `${hoursAgo}h`;
      ctx.fillText(label, x, height - 35);
    }

    // Draw data lines for each option
    options.forEach((option, optionIndex) => {
      if (dataPoints.length < 2) return;

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      const baseColor = option.color;
      gradient.addColorStop(0, baseColor + (isDarkMode ? '40' : '30'));
      gradient.addColorStop(1, baseColor + '05');

      const seriesData = dataPoints.map((point, idx) => ({
        x: padding.left + (chartWidth * idx) / (dataPoints.length - 1),
        y: padding.top + chartHeight - (chartHeight * (point.percentages[option.id] || 0)) / 100,
        value: point.percentages[option.id] || 0
      }));

      // Draw filled area
      ctx.beginPath();
      ctx.moveTo(seriesData[0].x, seriesData[0].y);
      
      for (let i = 0; i < seriesData.length - 1; i++) {
        const current = seriesData[i];
        const next = seriesData[i + 1];
        const controlX = (current.x + next.x) / 2;
        
        ctx.bezierCurveTo(
          controlX, current.y,
          controlX, next.y,
          next.x, next.y
        );
      }
      
      ctx.lineTo(seriesData[seriesData.length - 1].x, padding.top + chartHeight);
      ctx.lineTo(seriesData[0].x, padding.top + chartHeight);
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw the line
      ctx.beginPath();
      ctx.moveTo(seriesData[0].x, seriesData[0].y);
      
      for (let i = 0; i < seriesData.length - 1; i++) {
        const current = seriesData[i];
        const next = seriesData[i + 1];
        const controlX = (current.x + next.x) / 2;
        
        ctx.bezierCurveTo(
          controlX, current.y,
          controlX, next.y,
          next.x, next.y
        );
      }
      
      ctx.shadowColor = option.color + (isDarkMode ? '80' : '40');
      ctx.shadowBlur = 4;
      ctx.strokeStyle = option.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw points
      const pointsToHighlight = [0, dataPoints.length - 1];
      pointsToHighlight.forEach(idx => {
        if (idx >= 0 && idx < seriesData.length) {
          const point = seriesData[idx];
          const isLatest = idx === dataPoints.length - 1;
          
          if (isLatest) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = option.color + '20';
            ctx.fill();
          }
          
          const pulseScale = isLatest 
            ? 1 + Math.sin(animationFrame * 0.1 + optionIndex) * 0.2
            : 1;
            
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 * pulseScale, 0, Math.PI * 2);
          ctx.fillStyle = option.color;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = option.color + (isDarkMode ? '60' : '80');
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    // Draw velocity indicators as small bars at the bottom
    const velocityBarHeight = 20;
    const velocityY = padding.top + chartHeight + 15;
    const maxVelocity = Math.max(...dataPoints.map(p => p.bettingVelocity || 0), 1);

    dataPoints.forEach((point, idx) => {
      const velocity = point.bettingVelocity || 0;
      const barHeight = (velocity / maxVelocity) * velocityBarHeight;
      const x = padding.left + (chartWidth * idx) / (dataPoints.length - 1);
      
      // Draw velocity bar
      ctx.fillStyle = velocity > analytics.avgVelocity ? '#10B981' : '#6B7280';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x - 1, velocityY - barHeight, 2, barHeight);
      ctx.globalAlpha = 1;
    });

    // Add velocity label
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Betting Velocity', padding.left, velocityY + 15);

    // Draw axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw timestamp
    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Updated: ' + new Date().toLocaleTimeString(), width - padding.right, padding.top - 5);

  }, [dataPoints, options, animationFrame, isDarkMode, analytics.avgVelocity]);

  // Mouse interaction handlers
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (throttleRef.current !== null) return;
    
    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
    }, 30);
    
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padding = { top: 20, right: 40, bottom: 60, left: 50 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom - 30;

    if (x >= padding.left && x <= padding.left + chartWidth && 
        y >= padding.top && y <= padding.top + chartHeight) {
      
      const dataIndex = Math.min(
        dataPoints.length - 1,
        Math.max(0, Math.round(((x - padding.left) / chartWidth) * (dataPoints.length - 1)))
      );
      
      const dataPoint = dataPoints[dataIndex];
      
      if (dataPoint) {
        setHoveredPoint({
          x: event.clientX,
          y: event.clientY,
          data: dataPoint,
          index: dataIndex
        });
      }
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Utility functions
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getVolatilityLevel = () => {
    if (typeof analytics.volatility === 'number') {
      if (analytics.volatility > 15) return 'High';
      if (analytics.volatility > 8) return 'Medium';
      return 'Low';
    }
    return analytics.volatility;
  };

  const getTrendIcon = () => {
    if (analytics.trend === 'Rising') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (analytics.trend === 'Falling') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <TrendingUp className="w-4 h-4 text-gray-500" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative" ref={containerRef}>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-48 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="w-full h-80 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative" ref={containerRef}>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Failed to Load Analytics
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="relative" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Live Betting Trends (24H)
          </h4>
        </div>
        <div className="flex items-center gap-4">
          {insights && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Target className="w-4 h-4 text-purple-500" />
              <span>Peak: {insights.peakBettingHour}:00</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Data</span>
          </div>
        </div>
      </div>

      {/* Enhanced Legend with Momentum */}
      <div className="flex flex-wrap gap-4 mb-4">
        {options.map((option) => {
          const currentValue = dataPoints.length > 0 
            ? dataPoints[dataPoints.length - 1]?.percentages[option.id]
            : 0;
          
          const previousValue = dataPoints.length > 1 
            ? dataPoints[dataPoints.length - 2]?.percentages[option.id]
            : currentValue;
            
          const change = currentValue - previousValue;
          
          // Get momentum from the latest data point
          const momentum = dataPoints.length > 0 
            ? dataPoints[dataPoints.length - 1]?.momentum?.[option.id] || 0
            : 0;
          
          return (
            <div key={option.id} className="flex items-center gap-2 bg-white/10 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: option.color }}
              ></div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {option.label}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {currentValue?.toFixed(1) || '0'}%
                </span>
                {change !== 0 && (
                  <span className={`text-xs ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(1)}%
                  </span>
                )}
                {/* Add momentum indicator */}
                {Math.abs(momentum) > 1 && (
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    momentum > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                 : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {momentum > 0 ? '↗' : '↘'}{Math.abs(momentum).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Graph Container */}
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-md">
        <canvas
          ref={canvasRef}
          className="w-full h-80 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Enhanced Tooltip with Velocity */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 pointer-events-none max-w-xs"
            style={{
              left: hoveredPoint.x + 10,
              top: hoveredPoint.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
              <span>{formatDate(hoveredPoint.data.timestamp)}</span>
              <span>{formatTime(hoveredPoint.data.timestamp)}</span>
            </div>
            <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
              {options.map((option) => (
                <div key={option.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    ></div>
                    <span className="text-sm">{option.label}:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold">
                      {hoveredPoint.data.percentages[option.id]?.toFixed(1) || '0'}%
                    </span>
                    {/* Add momentum indicator in tooltip */}
                    {hoveredPoint.data.momentum?.[option.id] && Math.abs(hoveredPoint.data.momentum[option.id]) > 0.5 && (
                      <span className={`text-xs ${hoveredPoint.data.momentum[option.id] > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {hoveredPoint.data.momentum[option.id] > 0 ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2 space-y-1">
              <div className="text-xs flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Pool:</span>
                <span className="font-medium">{formatCurrency(hoveredPoint.data.totalPool)}</span>
              </div>
              {/* Add betting velocity to tooltip */}
              {hoveredPoint.data.bettingVelocity !== undefined && (
                <div className="text-xs flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Betting Rate:</span>
                  <span className="font-medium">{hoveredPoint.data.bettingVelocity} bets/hr</span>
                </div>
              )}
            </div>
            {hoveredPoint.index < dataPoints.length - 1 && (
              <div className="text-xs text-center mt-2 text-blue-500 dark:text-blue-400">
                {dataPoints.length - 1 - hoveredPoint.index} updates ago
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            {getTrendIcon()}
            <span className="text-xs text-gray-600 dark:text-gray-400">Trend</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
            {analytics.trend}
            {analytics.trend !== 'Stable' && (
              <span className={`text-xs ${analytics.trend === 'Rising' ? 'text-green-500' : 'text-red-500'}`}>
                {analytics.momentum > 0 ? '+' : ''}{analytics.momentum.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Betting Rate</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {analytics.avgVelocity.toFixed(1)} bets/hr
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Last Update</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {dataPoints.length > 0 ? formatTime(dataPoints[dataPoints.length - 1].timestamp) : 'N/A'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Volatility</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
            {getVolatilityLevel()}
            {typeof analytics.volatility === 'number' && (
              <span className="text-xs text-gray-500">±{analytics.volatility.toFixed(1)}%</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {insights?.trendingOption ? 'Trending' : 'Pool Growth'}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {insights?.trendingOption ? (
              <span className="text-blue-500">{insights.trendingOption}</span>
            ) : (
              dataPoints.length >= 2 ? (
                <span>
                  {(((dataPoints[dataPoints.length - 1].totalPool / dataPoints[0].totalPool) - 1) * 100).toFixed(1)}%
                </span>
              ) : 'N/A'
            )}
          </div>
        </div>
      </div>

      {/* Additional Insights Panel */}
      {insights && (
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Market Insights
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Peak Hour:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {insights.peakBettingHour}:00 - {insights.peakBettingHour + 1}:00
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Volatility Score:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {insights.volatilityScore.toFixed(1)}/100
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Trending Option:</span>
              <div className="font-medium text-blue-600 dark:text-blue-400">
                {insights.trendingOption}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Last Major Shift:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {insights.lastMajorShift 
                  ? formatTime(insights.lastMajorShift)
                  : 'None detected'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveAnalyticsGraph;