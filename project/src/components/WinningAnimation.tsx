import React, { useEffect, useState } from 'react';
import { Trophy, Star, Sparkles, Gift, Zap } from 'lucide-react';

interface WinningAnimationProps {
  isVisible: boolean;
  onClose: () => void;
  winAmount: number;
  eventTitle: string;
  streak?: number;
}

export const WinningAnimation: React.FC<WinningAnimationProps> = ({
  isVisible,
  onClose,
  winAmount,
  eventTitle,
  streak = 0
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      setAnimationPhase(1);
      
      const timer1 = setTimeout(() => setAnimationPhase(2), 500);
      const timer2 = setTimeout(() => setAnimationPhase(3), 1500);
      const timer3 = setTimeout(() => setAnimationPhase(4), 3000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getStreakMessage = () => {
    if (streak <= 1) return null;
    if (streak >= 10) return "LEGENDARY STREAK! 🏆";
    if (streak >= 5) return "AMAZING STREAK! 🔥";
    if (streak >= 3) return "HOT STREAK! ⚡";
    return "WIN STREAK! 🎯";
  };

  const streakMessage = getStreakMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      {/* Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      {/* Main Animation Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 opacity-10"></div>
        
        <div className="relative p-8 text-center">
          {/* Phase 1: Trophy Animation */}
          {animationPhase >= 1 && (
            <div className={`transition-all duration-1000 ${
              animationPhase >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}>
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Trophy className="w-12 h-12 text-white animate-bounce" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center animate-spin">
                  <Star className="w-4 h-4 text-yellow-700" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-orange-300 rounded-full flex items-center justify-center animate-ping">
                  <Sparkles className="w-3 h-3 text-orange-700" />
                </div>
              </div>
            </div>
          )}

          {/* Phase 2: Congratulations Text */}
          {animationPhase >= 2 && (
            <div className={`transition-all duration-1000 ${
              animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-2">
                🎉 YOU WON! 🎉
              </h1>
              
              {streakMessage && (
                <div className="mb-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border-2 border-orange-300">
                  <div className="text-lg font-bold text-orange-800 animate-pulse">
                    {streakMessage}
                  </div>
                  <div className="text-sm text-orange-700">
                    {streak} wins in a row!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 3: Win Amount */}
          {animationPhase >= 3 && (
            <div className={`transition-all duration-1000 ${
              animationPhase >= 3 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}>
              <div className="mb-6 p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl border-2 border-green-300">
                <div className="text-sm text-green-700 mb-2">You won</div>
                <div className="text-5xl font-extrabold text-green-800 animate-pulse">
                  {formatCurrency(winAmount)}
                </div>
                <div className="text-sm text-green-600 mt-2">Added to your balance!</div>
              </div>
              
              <div className="text-gray-700 mb-6">
                <div className="text-sm text-gray-600 mb-1">Event:</div>
                <div className="font-semibold text-gray-900 line-clamp-2">
                  {eventTitle}
                </div>
              </div>
            </div>
          )}

          {/* Phase 4: Action Buttons */}
          {animationPhase >= 4 && (
            <div className={`transition-all duration-1000 ${
              animationPhase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="space-y-3">
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Continue Betting! 🚀
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-xl transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Elements */}
        <div className="absolute top-4 left-4 animate-bounce" style={{ animationDelay: '0.5s' }}>
          <Gift className="w-6 h-6 text-yellow-500" />
        </div>
        <div className="absolute top-4 right-4 animate-bounce" style={{ animationDelay: '1s' }}>
          <Zap className="w-6 h-6 text-orange-500" />
        </div>
        <div className="absolute bottom-4 left-4 animate-bounce" style={{ animationDelay: '1.5s' }}>
          <Star className="w-6 h-6 text-yellow-500" />
        </div>
        <div className="absolute bottom-4 right-4 animate-bounce" style={{ animationDelay: '2s' }}>
          <Sparkles className="w-6 h-6 text-orange-500" />
        </div>
      </div>
    </div>
  );
};