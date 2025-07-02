import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Event, Bet } from '../../types';
import { MobileEventCard } from './MobileEventCard';
import { MobileCompletedEventCard } from './MobileCompletedEventCard';

interface MobileEventsSectionProps {
  events: Event[];
  userBets: Bet[];
  userBetsByEvent: { [eventId: string]: Bet };
  onEventSelect: (event: Event) => void;
  onCreateEvent: () => void;
  isAdmin: boolean;
}

export const MobileEventsSection: React.FC<MobileEventsSectionProps> = ({
  events,
  userBets,
  userBetsByEvent,
  onEventSelect,
  onCreateEvent,
  isAdmin
}) => {
  const [eventsTab, setEventsTab] = useState<'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSearch, setShowSearch] = useState(false);

  const categories = ['All', 'Weather', 'Cryptocurrency', 'Sports', 'Technology', 'Finance', 'Politics', 'Entertainment'];

  // Separate active and resolved events
  const activeEvents = events.filter(event => event.status === 'active');
  const resolvedEvents = events.filter(event => event.status === 'resolved');

  const filteredActiveEvents = activeEvents
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aHasUserBet = userBetsByEvent[a.id] ? 1 : 0;
      const bHasUserBet = userBetsByEvent[b.id] ? 1 : 0;
      if (aHasUserBet !== bHasUserBet) {
        return bHasUserBet - aHasUserBet;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const filteredResolvedEvents = resolvedEvents
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
      if (!isAdmin) {
        const hasUserBet = userBetsByEvent[event.id];
        return matchesSearch && matchesCategory && hasUserBet;
      }
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (b.resolvedAt?.getTime() || 0) - (a.resolvedAt?.getTime() || 0));

  return (
    <div className="space-y-6 pb-6">
      {/* Clean Header */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Events</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Icon */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-3 rounded-2xl transition-all ${
                showSearch 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            
            {isAdmin && eventsTab === 'active' && (
              <button
                onClick={onCreateEvent}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Search */}
        {showSearch && (
          <div className="space-y-3 mb-6 animate-slide-down">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300/60 dark:border-slate-600/60 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                autoFocus
              />
            </div>
            
            {/* Category Filter - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-6">
          <button
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              eventsTab === 'active'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-lg'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setEventsTab('active')}
          >
            Active Events
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              eventsTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-300 shadow-lg'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setEventsTab('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Events Content */}
      {eventsTab === 'active' ? (
        <div>
          {filteredActiveEvents.length > 0 ? (
            <div className="space-y-4 px-4">
              {/* Vertical Layout for Event Cards */}
              <div className="space-y-4">
                {filteredActiveEvents.map((event) => (
                  <MobileEventCard
                    key={event.id}
                    event={event}
                    userBet={userBetsByEvent[event.id] || null}
                    onBet={onEventSelect}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No active events found</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || selectedCategory !== 'All'
                  ? 'Try adjusting your search or filters'
                  : isAdmin
                    ? 'Create your first event to get started!'
                    : 'No active events available at the moment'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4">
          {/* Reduced Size Completed Events */}
          {filteredResolvedEvents.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredResolvedEvents.map((event) => (
                <MobileCompletedEventCard
                  key={event.id}
                  event={event}
                  userBet={userBetsByEvent[event.id] || null}
                  onEventClick={onEventSelect}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No completed events found</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || selectedCategory !== 'All'
                  ? 'Try adjusting your search or filters'
                  : 'No completed events to show yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};