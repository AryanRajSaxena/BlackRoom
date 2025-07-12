import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Users, 
  Clock,
  Zap,
  Target,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getEventAnalytics, 
  subscribeToEventUpdates,
  triggerAnalyticsUpdate,
  type AnalyticsDataPoint,
  type OptionMetadata
} from '../services/analyticsService';

interface LiveAnalyticsGraphProps {
  eventId: string;
  height?: number;
  className?: string;
}

export const LiveAnalyticsGraph: React.FC<LiveAnalyticsGraphProps> = ({
  eventId,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Updated state to match your simplified structure
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [options, setOptions] = useState<OptionMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    dataPoint: AnalyticsDataPoint;
    index: number;
  } | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const { isDarkMode } = useTheme();

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

  // Load analytics data using your simplified approach
  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[LiveGraph] Loading analytics for event:', eventId);
        
        // Use your simplified getEventAnalytics function
        const { historicalData, options } = await getEventAnalytics(eventId);
        
        setAnalyticsData(historicalData);
        setOptions(options);
        setLastUpdate(new Date());
        setIsLive(true);
        
        console.log('[LiveGraph] Analytics loaded successfully:', {
          dataPoints: historicalData.length,
          options: options.length
        });
        
      } catch (err) {
        console.error('[LiveGraph] Failed to fetch analytics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        setIsLive(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) {
      loadAnalytics();
    }

    // Set up real-time subscription using your approach
    const subscription = subscribeToEventUpdates(eventId, () => {
      console.log('[LiveGraph] Real-time update received, reloading data');
      loadAnalytics(); // Re-fetch when a new bet is placed
      setLastUpdate(new Date());
      setIsLive(true);
    });

    return () => {
      console.log('[LiveGraph] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [eventId]);

  // Enhanced canvas drawing with your base logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || analyticsData.length === 0 || options.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with device pixel ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Theme colors
    const bgColor = isDarkMode ? '#0F172A' : '#F8FAFC';
    const gridColor = isDarkMode ? '#334155' : '#E2E8F0';
    const textColor = isDarkMode ? '#94A3B8' : '#64748B';
    const axisColor = isDarkMode ? '#475569' : '#94A3B8';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Your time calculation logic
    const timestamps = analyticsData.map(d => new Date(d.timestamp).getTime());
    const timeMin = Math.min(...timestamps);
    const timeMax = Math.max(...timestamps);

    // Draw grid
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
    const timeSteps = Math.min(12, analyticsData.length);
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding.left + (chartWidth * i) / timeSteps;
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

    // Draw X-axis labels (time) with your timestamp logic
    ctx.textAlign = 'center';
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding.left + (chartWidth * i) / timeSteps;
      const dataIndex = Math.floor((analyticsData.length - 1) * i / timeSteps);
      const dataPoint = analyticsData[dataIndex];
      if (dataPoint) {
        const time = new Date(dataPoint.timestamp);
        const label = time.getHours().toString().padStart(2, '0') + ':' + 
                     time.getMinutes().toString().padStart(2, '0');
        ctx.fillText(label, x, height - 15);
      }
    }

    // Enhanced line drawing function
    const drawLine = (points: { x: number; y: number }[], color: string, optionIndex: number) => {
      if (points.length < 2) return;

      // Create gradient for fill area
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, color + '40');
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
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw animated points
      points.forEach((point, pointIndex) => {
        const isLatest = pointIndex === points.length - 1;
        const isFirst = pointIndex === 0;
        
        if (isLatest || isFirst) {
          // Animated pulse for latest point
          const pulseScale = isLatest 
            ? 1 + Math.sin(animationFrame * 0.1 + optionIndex * 0.5) * 0.3
            : 1;
          
          // Outer glow
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8 * pulseScale, 0, Math.PI * 2);
          ctx.fillStyle = color + '30';
          ctx.fill();
          
          // Inner circle
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          
          // White center
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = bgColor;
          ctx.fill();
        }
      });
    };

    // Draw lines for each option using your logic with enhancements
    options.forEach((option, optionIndex) => {
      const points = analyticsData.map((data, i) => {
        const time = new Date(data.timestamp).getTime();
        const percent = data.percentages[option.id] || 0;
        const x = padding.left + ((time - timeMin) / (timeMax - timeMin)) * chartWidth;
        const y = padding.top + chartHeight - (percent / 100) * chartHeight;
        return { x, y };
      });
      
      drawLine(points, option.color, optionIndex);
    });

    // Draw axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw live indicator
    if (isLive) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(width - 20, 20, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', width - 30, 25);
    }

  }, [analyticsData, options, animationFrame, isDarkMode, isLive]);

  // Mouse interaction
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || analyticsData.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padding = { top: 20, right: 40, bottom: 60, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    if (x >= padding.left && x <= padding.left + chartWidth && 
        y >= padding.top && y <= padding.top + chartHeight) {
      
      const dataIndex = Math.min(
        analyticsData.length - 1,
        Math.max(0, Math.round(((x - padding.left) / chartWidth) * (analyticsData.length - 1)))
      );
      
      const dataPoint = analyticsData[dataIndex];
      
      if (dataPoint) {
        setHoveredPoint({
          x: event.clientX,
          y: event.clientY,
          dataPoint,
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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate current percentages from latest data point
  const currentPercentages = useMemo(() => {
    if (analyticsData.length === 0) return {};
    const latestData = analyticsData[analyticsData.length - 1];
    return latestData.percentages;
  }, [analyticsData]);

  // Calculate basic insights
  const insights = useMemo(() => {
    if (analyticsData.length === 0 || options.length === 0) {
      return {
        leadingOption: 'N/A',
        volatility: 'Low',
        trend: 'Stable',
        averageVelocity: 0
      };
    }

    const latestData = analyticsData[analyticsData.length - 1];
    const leadingOptionId = Object.keys(latestData.percentages).reduce((a, b) => 
      latestData.percentages[a] > latestData.percentages[b] ? a : b
    );
    const leadingOption = options.find(opt => opt.id === leadingOptionId);

    // Simple trend calculation
    let trend = 'Stable';
    if (analyticsData.length > 1) {
      const prevData = analyticsData[analyticsData.length - 2];
      const currentPerc = latestData.percentages[leadingOptionId] || 0;
      const prevPerc = prevData.percentages[leadingOptionId] || 0;
      const change = currentPerc - prevPerc;
      
      if (change > 2) trend = 'Rising';
      else if (change < -2) trend = 'Falling';
    }

    return {
      leadingOption: leadingOption?.label || 'N/A',
      volatility: 'Medium',
      trend,
      averageVelocity: 0
    };
  }, [analyticsData, options]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className} relative`} ref={containerRef}>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-48 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-lg" style={{ height }}>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
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
      <div className={`${className} relative`} ref={containerRef}>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Analytics Error
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
  if (analyticsData.length === 0 || options.length === 0) {
    return (
      <div className={`${className} relative`} ref={containerRef}>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-8 border border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              No Data Available
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
    <div className={`${className} relative space-y-6`} ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Bet Percentage Trend
            </h3>
          </div>
          {isLive && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
              LIVE
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Updated {formatTime(lastUpdate)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {options.map((option) => {
          const currentPercentage = currentPercentages[option.id] || 0;
          
          return (
            <div key={option.id} className="flex items-center gap-2 bg-white/10 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: option.color }}
              ></div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {option.label}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {currentPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graph */}
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 pointer-events-none max-w-xs"
            style={{
              left: hoveredPoint.x + 10,
              top: hoveredPoint.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {formatDate(hoveredPoint.dataPoint.timestamp)}
            </div>
            <div className="space-y-1.5">
              {options.map((option) => (
                <div key={option.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    ></div>
                    <span className="text-sm">{option.label}:</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {(hoveredPoint.dataPoint.percentages[option.id] || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
              <div className="text-xs flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Total Pool:</span>
                <span className="font-medium">{formatCurrency(hoveredPoint.dataPoint.totalPool)}</span>
              </div>
              <div className="text-xs flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Participants:</span>
                <span className="font-medium">{hoveredPoint.dataPoint.participantCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Leading Option</span>
          </div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 truncate">
            {insights.leadingOption}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Market Trend</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {insights.trend}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Data Points</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {analyticsData.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAnalyticsGraph;