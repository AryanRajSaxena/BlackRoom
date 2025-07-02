export interface BetOption {
  id: string;
  label: string;
  odds: number;
  totalBets: number;
  bettors: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'closed' | 'resolved';
  totalPool: number;
  participantCount: number;
  options: BetOption[];
  winningOption?: string;
  image?: string;
}

export interface Bet {
  id: string;
  eventId: string;
  userId: string;
  optionId: string;
  amount: number;
  placedAt: Date;
  status: 'active' | 'won' | 'lost';
  payout?: number;
}

export interface User {
  id: string;
  name: string;
  balance: number;
  totalBets: number;
  totalWinnings: number;
  isAdmin: boolean;
  netPL?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'refund';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod?: string;
  transactionId?: string;
  eventId?: string;
  betId?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'card' | 'netbanking' | 'wallet';
  name: string;
  details: string;
  isDefault: boolean;
}

export interface WalletStats {
  totalDeposited: number;
  totalWithdrawn: number;
  totalBetAmount: number;
  totalWinnings: number;
  totalLosses: number;
  netProfit: number;
  winRate: number;
  averageBetSize: number;
}

export interface BetCalculation {
  potentialReturn: number;
  potentialProfit: number;
  impliedProbability: number;
  poolShare: number;
  effectiveOdds: number;
}