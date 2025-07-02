import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Activity,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { Event, User } from '../../types';
import { AdminEventCard } from './AdminEventCard';
import { EditEventModal } from './EditEventModal';
import { DeclareResultModal } from './DeclareResultModal';
import { CreateEventModal } from '../CreateEventModal';
import { updateEvent, deleteEvent, declareEventResult, getAdminStats } from '../../services/admin';

interface AdminDashboardProps {
  events: Event[];
  currentUser: User;
  onCreateEvent: (eventData: any) => void;
  onRefreshEvents: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  currentUser,
  onCreateEvent,
  onRefreshEvents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [declaringEvent, setDeclaringEvent] = useState<Event | null>(null);
  const [adminStats, setAdminStats] = useState<any>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Load admin statistics
  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        const stats = await getAdminStats(currentUser.id);
        setAdminStats(stats);
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      }
    };

    loadAdminStats();
  }, [currentUser.id, events]);

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Categorize events
  const activeEvents = filteredEvents.filter(e => e.status === 'active');
  const expiredEvents = filteredEvents.filter(e => 
    e.status === 'active' && e.expiresAt.getTime() <= Date.now()
  );
  const resolvedEvents = filteredEvents.filter(e => e.status === 'resolved');

  const handleEditEvent = async (eventData: any) => {
    try {
      await updateEvent(eventData);
      onRefreshEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      onRefreshEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleDeclareResult = async (eventId: string, winningOptionId: string) => {
    try {
      await declareEventResult(eventId, winningOptionId);
      onRefreshEvents();
    } catch (error) {
      console.error('Failed to declare result:', error);
      alert('Failed to declare result. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Stats Dashboard */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Events</div>
                <div className="text-2xl font-bold text-gray-900">{adminStats.totalEvents}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Active Events</div>
                <div className="text-2xl font-bold text-green-600">{adminStats.activeEvents}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Resolved Events</div>
                <div className="text-2xl font-bold text-purple-600">{adminStats.resolvedEvents}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Pool Managed</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(adminStats.totalPoolManaged)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">House Earnings</div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(adminStats.totalHouseEarnings)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Event Management</h2>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Events Requiring Attention */}
      {expiredEvents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">
              Events Requiring Attention ({expiredEvents.length})
            </h3>
          </div>
          <p className="text-yellow-700 mb-4">
            These events have expired and need results to be declared.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expiredEvents.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                onEdit={setEditingEvent}
                onDelete={handleDeleteEvent}
                onDeclareResult={setDeclaringEvent}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Events */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          All Events ({filteredEvents.length})
        </h3>
        
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first event to get started!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                onEdit={setEditingEvent}
                onDelete={handleDeleteEvent}
                onDeclareResult={setDeclaringEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateEvent={onCreateEvent}
        />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleEditEvent}
        />
      )}

      {declaringEvent && (
        <DeclareResultModal
          event={declaringEvent}
          onClose={() => setDeclaringEvent(null)}
          onDeclareResult={handleDeclareResult}
        />
      )}
    </div>
  );
};