import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star, 
  Flame, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Target,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  BarChart3,
  Activity,
  Zap,
  Gift,
  Share2,
  UserPlus,
  Eye,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Gem,
  Shield
} from 'lucide-react';
import { User } from '../types';
import { getLeaderboard, getUserRank, LeaderboardUser, getTierInfo } from '../services/leaderboard';

interface LeaderboardProps {
  currentUser: User;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser }) => {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total_winnings' | 'weekly_earnings' | 'monthly_earnings' | 'current_streak'>('total_winnings'); // Changed default
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardUser | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; totalUsers: number; percentile: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingRanks, setAnimatingRanks] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const tierInfo = getTierInfo();

  const getTierConfig = (tier: string) => {
    const info = tierInfo[tier as keyof typeof tierInfo];
    if (!info) return tierInfo.Bronze;

    switch (tier) {
      case 'Master':
        return {
          gradient: 'from-indigo-500 via-purple-500 to-blue-600',
          bgGradient: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
          borderColor: 'border-indigo-300 dark:border-indigo-600',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          icon: <Shield className="w-4 h-4" />,
          aura: true
        };
      case 'Diamond':
        return {
          gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
          bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
          borderColor: 'border-cyan-300 dark:border-cyan-600',
          textColor: 'text-cyan-700 dark:text-cyan-300',
          icon: <Gem className="w-4 h-4" />,
          sparkle: true
        };
      case 'Platinum':
        return {
          gradient: 'from-gray-300 via-gray-400 to-gray-600',
          bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
          borderColor: 'border-gray-300 dark:border-gray-600',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: <Crown className="w-4 h-4" />,
          glow: true
        };
      case 'Gold':
        return {
          gradient: 'from-yellow-400 via-orange-400 to-orange-600',
          bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20',
          borderColor: 'border-yellow-300 dark:border-yellow-600',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          icon: <Trophy className="w-4 h-4" />,
          shine: true
        };
      case 'Silver':
        return {
          gradient: 'from-gray-200 via-gray-300 to-gray-500',
          bgGradient: 'from-gray-50 to-slate-100 dark:from-gray-800/20 dark:to-slate-800/20',
          borderColor: 'border-gray-200 dark:border-gray-600',
          textColor: 'text-gray-600 dark:text-gray-400',
          icon: <Medal className="w-4 h-4" />,
          metallic: true
        };
      case 'Bronze':
        return {
          gradient: 'from-orange-300 via-amber-400 to-orange-600',
          bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
          borderColor: 'border-orange-200 dark:border-orange-600',
          textColor: 'text-orange-600 dark:text-orange-400',
          icon: <Award className="w-4 h-4" />
        };
      default:
        return {
          gradient: 'from-gray-300 to-gray-500',
          bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20',
          borderColor: 'border-gray-200 dark:border-gray-600',
          textColor: 'text-gray-600 dark:text-gray-400',
          icon: <Star className="w-4 h-4" />
        };
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500 animate-pulse" />;
    if (rank === 2) return <Trophy className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500" />;
    return null;
  };

  const getRankChange = (player: LeaderboardUser) => {
    // For now, we'll simulate rank changes
    const change = Math.floor(Math.random() * 6) - 3; // Random change between -3 and +3
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ArrowUp className="w-3 h-3" />
          <span className="text-xs font-medium">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <ArrowDown className="w-3 h-3" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
        <span className="text-xs">—</span>
      </div>
    );
  };

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const [leaderboardData, rankData] = await Promise.all([
          getLeaderboard(100, 0, sortBy),
          getUserRank(currentUser.id)
        ]);
        
        setPlayers(leaderboardData);
        setUserRank(rankData);
        
        setTimeout(() => {
          const changingRanks = new Set(leaderboardData.slice(0, 10).map(p => p.id));
          setAnimatingRanks(changingRanks);
          setTimeout(() => setAnimatingRanks(new Set()), 2000);
        }, 1000);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [currentUser.id, sortBy]);

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top10Players = filteredPlayers.slice(0, 10);
  const remainingPlayers = filteredPlayers.slice(10);

  const handlePlayerClick = (player: LeaderboardUser) => {
    setSelectedPlayer(player);
    if (player.rank_position <= 3) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  // Top 10 Player Card Component
  const TopPlayerCard: React.FC<{ player: LeaderboardUser; index: number }> = ({ player, index }) => {
    const isTop3 = player.rank_position <= 3;
    const isAnimating = animatingRanks.has(player.id);
    const tierConfig = getTierConfig(player.tier);
    
    return (
      <div
        className={`relative group cursor-pointer transition-all duration-500 ${
          isAnimating ? 'animate-pulse scale-105' : 'hover:scale-105'
        } ${isTop3 ? 'transform hover:scale-110' : ''}`}
        onClick={() => handlePlayerClick(player)}
      >
        <div className={`
          relative overflow-hidden rounded-2xl border-2 transition-all duration-300 shadow-xl
          ${isTop3 
            ? `bg-gradient-to-br ${tierConfig.gradient} p-[3px] shadow-2xl` 
            : `bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ${tierConfig.borderColor} hover:shadow-2xl`
          }
        `}>
          {/* Special Effects for Top Tiers */}
          {tierConfig.aura && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-600/20 animate-pulse rounded-2xl"></div>
          )}
          {tierConfig.sparkle && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse opacity-30"></div>
          )}
          {tierConfig.glow && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-300/10 via-white/20 to-gray-300/10 animate-pulse rounded-2xl"></div>
          )}
          
          <div className={`
            relative p-6 rounded-2xl transition-all duration-300
            ${isTop3 
              ? 'bg-white dark:bg-slate-900' 
              : `${tierConfig.bgGradient} backdrop-blur-sm group-hover:bg-white/90 dark:group-hover:bg-slate-800/90`
            }
          `}>
            {/* Rank and Change */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`
                  relative flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl
                  ${isTop3 
                    ? `bg-gradient-to-br ${tierConfig.gradient} text-white shadow-lg` 
                    : `bg-slate-100 dark:bg-slate-700 ${tierConfig.textColor}`
                  }
                `}>
                  {getRankIcon(player.rank_position) || player.rank_position}
                  {isTop3 && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  )}
                </div>
                {getRankChange(player)}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`
                  px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1
                  bg-gradient-to-r ${tierConfig.gradient} text-white shadow-md
                `}>
                  {tierConfig.icon}
                  {player.tier}
                </div>
                {player.is_verified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </div>
                {(player.current_streak || 0) > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Flame className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {player.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Member since {new Date(player.created_at).getFullYear()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {player.total_bets > 0 ? ((player.total_winnings / (player.total_bets * 1000)) * 100).toFixed(1) : 0}% win rate
                  </span>
                </div>
              </div>
            </div>

            {/* Money Earned Display (Bold) - Replacing Points */}
            <div className="mb-4">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                <strong>{formatCurrency(player.total_winnings)}</strong>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <strong>money earned</strong>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-slate-50/80 dark:bg-slate-700/80 rounded-lg">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {player.current_streak || 0}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Streak</div>
              </div>
              <div className="text-center p-3 bg-slate-50/80 dark:bg-slate-700/80 rounded-lg">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {player.total_bets}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Bets</div>
              </div>
              <div className="text-center p-3 bg-slate-50/80 dark:bg-slate-700/80 rounded-lg">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(player.weekly_earnings || 0)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">This Week</div>
              </div>
            </div>

            {/* Achievements */}
            {player.achievements && player.achievements.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {player.achievements.slice(0, 3).map((achievement, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                  >
                    {achievement}
                  </span>
                ))}
                {player.achievements.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                    +{player.achievements.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Remaining Players Bar Component
  const PlayerBar: React.FC<{ player: LeaderboardUser; index: number }> = ({ player, index }) => {
    const tierConfig = getTierConfig(player.tier);
    
    return (
      <div
        className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
        onClick={() => handlePlayerClick(player)}
      >
        <div className={`
          flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
          bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ${tierConfig.borderColor}
          hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-md
        `}>
          {/* Rank */}
          <div className="flex items-center gap-2 min-w-[60px]">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${tierConfig.bgGradient} ${tierConfig.textColor}
            `}>
              {player.rank_position}
            </div>
            {getRankChange(player)}
          </div>

          {/* Avatar */}
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {player.name.split(' ').map(n => n[0]).join('')}
            </div>
            {(player.current_streak || 0) > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                <Flame className="w-2 h-2 text-white" />
              </div>
            )}
          </div>

          {/* Name and Tier */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                {player.name}
              </h4>
              {player.is_verified && (
                <Star className="w-3 h-3 text-blue-500" />
              )}
              <div className={`
                px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1
                bg-gradient-to-r ${tierConfig.gradient} text-white
              `}>
                {tierConfig.icon}
                {player.tier}
              </div>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {player.total_bets > 0 ? ((player.total_winnings / (player.total_bets * 1000)) * 100).toFixed(1) : 0}% win rate • {player.current_streak || 0} streak
            </div>
          </div>

          {/* Money Earned (Bold) */}
          <div className="text-right min-w-[120px]">
            <div className="font-bold text-slate-900 dark:text-white">
              <strong>{formatCurrency(player.total_winnings)}</strong>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <strong>money earned</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading Leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {i % 4 === 0 ? '🎉' : i % 4 === 1 ? '✨' : i % 4 === 2 ? '🎊' : '⭐'}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Blue-Violet Gradient */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                Global Leaderboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Top 100 Prediction Masters
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-2">🏆 Hall of Champions</h2>
            <p className="text-blue-100">
              Compete with the best prediction masters and climb your way to the top!
            </p>
            {userRank && (
              <div className="mt-4 text-center">
                <p className="text-blue-100">
                  Your Rank: <span className="font-bold text-white">#{userRank.rank}</span> out of {userRank.totalUsers} players
                  <span className="text-blue-200 ml-2">(Top {userRank.percentile}%)</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300/60 dark:border-slate-600/60 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 border border-slate-300/60 dark:border-slate-600/60 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white"
              >
                <option value="total_winnings">Money Earned</option>
                <option value="weekly_earnings">Weekly Performance</option>
                <option value="monthly_earnings">Monthly Performance</option>
                <option value="current_streak">Current Streak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top 10 Players Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Top 10 Champions
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {top10Players.map((player, index) => (
              <TopPlayerCard key={player.id} player={player} index={index} />
            ))}
          </div>
        </div>

        {/* Remaining Players Section */}
        {remainingPlayers.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Rising Stars (Ranks 11-100)
              </h2>
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {remainingPlayers.map((player, index) => (
                <PlayerBar key={player.id} player={player} index={index} />
              ))}
            </div>
          </div>
        )}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No players found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search terms
            </p>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedPlayer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      {selectedPlayer.name}
                      {selectedPlayer.is_verified && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </h2>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        Rank #{selectedPlayer.rank_position}
                      </span>
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1
                        bg-gradient-to-r ${getTierConfig(selectedPlayer.tier).gradient} text-white
                      `}>
                        {getTierConfig(selectedPlayer.tier).icon}
                        {selectedPlayer.tier}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl">
                  <div className="text-3xl font-bold">{formatCurrency(selectedPlayer.total_winnings)}</div>
                  <div className="text-green-100">Money Earned</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-xl">
                  <div className="text-3xl font-bold">{selectedPlayer.total_bets}</div>
                  <div className="text-blue-100">Total Bets</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-xl">
                  <div className="text-3xl font-bold">{selectedPlayer.current_streak || 0}</div>
                  <div className="text-orange-100">Current Streak</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-6 rounded-xl">
                  <div className="text-3xl font-bold">{selectedPlayer.total_points?.toLocaleString() || 0}</div>
                  <div className="text-purple-100">Total Points</div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Performance Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Weekly Earnings</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedPlayer.weekly_earnings || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Monthly Earnings</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedPlayer.monthly_earnings || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Longest Streak</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{selectedPlayer.longest_streak || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Current Balance</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(selectedPlayer.balance)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Achievements & Info</h3>
                  <div className="space-y-4">
                    {selectedPlayer.achievements && selectedPlayer.achievements.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Achievements</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayer.achievements.map((achievement, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                            >
                              {achievement}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Member Since</h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {new Date(selectedPlayer.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};