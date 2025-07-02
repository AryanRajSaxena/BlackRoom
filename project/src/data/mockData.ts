import { PaymentMethod } from '../types';

export const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'upi-1',
    type: 'upi',
    name: 'Google Pay',
    details: 'user@okaxis',
    isDefault: true
  },
  {
    id: 'upi-2',
    type: 'upi',
    name: 'PhonePe',
    details: 'user@ybl',
    isDefault: false
  },
  {
    id: 'card-1',
    type: 'card',
    name: 'HDFC Debit Card',
    details: '**** **** **** 1234',
    isDefault: false
  },
  {
    id: 'netbanking-1',
    type: 'netbanking',
    name: 'HDFC Bank',
    details: 'Net Banking',
    isDefault: false
  },
  {
    id: 'wallet-1',
    type: 'wallet',
    name: 'Paytm Wallet',
    details: 'Wallet Balance: ₹2,500',
    isDefault: false
  }
];