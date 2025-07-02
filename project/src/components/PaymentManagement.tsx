import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  CreditCard, 
  Smartphone, 
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Calendar,
  Download,
  Eye,
  EyeOff,
  PieChart,
  BarChart3,
  Activity
} from 'lucide-react';
import { Transaction, PaymentMethod, WalletStats } from '../types';

interface PaymentManagementProps {
  userId: string;
  currentBalance: number;
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  onAddMoney: (amount: number, method: string) => void;
  onWithdraw: (amount: number, method: string) => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  userId,
  currentBalance,
  transactions,
  paymentMethods,
  onAddMoney,
  onWithdraw
}) => {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [selectedMethod, setSelectedMethod] = useState<string>(paymentMethods[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'upi': return <Smartphone className="w-5 h-5" />;
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'netbanking': return <Building2 className="w-5 h-5" />;
      default: return <Wallet className="w-5 h-5" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'withdrawal': return <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'bet_placed': return <Minus className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'bet_won': return <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'bet_lost': return <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'refund': return <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default: return <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const calculateStats = (): WalletStats => {
    const deposits = transactions.filter(t => t.type === 'deposit');
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    const bets = transactions.filter(t => t.type === 'bet_placed');
    const wins = transactions.filter(t => t.type === 'bet_won');
    const losses = transactions.filter(t => t.type === 'bet_lost');

    const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawn = Math.abs(withdrawals.reduce((sum, t) => sum + t.amount, 0));
    const totalBetAmount = Math.abs(bets.reduce((sum, t) => sum + t.amount, 0));
    const totalWinnings = wins.reduce((sum, t) => sum + t.amount, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.amount, 0));
    const netProfit = totalWinnings - totalLosses;
    const winRate = bets.length > 0 ? (wins.length / bets.length) * 100 : 0;
    const averageBetSize = bets.length > 0 ? totalBetAmount / bets.length : 0;

    return {
      totalDeposited,
      totalWithdrawn,
      totalBetAmount,
      totalWinnings,
      totalLosses,
      netProfit,
      winRate,
      averageBetSize
    };
  };

  const stats = calculateStats();

  const filteredTransactions = transactions.filter(transaction => {
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    
    const daysDiff = Math.floor((Date.now() - transaction.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    if (dateRange !== 'all' && daysDiff > parseInt(dateRange)) return false;
    
    return true;
  });

  const handleAddMoney = () => {
    if (amount > 0 && selectedMethod) {
      onAddMoney(amount, selectedMethod);
      setShowAddMoney(false);
      setAmount(500);
    }
  };

  const handleWithdraw = () => {
    if (amount > 0 && amount <= currentBalance && selectedMethod) {
      onWithdraw(amount, selectedMethod);
      setShowWithdraw(false);
      setAmount(500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your wallet, track earnings, and view transaction history</p>
        </div>

        {/* Balance Card - Fixed Responsive Layout */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-4 sm:p-6 lg:p-8 text-white mb-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="w-full sm:w-auto">
              <h2 className="text-lg font-medium opacity-90">Current Balance</h2>
              <div className="flex items-center gap-3 mt-2">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  {showBalance ? formatCurrency(currentBalance) : '₹ ••••••'}
                </div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <div className="text-sm opacity-75">Net P&L</div>
              <div className={`text-xl sm:text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {stats.netProfit >= 0 ? '+' : ''}{formatCurrency(stats.netProfit)}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowAddMoney(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-3 px-6 font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-3 px-6 font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Minus className="w-5 h-5" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-8 transition-colors duration-300 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Deposited</div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalDeposited)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Winnings</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalWinnings)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Losses</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalLosses)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.winRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Betting Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Average Bet Size</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.averageBetSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Bet Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.totalBetAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Win Rate</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{stats.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Net Profit/Loss</span>
                  <span className={`font-semibold ${stats.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stats.netProfit >= 0 ? '+' : ''}{formatCurrency(stats.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wallet Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Money Added</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+{formatCurrency(stats.totalDeposited)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Money Withdrawn</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(stats.totalWithdrawn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current Balance</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(currentBalance)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-900 dark:text-white font-medium">Net Position</span>
                    <span className={`font-bold text-lg ${
                      (stats.totalDeposited - stats.totalWithdrawn + stats.netProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(stats.totalDeposited - stats.totalWithdrawn + stats.netProfit) >= 0 ? '+' : ''}
                      {formatCurrency(stats.totalDeposited - stats.totalWithdrawn + stats.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposits</option>
                    <option value="withdrawal">Withdrawals</option>
                    <option value="bet_placed">Bets Placed</option>
                    <option value="bet_won">Bets Won</option>
                    <option value="bet_lost">Bets Lost</option>
                  </select>

                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 3 months</option>
                    <option value="all">All time</option>
                  </select>

                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-900 dark:text-white">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{transaction.description}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                          <span>{transaction.timestamp.toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{transaction.timestamp.toLocaleTimeString()}</span>
                          {transaction.paymentMethod && (
                            <>
                              <span>•</span>
                              <span>{transaction.paymentMethod}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                      <div className={`text-sm px-2 py-1 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                        transaction.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      }`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTransactions.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">💳</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No transactions found</h3>
                <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or make your first transaction</p>
              </div>
            )}
          </div>
        )}

        {/* Add Money Modal */}
        {showAddMoney && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Money to Wallet</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                  min="100"
                  max="50000"
                />
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-gray-900 dark:text-white"
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        selectedMethod === method.id
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                      }`}
                    >
                      {getPaymentMethodIcon(method.type)}
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">{method.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{method.details}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddMoney(false)}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMoney}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg transition-all"
                >
                  Add ₹{amount}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Withdraw Money</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                  min="100"
                  max={currentBalance}
                />
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Available balance: {formatCurrency(currentBalance)}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Withdrawal Method</label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        selectedMethod === method.id
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                      }`}
                    >
                      {getPaymentMethodIcon(method.type)}
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">{method.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{method.details}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={amount > currentBalance}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  Withdraw ₹{amount}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};