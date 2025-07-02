import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Clock, AlertCircle, Info, BarChart3, PieChart, Activity } from 'lucide-react';
import { Event, BetOption } from '../types';
import { calculateBetReturns, BetCalculation, getBettingHistory, subscribeToOddsUpdates, unsubscribeFromOddsUpdates } from '../services/betting';
import { LiveAnalyticsGraph } from './LiveAnalyticsGraph';

interface BettingModalProps {
  event: Event;
  userBalance: number;
  isAdmin?: boolean;
  onClose: () => void;
  onPlaceBet: (eventId: string, optionId: string, amount: number) => void;
}

interface BettingHistoryPoint {
  timestamp: Date;
  optionId: string;
  optionLabel: string;
  amount: number;
  cumulativePercentage: number;
}

export const BettingModal: React.FC<BettingModalProps> = ({
  event,
  userBalance,
  isAdmin = false,
  onClose,
  onPlaceBet
}) => {
  const [currentEvent, setCurrentEvent] = useState(event);
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isPlacing, setIsPlacing] = useState(false);
  const [betCalculation, setBetCalculation] = useState<BetCalculation | null>(null);
  const [activeTab, setActiveTab] = useState<'bet' | 'analytics'>('bet');
  const [bettingHistory, setBettingHistory] = useState<BettingHistoryPoint[]>([]);
  const [animatedReturn, setAnimatedReturn] = useState<number>(0);
  const [isUpdatingOdds, setIsUpdatingOdds] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Subscribe to real-time odds updates
  useEffect(() => {
    if (currentEvent.status === 'active') {
      const subscription = subscribeToOddsUpdates(currentEvent.id, (updatedOptions) => {
        console.log(`[BettingModal] Received odds update for event ${currentEvent.id}:`, updatedOptions);
        setCurrentEvent(prev => ({
          ...prev,
          options: updatedOptions.map(opt => ({
            id: opt.id,
            label: opt.label,
            odds: opt.odds,
            totalBets: opt.total_bets || 0,
            bettors: opt.bettors || 0
          }))
        }));
        setIsUpdatingOdds(true);
        setTimeout(() => setIsUpdatingOdds(false), 1000); // Flash effect
      });

      return () => {
        unsubscribeFromOddsUpdates(subscription);
      };
    }
  }, [currentEvent.id, currentEvent.status]);

  // Update event when prop changes
  useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  // Load betting history for analytics
  useEffect(() => {
    const loadBettingHistory = async () => {
      try {
        const history = await getBettingHistory(currentEvent.id);
        const processedHistory: BettingHistoryPoint[] = [];
        let runningTotals: { [optionId: string]: number } = {};
        let totalAmount = 0;

        history.forEach((bet: any) => {
          const optionId = bet.option_id;
          const amount = bet.amount;
          runningTotals[optionId] = (runningTotals[optionId] || 0) + amount;
          totalAmount += amount;
          const percentage = totalAmount > 0 ? (runningTotals[optionId] / totalAmount) * 100 : 0;
          processedHistory.push({
            timestamp: new Date(bet.placed_at),
            optionId: optionId,
            optionLabel: bet.bet_options.label,
            amount: amount,
            cumulativePercentage: percentage
          });
        });

        setBettingHistory(processedHistory);
      } catch (error) {
        console.error('Failed to load betting history:', error);
      }
    };

    if (activeTab === 'analytics') {
      loadBettingHistory();
    }
  }, [currentEvent.id, activeTab]);

  // Calculate percentage distribution for analytics
  const calculatePercentages = () => {
    const totalPool = currentEvent.totalPool || 1;
    const availablePool = totalPool * 0.85; // 85% available pool
    return currentEvent.options.map(option => ({
      ...option,
      percentage: totalPool > 0 ? (option.totalBets / totalPool) * 100 : 0,
      availablePercentage: availablePool > 0 ? (option.totalBets / availablePool) * 100 : 0,
      color: getOptionColor(option.id)
    }));
  };

  const getOptionColor = (optionId: string) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    const index = currentEvent.options.findIndex(opt => opt.id === optionId);
    return colors[index % colors.length];
  };

  // Calculate dynamic odds for display (consistent with EventCard)
  const getDisplayOdds = (option: any, testBetAmount: number = 100) => {
    try {
      const calculation = calculateBetReturns(currentEvent, option.id, testBetAmount, isAdmin);
      return calculation.effectiveOdds;
    } catch (error) {
      // Fallback to stored odds if calculation fails
      return option.odds;
    }
  };

  // Recalculate returns whenever bet amount or selected option changes
  useEffect(() => {
    if (selectedOption && betAmount > 0) {
      try {
        const calculation = calculateBetReturns(currentEvent, selectedOption.id, betAmount, isAdmin);
        setBetCalculation(calculation);
        console.log(`[BettingModal] Bet calculation for ${betAmount}:`, {
          totalPool: currentEvent.totalPool,
          availablePool: calculation.availablePool,
          effectiveOdds: calculation.effectiveOdds,
          potentialReturn: calculation.potentialReturn
        });
      } catch (error) {
        setBetCalculation(null);
      }
    } else {
      setBetCalculation(null);
    }
  }, [selectedOption, betAmount, currentEvent, isAdmin]);

  // Animate the return value for a smooth, professional effect
  useEffect(() => {
    if (!betCalculation) {
      setAnimatedReturn(0);
      return;
    }
    let frame: number;
    const duration = 350;
    const start = animatedReturn;
    const end = betCalculation.potentialReturn;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedReturn(start + (end - start) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, [betCalculation?.potentialReturn]);

  const handlePlaceBet = async () => {
    if (!selectedOption || betAmount <= 0 || (betAmount > userBalance && !isAdmin)) return;
    setIsPlacing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onPlaceBet(currentEvent.id, selectedOption.id, betAmount);
      onClose();
    } catch (error) {
      // handle error
    } finally {
      setIsPlacing(false);
    }
  };

  const timeLeft = Math.max(0, currentEvent.expiresAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const maxBetAmount = betCalculation?.maxBetAmount || (isAdmin ? Infinity : Math.min(userBalance, 10000));
  const percentages = calculatePercentages();
  const availablePool = currentEvent.totalPool * 0.85;

  // Prepare data for LiveAnalyticsGraph
  const graphOptions = currentEvent.options.map(option => ({
    id: option.id,
    label: option.label,
    totalBets: option.totalBets,
    color: getOptionColor(option.id)
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto border border-blue-100 dark:border-gray-700">
        <div className="p-0 sm:p-8">
          {/* Header with Icon and Close */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full p-2 shadow">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                {currentEvent.title}
                {isUpdatingOdds && (
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full animate-pulse">
                    Live Updates
                  </span>
                )}
              </h4>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Event Info */}
          <div className="px-6 pt-4 pb-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-white via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-t-2xl">
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{currentEvent.description}</p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>
                  {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : 
                    minutesLeft > 0 ? `${minutesLeft}m left` : 'Expired'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>Pool: <span className="font-semibold text-blue-700 dark:text-blue-300">{formatCurrency(currentEvent.totalPool)}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>Available: <span className="font-semibold text-green-700 dark:text-green-300">{formatCurrency(availablePool)}</span> (85%)</span>
              </div>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span>15% House Edge</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 pt-2">
            <button
              onClick={() => setActiveTab('bet')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'bet'
                  ? 'text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              Place Bet
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Live Analytics
            </button>
          </div>

          <div className="px-6 pb-6 pt-4">
            {activeTab === 'bet' ? (
              <>
                {/* Betting Options */}
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Select Your Prediction</h4>
                  <div className="space-y-2">
                    {currentEvent.options.map((option) => {
                      const displayOdds = getDisplayOdds(option, selectedOption?.id === option.id ? betAmount : 100);
                      return (
                        <button
                          key={option.id}
                          onClick={() => setSelectedOption(option)}
                          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between shadow-sm ${
                            selectedOption?.id === option.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400 bg-white dark:bg-gray-700'
                          } ${isUpdatingOdds ? 'ring-2 ring-blue-400 ring-opacity-30' : ''}`}
                          style={{ transition: 'all 0.18s cubic-bezier(.4,2,.6,1)' }}
                        >
                          <div className="text-left">
                            <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {option.bettors} bettors • {formatCurrency(option.totalBets)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-xl transition-all duration-300 ${
                              isUpdatingOdds ? 'text-green-600 dark:text-green-400 scale-110' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {displayOdds.toFixed(2)}x
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">live returns</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bet Amount & Potential Return */}
                {selectedOption && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white text-lg">Bet Amount</span>
                      <span className="font-semibold text-gray-900 dark:text-white text-lg">Potential Return</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Math.max(0, Math.min(maxBetAmount, Number(e.target.value))))}
                        min="1"
                        max={maxBetAmount}
                        className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                        placeholder="Enter bet amount"
                        style={{ minWidth: 120, maxWidth: 200 }}
                      />
                      {selectedOption && betCalculation && (
                        <div
                          className="transition-all duration-300 ease-out bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl shadow-lg font-extrabold text-4xl flex items-center justify-end"
                          style={{
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
                            minWidth: 180,
                            letterSpacing: 1,
                            lineHeight: 1.1,
                          }}
                        >
                          <span
                            style={{
                              transition: 'color 0.3s',
                              color: animatedReturn > betAmount ? '#22c55e' : '#fff',
                              fontSize: '2.5rem',
                            }}
                          >
                            {formatCurrency(Math.round(animatedReturn))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col" style={{ minHeight: 40 }}>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Available: {formatCurrency(userBalance)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Max: {isAdmin ? '∞' : formatCurrency(maxBetAmount)}
                        {!isAdmin && <span className="text-xs text-gray-400 ml-1">(20% of pool)</span>}
                      </div>
                      {betCalculation && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          From available pool: {formatCurrency(betCalculation.availablePool)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      {[100, 500, 1000, 2500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setBetAmount(Math.min(amount, maxBetAmount))}
                          className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors text-gray-900 dark:text-white"
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                    {betAmount > userBalance && !isAdmin && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Insufficient balance</span>
                      </div>
                    )}
                    {betAmount > maxBetAmount && !isAdmin && (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Bet amount exceeds maximum limit (20% of pool)</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Analytics tab with Live Graph
              <div className="space-y-6">
                {/* Live Analytics Graph */}
                <LiveAnalyticsGraph
                  eventId={currentEvent.id}
                  options={graphOptions}
                  totalPool={currentEvent.totalPool}
                />

                {/* Pool Distribution Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Current Pool Distribution (85% Available for Payouts)
                  </h4>
                  <div className="space-y-3">
                    {percentages.map((option) => (
                      <div key={option.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: option.color }}
                          ></div>
                          <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{option.percentage.toFixed(1)}%</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(option.totalBets)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Pool:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(currentEvent.totalPool)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Available for Payouts (85%):</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(availablePool)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">House Edge (15%):</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(currentEvent.totalPool * 0.15)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {activeTab === 'bet' && (
              <div className="flex gap-3 mt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={!selectedOption || betAmount <= 0 || (betAmount > userBalance && !isAdmin) || (betAmount > maxBetAmount && !isAdmin) || isPlacing}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all disabled:cursor-not-allowed font-semibold shadow"
                >
                  {isPlacing ? 'Placing Bet...' : `Place Bet - ${formatCurrency(betAmount)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};