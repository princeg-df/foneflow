"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import type { Order, User, CreditCard, Transaction } from "@/lib/types"
import useLocalStorage from "@/hooks/use-local-storage"
import StatCard from "@/components/stat-card"
import OrderTable from "@/components/order-table"
import UserTable from "@/components/user-table"
import CardTable from "@/components/card-table"
import TransactionTable from "@/components/transaction-table"
import AddOrderDialog from "@/components/add-order-dialog"
import AddUserDialog from "@/components/add-user-dialog"
import AddCardDialog from "@/components/add-card-dialog"
import AddTransactionDialog from "@/components/add-transaction-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Smartphone, DollarSign, TrendingUp, CreditCard as CreditCardIcon, Users, XCircle, Download, Upload, Settings, LogOut, FileText, Landmark, RotateCw } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { addDays, format, isAfter, isBefore, isEqual } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const initialUsers: User[] = []

const initialCards: CreditCard[] = []

const initialOrders: Order[] = [];

const initialTransactions: Transaction[] = [];

const defaultAdminUser: User = {
  id: 'user_admin',
  name: 'Prince',
  email: 'princegupta619@gmail.com',
  password: 'admin',
  role: 'admin',
};

export default function Dashboard() {
  const [orders, setOrders] = useLocalStorage<Order[]>("foneflow-orders", initialOrders)
  const [users, setUsers] = useLocalStorage<User[]>("foneflow-users", initialUsers);
  const [cards, setCards] = useLocalStorage<CreditCard[]>("foneflow-cards", initialCards);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("foneflow-transactions", initialTransactions);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('foneflow-currentUser', null);
  const [isClient, setIsClient] = useState(false);


  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [userFilter, setUserFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<string>("all")
  const [dealerFilter, setDealerFilter] = useState<string>("all")
  
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  
  const [isLogoutAlertOpen, setLogoutAlertOpen] = useState(false);
  const [isResetAlertOpen, setResetAlertOpen] = useState(false);
  const { toast } = useToast()
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImportAlertOpen, setImportAlertOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, router, isClient]);

  useEffect(() => {
    // Deduplicate users on mount
    const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
    if (uniqueUsers.length !== users.length) {
      setUsers(uniqueUsers);
    }
  }, [setUsers, users]);
  
  const isAdmin = currentUser?.role === 'admin';

  const handleAddOrder = (order: Order) => {
    setOrders((prev) => {
        const existingOrder = prev.find(o => o.id === order.id);
        if (existingOrder) {
            return prev.map(o => o.id === order.id ? order : o);
        }
        return [order, ...prev];
    });
  }

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter(o => o.id !== orderId))
    setOrderToDelete(null)
    toast({ title: "Success!", description: "Order deleted successfully." });
  };
  
  const handleAddUser = (user: User) => {
    setUsers((prev) => {
        const existingUser = prev.find(u => u.id === user.id);
        if (existingUser) {
            return prev.map(u => u.id === user.id ? user : u);
        }
        return [user, ...prev];
    });
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if(adminCount <= 1) {
        toast({ title: "Error", description: "Cannot delete the last admin.", variant: "destructive" });
        setUserToDelete(null);
        return;
      }
    }

    const hasCards = cards.some(c => c.userId === userId);
    const hasOrders = orders.some(o => o.userId === userId);
    if(hasCards || hasOrders) {
        toast({ title: "Error", description: "Cannot delete user with associated cards or orders.", variant: "destructive" });
        setUserToDelete(null);
        return;
    }
    setUsers((prev) => prev.filter(u => u.id !== userId));
    setUserToDelete(null);
    toast({ title: "Success!", description: "User deleted successfully." });
  };

  const handleAddCard = (card: CreditCard) => {
    setCards((prev) => {
        const existingCard = prev.find(c => c.id === card.id);
        if (existingCard) {
            return prev.map(c => c.id === card.id ? card : c);
        }
        return [card, ...prev];
    });
  };

  const handleDeleteCard = (cardId: string) => {
    const hasOrders = orders.some(o => o.cardId === cardId);
    if (hasOrders) {
      toast({ title: "Error", description: "Cannot delete card with associated orders.", variant: "destructive" });
      setCardToDelete(null);
      return;
    }
    setCards((prev) => prev.filter(c => c.id !== cardId));
    setCardToDelete(null);
    toast({ title: "Success!", description: "Card deleted successfully." });
  };

  const handleAddTransaction = (transaction: Transaction) => {
    setTransactions((prev) => {
      const existing = prev.find(t => t.id === transaction.id);
      if (existing) {
        return prev.map(t => t.id === transaction.id ? transaction : t);
      }
      return [transaction, ...prev];
    });
  }

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter(t => t.id !== transactionId));
    setTransactionToDelete(null);
    toast({ title: "Success!", description: "Transaction deleted successfully." });
  };

  const handleExport = () => {
    const data = {
      users,
      cards,
      orders,
      transactions,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `foneflow-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast({ title: "Success!", description: "Data exported successfully." });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setImportAlertOpen(true);
    }
    if(event.target) event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportConfirm = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            throw new Error("File content is not a string.");
        }
        const data = JSON.parse(text);

        if (Array.isArray(data.users) && Array.isArray(data.cards) && Array.isArray(data.orders)) {
          const parsedOrders = data.orders.map((o: any) => ({
            ...o,
            orderDate: new Date(o.orderDate),
            deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : undefined,
          }))
          const parsedTransactions = (data.transactions || []).map((t: any) => ({
            ...t,
            date: new Date(t.date),
          }))

          setUsers(data.users);
          setCards(data.cards);
          setOrders(parsedOrders);
          setTransactions(parsedTransactions);

          toast({ title: "Success!", description: "Data imported successfully." });
        } else {
          throw new Error("Invalid JSON structure.");
        }
      } catch (error) {
        console.error("Import failed:", error);
        toast({
          title: "Import Error",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      } finally {
        setImportAlertOpen(false);
        setPendingFile(null);
      }
    };
    reader.readAsText(pendingFile);
  };
  
  const handleLogout = () => {
    setLogoutAlertOpen(true);
  };
  
  const confirmLogout = () => {
    setCurrentUser(null)
    router.replace('/login');
  }

  const handleResetData = () => {
    setResetAlertOpen(true);
  }

  const confirmResetData = () => {
    setOrders([]);
    setCards([]);
    setTransactions([]);
    setUsers([defaultAdminUser]);
    setResetAlertOpen(false);
    toast({
      title: "Application Reset",
      description: "All data has been cleared successfully.",
    });
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  const formatCurrencyPdf = (amount: number) => `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}`;

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const userMap = new Map(users.map(u => [u.id, u.name]));
    
    doc.setFontSize(20);
    doc.text("FoneFlow Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Report generated on: ${format(new Date(), "PPP")}`, 14, 30);
    
    autoTable(doc, {
      startY: 40,
      head: [['Model', 'User', 'Order Date', 'Price', 'Cashback', 'Net Cost', 'Selling Price', 'Profit']],
      body: filteredOrders.map(o => {
        const netCost = o.orderedPrice - o.cashback;
        const profit = o.sellingPrice ? o.sellingPrice - netCost : 0;
        return [
          `${o.model}\n${o.variant}`,
          userMap.get(o.userId) || 'N/A',
          format(new Date(o.orderDate), "P"),
          formatCurrencyPdf(o.orderedPrice),
          formatCurrencyPdf(o.cashback),
          formatCurrencyPdf(netCost),
          o.sellingPrice ? formatCurrencyPdf(o.sellingPrice) : 'N/A',
          o.sellingPrice ? formatCurrencyPdf(profit) : 'N/A',
        ];
      }),
      headStyles: { fillColor: [33, 150, 243] },
      didDrawPage: (data) => {
         if (data.pageNumber === 1) {
            doc.setFontSize(16);
            doc.text("Orders", 14, 38);
         }
      }
    });

    const lastTableY = (doc as any).lastAutoTable.finalY || 40;
    
    autoTable(doc, {
      startY: lastTableY + 20,
      head: [['Date', 'Dealer', 'Amount', 'Description']],
      body: transactions.map(t => [
        format(new Date(t.date), "P"),
        t.dealer,
        formatCurrencyPdf(t.amount),
        t.description || 'N/A',
      ]),
      headStyles: { fillColor: [33, 150, 243] },
       didDrawPage: (data) => {
        doc.setFontSize(16);
        doc.text("Transactions", 14, lastTableY + 18);
      }
    });

    doc.save(`foneflow-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Success!", description: "PDF report exported successfully." });
  };

  const usersForFilter = isAdmin ? users : users.filter(u => u.id === currentUser?.id);
  const cardsToDisplay = isAdmin ? cards : cards.filter(c => c.userId === currentUser?.id);

  const uniqueDealers = useMemo(() => {
    const relevantOrders = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
    return ["all", ...Array.from(new Set(relevantOrders.filter(o => o.dealer).map(o => o.dealer!)))]
  }, [orders, isAdmin, currentUser]);

  const filteredOrders = useMemo(() => {
    // If not admin, only show user's own orders
    const baseOrders = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);

    return baseOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const inDateRange = !dateRange || (!dateRange.from || (isAfter(orderDate, dateRange.from) || isEqual(orderDate, dateRange.from))) && (!dateRange.to || (isBefore(orderDate, dateRange.to) || isEqual(orderDate, dateRange.to)));
      // If admin is filtering for a user, use that filter. Otherwise, it's already pre-filtered for the current user.
      const userMatch = userFilter === 'all' || order.userId === userFilter;
      const cardMatch = cardFilter === "all" || order.cardId === cardFilter;
      const dealerMatch = dealerFilter === "all" || order.dealer === dealerFilter;
      return inDateRange && userMatch && cardMatch && dealerMatch;
    });
  }, [orders, dateRange, userFilter, cardFilter, dealerFilter, isAdmin, currentUser]);

  const cardsForFilter = useMemo(() => {
    if (userFilter === 'all') return cardsToDisplay;
    return cardsToDisplay.filter(c => c.userId === userFilter);
  }, [cardsToDisplay, userFilter]);
  
  useEffect(() => {
    if(userFilter !== 'all' && cardFilter !== 'all' && !cardsForFilter.some(c => c.id === cardFilter)) {
        setCardFilter('all');
    }
  }, [userFilter, cardFilter, cardsForFilter])

  const stats = useMemo(() => {
    const soldOrders = filteredOrders.filter(o => o.sellingPrice);
    const totalInvested = filteredOrders.reduce((sum, o) => sum + o.orderedPrice, 0);
    const totalInvestedAfterCashback = filteredOrders.reduce((sum, o) => sum + (o.orderedPrice - (o.cashback || 0)), 0);
    const totalFromSoldPhones = soldOrders.reduce((sum, o) => sum + o.sellingPrice!, 0);
    const totalFromTransactions = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = totalFromSoldPhones + totalFromTransactions;
    
    const profitFromSoldPhones = soldOrders.reduce((sum, o) => sum + (o.sellingPrice! - (o.orderedPrice - (o.cashback || 0))), 0);

    const totalProfit = profitFromSoldPhones;
    
    const avgProfit = soldOrders.length > 0 ? totalProfit / soldOrders.length : 0;
    
    return {
      totalPhones: filteredOrders.length,
      totalInvested,
      totalInvestedAfterCashback,
      totalReceived,
      totalProfit,
      avgProfit
    };
  }, [filteredOrders, transactions]);


  const resetFilters = () => {
    setDateRange(undefined);
    setUserFilter("all");
    setCardFilter("all");
    setDealerFilter("all");
  };

  if (!isClient || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between mx-auto">
          <div className="flex items-center">
            <Smartphone className="h-6 w-6 mr-2 text-primary"/>
            <h1 className="text-2xl font-bold font-headline text-primary">
              FoneFlow
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="font-semibold">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.role === 'admin' ? 'Administrator' : 'User'}</p>
             </div>
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col gap-8 p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Total Phones Ordered" value={stats.totalPhones.toString()} icon={Smartphone} />
          <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={DollarSign} description={`After cashback: ${formatCurrency(stats.totalInvestedAfterCashback)}`}/>
          <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} icon={TrendingUp} />
          <StatCard title="Total Profit" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} className="text-green-600" />
          <StatCard title="Avg. Profit / Piece" value={formatCurrency(stats.avgProfit)} icon={TrendingUp} />
        </div>

        <Card className="shadow-lg">
           <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>FoneFlow Hub</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <AddOrderDialog onAddOrder={handleAddOrder} users={usersForFilter} cards={cards} currentUser={currentUser} />
              {isAdmin && <AddTransactionDialog onAddTransaction={handleAddTransaction} />}
              <AddUserDialog onAddUser={handleAddUser} currentUser={currentUser} />
              <AddCardDialog onAddCard={handleAddCard} users={usersForFilter}/>
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={handleResetData}>
                    <RotateCw className="mr-2 h-4 w-4" /> Reset Data
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                  <Button variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" /> Import
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export JSON
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleExportPdf}>
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders">
              <TabsList>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  {isAdmin && <TabsTrigger value="transactions">Transactions</TabsTrigger>}
                  {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
                  <TabsTrigger value="cards">Credit Cards</TabsTrigger>
              </TabsList>
              <TabsContent value="orders">
                <div className="flex flex-col md:flex-row gap-2 items-center flex-wrap my-4">
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
                  {isAdmin && <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-full sm:w-auto min-w-[180px]">
                          <Users className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter by user" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                      </SelectContent>
                  </Select>}
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
                          <Landmark className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter by dealer" />
                      </SelectTrigger>
                      <SelectContent>
                          {uniqueDealers.map(dealer => <SelectItem key={dealer} value={dealer}>{dealer === "all" ? "All Dealers" : dealer}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filters"><XCircle className="h-4 w-4" /></Button>
                </div>
                <OrderTable 
                  orders={filteredOrders} 
                  users={users} 
                  cards={cards}
                  onEditOrder={setOrderToEdit}
                  onDeleteOrder={setOrderToDelete}
                />
              </TabsContent>
              {isAdmin && <TabsContent value="transactions">
                  <TransactionTable 
                    transactions={transactions} 
                    onEditTransaction={setTransactionToEdit} 
                    onDeleteTransaction={setTransactionToDelete} 
                  />
              </TabsContent>}
              {isAdmin && <TabsContent value="users">
                  <UserTable users={users} onEditUser={setUserToEdit} onDeleteUser={setUserToDelete} currentUser={currentUser} />
              </TabsContent>}
              <TabsContent value="cards">
                  <CardTable cards={cardsToDisplay} users={users} onEditCard={setCardToEdit} onDeleteCard={setCardToDelete} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {orderToEdit && (
          <AddOrderDialog
            isOpen={!!orderToEdit}
            onOpenChange={(isOpen) => !isOpen && setOrderToEdit(null)}
            onAddOrder={handleAddOrder}
            users={usersForFilter}
            cards={cards}
            order={orderToEdit}
            currentUser={currentUser}
          />
        )}

        {orderToDelete && (
          <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the order for the {orderToDelete.model}.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteOrder(orderToDelete.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}
        
        {transactionToEdit && (
          <AddTransactionDialog
            isOpen={!!transactionToEdit}
            onOpenChange={(isOpen) => !isOpen && setTransactionToEdit(null)}
            onAddTransaction={handleAddTransaction}
            transaction={transactionToEdit}
          />
        )}

        {transactionToDelete && (
          <AlertDialog open={!!transactionToDelete} onOpenChange={(isOpen) => !isOpen && setTransactionToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the transaction from {transactionToDelete.dealer} of {formatCurrency(transactionToDelete.amount)}.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteTransaction(transactionToDelete.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}

        {userToEdit && (
          <AddUserDialog
            isOpen={!!userToEdit}
            onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
            onAddUser={handleAddUser}
            user={userToEdit}
            currentUser={currentUser}
          />
        )}

        {userToDelete && (
          <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the user {userToDelete.name}.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteUser(userToDelete.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}

        {cardToEdit && (
          <AddCardDialog
            isOpen={!!cardToEdit}
            onOpenChange={(isOpen) => !isOpen && setCardToEdit(null)}
            onAddCard={handleAddCard}
            users={usersForFilter}
            card={cardToEdit}
          />
        )}

        {cardToDelete && (
          <AlertDialog open={!!cardToDelete} onOpenChange={(isOpen) => !isOpen && setCardToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the card {cardToDelete.name} (....{cardToDelete.cardNumber.slice(-4)}).
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setCardToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteCard(cardToDelete.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}

        {isAdmin && <AlertDialog open={isImportAlertOpen} onOpenChange={setImportAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to import data?</AlertDialogTitle>
              <AlertDialogDescription>
                  This will overwrite all existing data (orders, users, cards, and transactions). This action cannot be undone.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleImportConfirm}>Import Data</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>}

        <AlertDialog open={isResetAlertOpen} onOpenChange={setResetAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action will permanently delete all orders, cards, transactions, and users (except for the default admin). This cannot be undone.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmResetData} variant="outline">Reset Data</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isLogoutAlertOpen} onOpenChange={setLogoutAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
              <AlertDialogDescription>
                  You will be returned to the login screen.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLogout}>Log Out</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <footer className="container py-4 text-center text-sm text-muted-foreground">
        <p>Built for mobile resellers. FoneFlow 2024.</p>
      </footer>
    </div>
  )
}
