// src/components/add-transaction-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Save, Landmark } from "lucide-react"
import type { Transaction, User, CreditCard } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { db } from "@/lib/firebase"
import { doc, setDoc, Timestamp, collection } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"

const transactionSchema = z.object({
  date: z.date({ required_error: "Transaction date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dealer: z.string().min(2, "Dealer name is required"),
  description: z.string().optional(),
  paymentMode: z.enum(["cash", "online"], { required_error: "Payment mode is required." }),
  onlinePaymentType: z.enum(["upi", "bank_transfer"]).optional(),
  userId: z.string({ required_error: "User is required." }),
  cardId: z.string({ required_error: "Credit card is required." }),
}).refine(data => {
    if (data.paymentMode === 'online') {
        return !!data.onlinePaymentType;
    }
    return true;
}, {
    message: "Online payment type is required for online payments.",
    path: ["onlinePaymentType"],
});

type TransactionFormValues = z.infer<typeof transactionSchema>

interface AddTransactionDialogProps {
  transaction?: Transaction | null
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  users: User[];
  cards: CreditCard[];
  onSuccess?: () => void;
}

export default function AddTransactionDialog({ transaction, isOpen, onOpenChange, users, cards, onSuccess }: AddTransactionDialogProps) {
  const { user: currentUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false)
  const { toast } = useToast()

  const isEditMode = !!transaction;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  
  const defaultUserId = !isEditMode && currentUser?.role !== 'admin' ? currentUser?.id : undefined;

  const getInitialValues = () => {
    if (isEditMode && transaction) {
       return { 
        ...transaction, 
        date: transaction.date instanceof Timestamp ? transaction.date.toDate() : transaction.date,
        description: transaction.description ?? "" ,
        onlinePaymentType: transaction.onlinePaymentType ?? undefined,
      }
    }
    return {
      date: new Date(),
      amount: undefined,
      dealer: "",
      description: "",
      paymentMode: 'cash' as const,
      onlinePaymentType: undefined,
      userId: defaultUserId,
      cardId: undefined,
    }
  }

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: getInitialValues(),
  })
  
  const paymentMode = form.watch("paymentMode");
  const selectedUserId = form.watch("userId");
  const filteredCards = cards.filter(card => card.userId === selectedUserId);

  useEffect(() => {
    if (open) {
      form.reset(getInitialValues());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction, open]);

  async function onSubmit(data: TransactionFormValues) {
    const id = isEditMode && transaction ? transaction.id : doc(collection(db, 'transactions')).id;
    const transactionData = {
      ...data,
      id,
      date: Timestamp.fromDate(data.date),
      onlinePaymentType: data.paymentMode === 'online' ? data.onlinePaymentType : undefined,
      description: data.description ?? null,
    };
    
    try {
        await setDoc(doc(db, "transactions", id), transactionData, { merge: true });
        toast({
            title: `Success!`,
            description: `Transaction has been ${isEditMode ? 'updated' : 'added'}.`,
        })
        setOpen(false)
        if (onSuccess) onSuccess();
    } catch(e) {
        console.error("Error adding transaction: ", e);
         toast({
            title: `Error`,
            description: `Could not save transaction. Please try again.`,
            variant: "destructive"
        })
    }
  }

  const dialogTitle = isEditMode ? "Edit Transaction" : "Add New Transaction";
  const dialogDescription = isEditMode 
    ? "Update the details of the payment received. Click save when you're done."
    : "Enter the details of the payment you received from a dealer.";
  const buttonText = isEditMode ? "Save Changes" : "Save Transaction";

  const TriggerButton = (
    <Button variant="outline">
      <Landmark className="mr-2 h-4 w-4" />
      Add Transaction
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEditMode && <DialogTrigger asChild>{TriggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
         <ScrollArea className="max-h-[70vh] pr-6 -mr-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField control={form.control} name="dealer" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Dealer Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Amazon" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount Received</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 50000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField control={form.control} name="userId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); form.setValue('cardId', ''); }} value={field.value} disabled={currentUser?.role !== 'admin'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="cardId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Credit Card</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUserId}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a card for payment" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredCards.map(card => (
                                <SelectItem key={card.id} value={card.id}>{card.name} (....{card.cardNumber.slice(-4)})</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Transaction Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Payment Mode</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="cash" />
                            </FormControl>
                            <FormLabel className="font-normal">Cash</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="online" />
                            </FormControl>
                            <FormLabel className="font-normal">Online</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {paymentMode === 'online' && (
                <FormField
                    control={form.control}
                    name="onlinePaymentType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Online Payment Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="upi" />
                                </FormControl>
                                <FormLabel className="font-normal">UPI</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="bank_transfer" />
                                </FormControl>
                                <FormLabel className="font-normal">Bank Transfer</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Bulk payment for January sales" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    {buttonText}
                </Button>
                </DialogFooter>
            </form>
            </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
