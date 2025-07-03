import React, { useState } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Activity, 
  ChevronRight,
  Eye,
  EyeOff,
  Trophy,
  Target,
  Zap,
  Star,
  Users,
  BarChart3,
  Gift,
  Crown,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Clock,
  Award,
  Rocket
} from 'lucide-react';
import { User as UserType, Bet, Event } from '../../types';

interface MobileDashboardProps {
  user: UserType & { netPL?: number };
  userBets: Bet[];
  events: Event[];
  onNavigate: (section: string) => void;
  totalPool?: number;
  totalEvents?: number;
  activeUsers?: number;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  user,
  userBets,
  events,
  onNavigate,
  totalPool = 0,
  totalEvents = 0,
  activeUsers = 0
}) => {
  const [showBalance, setShowBalance] = useState(true);

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
  const netPL = user.netPL || 0;
  const recentWins = wonBets.slice(0, 3);

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
  const winRate = resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0;

  // Get hot events (high activity)
  const hotEvents = events
    .filter(event => event.status === 'active')
    .sort((a, b) => b.participantCount - a.participantCount)
    .slice(0, 3);

  // Get upcoming events ending soon
  const endingSoonEvents = events
    .filter(event => {
      const timeLeft = event.expiresAt.getTime() - Date.now();
      return event.status === 'active' && timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours
    })
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
    .slice(0, 2);

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Header with Balance */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl p-6 text-white shadow-2xl mx-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium opacity-90">Welcome back,</h2>
              <h1 className="text-2xl font-bold">{user.name.split(' ')[0]}! 👋</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm opacity-75 mb-1">Available Balance</div>
            <div className="text-3xl font-bold">
              {showBalance ? formatCurrency(user.balance) : '₹ ••••••'}
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Cards */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Win Streak Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5" />
                <span className="text-sm font-medium">Win Streak</span>
              </div>
              <div className="text-2xl font-bold">
                {currentStreak}
                {currentStreak >= 3 && <span className="text-lg ml-1">🔥</span>}
              </div>
              {currentStreak >= 3 && (
                <div className="text-xs opacity-90 mt-1">You're on fire!</div>
              )}
            </div>
          </div>

          {/* Win Rate Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              {winRate > 60 && (
                <div className="text-xs opacity-90 mt-1">Excellent!</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Wins Section */}
      {recentWins.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Recent Wins 🎉</h3>
                  <p className="text-green-100 text-sm">Your latest victories</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {recentWins.map((bet, index) => (
                <div key={bet.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        Event #{bet.eventId.slice(-4)}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Won on {bet.placedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(bet.payout || 0)}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hot Events Section */}
      {hotEvents.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Hot Events 🔥</h3>
                    <p className="text-orange-100 text-sm">Most popular right now</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('events')}
                  className="text-white hover:text-orange-200 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {hotEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                      {event.title}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.participantCount} bettors
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {formatCurrency(event.totalPool)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('events')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    Bet Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ending Soon Section */}
      {endingSoonEvents.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Ending Soon ⏰</h3>
                    <p className="text-purple-100 text-sm">Last chance to bet</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('events')}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {endingSoonEvents.map((event) => {
                const timeLeft = Math.max(0, event.expiresAt.getTime() - Date.now());
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m left`}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {formatCurrency(event.totalPool)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('events')}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                      Quick Bet
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Bets Section */}
      <div className="px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-5 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your Active Bets</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {activeBets.length} active • {formatCurrency(totalActiveBetAmount)} total
                  </p>
                </div>
              </div>
              {activeBets.length > 0 && (
                <button
                  onClick={() => onNavigate('events')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {activeBets.length > 0 ? (
              <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {activeBets.slice(0, 5).map((bet, index) => (
                  <div key={bet.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            Event #{bet.eventId.slice(-4)}
                          </p>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Placed {bet.placedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(bet.amount)}
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                          Active
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {activeBets.length > 5 && (
                  <div className="p-4 text-center">
                    <button
                      onClick={() => onNavigate('events')}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      View all {activeBets.length} active bets
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Ready for Your Next Win?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  Explore exciting events and make your predictions!
                </p>
                <button
                  onClick={() => onNavigate('events')}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  Discover Events
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Motivational Banner */}
      {netPL > 0 && (
        <div className="mx-4">
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">Profit Master! 🎯</h3>
                <p className="text-green-100 text-sm mb-2">
                  You're up {formatCurrency(netPL)}! Keep the momentum going!
                </p>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">You're in the top performers!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('leaderboard')}
            className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              <div className="text-left">
                <div className="font-bold">Rankings</div>
                <div className="text-sm opacity-90">See top players</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6" />
              <div className="text-left">
                <div className="font-bold">Rewards</div>
                <div className="text-sm opacity-90">Manage wallet</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};