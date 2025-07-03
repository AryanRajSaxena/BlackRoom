import React, { useState } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDashboard } from './MobileDashboard';
import { MobileEventsSection } from './MobileEventsSection';
import { MobileLeaderboardSection } from './MobileLeaderboardSection';
import { MobileBettingModal } from './MobileBettingModal';
import { PaymentManagement } from '../PaymentManagement';
import { AdminDashboard } from '../admin/AdminDashboard';
import { CreateEventModal } from '../CreateEventModal';
import { WinningAnimation } from '../WinningAnimation';
import { Event, User, Bet, Transaction, PaymentMethod } from '../../types';

interface MobileLayoutProps {
  currentUser: User & { netPL?: number };
  events: Event[];
  userBets: Bet[];
  userBetsByEvent: { [eventId: string]: Bet };
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  onSignOut: () => void;
  onPlaceBet: (eventId: string, optionId: string, amount: number) => void;
  onCreateEvent: (eventData: any) => void;
  onAddMoney: (amount: number, methodId: string) => void;
  onWithdraw: (amount: number, methodId: string) => void;
  onRefreshEvents: () => void;
  showWinningAnimation: boolean;
  winningAnimationData: any;
  onCloseWinningAnimation: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  currentUser,
  events,
  userBets,
  userBetsByEvent,
  transactions,
  paymentMethods,
  onSignOut,
  onPlaceBet,
  onCreateEvent,
  onAddMoney,
  onWithdraw,
  onRefreshEvents,
  showWinningAnimation,
  winningAnimationData,
  onCloseWinningAnimation
}) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'events' | 'payments' | 'leaderboard' | 'admin'>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (section: string) => {
    setCurrentView(section as any);
  };

  // Calculate actual platform stats
  const totalPool = events.reduce((sum, event) => sum + event.totalPool, 0);
  const totalEvents = events.length;
  const activeUsers = events.reduce((sum, event) => sum + event.participantCount, 0);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <MobileDashboard
            user={currentUser}
            userBets={userBets}
            events={events}
            onNavigate={handleNavigate}
            totalPool={totalPool}
            totalEvents={totalEvents}
            activeUsers={activeUsers}
          />
        );
      
      case 'events':
        return (
          <MobileEventsSection
            events={events}
            userBets={userBets}
            userBetsByEvent={userBetsByEvent}
            onEventSelect={setSelectedEvent}
            onCreateEvent={() => setShowCreateModal(true)}
            isAdmin={currentUser.isAdmin}
          />
        );
      
      case 'leaderboard':
        return (
          <MobileLeaderboardSection currentUser={currentUser} />
        );
      
      case 'payments':
        return (
          <div className="pb-6">
            <PaymentManagement
              userId={currentUser.id}
              currentBalance={currentUser.balance}
              transactions={transactions}
              paymentMethods={paymentMethods}
              onAddMoney={onAddMoney}
              onWithdraw={onWithdraw}
            />
          </div>
        );
      
      case 'admin':
        if (!currentUser.isAdmin) return null;
        return (
          <div className="pb-6">
            <AdminDashboard
              events={events}
              currentUser={currentUser}
              onCreateEvent={onCreateEvent}
              onRefreshEvents={onRefreshEvents}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Mobile Header */}
      <MobileHeader
        user={currentUser}
        onSignOut={onSignOut}
        onMenuToggle={setIsMenuOpen}
      />

      {/* Main Content */}
      <main className="pb-20 pt-4">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav
        activeTab={currentView}
        onTabChange={(tab) => setCurrentView(tab as any)}
        isAdmin={currentUser.isAdmin}
      />

      {/* Modals */}
      {selectedEvent && (
        <MobileBettingModal
          event={selectedEvent}
          userBalance={currentUser.balance}
          isAdmin={currentUser.isAdmin}
          onClose={() => setSelectedEvent(null)}
          onPlaceBet={onPlaceBet}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateEvent={onCreateEvent}
        />
      )}

      {showWinningAnimation && winningAnimationData && (
        <WinningAnimation
          isVisible={showWinningAnimation}
          onClose={onCloseWinningAnimation}
          winAmount={winningAnimationData.winAmount}
          eventTitle={winningAnimationData.eventTitle}
          streak={winningAnimationData.streak}
        />
      )}
    </div>
  );
};