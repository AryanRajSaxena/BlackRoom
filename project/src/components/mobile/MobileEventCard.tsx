import React from 'react';
import { Clock, Users, Trophy, TrendingUp, Zap, Star } from 'lucide-react';
import { Event } from '../../types';

interface MobileEventCardProps {
  event: Event;
  userBet?: {
    amount: number;
    optionId: string;
    status: 'active' | 'won' | 'lost';
    payout?: number;
  } | null;
  onBet: (event: Event) => void;
  isAdmin?: boolean;
}

export const MobileEventCard: React.FC<MobileEventCardProps> = ({
  event,
  userBet,
  onBet,
  isAdmin = false
}) => {
  const timeLeft = Math.max(0, event.expiresAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Weather: 'from-blue-500 to-cyan-500',
      Cryptocurrency: 'from-orange-500 to-yellow-500',
      Sports: 'from-green-500 to-emerald-500',
      Technology: 'from-purple-500 to-indigo-500',
      Finance: 'from-indigo-500 to-blue-500',
      Politics: 'from-red-500 to-pink-500',
      Entertainment: 'from-pink-500 to-purple-500'
    };
    return colors[category as keyof typeof colors] || 'from-gray-500 to-slate-500';
  };

  const getUserBetOption = () => {
    if (!userBet) return null;
    return event.options.find(opt => opt.id === userBet.optionId);
  };

  const userBetOption = getUserBetOption();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
      {/* Header with Category and Status */}
      <div className={`bg-gradient-to-r ${getCategoryColor(event.category)} p-4 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
              {event.category}
            </span>
            <div className="flex items-center gap-2">
              {userBet && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  userBet.status === 'active' ? 'bg-blue-100/90 text-blue-800' :
                  userBet.status === 'won' ? 'bg-green-100/90 text-green-800' :
                  'bg-gray-100/90 text-gray-800'
                }`}>
                  {userBet.status === 'active' ? 'BETTING' : 
                   userBet.status === 'won' ? 'WON' : 'LOST'}
                </span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                event.status === 'active' ? 'bg-green-100/90 text-green-800' : 
                'bg-gray-100/90 text-gray-800'
              }`}>
                {event.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-bold leading-tight mb-2 line-clamp-2">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm opacity-90">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {event.status === 'resolved' ? 'Resolved' :
                 hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : 
                 minutesLeft > 0 ? `${minutesLeft}m left` : 'Expired'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.participantCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Display */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(event.totalPool)}
            </div>
            <div className="text-sm text-emerald-600 dark:text-emerald-500">Total Pool</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(event.totalPool * 0.85)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500">Available (85%)</div>
          </div>
        </div>
      </div>

      {/* User Bet Info (if exists) */}
      {userBet && userBetOption && (
        <div className={`p-4 border-b border-slate-200/50 dark:border-slate-700/50 ${
          userBet.status === 'won' ? 'bg-green-50 dark:bg-green-900/20' :
          userBet.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/20' :
          'bg-gray-50 dark:bg-gray-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Bet</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {userBetOption.label}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {formatCurrency(userBet.amount)} bet
              </div>
            </div>
            {userBet.status === 'won' && userBet.payout && (
              <div className="text-right">
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(userBet.payout)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-500">Won!</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Options Preview */}
      <div className="p-4">
        <div className="space-y-3">
          {event.options.slice(0, 2).map((option) => {
            const isWinningOption = event.winningOption === option.id;
            const isUserOption = userBet?.optionId === option.id;
            
            return (
              <div 
                key={option.id} 
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  isWinningOption ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-600' :
                  isUserOption ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600' :
                  'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {option.label}
                    </span>
                    {isWinningOption && <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />}
                    {isUserOption && !isWinningOption && (
                      <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {option.bettors} bets • {formatCurrency(option.totalBets)}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {option.odds.toFixed(2)}x
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">odds</div>
                </div>
              </div>
            );
          })}

          {event.options.length > 2 && (
            <div className="text-center text-xs py-2 text-slate-500 dark:text-slate-400">
              +{event.options.length - 2} more options
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 pt-0">
        <button
          onClick={() => onBet(event)}
          disabled={event.status !== 'active' || timeLeft <= 0}
          className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-lg"
        >
          {event.status !== 'active' ? 'Event Closed' : 
           timeLeft <= 0 ? 'Expired' : 
           userBet && event.status === 'active' ? 'Update Bet' : 'Place Bet'}
        </button>
      </div>
    </div>
  );
};