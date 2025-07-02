import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Save } from 'lucide-react';
import { Event } from '../../types';

interface EditEventModalProps {
  event: Event;
  onClose: () => void;
  onSave: (eventData: any) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  event,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [category, setCategory] = useState(event.category);
  const [expiryDate, setExpiryDate] = useState(
    event.expiresAt.toISOString().split('T')[0]
  );
  const [expiryTime, setExpiryTime] = useState(
    event.expiresAt.toTimeString().slice(0, 5)
  );
  const [options, setOptions] = useState(
    event.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      odds: opt.odds,
      totalBets: opt.totalBets,
      bettors: opt.bettors
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    'Weather', 'Cryptocurrency', 'Sports', 'Technology', 
    'Finance', 'Politics', 'Entertainment'
  ];

  const updateOption = (index: number, field: 'label' | 'odds', value: string | number) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !expiryDate || !expiryTime) return;
    if (options.some(opt => !opt.label || opt.odds <= 1)) return;

    setIsSaving(true);
    
    try {
      const expiresAt = new Date(`${expiryDate}T${expiryTime}`);
      
      const eventData = {
        id: event.id,
        title,
        description,
        category,
        expiresAt,
        options: options.map(opt => ({
          id: opt.id,
          label: opt.label,
          odds: opt.odds,
          totalBets: opt.totalBets,
          bettors: opt.bettors
        }))
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = title && description && expiryDate && expiryTime && 
                     options.every(opt => opt.label && opt.odds > 1);

  const hasActiveBets = event.totalPool > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {hasActiveBets && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Active Bets Warning:</p>
                  <p>This event has active bets. Changes to odds may affect existing bets. Consider the impact on users before making modifications.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Will it rain in Mumbai tomorrow?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide detailed information about the event and how it will be resolved..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Time *
                  </label>
                  <input
                    type="time"
                    value={expiryTime}
                    onChange={(e) => setExpiryTime(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Betting Options *
              </label>

              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={option.id} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={option.odds}
                        onChange={(e) => updateOption(index, 'odds', parseFloat(e.target.value) || 1)}
                        min="1.1"
                        max="50"
                        step="0.1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">Odds</div>
                    </div>
                    <div className="w-20 text-center">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">{option.bettors}</div>
                        <div className="text-xs text-gray-500">bets</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Edit Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Changes to odds will affect future bets but not existing ones</li>
                    <li>Extending expiry time is allowed, shortening requires careful consideration</li>
                    <li>Option labels can be clarified but shouldn't change meaning</li>
                    <li>All changes are logged for transparency</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSaving}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};