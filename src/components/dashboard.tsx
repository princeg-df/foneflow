
// src/components/dashboard.tsx
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import type { Order, User, CreditCard, Transaction } from "@/lib/types"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar as CalendarIcon, Smartphone, DollarSign, TrendingUp, CreditCard as CreditCardIcon, Users, XCircle, Download, Upload, Settings, LogOut, FileText, Landmark, RotateCw, AlertCircle, Menu, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { format, isAfter, isBefore, isEqual } from "date-fns"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { auth, db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { collection, onSnapshot, query, where, doc, deleteDoc, getDocs, writeBatch, Timestamp } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"

export default function Dashboard() {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [userFilter, setUserFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<string>("all")
  const [dealerFilter, setDealerFilter] = useState<string>("all")
  const [cashbackUserFilter, setCashbackUserFilter] = useState<string>("all");
  
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
  
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAuthLoading) return; // Wait for authentication to resolve

    if (!currentUser) {
        router.replace('/login');
        return;
    }

    setIsDataLoading(true);

    const collectionsToFetch = [
      { name: 'orders', setter: setOrders },
      { name: 'users', setter: setUsers, adminOnly: true },
      { name: 'cards', setter: setCards },
      { name: 'transactions', setter: setTransactions, adminOnly: true }
    ];

    const unsubscribers = collectionsToFetch.map(col => {
      let q;
      if (col.name === 'users' && !isAdmin) {
          // If not admin, only fetch the current user's data
          setUsers([currentUser]);
          return () => {}; // No-op for users collection
      } else if ((col.name === 'orders' || col.name === 'cards' || col.name === 'transactions') && !isAdmin) {
          // Non-admins only see their own data for these collections
          q = query(collection(db, col.name), where("userId", "==", currentUser.id));
      } else {
          // Admin can see everything
          q = query(collection(db, col.name));
      }

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        col.setter(data as any);
      }, (error) => {
        console.error(`Error fetching ${col.name}:`, error);
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            toast({ title: `Authentication Error`, description: `You do not have permission to view ${col.name}.`, variant: "destructive"});
        } else {
            toast({ title: `Error fetching ${col.name}`, description: "Please check your connection or try again later.", variant: "destructive"});
        }
      });
      return unsubscribe;
    });

    // A small delay to allow all listeners to attach and fetch initial data
    const timer = setTimeout(() => setIsDataLoading(false), 1000);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser, isAuthLoading, router, isAdmin, toast]);


  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      toast({ title: "Success!", description: "Order deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete order.", variant: "destructive" });
    } finally {
      setOrderToDelete(null)
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
        toast({ title: "Error", description: "Cannot delete the last admin.", variant: "destructive" });
        setUserToDelete(null);
        return;
    }
    try {
      await deleteDoc(doc(db, "users", userId));
      toast({ title: "Success!", description: "User deleted successfully." });
    } catch (error) {
       toast({ title: "Error", description: "Could not delete user.", variant: "destructive" });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteDoc(doc(db, "cards", cardId));
      toast({ title: "Success!", description: "Card deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete card.", variant: "destructive" });
    } finally {
      setCardToDelete(null);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteDoc(doc(db, "transactions", transactionId));
      toast({ title: "Success!", description: "Transaction deleted successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete transaction.", variant: "destructive" });
    } finally {
      setTransactionToDelete(null);
    }
  };

  const handleExportJson = () => {
    const data = {
      users,
      cards,
      orders: orders.map(o => ({...o, orderDate: (o.orderDate as Timestamp).toDate(), deliveryDate: o.deliveryDate ? (o.deliveryDate as Timestamp).toDate() : null})),
      transactions: transactions.map(t => ({...t, date: (t.date as Timestamp).toDate()})),
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

  const handleImportConfirm = async () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            throw new Error("File content is not a string.");
        }
        const data = JSON.parse(text);

        if (!data.users || !data.cards || !data.orders || !data.transactions) {
          throw new Error("Invalid JSON structure.");
        }

        const batch = writeBatch(db);

        data.users.forEach((user: User) => batch.set(doc(db, "users", user.id), user));
        data.cards.forEach((card: CreditCard) => batch.set(doc(db, "cards", card.id), card));
        data.orders.forEach((order: any) => {
            const orderData = { ...order, orderDate: Timestamp.fromDate(new Date(order.orderDate)), deliveryDate: order.deliveryDate ? Timestamp.fromDate(new Date(order.deliveryDate)) : null };
            batch.set(doc(db, "orders", order.id), orderData)
        });
        data.transactions.forEach((transaction: any) => {
             const transData = { ...transaction, date: Timestamp.fromDate(new Date(transaction.date)) };
            batch.set(doc(db, "transactions", transaction.id), transData)
        });

        await batch.commit();

        toast({ title: "Success!", description: "Data imported successfully." });
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
  
  const confirmLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      toast({ title: "Error", description: "Failed to log out.", variant: "destructive" });
    } finally {
      setLogoutAlertOpen(false);
    }
  }

  const handleResetData = () => {
    setResetAlertOpen(true);
  }

  const confirmResetData = async () => {
    try {
        const batch = writeBatch(db);
        const collectionsToDelete = ["orders", "cards", "transactions"];
        for (const col of collectionsToDelete) {
            const snapshot = await getDocs(collection(db, col));
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
        toast({
          title: "Application Reset",
          description: "All non-user data has been cleared.",
        });
    } catch(e) {
        toast({
          title: "Error",
          description: "Could not reset application data.",
          variant: "destructive"
        });
    } finally {
       setResetAlertOpen(false);
    }
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
      head: [['Model', 'User', 'Order Date', 'Delivery Date', 'Price', 'Cashback', 'Net Cost', 'Selling Price', 'Profit', 'Profit %', 'Status']],
      body: filteredOrders.map(o => {
        const orderDate = o.orderDate instanceof Timestamp ? o.orderDate.toDate() : o.orderDate;
        const deliveryDate = o.deliveryDate ? (o.deliveryDate instanceof Timestamp ? o.deliveryDate.toDate() : o.deliveryDate) : null;
        const netCost = o.orderedPrice - (o.cashback || 0);
        const profit = o.sellingPrice ? o.sellingPrice - netCost : undefined;
        const profitPercentage = profit !== undefined && netCost > 0 ? (profit / netCost) * 100 : undefined;
        return [
          `${o.model}\n${o.variant}`,
          userMap.get(o.userId) || 'N/A',
          format(orderDate, "P"),
          deliveryDate ? format(deliveryDate, "P") : 'N/A',
          formatCurrencyPdf(o.orderedPrice),
          formatCurrencyPdf(o.cashback || 0),
          formatCurrencyPdf(netCost),
          o.sellingPrice ? formatCurrencyPdf(o.sellingPrice) : 'N/A',
          profit !== undefined ? formatCurrencyPdf(profit) : 'N/A',
          profitPercentage !== undefined ? `${profitPercentage.toFixed(2)}%` : 'N/A',
          o.sellingPrice ? 'Sold' : 'In Stock'
        ];
      }),
      headStyles: { fillColor: [0, 128, 128] },
      didDrawPage: (data) => {
         if (data.pageNumber === 1) {
            doc.setFontSize(16);
            doc.text("Orders", 14, 38);
         }
      }
    });

    doc.save(`foneflow-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Success!", description: "PDF report exported successfully." });
  };


  const usersForFilter = isAdmin ? users : (currentUser ? users.filter(u => u.id === currentUser.id) : []);
  const cardsToDisplay = isAdmin ? cards : (currentUser ? cards.filter(c => c.userId === currentUser.id) : []);

  const uniqueDealers = useMemo(() => {
    const relevantOrders = isAdmin ? orders : (currentUser ? orders.filter(o => o.userId === currentUser.id) : []);
    return ["all", ...Array.from(new Set(relevantOrders.filter(o => o.dealer).map(o => o.dealer!)))]
  }, [orders, isAdmin, currentUser]);

  const filteredOrders = useMemo(() => {
    const baseOrders = isAdmin ? orders : (currentUser ? orders.filter(o => o.userId === currentUser.id) : []);

    return baseOrders.filter(order => {
      const orderDate = order.orderDate instanceof Timestamp ? order.orderDate.toDate() : order.orderDate;
      const inDateRange = !dateRange || (!dateRange.from || (isAfter(orderDate, dateRange.from) || isEqual(orderDate, dateRange.from))) && (!dateRange.to || (isBefore(orderDate, dateRange.to) || isEqual(orderDate, dateRange.to)));
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
    const totalFromTransactions = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = totalFromTransactions;

    const totalSellingPrice = soldOrders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
    const profitFromSoldPhones = soldOrders.reduce((sum, o) => sum + (o.sellingPrice! - (o.orderedPrice - (o.cashback || 0))), 0);
    const totalProfit = profitFromSoldPhones;
    const avgProfit = soldOrders.length > 0 ? totalProfit / soldOrders.length : 0;
    const totalPending = totalInvested - totalReceived;
    
    return {
      totalPhones: filteredOrders.length,
      totalInvested,
      totalInvestedAfterCashback,
      totalReceived,
      totalPending,
      totalProfit,
      avgProfit
    };
  }, [filteredOrders, transactions]);
  
  const userCashback = useMemo(() => {
    let ordersToConsider: Order[];
  
    if (isAdmin) {
      ordersToConsider = cashbackUserFilter === 'all' 
        ? orders 
        : orders.filter(o => o.userId === cashbackUserFilter);
    } else {
      ordersToConsider = currentUser ? orders.filter(o => o.userId === currentUser.id) : [];
    }
    
    return ordersToConsider.reduce((sum, o) => sum + (o.cashback || 0), 0);
  }, [orders, cashbackUserFilter, isAdmin, currentUser]);
  
  const creditCardBills = useMemo(() => {
    const bills = new Map<string, number>();
    
    cards.forEach(card => {
        const cardOrders = orders.filter(o => o.cardId === card.id);
        const totalSpent = cardOrders.reduce((sum, o) => sum + o.orderedPrice, 0);
        bills.set(card.id, totalSpent);
    });

    transactions.forEach(transaction => {
        if (transaction.cardId && bills.has(transaction.cardId)) {
            const currentBill = bills.get(transaction.cardId) || 0;
            bills.set(transaction.cardId, currentBill - transaction.amount);
        }
    });

    return bills;
  }, [orders, cards, transactions]);


  const resetFilters = () => {
    setDateRange(undefined);
    setUserFilter("all");
    setCardFilter("all");
    setDealerFilter("all");
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading application...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary"/>
            <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
              FoneFlow
            </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            {isAdmin && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <Button variant="outline" size="sm" onClick={handleImportClick}>
                  <Upload className="h-4 w-4 mr-2" /> Import
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportJson}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                 <Button variant="outline" size="sm" className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600" onClick={handleResetData}>
                    <RotateCw className="h-4 w-4 mr-2" /> Reset
                  </Button>
              </>
            )}
             {currentUser && <div className="flex items-center gap-2 border-l ml-2 pl-4">
                <div className="text-right">
                    <p className="font-semibold text-sm">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
             </div>}
          </div>

          <div className="md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    {currentUser && <div className="flex flex-col gap-4 py-4">
                        <div className="mb-2">
                           <p className="font-semibold text-lg">{currentUser.name}</p>
                           <p className="text-sm text-muted-foreground capitalize">{currentUser.role}</p>
                        </div>
                        <Separator />
                        <SheetClose asChild>
                            <Button variant="ghost" className="justify-start" onClick={() => router.push('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        </SheetClose>
                        {isAdmin && (
                            <>
                                <Separator />
                                <h4 className="text-sm font-semibold text-muted-foreground px-2">Admin Actions</h4>
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                <SheetClose asChild>
                                    <Button variant="ghost" className="justify-start" onClick={handleImportClick}>
                                      <Upload className="mr-2 h-4 w-4" /> Import Data
                                    </Button>
                                </SheetClose>
                                 <SheetClose asChild>
                                    <Button variant="ghost" className="justify-start" onClick={handleExportJson}>
                                      <FileText className="mr-2 h-4 w-4" /> Export JSON
                                    </Button>
                                </SheetClose>
                                 <SheetClose asChild>
                                    <Button variant="ghost" className="justify-start" onClick={handleExportPdf}>
                                      <FileText className="mr-2 h-4 w-4" /> Export PDF
                                    </Button>
                                </SheetClose>
                                 <SheetClose asChild>
                                    <Button variant="ghost" className="justify-start text-red-500 hover:text-red-600" onClick={handleResetData}>
                                      <RotateCw className="mr-2 h-4 w-4" /> Reset App
                                    </Button>
                                </SheetClose>
                            </>
                        )}
                        <Separator />
                        <SheetClose asChild>
                            <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                               <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </SheetClose>
                    </div>}
                </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col gap-8 p-4 md:p-8">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 animate-fade-in-up">
          <StatCard title="Total Phones Ordered" value={stats.totalPhones.toString()} icon={Smartphone} />
          <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={DollarSign} description={`After cashback: ${formatCurrency(stats.totalInvestedAfterCashback)}`}/>
          <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} icon={TrendingUp} />
          <StatCard title="Total Pending" value={formatCurrency(stats.totalPending)} icon={AlertCircle} className={stats.totalPending > 0 ? "text-orange-600" : ""} />
          <StatCard title="Total Profit" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} className="text-green-600" />
          <StatCard title="Avg. Profit / Piece" value={formatCurrency(stats.avgProfit)} icon={TrendingUp} />
          <Card className={cn("shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in-up")} style={{animationDelay: '0.1s', animationFillMode: 'backwards'}}>
             <CardContent className="pt-6">
                {isAdmin && (
                    <div className="mb-4">
                        <Select value={cashbackUserFilter} onValueChange={setCashbackUserFilter}>
                            <SelectTrigger className="w-full h-8 text-xs">
                                <Users className="mr-2 h-3 w-3" />
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="text-sm font-medium">Total Cashback</div>
                <div className="text-2xl font-bold">{formatCurrency(userCashback)}</div>
                <p className="text-xs text-muted-foreground">
                  {
                    isAdmin 
                    ? (cashbackUserFilter === 'all' ? 'Across all users' : `For ${users.find(u => u.id === cashbackUserFilter)?.name || 'selected user'}`)
                    : (currentUser ? `For ${currentUser.name}`: '')
                  }
                </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'backwards'}}>
           <CardHeader>
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle>FoneFlow Hub</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                    <AddOrderDialog users={usersForFilter} cards={cards} onSuccess={() => {}} />
                    {isAdmin && <AddTransactionDialog users={usersForFilter} cards={cards} onSuccess={() => {}} />}
                    <AddUserDialog onSuccess={() => {}}/>
                    <AddCardDialog users={usersForFilter} onSuccess={() => {}}/>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders">
              <TabsList className="w-full md:w-auto overflow-x-auto whitespace-nowrap">
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  {isAdmin && <TabsTrigger value="transactions">Transactions</TabsTrigger>}
                  <TabsTrigger value="cards">Credit Cards</TabsTrigger>
                  {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
              </TabsList>
              <TabsContent value="orders">
                <div className="flex flex-col md:flex-row gap-2 items-center flex-wrap my-4">
                  <Popover>
                      <PopoverTrigger asChild>
                      <Button id="date" variant={"outline"} className="w-full md:w-auto min-w-[240px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                      </PopoverContent>
                  </Popover>
                  {isAdmin && <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
                          <Users className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter by user" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                      </SelectContent>
                  </Select>}
                  <Select value={cardFilter} onValueChange={setCardFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
                          <CreditCardIcon className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter by card" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cards</SelectItem>
                        {cardsForFilter.map(card => <SelectItem key={card.id} value={card.id}>{card.name} (....{card.cardNumber.slice(-4)})</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select value={dealerFilter} onValueChange={setDealerFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
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
                    cards={cards}
                    onEditTransaction={setTransactionToEdit} 
                    onDeleteTransaction={setTransactionToDelete} 
                  />
              </TabsContent>}
               <TabsContent value="cards">
                    <Tabs defaultValue="bills" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="bills">Card Bills</TabsTrigger>
                            <TabsTrigger value="manage">Manage Cards</TabsTrigger>
                        </TabsList>
                        <TabsContent value="bills">
                           <Card>
                             <CardHeader>
                                <CardTitle>Credit Card Bills</CardTitle>
                                <CardDescription>Total amount spent on each credit card for orders, minus any payments received.</CardDescription>
                             </CardHeader>
                             <CardContent>
                                <div className="rounded-md border">
                                  <Table>
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead>Card</TableHead>
                                              <TableHead>User</TableHead>
                                              <TableHead className="text-right">Total Bill</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {cardsToDisplay.length === 0 ? (
                                              <TableRow>
                                                  <TableCell colSpan={3} className="h-24 text-center">No cards found.</TableCell>
                                              </TableRow>
                                          ) : (
                                              cardsToDisplay.map(card => (
                                                  <TableRow key={card.id}>
                                                      <TableCell>{card.name} (....{card.cardNumber.slice(-4)})</TableCell>
                                                      <TableCell>{users.find(u => u.id === card.userId)?.name || 'N/A'}</TableCell>
                                                      <TableCell className="text-right font-medium">{formatCurrency(creditCardBills.get(card.id) || 0)}</TableCell>
                                                  </TableRow>
                                              ))
                                          )}
                                      </TableBody>
                                  </Table>
                                </div>
                             </CardContent>
                           </Card>
                        </TabsContent>
                        <TabsContent value="manage">
                           <Card>
                                <CardHeader>
                                    <CardTitle>Manage Credit Cards</CardTitle>
                                    <CardDescription>Add, edit, or delete your credit cards.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CardTable cards={cardsToDisplay} users={users} onEditCard={setCardToEdit} onDeleteCard={setCardToDelete} />
                                </CardContent>
                           </Card>
                        </TabsContent>
                    </Tabs>
              </TabsContent>
              {isAdmin && <TabsContent value="users">
                  <UserTable users={users} onEditUser={setUserToEdit} onDeleteUser={setUserToDelete} />
              </TabsContent>}
            </Tabs>
          </CardContent>
        </Card>

        {orderToEdit && (
          <AddOrderDialog
            isOpen={!!orderToEdit}
            onOpenChange={(isOpen) => !isOpen && setOrderToEdit(null)}
            users={usersForFilter}
            cards={cards}
            order={orderToEdit}
            onSuccess={() => {}}
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
            transaction={transactionToEdit}
            users={usersForFilter}
            cards={cards}
            onSuccess={() => {}}
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
            user={userToEdit}
            onSuccess={() => {}}
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
            users={usersForFilter}
            card={cardToEdit}
            onSuccess={() => {}}
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
                  This will overwrite all existing data in Firestore. This action cannot be undone.
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
                  This action will permanently delete all orders, cards, and transactions. Users will not be deleted. This cannot be undone.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmResetData} variant="destructive">Reset Data</AlertDialogAction>
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

    