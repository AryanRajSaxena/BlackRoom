export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          balance: number
          total_bets: number
          total_winnings: number
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          balance?: number
          total_bets?: number
          total_winnings?: number
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          balance?: number
          total_bets?: number
          total_winnings?: number
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          created_by: string
          expires_at: string
          status: 'active' | 'closed' | 'resolved'
          total_pool: number
          participant_count: number
          winning_option_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          created_by: string
          expires_at: string
          status?: 'active' | 'closed' | 'resolved'
          total_pool?: number
          participant_count?: number
          winning_option_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          created_by?: string
          expires_at?: string
          status?: 'active' | 'closed' | 'resolved'
          total_pool?: number
          participant_count?: number
          winning_option_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bet_options: {
        Row: {
          id: string
          event_id: string
          label: string
          odds: number
          total_bets: number
          bettors: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          label: string
          odds: number
          total_bets?: number
          bettors?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          label?: string
          odds?: number
          total_bets?: number
          bettors?: number
          created_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          event_id: string
          user_id: string
          option_id: string
          amount: number
          status: 'active' | 'won' | 'lost'
          payout: number | null
          placed_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          option_id: string
          amount: number
          status?: 'active' | 'won' | 'lost'
          payout?: number | null
          placed_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          option_id?: string
          amount?: number
          status?: 'active' | 'won' | 'lost'
          payout?: number | null
          placed_at?: string
          resolved_at?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'refund'
          amount: number
          description: string
          status: 'pending' | 'completed' | 'failed'
          payment_method: string | null
          transaction_id: string | null
          event_id: string | null
          bet_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'refund'
          amount: number
          description: string
          status?: 'pending' | 'completed' | 'failed'
          payment_method?: string | null
          transaction_id?: string | null
          event_id?: string | null
          bet_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'refund'
          amount?: number
          description?: string
          status?: 'pending' | 'completed' | 'failed'
          payment_method?: string | null
          transaction_id?: string | null
          event_id?: string | null
          bet_id?: string | null
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          type: 'upi' | 'card' | 'netbanking' | 'wallet'
          name: string
          details: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'upi' | 'card' | 'netbanking' | 'wallet'
          name: string
          details: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'upi' | 'card' | 'netbanking' | 'wallet'
          name?: string
          details?: string
          is_default?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}