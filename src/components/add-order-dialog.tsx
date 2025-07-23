// src/components/add-order-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, PlusCircle, Save } from "lucide-react"
import type { Order, User, CreditCard } from "@/lib/types"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { db } from "@/lib/firebase"
import { doc, setDoc, Timestamp, collection } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"

const orderSchema = z.object({
  model: z.string().min(2, "Model is required"),
  variant: z.string().min(2, "Variant is required"),
  orderDate: z.date({ required_error: "Order date is required." }),
  orderedPrice: z.coerce.number().min(0, "Price must be a positive number"),
  cashback: z.coerce.number().min(0, "Cashback must be a positive number").optional().default(0),
  userId: z.string({ required_error: "User is required." }),
  cardId: z.string({ required_error: "Credit card is required." }),
  deliveryDate: z.date().optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  dealer: z.string().optional(),
})

type OrderFormValues = z.infer<typeof orderSchema>

interface AddOrderDialogProps {
  users: User[]
  cards: CreditCard[]
  order?: Order | null
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void;
}

export default function AddOrderDialog({ users, cards, order, isOpen, onOpenChange, onSuccess }: AddOrderDialogProps) {
  const { user: currentUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast()

  const isEditMode = !!order;
  
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  
  const defaultUserId = !isEditMode && currentUser?.role !== 'admin' ? currentUser?.id : undefined;

  const getInitialValues = () => {
    if (isEditMode && order) {
      return {
        ...order,
        orderDate: order.orderDate instanceof Timestamp ? order.orderDate.toDate() : order.orderDate,
        deliveryDate: order.deliveryDate ? (order.deliveryDate instanceof Timestamp ? order.deliveryDate.toDate() : order.deliveryDate) : undefined,
        sellingPrice: order.sellingPrice ?? undefined,
        dealer: order.dealer ?? "",
        cashback: order.cashback ?? 0,
      }
    }
    return {
      model: "",
      variant: "",
      userId: defaultUserId,
      cardId: undefined,
      orderDate: new Date(),
      deliveryDate: undefined,
      orderedPrice: undefined,
      cashback: 0,
      sellingPrice: undefined,
      dealer: "",
    }
  }

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: getInitialValues(),
  })

  useEffect(() => {
    form.reset(getInitialValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, open]);
  
  const selectedUserId = form.watch("userId");
  const filteredCards = cards.filter(card => card.userId === selectedUserId);

  async function onSubmit(data: OrderFormValues) {
    const id = isEditMode && order ? order.id : doc(collection(db, 'orders')).id;
    
    // Convert dates to Firestore Timestamps
    const orderData = {
      ...data,
      id,
      orderDate: Timestamp.fromDate(data.orderDate),
      deliveryDate: data.deliveryDate ? Timestamp.fromDate(data.deliveryDate) : null,
    };

    try {
      await setDoc(doc(db, "orders", id), orderData);
      toast({
          title: `Success!`,
          description: `Order has been ${isEditMode ? 'updated' : 'added'}.`,
      });
      setOpen(false);
      if(onSuccess) onSuccess();
    } catch(e) {
        console.error("Error adding document: ", e);
        toast({
            title: `Error`,
            description: `Could not save order. Please try again.`,
            variant: "destructive"
        })
    }
  }

  const dialogTitle = isEditMode ? "Edit Phone Order" : "Add New Phone Order";
  const dialogDescription = isEditMode 
    ? "Update the details of your phone purchase. Click save when you're done."
    : "Enter the details of your new phone purchase. Click save when you're done.";
  const buttonText = isEditMode ? "Save Changes" : "Save Order";

  const TriggerButton = (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" />
      Add Order
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEditMode && <DialogTrigger asChild>{TriggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6 -mr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input placeholder="e.g., iPhone 15 Pro" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="variant" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant</FormLabel>
                    <FormControl><Input placeholder="e.g., 256GB Natural Titanium" {...field} /></FormControl>
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
                              <SelectValue placeholder="Select a card" />
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
              <FormField control={form.control} name="orderDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date</FormLabel>
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
              <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Delivery Date (Optional)</FormLabel>
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
              <FormField control={form.control} name="orderedPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordered Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 89000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="cashback" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cashback</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (Optional)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 95000" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="dealer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Amazon" {...field} value={field.value ?? ""} /></FormControl>
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
