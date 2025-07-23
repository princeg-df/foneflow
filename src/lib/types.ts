// src/lib/types.ts
import type { Timestamp } from "firebase/firestore";

export type Order = {
  id: string;
  model: string;
  variant: string;
  orderDate: Date | Timestamp;
  orderedPrice: number;
  cashback: number;
  cardId: string;
  userId: string;
  deliveryDate?: Date | Timestamp | null;
  sellingPrice?: number;
  dealer?: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
}

export type CreditCard = {
    id: string;
    name: string;
    cardNumber: string;
    userId: string;
}

export type Transaction = {
    id: string;
    date: Date | Timestamp;
    amount: number;
    dealer: string;
    description?: string;
    paymentMode: 'cash' | 'online';
    onlinePaymentType?: 'upi' | 'bank_transfer';
    userId: string;
    cardId: string;
}
