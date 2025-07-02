import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Info, 
  Zap,
  Target,
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';
import { Event, BetOption } from '../../types';
import { calculateBetReturns, BetCalculation } from '../../services/betting';
import { MobileLiveAnalytics } from './MobileLiveAnalytics';

interface MobileBettingModalProps {
  event: Event;
  userBalance: number;
  isAdmin?: boolean;
  onClose: () => void;
  onPlaceBet: (eventId: string, optionId: string, amount: number) => void;
}

export const MobileBettingModal: React.FC<MobileBettingModalProps> = ({
  event,
  userBalance,
  isAdmin = false,
  onClose,
  onPlaceBet
}) => {
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [isPlacing, setIsPlacing] = useState(false);
  const [betCalculation, setBetCalculation] = useState<BetCalculation | null>(null);
  const [animatedReturn, setAnimatedReturn] = useState<number>(0);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'bet' | 'analytics'>('bet');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const timeLeft = Math.max(0, event.expiresAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  // Calculate returns when bet amount or selected option changes
  useEffect(() => {
    if (selectedOption && betAmount > 0) {
      try {
        const calculation = calculateBetReturns(event, selectedOption.id, betAmount, isAdmin);
        setBetCalculation(calculation);
      } catch (error) {
        setBetCalculation(null);
      }
    } else {
      setBetCalculation(null);
    }
  }, [selectedOption, betAmount, event, isAdmin]);

  // Animate the return value
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedReturn(start + (end - start) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [betCalculation?.potentialReturn]);

  const handlePlaceBet = async () => {
    if (!selectedOption || betAmount <= 0) return;
    
    const maxBetAmount = betCalculation?.maxBetAmount || (isAdmin ? Infinity : Math.min(userBalance, 10000));
    
    // Show validation popup for bet limit exceeded
    if ((betAmount > userBalance && !isAdmin) || (betAmount > maxBetAmount && !isAdmin)) {
      setShowValidationPopup(true);
      setTimeout(() => setShowValidationPopup(false), 3000);
      return;
    }

    setIsPlacing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onPlaceBet(event.id, selectedOption.id, betAmount);
      onClose();
    } catch (error) {
      // handle error
    } finally {
      setIsPlacing(false);
    }
  };

  const maxBetAmount = betCalculation?.maxBetAmount || (isAdmin ? Infinity : Math.min(userBalance, 10000));

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center z-50">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-h-[95vh] overflow-hidden transition-colors duration-300 flex flex-col">
          {/* Fixed Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Place Your Bet</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Choose wisely and win big!</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                {event.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : 
                      minutesLeft > 0 ? `${minutesLeft}m left` : 'Expired'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Pool: {formatCurrency(event.totalPool)}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('bet')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'bet'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Place Bet
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'bet' ? (
              <div className="p-4 space-y-6">
                {/* Betting Options - Fixed positioning to prevent overlap */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Select Your Prediction
                  </h4>
                  <div className="space-y-3">
                    {event.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between shadow-sm active:scale-95 ${
                          selectedOption?.id === option.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
                            : 'border-slate-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-400 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="text-left flex-1">
                          <div className="font-medium text-slate-900 dark:text-white mb-1">{option.label}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {option.bettors} bettors • {formatCurrency(option.totalBets)}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-2xl text-green-600 dark:text-green-400">
                            {option.odds.toFixed(2)}x
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">returns</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bet Amount & Potential Return */}
                {selectedOption && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-lg font-semibold text-slate-900 dark:text-white mb-3">
                        Bet Amount
                      </label>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Math.max(0, Math.min(maxBetAmount, Number(e.target.value))))}
                        min="1"
                        max={maxBetAmount}
                        className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        placeholder="Enter bet amount"
                      />
                      
                      <div className="flex gap-2 mt-3">
                        {[100, 500, 1000, 2500].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setBetAmount(Math.min(amount, maxBetAmount))}
                            className="flex-1 py-3 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-xl text-sm font-medium transition-colors text-slate-900 dark:text-white active:scale-95"
                          >
                            ₹{amount}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <div>Available: {formatCurrency(userBalance)}</div>
                      </div>
                    </div>

                    {/* Minimized Potential Return Display */}
                    {betCalculation && (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-xl">
                        <div className="text-center">
                          <div className="text-sm opacity-90 mb-1">Potential Return</div>
                          <div className="text-3xl font-bold">
                            {formatCurrency(Math.round(animatedReturn))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <MobileLiveAnalytics event={event} />
              </div>
            )}
          </div>

          {/* Fixed Action Buttons */}
          {activeTab === 'bet' && (
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 px-6 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={!selectedOption || betAmount <= 0 || isPlacing}
                  className="flex-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl transition-all disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  {isPlacing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Place Bet - {formatCurrency(betAmount)}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Validation Popup */}
      {showValidationPopup && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-down">
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm">
            <AlertCircle className="w-6 h-6" />
            <div>
              <div className="font-semibold">Bet Limit Exceeded</div>
              <div className="text-sm opacity-90">
                {betAmount > userBalance ? 'Insufficient balance' : 'Maximum bet limit reached'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};