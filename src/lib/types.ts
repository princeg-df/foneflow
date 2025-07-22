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
}

export type CreditCard = {
    id: string;
    name: string;
    cardNumber: string;
    userId: string;
}
