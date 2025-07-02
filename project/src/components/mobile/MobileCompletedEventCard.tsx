import React from 'react';
import { Clock, Users, Trophy, CheckCircle, Star } from 'lucide-react';
import { Event, Bet } from '../../types';

interface MobileCompletedEventCardProps {
  event: Event;
  userBet?: Bet | null;
  onEventClick: (event: Event) => void;
  isAdmin?: boolean;
}

export const MobileCompletedEventCard: React.FC<MobileCompletedEventCardProps> = ({
  event,
  userBet,
  onEventClick,
  isAdmin = false
}) => {
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

  const getUserBetStatus = () => {
    if (!userBet) return 'no_bet';
    if (event.winningOption && userBet.optionId === event.winningOption) {
      return 'won';
    } else if (event.winningOption) {
      return 'lost';
    }
    return userBet.status === 'won' ? 'won' : 'lost';
  };

  const getWinningOption = () => {
    return event.options.find(opt => opt.id === event.winningOption);
  };

  const betStatus = getUserBetStatus();
  const isWinner = betStatus === 'won';
  const winningOption = getWinningOption();
  const userProfit = userBet && userBet.payout ? userBet.payout : 0;

  return (
    <div
      onClick={() => onEventClick(event)}
      className={`relative rounded-xl shadow-md border overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-95 cursor-pointer ${
        betStatus === 'no_bet'
          ? 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
          : isWinner
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-600'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
      }`}
    >
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Star className="w-3 h-3" />
            WON
          </div>
        </div>
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
          {userBet && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isWinner
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
            }`}>
              {isWinner ? '🏆 WON' : 'LOST'}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
          {event.title}
        </h3>

        {/* User's Result */}
        {userBet ? (
          <div className={`rounded-lg p-3 mb-3 ${
            isWinner
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
          }`}>
            <div className="text-center">
              <div className="text-lg font-bold">
                {isWinner ? formatCurrency(userProfit) : formatCurrency(0)}
              </div>
              {isWinner && (
                <div className="text-xs opacity-90 mt-1">
                  🎉 Congratulations!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-center mb-3">
            <div className="text-slate-600 dark:text-slate-400 text-xs">
              No bet placed
            </div>
          </div>
        )}

        {/* Winning Result */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Trophy className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-900 dark:text-purple-300">Result</span>
          </div>
          <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
            {winningOption?.label || 'Result not available'}
          </div>
        </div>

        {/* Event Stats */}
        <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Resolved</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{event.participantCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};