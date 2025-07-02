import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Activity, Clock, BarChart3 } from 'lucide-react';

interface DataPoint {
  timestamp: Date;
  percentages: { [optionId: string]: number };
  totalPool: number;
}

interface LiveAnalyticsGraphProps {
  eventId: string;
  options: Array<{
    id: string;
    label: string;
    totalBets: number;
    color: string;
  }>;
  totalPool: number;
}

export const LiveAnalyticsGraph: React.FC<LiveAnalyticsGraphProps> = ({
  eventId,
  options,
  totalPool
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: any } | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Generate time intervals for last 24 hours
  const generateTimeIntervals = () => {
    const intervals = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      intervals.push(time);
    }
    return intervals;
  };

  // Simulate real-time data updates
  useEffect(() => {
    const updateData = () => {
      const now = new Date();
      const currentPercentages: { [optionId: string]: number } = {};
      
      // Calculate current percentages
      if (totalPool > 0) {
        options.forEach(option => {
          currentPercentages[option.id] = (option.totalBets / totalPool) * 100;
        });
      } else {
        options.forEach(option => {
          currentPercentages[option.id] = 50; // Default split for new events
        });
      }

      const newDataPoint: DataPoint = {
        timestamp: now,
        percentages: currentPercentages,
        totalPool
      };

      setDataPoints(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 24 hours of data
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return updated.filter(point => point.timestamp >= cutoff);
      });
    };

    // Initial data generation for demo
    if (dataPoints.length === 0) {
      const intervals = generateTimeIntervals();
      const initialData = intervals.map(time => {
        const basePercentages: { [optionId: string]: number } = {};
        options.forEach((option, index) => {
          // Simulate historical data with some variation
          const base = 50 + (Math.sin(time.getTime() / 1000000) * 20);
          const variation = Math.random() * 10 - 5;
          basePercentages[option.id] = Math.max(10, Math.min(90, base + variation));
        });
        
        // Normalize to 100%
        const total = Object.values(basePercentages).reduce((sum, val) => sum + val, 0);
        Object.keys(basePercentages).forEach(key => {
          basePercentages[key] = (basePercentages[key] / total) * 100;
        });

        return {
          timestamp: time,
          percentages: basePercentages,
          totalPool: Math.random() * 50000 + 10000
        };
      });
      setDataPoints(initialData);
    }

    updateData();
    const interval = setInterval(updateData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [options, totalPool]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 40, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas with dark background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#333333';
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
    ctx.fillStyle = '#888888';
    ctx.font = '12px Inter, sans-serif';
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
      const label = hoursAgo === 0 ? 'Now' : `${hoursAgo}h ago`;
      ctx.fillText(label, x, height - 10);
    }

    // Draw data lines with gradients
    options.forEach((option, optionIndex) => {
      if (dataPoints.length < 2) return;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, option.color + '40'); // 25% opacity
      gradient.addColorStop(1, option.color + '10'); // 6% opacity

      // Draw filled area
      ctx.beginPath();
      dataPoints.forEach((point, index) => {
        const x = padding.left + (chartWidth * index) / (dataPoints.length - 1);
        const percentage = point.percentages[option.id] || 0;
        const y = padding.top + chartHeight - (chartHeight * percentage) / 100;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      // Close the path for filling
      const lastX = padding.left + chartWidth;
      const firstX = padding.left;
      ctx.lineTo(lastX, padding.top + chartHeight);
      ctx.lineTo(firstX, padding.top + chartHeight);
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      dataPoints.forEach((point, index) => {
        const x = padding.left + (chartWidth * index) / (dataPoints.length - 1);
        const percentage = point.percentages[option.id] || 0;
        const y = padding.top + chartHeight - (chartHeight * percentage) / 100;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.strokeStyle = option.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw animated points
      dataPoints.forEach((point, index) => {
        const x = padding.left + (chartWidth * index) / (dataPoints.length - 1);
        const percentage = point.percentages[option.id] || 0;
        const y = padding.top + chartHeight - (chartHeight * percentage) / 100;
        
        // Animate the last few points
        if (index >= dataPoints.length - 3) {
          const pulseScale = 1 + Math.sin(animationFrame * 0.1 + optionIndex) * 0.2;
          ctx.beginPath();
          ctx.arc(x, y, 4 * pulseScale, 0, Math.PI * 2);
          ctx.fillStyle = option.color;
          ctx.fill();
          
          // Outer ring
          ctx.beginPath();
          ctx.arc(x, y, 6 * pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = option.color + '60';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    // Draw axes
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

  }, [dataPoints, options, animationFrame]);

  // Handle mouse interactions for tooltips
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padding = { top: 20, right: 40, bottom: 40, left: 50 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Check if mouse is within chart area
    if (x >= padding.left && x <= padding.left + chartWidth && 
        y >= padding.top && y <= padding.top + chartHeight) {
      
      // Find closest data point
      const dataIndex = Math.round(((x - padding.left) / chartWidth) * (dataPoints.length - 1));
      const dataPoint = dataPoints[dataIndex];
      
      if (dataPoint) {
        setHoveredPoint({
          x: event.clientX,
          y: event.clientY,
          data: dataPoint
        });
      }
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Live Betting Trends (24H)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: option.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {option.label}
            </span>
            <span className="text-xs text-gray-500">
              {dataPoints.length > 0 && dataPoints[dataPoints.length - 1]?.percentages[option.id]
                ? `${dataPoints[dataPoints.length - 1].percentages[option.id].toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
        ))}
      </div>

      {/* Graph Container */}
      <div className="relative bg-gray-900 rounded-xl p-4 border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-80 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-xl border border-gray-600 pointer-events-none"
            style={{
              left: hoveredPoint.x + 10,
              top: hoveredPoint.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-xs text-gray-300 mb-1">
              {formatTime(hoveredPoint.data.timestamp)}
            </div>
            <div className="space-y-1">
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
                    {hoveredPoint.data.percentages[option.id]?.toFixed(1) || '0'}%
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-600 mt-2 pt-2 text-xs text-gray-300">
              Total Pool: {formatCurrency(hoveredPoint.data.totalPool)}
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Trend</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {dataPoints.length >= 2 ? 
              (dataPoints[dataPoints.length - 1]?.percentages[options[0]?.id] > 
               dataPoints[dataPoints.length - 2]?.percentages[options[0]?.id] ? '↗ Rising' : '↘ Falling')
              : 'Stable'
            }
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Last Update</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {dataPoints.length > 0 ? formatTime(dataPoints[dataPoints.length - 1].timestamp) : 'N/A'}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Volatility</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {dataPoints.length >= 5 ? 
              (Math.max(...dataPoints.slice(-5).map(p => Math.max(...Object.values(p.percentages)))) - 
               Math.min(...dataPoints.slice(-5).map(p => Math.min(...Object.values(p.percentages))))).toFixed(1) + '%'
              : 'Low'
            }
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Data Points</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {dataPoints.length}
          </div>
        </div>
      </div>
    </div>
  );
};