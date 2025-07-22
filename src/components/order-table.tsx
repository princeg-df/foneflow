"use client"

import type { Order, User, CreditCard } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface OrderTableProps {
  orders: Order[];
  users: User[];
  cards: CreditCard[];
}

export default function OrderTable({ orders, users, cards }: OrderTableProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  
  const userMap = new Map(users.map(u => [u.id, u.name]));
  const cardMap = new Map(cards.map(c => [c.id, `${c.name} (....${c.cardNumber.slice(-4)})`]));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Cashback</TableHead>
            <TableHead>Card</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead>Dealer</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">Profit %</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
             <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                No orders found.
                </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const netCost = order.orderedPrice - order.cashback
              const profit = order.sellingPrice ? order.sellingPrice - netCost : undefined
              const profitPercentage = profit && netCost > 0 ? (profit / netCost) * 100 : undefined

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <div>{order.model}</div>
                    <div className="text-xs text-muted-foreground">{order.variant}</div>
                  </TableCell>
                  <TableCell>{userMap.get(order.userId) || 'Unknown'}</TableCell>
                  <TableCell>{format(order.orderDate, 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.orderedPrice)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(order.cashback)}</TableCell>
                  <TableCell>{cardMap.get(order.cardId) || 'Unknown'}</TableCell>
                  <TableCell className="text-right">{order.sellingPrice ? formatCurrency(order.sellingPrice) : 'N/A'}</TableCell>
                  <TableCell>{order.dealer || 'N/A'}</TableCell>
                  <TableCell className={`text-right font-medium ${profit && profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profit !== undefined ? formatCurrency(profit) : 'N/A'}
                  </TableCell>
                  <TableCell className={`text-right ${profit && profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {profitPercentage !== undefined ? `${profitPercentage.toFixed(2)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.sellingPrice ? "default" : "secondary"}>
                      {order.sellingPrice ? 'Sold' : 'In Stock'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
