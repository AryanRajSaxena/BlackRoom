import React, { useState } from 'react';
import { X, Trophy, AlertTriangle, DollarSign, Users, Calculator } from 'lucide-react';
import { Event } from '../../types';

interface DeclareResultModalProps {
  event: Event;
  onClose: () => void;
  onDeclareResult: (eventId: string, winningOptionId: string) => void;
}

export const DeclareResultModal: React.FC<DeclareResultModalProps> = ({
  event,
  onClose,
  onDeclareResult
}) => {
  const [selectedWinningOption, setSelectedWinningOption] = useState<string>('');
  const [isDeclaring, setIsDeclaring] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePayouts = () => {
    if (!selectedWinningOption) return null;

    const winningOption = event.options.find(opt => opt.id === selectedWinningOption);
    if (!winningOption) return null;

    const totalPool = event.totalPool;
    const houseEdge = 0.15; // 15%
    const houseAmount = totalPool * houseEdge;
    const availableForDistribution = totalPool - houseAmount; // 85% of pool
    const winningPool = winningOption.totalBets;
    const losingPool = totalPool - winningPool;

    // Calculate average payout per winning bettor
    const winningBettors = winningOption.bettors;
    const averageWinningBet = winningPool > 0 ? winningPool / winningBettors : 0;
    
    // Each winner gets proportional share of the 85% distribution pool
    const averagePayout = winningPool > 0 ? 
      (averageWinningBet / winningPool) * availableForDistribution : 0;

    return {
      totalPool,
      houseAmount,
      availableForDistribution,
      winningPool,
      losingPool,
      winningBettors,
      averagePayout,
      effectiveMultiplier: averageWinningBet > 0 ? averagePayout / averageWinningBet : 0
    };
  };

  const payoutData = calculatePayouts();

  const handleDeclareResult = async () => {
    if (!selectedWinningOption) return;

    setIsDeclaring(true);
    try {
      await onDeclareResult(event.id, selectedWinningOption);
      onClose();
    } catch (error) {
      console.error('Failed to declare result:', error);
    } finally {
      setIsDeclaring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Declare Result</h2>
                <p className="text-gray-600">Select the winning option for this event</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Event Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pool:</span>
                <span className="font-semibold">{formatCurrency(event.totalPool)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Participants:</span>
                <span className="font-semibold">{event.participantCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">House Edge:</span>
                <span className="font-semibold text-orange-600">15%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">House Amount:</span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(event.totalPool * 0.15)}
                </span>
              </div>
            </div>
          </div>

          {/* Option Selection */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Select Winning Option:</h4>
            <div className="space-y-3">
              {event.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedWinningOption(option.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedWinningOption === option.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">
                        {option.bettors} bettors • {formatCurrency(option.totalBets)} pool
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">
                        {option.odds.toFixed(2)}x
                      </div>
                      <div className="text-sm text-gray-500">current odds</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payout Calculation Preview */}
          {payoutData && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Corrected Payout Calculation Preview
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Pool:</span>
                    <span className="font-semibold">{formatCurrency(payoutData.totalPool)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">House Cut (15%):</span>
                    <span className="font-semibold text-orange-600">
                      -{formatCurrency(payoutData.houseAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Available for Winners:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(payoutData.availableForDistribution)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Winning Bettors:</span>
                    <span className="font-semibold">{payoutData.winningBettors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Avg. Payout:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(payoutData.averagePayout)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Effective Multiplier:</span>
                    <span className="font-semibold text-purple-600">
                      {payoutData.effectiveMultiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                <strong>Formula:</strong> Each winner gets proportional share of 85% pool based on their bet amount
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This action cannot be undone once confirmed</li>
                  <li>15% of total pool will be transferred to admin account</li>
                  <li>Remaining 85% will be distributed proportionally to winning bettors</li>
                  <li>All losing bets will be marked as lost</li>
                  <li>Event status will be changed to "resolved"</li>
                  <li><strong>Total distribution will never exceed the available pool</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclareResult}
              disabled={!selectedWinningOption || isDeclaring}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeclaring ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trophy className="w-5 h-5" />
                  Declare Result
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};