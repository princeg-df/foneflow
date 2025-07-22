"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Save, Landmark } from "lucide-react"
import type { Transaction } from "@/lib/types"
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
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const transactionSchema = z.object({
  date: z.date({ required_error: "Transaction date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dealer: z.string().min(2, "Dealer name is required"),
  description: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface AddTransactionDialogProps {
  onAddTransaction: (transaction: Transaction) => void
  transaction?: Transaction | null
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function AddTransactionDialog({ onAddTransaction, transaction, isOpen, onOpenChange }: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const { toast } = useToast()

  const isEditMode = !!transaction;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: isEditMode ? { ...transaction, description: transaction.description ?? "" } : {
      dealer: "",
      description: "",
    },
  })

  useEffect(() => {
    if (transaction) {
      form.reset({
        ...transaction,
        description: transaction.description ?? "",
      });
    } else {
      form.reset({
        date: undefined,
        amount: undefined,
        dealer: "",
        description: "",
      });
    }
  }, [transaction, form]);

  function onSubmit(data: TransactionFormValues) {
    const newTransaction: Transaction = {
      ...data,
      id: isEditMode ? transaction.id : new Date().toISOString(),
      description: data.description,
    }
    onAddTransaction(newTransaction)
    toast({
        title: `Success!`,
        description: `Transaction has been ${isEditMode ? 'updated' : 'added'}.`,
        variant: "default",
    })
    setOpen(false)
    if (!isEditMode) {
      form.reset()
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
                  <FormControl><Input type="number" step="0.01" placeholder="e.g., 50000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Bulk payment for January sales" {...field} /></FormControl>
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
      </DialogContent>
    </Dialog>
  )
}