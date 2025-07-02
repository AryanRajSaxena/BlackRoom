import React, { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, Settings, Wallet, Shield } from 'lucide-react';
import { Event, User, Bet, Transaction, PaymentMethod } from './types';
import { mockPaymentMethods } from './data/mockData';
import { EventCard } from './components/EventCard';
import { BettingModal } from './components/BettingModal';
import { CreateEventModal } from './components/CreateEventModal';
import { UserProfile } from './components/UserProfile';
import { PaymentManagement } from './components/PaymentManagement';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthPage } from './components/auth/AuthPage';
import { WinningAnimation } from './components/WinningAnimation';
import { CompletedEventsSection } from './components/CompletedEventsSection';
import { Leaderboard } from './components/Leaderboard';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import { MobileLayout } from './components/mobile/MobileLayout';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { getCurrentUser, onAuthStateChange, signOut, getUserProfile, createUserProfile } from './services/auth';
import { fetchEvents, createEvent } from './services/events';
import { placeBet } from './services/betting';
import { supabase } from './lib/supabase';

// For smooth tab transitions
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import './AppTransition.css';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [userBetsByEvent, setUserBetsByEvent] = useState<{ [eventId: string]: Bet }>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'ending'>('newest');
  const [currentView, setCurrentView] = useState<'events' | 'payments' | 'leaderboard' | 'admin'>('events');

  // Tabs for events
  const [eventsTab, setEventsTab] = useState<'active' | 'completed'>('active');

  // Winning animation state
  const [showWinningAnimation, setShowWinningAnimation] = useState(false);
  const [winningAnimationData, setWinningAnimationData] = useState<{
    winAmount: number;
    eventTitle: string;
    streak: number;
  } | null>(null);

  // Device detection
  const deviceInfo = useDeviceDetection();

  // Track shown wins using localStorage to persist across sessions
  const [shownWins, setShownWins] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('shownWins');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const categories = ['All', 'Weather', 'Cryptocurrency', 'Sports', 'Technology', 'Finance', 'Politics', 'Entertainment'];

  // Save shown wins to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('shownWins', JSON.stringify(Array.from(shownWins)));
    } catch (error) {
      console.error('Failed to save shown wins to localStorage:', error);
    }
  }, [shownWins]);

  const handleUserProfile = async (user: any) => {
    try {
      let profile = await getUserProfile(user.id);
      if (!profile) {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        const userPhone = user.user_metadata?.phone || user.phone || null;
        const isAdminEmail = user.email === 'admin@predictbet.com';
        if (isAdminEmail) {
          profile = await createUserProfile(user.id, 'Admin', userPhone);
          if (profile) {
            profile.is_admin = true;
            profile.balance = Math.max(profile.balance, 100000);
          }
        } else {
          profile = await createUserProfile(user.id, userName, userPhone);
        }
      }
      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          balance: profile.balance,
          totalBets: profile.total_bets,
          totalWinnings: profile.total_winnings,
          isAdmin: profile.is_admin || false
        });
        setIsAuthenticated(true);
      } else {
        throw new Error('Failed to create or retrieve user profile');
      }
    } catch (error) {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const loadEvents = async () => {
    try {
      const eventsData = await fetchEvents();
      setEvents(eventsData || []);
    } catch (error) {
      setEvents([]);
    }
  };

  const loadUserBets = async (userId: string) => {
    try {
      const { data: betsData, error } = await supabase
        .from('bets')
        .select(`
          *,
          events (title),
          bet_options (label)
        `)
        .eq('user_id', userId)
        .order('placed_at', { ascending: false });

      if (error) {
        setUserBets([]);
        return;
      }

      const formattedBets: Bet[] = (betsData || []).map(bet => ({
        id: bet.id,
        eventId: bet.event_id,
        userId: bet.user_id,
        optionId: bet.option_id,
        amount: bet.amount,
        placedAt: new Date(bet.placed_at),
        status: bet.status,
        payout: bet.payout
      }));

      setUserBets(formattedBets);

      // Create a map of user bets by event ID (latest bet per event)
      const betsByEvent: { [eventId: string]: Bet } = {};
      formattedBets.forEach(bet => {
        if (!betsByEvent[bet.eventId] || bet.placedAt > betsByEvent[bet.eventId].placedAt) {
          betsByEvent[bet.eventId] = bet;
        }
      });
      setUserBetsByEvent(betsByEvent);

      // Check for new wins and show animation
      checkForNewWins(formattedBets);
    } catch (error) {
      setUserBets([]);
    }
  };

  const checkForNewWins = async (bets: Bet[]) => {
    if (!currentUser) return;
    
    // Only check for wins that haven't been shown before
    const wonBets = bets.filter(bet => 
      bet.status === 'won' && 
      bet.payout && 
      bet.payout > 0 && 
      !shownWins.has(bet.id)
    );

    if (wonBets.length === 0) return;

    // Calculate current streak from all resolved bets
    const resolvedBets = bets
      .filter(bet => bet.status === 'won' || bet.status === 'lost')
      .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
    
    let currentStreak = 0;
    for (const bet of resolvedBets) {
      if (bet.status === 'won') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Show animation for the most recent win
    const latestWin = wonBets.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())[0];
    const event = events.find(e => e.id === latestWin.eventId);
    const eventTitle = event?.title || 'Event';

    setWinningAnimationData({
      winAmount: latestWin.payout!,
      eventTitle,
      streak: currentStreak
    });
    setShowWinningAnimation(true);

    // Mark all new wins as shown
    setShownWins(prev => {
      const newShownWins = new Set(prev);
      wonBets.forEach(bet => newShownWins.add(bet.id));
      return newShownWins;
    });
  };

  const loadTransactions = async (userId: string) => {
    try {
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        setTransactions([]);
        return;
      }

      const formattedTransactions: Transaction[] = (transactionsData || []).map(txn => ({
        id: txn.id,
        userId: txn.user_id,
        type: txn.type,
        amount: txn.amount,
        description: txn.description,
        timestamp: new Date(txn.created_at),
        status: txn.status,
        paymentMethod: txn.payment_method,
        transactionId: txn.transaction_id,
        eventId: txn.event_id,
        betId: txn.bet_id
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      setTransactions([]);
    }
  };

  // Calculate Net P&L based only on resolved bets
  const calculateNetPL = (userBets: Bet[]): number => {
    const resolvedBets = userBets.filter(bet => bet.status === 'won' || bet.status === 'lost');
    let totalWinnings = 0;
    let totalLosses = 0;
    resolvedBets.forEach(bet => {
      if (bet.status === 'won' && bet.payout) {
        totalWinnings += bet.payout - bet.amount;
      } else if (bet.status === 'lost') {
        totalLosses += bet.amount;
      }
    });
    return totalWinnings - totalLosses;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          await handleUserProfile(user);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
    const { data: { subscription } } = onAuthStateChange(async (user) => {
      if (user) {
        await handleUserProfile(user);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadEvents();
      loadUserBets(currentUser.id);
      loadTransactions(currentUser.id);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser && events.length > 0) {
      loadUserBets(currentUser.id);
    }
  }, [events]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setEvents([]);
      setUserBets([]);
      setTransactions([]);
      // Clear shown wins when signing out
      setShownWins(new Set());
      localStorage.removeItem('shownWins');
    } catch (error) {}
  };

  const handleAuthSuccess = () => {};

  // Separate active and resolved events
  const activeEvents = events.filter(event => event.status === 'active');
  const resolvedEvents = events.filter(event => event.status === 'resolved');

  const filteredActiveEvents = activeEvents
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
      if (currentUser?.isAdmin) {
        return matchesSearch && matchesCategory;
      } else {
        const hasUserBet = userBetsByEvent[event.id];
        const isActiveEvent = event.status === 'active';
        return matchesSearch && matchesCategory && (hasUserBet || isActiveEvent);
      }
    })
    .sort((a, b) => {
      const aHasUserBet = userBetsByEvent[a.id] ? 1 : 0;
      const bHasUserBet = userBetsByEvent[b.id] ? 1 : 0;
      if (aHasUserBet !== bHasUserBet) {
        return bHasUserBet - aHasUserBet;
      }
      switch (sortBy) {
        case 'popular':
          return b.participantCount - a.participantCount;
        case 'ending':
          return a.expiresAt.getTime() - b.expiresAt.getTime();
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  const filteredResolvedEvents = resolvedEvents
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
      if (currentUser?.isAdmin) {
        return matchesSearch && matchesCategory;
      } else {
        const hasUserBet = userBetsByEvent[event.id];
        return matchesSearch && matchesCategory && hasUserBet;
      }
    })
    .sort((a, b) => (b.resolvedAt?.getTime() || 0) - (a.resolvedAt?.getTime() || 0));

  const handlePlaceBet = async (eventId: string, optionId: string, amount: number) => {
    if (!currentUser || (currentUser.balance < amount && !currentUser.isAdmin)) {
      alert('Insufficient balance');
      return;
    }
    try {
      await placeBet(currentUser.id, eventId, optionId, amount);
      setCurrentUser(prev => prev ? ({
        ...prev,
        balance: prev.balance - amount,
        totalBets: prev.totalBets + 1
      }) : null);
      await loadEvents();
      await loadUserBets(currentUser.id);
      await loadTransactions(currentUser.id);
    } catch (error) {
      alert('Failed to place bet. Please try again.');
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    if (!currentUser) return;
    try {
      await createEvent({
        ...eventData,
        createdBy: currentUser.id
      });
      await loadEvents();
      setShowCreateModal(false);
    } catch (error) {
      alert('Failed to create event. Please try again.');
    }
  };

  const handleAddMoney = async (amount: number, methodId: string) => {
    if (!currentUser) return;
    try {
      const method = paymentMethods.find(m => m.id === methodId);
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: currentUser.balance + amount })
        .eq('id', currentUser.id);
      if (balanceError) throw balanceError;
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          type: 'deposit',
          amount: amount,
          description: `Wallet top-up via ${method?.name}`,
          status: 'completed',
          payment_method: method?.name,
          transaction_id: `${method?.type.toUpperCase()}${Math.random().toString().slice(2, 11)}`
        });
      if (transactionError) throw transactionError;
      setCurrentUser(prev => prev ? ({
        ...prev,
        balance: prev.balance + amount
      }) : null);
      await loadTransactions(currentUser.id);
    } catch (error) {
      alert('Failed to add money. Please try again.');
    }
  };

  const handleWithdraw = async (amount: number, methodId: string) => {
    if (!currentUser || currentUser.balance < amount) return;
    try {
      const method = paymentMethods.find(m => m.id === methodId);
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: currentUser.balance - amount })
        .eq('id', currentUser.id);
      if (balanceError) throw balanceError;
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUser.id,
          type: 'withdrawal',
          amount: -amount,
          description: `Withdrawal to ${method?.name}`,
          status: 'completed',
          payment_method: method?.name,
          transaction_id: `${method?.type.toUpperCase()}${Math.random().toString().slice(2, 11)}`
        });
      if (transactionError) throw transactionError;
      setCurrentUser(prev => prev ? ({
        ...prev,
        balance: prev.balance - amount
      }) : null);
      await loadTransactions(currentUser.id);
    } catch (error) {
      alert('Failed to withdraw money. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading PredictBet...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300">Loading user profile...</p>
        </div>
      </div>
    );
  }

  const totalPool = events.reduce((sum, event) => sum + event.totalPool, 0);
  const totalEvents = events.length;
  const activeEventsCount = activeEvents.length;
  const netPL = calculateNetPL(userBets);

  // Use mobile layout for mobile devices
  if (deviceInfo.isMobile) {
    return (
      <MobileLayout
        currentUser={{ ...currentUser, netPL }}
        events={events}
        userBets={userBets}
        userBetsByEvent={userBetsByEvent}
        transactions={transactions}
        paymentMethods={paymentMethods}
        onSignOut={handleSignOut}
        onPlaceBet={handlePlaceBet}
        onCreateEvent={handleCreateEvent}
        onAddMoney={handleAddMoney}
        onWithdraw={handleWithdraw}
        onRefreshEvents={loadEvents}
        showWinningAnimation={showWinningAnimation}
        winningAnimationData={winningAnimationData}
        onCloseWinningAnimation={() => setShowWinningAnimation(false)}
      />
    );
  }

  // Desktop layout (existing code)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-slate-200/60 dark:border-slate-700/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">PredictBet</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">Event Prediction Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('events')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'events'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setCurrentView('leaderboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'leaderboard'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Leaderboard
                </button>
                <button
                  onClick={() => setCurrentView('payments')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'payments'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Payments
                </button>
                {currentUser.isAdmin && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentView === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                )}
              </div>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatCurrency(currentUser.balance)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {currentUser.isAdmin ? 'Admin Balance' : 'Available Balance'}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {currentView === 'leaderboard' ? (
        <Leaderboard currentUser={currentUser} />
      ) : currentView === 'admin' && currentUser.isAdmin ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard
            events={events}
            currentUser={currentUser}
            onCreateEvent={handleCreateEvent}
            onRefreshEvents={loadEvents}
          />
        </div>
      ) : currentView === 'payments' ? (
        <PaymentManagement
          userId={currentUser.id}
          currentBalance={currentUser.balance}
          transactions={transactions}
          paymentMethods={paymentMethods}
          onAddMoney={handleAddMoney}
          onWithdraw={handleWithdraw}
        />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <UserProfile user={{ ...currentUser, netPL }} userBets={userBets} />
              <div className="mt-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 transition-colors duration-300">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Platform Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total Pool</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalPool)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Active Events</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{activeEventsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total Events</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">House Edge</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">15%</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-slate-200/60 dark:border-slate-700/60">
                <button
                  className={`px-5 py-2 font-medium transition-all rounded-t-lg focus:outline-none ${
                    eventsTab === 'active'
                      ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                      : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                  onClick={() => setEventsTab('active')}
                >
                  Active Events
                </button>
                <button
                  className={`px-5 py-2 font-medium transition-all rounded-t-lg focus:outline-none ${
                    eventsTab === 'completed'
                      ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow text-green-700 dark:text-green-300 border-b-2 border-green-600'
                      : 'text-slate-500 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-300'
                  }`}
                  onClick={() => setEventsTab('completed')}
                >
                  Completed Events
                </button>
              </div>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300/60 dark:border-slate-600/60 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    />
                  </div>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-slate-300/60 dark:border-slate-600/60 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'ending')}
                  className="px-4 py-2 border border-slate-300/60 dark:border-slate-600/60 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="ending">Ending Soon</option>
                </select>
              </div>
              {/* Tab Content with Transition */}
              <SwitchTransition>
                <CSSTransition
                  key={eventsTab}
                  timeout={300}
                  classNames="fade-slide"
                  unmountOnExit
                >
                  <div>
                    {eventsTab === 'active' ? (
                      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 transition-colors duration-300">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currentUser.isAdmin ? 'Manage Events' : 'Your Events & Betting History'}
                          </h2>
                          {currentUser.isAdmin && (
                            <button
                              onClick={() => setShowCreateModal(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg transition-all"
                            >
                              <Plus className="w-5 h-5" />
                              Create Event
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {filteredActiveEvents.map((event) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              userBet={userBetsByEvent[event.id] || null}
                              onBet={setSelectedEvent}
                              isAdmin={currentUser.isAdmin}
                            />
                          ))}
                        </div>
                        {filteredActiveEvents.length === 0 && (
                          <div className="text-center py-12">
                            <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No active events found</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                              {searchTerm || selectedCategory !== 'All'
                                ? 'Try adjusting your search or filters'
                                : currentUser.isAdmin
                                  ? 'Create your first event to get started!'
                                  : 'No active events available at the moment'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 transition-colors duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                          Completed Events
                        </h2>
                        <CompletedEventsSection
                          resolvedEvents={filteredResolvedEvents}
                          userBets={userBets}
                          userBetsByEvent={userBetsByEvent}
                          onEventClick={setSelectedEvent}
                          isAdmin={currentUser.isAdmin}
                        />
                        {filteredResolvedEvents.length === 0 && (
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
                </CSSTransition>
              </SwitchTransition>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedEvent && (
        <BettingModal
          event={selectedEvent}
          userBalance={currentUser.balance}
          isAdmin={currentUser.isAdmin}
          onClose={() => setSelectedEvent(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateEvent={handleCreateEvent}
        />
      )}
      {showWinningAnimation && winningAnimationData && (
        <WinningAnimation
          isVisible={showWinningAnimation}
          onClose={() => setShowWinningAnimation(false)}
          winAmount={winningAnimationData.winAmount}
          eventTitle={winningAnimationData.eventTitle}
          streak={winningAnimationData.streak}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;