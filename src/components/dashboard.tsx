"use client"

import { useState, useMemo, useEffect } from "react"
import type { Order, User, CreditCard } from "@/lib/types"
import useLocalStorage from "@/hooks/use-local-storage"
import StatCard from "@/components/stat-card"
import OrderTable from "@/components/order-table"
import AddOrderDialog from "@/components/add-order-dialog"
import AddUserDialog from "@/components/add-user-dialog"
import AddCardDialog from "@/components/add-card-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Smartphone, DollarSign, TrendingUp, CreditCard as CreditCardIcon, Users, XCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { addDays, format, isAfter, isBefore, isEqual } from "date-fns"

const initialUsers: User[] = [
    { id: 'user1', name: 'Alice' },
    { id: 'user2', name: 'Bob' },
]

const initialCards: CreditCard[] = [
    { id: 'card1', name: 'Amex Gold', cardNumber: '1111222233334444', userId: 'user1' },
    { id: 'card2', name: 'Chase Sapphire', cardNumber: '5555666677778888', userId: 'user1' },
    { id: 'card3', name: 'Citi Double Cash', cardNumber: '9999000011112222', userId: 'user2' },
]

const initialOrders: Order[] = [
    {
      id: '1',
      model: 'iPhone 15 Pro',
      variant: '256GB Natural Titanium',
      orderDate: new Date('2023-09-15'),
      orderedPrice: 99900,
      cashback: 5000,
      cardId: 'card1',
      userId: 'user1',
      deliveryDate: new Date('2023-09-22'),
      sellingPrice: 110000,
      dealer: 'Local Shop',
    },
    {
      id: '2',
      model: 'Samsung S24 Ultra',
      variant: '512GB Black',
      orderDate: new Date('2024-01-20'),
      orderedPrice: 115000,
      cashback: 10000,
      cardId: 'card2',
      userId: 'user1',
      deliveryDate: new Date('2024-01-28'),
      sellingPrice: 125000,
      dealer: 'Online Marketplace',
    },
    {
      id: '3',
      model: 'Pixel 8 Pro',
      variant: '256GB Obsidian',
      orderDate: new Date('2023-10-10'),
      orderedPrice: 85000,
      cashback: 0,
      cardId: 'card1',
      userId: 'user1',
      deliveryDate: new Date('2023-10-18'),
      sellingPrice: 90000,
      dealer: 'Local Shop',
    },
    {
      id: '4',
      model: 'iPhone 15',
      variant: '128GB Blue',
      orderDate: new Date('2024-02-01'),
      orderedPrice: 72000,
      cashback: 2500,
      cardId: 'card3',
      userId: 'user2',
      deliveryDate: new Date('2024-02-08'),
    },
];

export default function Dashboard() {
  const [orders, setOrders] = useLocalStorage<Order[]>("foneflow-orders", initialOrders)
  const [users, setUsers] = useLocalStorage<User[]>("foneflow-users", initialUsers);
  const [cards, setCards] = useLocalStorage<CreditCard[]>("foneflow-cards", initialCards);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [userFilter, setUserFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<string>("all")
  const [dealerFilter, setDealerFilter] = useState<string>("all")

  const handleAddOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev])
  }
  
  const handleAddUser = (user: User) => {
    setUsers((prev) => [user, ...prev]);
  };

  const handleAddCard = (card: CreditCard) => {
    setCards((prev) => [card, ...prev]);
  };

  const uniqueDealers = useMemo(() => ["all", ...Array.from(new Set(orders.filter(o => o.dealer).map(o => o.dealer!)))], [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.orderDate;
      const inDateRange = !dateRange || (!dateRange.from || (isAfter(orderDate, dateRange.from) || isEqual(orderDate, dateRange.from))) && (!dateRange.to || (isBefore(orderDate, dateRange.to) || isEqual(orderDate, dateRange.to)));
      const userMatch = userFilter === 'all' || order.userId === userFilter;
      const cardMatch = cardFilter === "all" || order.cardId === cardFilter;
      const dealerMatch = dealerFilter === "all" || order.dealer === dealerFilter;
      return inDateRange && userMatch && cardMatch && dealerMatch;
    });
  }, [orders, dateRange, userFilter, cardFilter, dealerFilter]);

  const cardsForFilter = useMemo(() => {
    if (userFilter === 'all') return cards;
    return cards.filter(c => c.userId === userFilter);
  }, [cards, userFilter]);
  
  // Reset card filter if the selected card doesn't belong to the selected user
  useEffect(() => {
    if(userFilter !== 'all' && cardFilter !== 'all' && !cardsForFilter.some(c => c.id === cardFilter)) {
        setCardFilter('all');
    }
  }, [userFilter, cardFilter, cardsForFilter])

  const stats = useMemo(() => {
    const soldOrders = filteredOrders.filter(o => o.sellingPrice);
    const totalInvested = filteredOrders.reduce((sum, o) => sum + o.orderedPrice, 0);
    const totalInvestedAfterCashback = filteredOrders.reduce((sum, o) => sum + (o.orderedPrice - o.cashback), 0);
    const totalReceived = soldOrders.reduce((sum, o) => sum + o.sellingPrice!, 0);
    const totalProfit = totalReceived - soldOrders.reduce((sum, o) => sum + (o.orderedPrice - o.cashback), 0);
    const avgProfit = soldOrders.length > 0 ? totalProfit / soldOrders.length : 0;
    
    return {
      totalPhones: filteredOrders.length,
      totalInvested,
      totalInvestedAfterCashback,
      totalReceived,
      totalProfit,
      avgProfit
    };
  }, [filteredOrders]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const resetFilters = () => {
    setDateRange(undefined);
    setUserFilter("all");
    setCardFilter("all");
    setDealerFilter("all");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Phones Ordered" value={stats.totalPhones.toString()} icon={Smartphone} />
        <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={DollarSign} description={`After cashback: ${formatCurrency(stats.totalInvestedAfterCashback)}`}/>
        <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} icon={TrendingUp} />
        <StatCard title="Total Profit" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} className="text-green-600" />
        <StatCard title="Avg. Profit / Piece" value={formatCurrency(stats.avgProfit)} icon={TrendingUp} />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Orders Overview</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 items-center flex-wrap">
            <div className="flex gap-2 flex-wrap justify-center">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className="w-full sm:w-auto min-w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
                 <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px]">
                        <Users className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={cardFilter} onValueChange={setCardFilter}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px]">
                        <CreditCardIcon className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by card" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">All Cards</SelectItem>
                       {cardsForFilter.map(card => <SelectItem key={card.id} value={card.id}>{card.name} (....{card.cardNumber.slice(-4)})</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={dealerFilter} onValueChange={setDealerFilter}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px]">
                        <Users className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by dealer" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueDealers.map(dealer => <SelectItem key={dealer} value={dealer}>{dealer === "all" ? "All Dealers" : dealer}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filters"><XCircle className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <AddOrderDialog onAddOrder={handleAddOrder} users={users} cards={cards} />
              <AddUserDialog onAddUser={handleAddUser} />
              <AddCardDialog onAddCard={handleAddCard} users={users}/>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrderTable orders={filteredOrders} users={users} cards={cards} />
        </CardContent>
      </Card>
    </div>
  )
}
