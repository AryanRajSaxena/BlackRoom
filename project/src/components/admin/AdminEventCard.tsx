import React, { useState } from 'react';
import { 
  Clock, 
  Users, 
  Edit3, 
  Trash2, 
  Trophy, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Settings
} from 'lucide-react';
import { Event } from '../../types';
import { calculateBetReturns } from '../../services/betting';

interface AdminEventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onDeclareResult: (event: Event) => void;
}

export const AdminEventCard: React.FC<AdminEventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onDeclareResult
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const timeLeft = Math.max(0, event.expiresAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const getCategoryColor = (category: string) => {
    const colors = {
      Weather: 'bg-blue-500',
      Cryptocurrency: 'bg-orange-500',
      Sports: 'bg-green-500',
      Technology: 'bg-purple-500',
      Finance: 'bg-indigo-500',
      Politics: 'bg-red-500',
      Entertainment: 'bg-pink-500'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = event.status === 'active';
  const canDelete = event.status === 'active' && event.totalPool === 0;
  const canDeclareResult = event.status === 'active' && timeLeft <= 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
              {event.status.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(event)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Event"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {canDeclareResult && (
              <button
                onClick={() => onDeclareResult(event)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Declare Result"
              >
                <Trophy className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {event.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Pool and Stats */}
        <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg p-4 text-white mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{formatCurrency(event.totalPool)}</div>
              <div className="text-sm opacity-80">Total Pool</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{event.participantCount}</div>
              <div className="text-sm opacity-80">Participants</div>
            </div>
          </div>
        </div>

        {/* Time Status */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {event.status === 'resolved' ? 'Resolved' :
               timeLeft <= 0 ? 'Expired - Awaiting Result' :
               hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : 
               minutesLeft > 0 ? `${minutesLeft}m left` : 'Expiring soon'}
            </span>
          </div>
          
          {event.winningOption && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Result Declared</span>
            </div>
          )}
        </div>

        {/* Betting Options */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm">Betting Options:</h4>
          {event.options.map((option) => {
            const isWinning = event.winningOption === option.id;
            return (
              <div 
                key={option.id} 
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  isWinning ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {isWinning && <Trophy className="w-4 h-4 text-green-600" />}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.bettors} bets • {formatCurrency(option.totalBets)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-blue-600">
                    {option.odds.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">odds</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Indicators */}
        {canDeclareResult && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Event expired - Ready to declare result</span>
            </div>
          </div>
        )}

        {event.status === 'resolved' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Event resolved - Payouts distributed</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Event</h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{event.title}"? This will permanently remove the event and all associated data.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(event.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};