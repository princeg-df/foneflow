export type Order = {
  id: string;
  model: string;
  variant: string;
  orderDate: Date;
  orderedPrice: number;
  cashback: number;
  cardId: string;
  userId: string;
  deliveryDate?: Date;
  sellingPrice?: number;
  dealer?: string;
};

export type User = {
    id: string;
    name: string;
    password: string;
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
    date: Date;
    amount: number;
    dealer: string;
    description?: string;
}
