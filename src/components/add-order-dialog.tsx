"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react"
import type { Order } from "@/lib/types"
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

const orderSchema = z.object({
  model: z.string().min(2, "Model is required"),
  variant: z.string().min(2, "Variant is required"),
  orderDate: z.date({ required_error: "Order date is required." }),
  orderedPrice: z.coerce.number().min(0, "Price must be a positive number"),
  cashback: z.coerce.number().min(0, "Cashback must be a positive number").optional().default(0),
  card: z.string().min(2, "Credit card is required"),
  deliveryDate: z.date().optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  dealer: z.string().optional(),
})

type OrderFormValues = z.infer<typeof orderSchema>

interface AddOrderDialogProps {
  onAddOrder: (order: Order) => void
}

export default function AddOrderDialog({ onAddOrder }: AddOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
        model: "",
        variant: "",
        cashback: 0,
        card: "",
    },
  })

  function onSubmit(data: OrderFormValues) {
    const newOrder: Order = {
      ...data,
      cashback: data.cashback || 0,
      id: new Date().toISOString(),
    }
    onAddOrder(newOrder)
    toast({
        title: "Success!",
        description: "New phone order has been added.",
        variant: "default",
    })
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Phone Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Phone Order</DialogTitle>
          <DialogDescription>
            Enter the details of your new phone purchase. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
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
            <FormField control={form.control} name="orderedPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordered Price</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="e.g., 1099" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="cashback" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cashback</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="e.g., 50" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="card" render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Card Used</FormLabel>
                  <FormControl><Input placeholder="e.g., Amex Gold" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Order</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
