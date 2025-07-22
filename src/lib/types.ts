export type Order = {
  id: string;
  model: string;
  variant: string;
  orderDate: Date;
  orderedPrice: number;
  cashback: number;
  card: string;
  deliveryDate?: Date;
  sellingPrice?: number;
  dealer?: string;
};
