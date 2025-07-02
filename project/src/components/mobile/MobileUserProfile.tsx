import React from 'react';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet, 
  Target, 
  Award,
  Flame,
  Star,
  Trophy,
  Zap
} from 'lucide-react';
import { User as UserType, Bet } from '../../types';

interface MobileUserProfileProps {
  user: UserType & { netPL?: number };
  userBets: Bet[];
}

export const MobileUserProfile: React.FC<MobileUserProfileProps> = ({ user, userBets }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const activeBets = userBets.filter(bet => bet.status === 'active');
  const wonBets = userBets.filter(bet => bet.status === 'won');
  const resolvedBets = userBets.filter(bet => bet.status === 'won' || bet.status === 'lost');
  
  const totalActiveBetAmount = activeBets.reduce((sum, bet) => sum + bet.amount, 0);
  const winRate = resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0;
  const netPL = user.netPL || 0;

  // Calculate current streak
  const calculateStreak = () => {
    const sortedBets = resolvedBets.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
    let streak = 0;
    for (const bet of sortedBets) {
      if (bet.status === 'won') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-blue-100">
              {user.isAdmin ? 'Event Creator' : 'Prediction Master'}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold">{user.totalBets}</div>
            <div className="text-sm text-blue-100">Total Bets</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-100">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Balance</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(user.balance)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              netPL >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              {netPL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Net P&L</div>
              <div className={`text-xl font-bold ${
                netPL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {netPL >= 0 ? '+' : ''}{formatCurrency(netPL)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Winnings</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(user.totalWinnings)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Streak</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {currentStreak}
                {currentStreak >= 3 && <span className="text-sm ml-1">🔥</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Bets ({activeBets.length})
          </h3>
          
          <div className="space-y-3">
            {activeBets.slice(0, 3).map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    Event #{bet.eventId.slice(-4)}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Placed {bet.placedAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(bet.amount)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Active</div>
                </div>
              </div>
            ))}
            
            {activeBets.length > 3 && (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                +{activeBets.length - 3} more active bets
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-blue-800 dark:text-blue-300 font-medium">Total Active Amount:</span>
              <span className="text-blue-900 dark:text-blue-100 font-bold">
                {formatCurrency(totalActiveBetAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {currentStreak >= 3 && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">You're on Fire! 🔥</h3>
              <p className="text-yellow-100">
                {currentStreak} wins in a row! Keep the momentum going!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Motivational Message */}
      {user.totalBets === 0 ? (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white text-center shadow-xl">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Ready to Start Winning?</h3>
          <p className="text-blue-100">
            Place your first bet and join thousands of successful predictors!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50 text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {netPL >= 0 ? 'Great Performance!' : 'Keep Going!'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {netPL >= 0 
              ? `You're up ${formatCurrency(netPL)}! Find your next winning opportunity.`
              : 'Every expert was once a beginner. Your next bet could be the winner!'
            }
          </p>
        </div>
      )}
    </div>
  );
};