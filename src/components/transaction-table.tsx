"use client"

import type { Transaction, CreditCard } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface TransactionTableProps {
  transactions: Transaction[];
  cards: CreditCard[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}

export default function TransactionTable({ transactions, cards, onEditTransaction, onDeleteTransaction }: TransactionTableProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  const cardMap = new Map(cards.map(c => [c.id, `${c.name} (....${c.cardNumber.slice(-4)})`]));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Dealer</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Credit Card</TableHead>
            <TableHead>Payment Mode</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
             <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                No transactions found.
                </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{transaction.dealer}</TableCell>
                  <TableCell className="text-muted-foreground">{transaction.description || 'N/A'}</TableCell>
                  <TableCell>{cardMap.get(transaction.cardId) || 'N/A'}</TableCell>
                  <TableCell>
                      <Badge variant="outline" className="capitalize">
                          {transaction.paymentMode}
                          {transaction.onlinePaymentType && ` (${transaction.onlinePaymentType.replace('_', ' ')})`}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">{formatCurrency(transaction.amount)}</TableCell>
                   <TableCell className="text-right">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEditTransaction(transaction)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDeleteTransaction(transaction)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
