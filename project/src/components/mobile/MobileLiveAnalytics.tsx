import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  BarChart3, 
  PieChart,
  DollarSign,
  Users
} from 'lucide-react';
import { Event } from '../../types';

interface MobileLiveAnalyticsProps {
  event: Event;
}

export const MobileLiveAnalytics: React.FC<MobileLiveAnalyticsProps> = ({ event }) => {
  const [animationFrame, setAnimationFrame] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Animation loop for live effects
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Calculate percentages and analytics
  const calculateAnalytics = () => {
    const totalPool = event.totalPool || 1;
    const availablePool = totalPool * 0.85; // 85% available pool
    
    return event.options.map((option, index) => ({
      ...option,
      percentage: totalPool > 0 ? (option.totalBets / totalPool) * 100 : 0,
      availablePercentage: availablePool > 0 ? (option.totalBets / availablePool) * 100 : 0,
      color: getOptionColor(index)
    }));
  };

  const getOptionColor = (index: number) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };

  const analytics = calculateAnalytics();
  const availablePool = event.totalPool * 0.85;

  return (
    <div className="space-y-6">
      {/* Live Pool Distribution Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-500" />
          Live Pool Distribution
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-auto"></div>
        </h4>
        
        {/* Mobile-friendly bar chart */}
        <div className="space-y-3">
          {analytics.map((option) => (
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
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {option.percentage.toFixed(1)}%
                </span>
              </div>
              
              {/* Animated progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out relative"
                  style={{ 
                    width: `${option.percentage}%`,
                    backgroundColor: option.color
                  }}
                >
                  {/* Animated shine effect */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse"
                    style={{ 
                      animationDelay: `${Math.sin(animationFrame * 0.02) * 500}ms`,
                      animationDuration: '2s'
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{formatCurrency(option.totalBets)}</span>
                <span>{option.bettors} bets</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pool Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Pool Breakdown
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(event.totalPool)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Pool</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(availablePool)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Available (85%)</div>
          </div>
          
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(event.totalPool * 0.15)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">House Edge (15%)</div>
          </div>
          
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {event.participantCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Bettors</div>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          Live Statistics
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Most Popular</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {analytics.reduce((max, option) => 
                option.percentage > max.percentage ? option : max, analytics[0]
              )?.label || 'N/A'}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Last Update</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Just now
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Volatility</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {analytics.length > 1 ? 
                (Math.max(...analytics.map(a => a.percentage)) - 
                 Math.min(...analytics.map(a => a.percentage))).toFixed(1) + '%'
                : 'Low'
              }
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Avg Bet</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {event.participantCount > 0 ? 
                formatCurrency(event.totalPool / event.participantCount) : 
                formatCurrency(0)
              }
            </div>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Live Data • Updates every 30s
          </span>
        </div>
      </div>
    </div>
  );
};