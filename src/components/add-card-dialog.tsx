"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CreditCard as CreditCardIcon, Save } from "lucide-react"
import type { CreditCard, User } from "@/lib/types"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const cardSchema = z.object({
  name: z.string().min(2, "Card name is required"),
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  userId: z.string({required_error: "User is required."}),
})

type CardFormValues = z.infer<typeof cardSchema>

interface AddCardDialogProps {
  onAddCard: (card: CreditCard) => void;
  users: User[];
  card?: CreditCard | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddCardDialog({ onAddCard, users, card, isOpen, onOpenChange }: AddCardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast()

  const isEditMode = !!card;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: isEditMode ? card : { name: "", cardNumber: "" },
  })

  useEffect(() => {
    if (card) {
      form.reset(card);
    } else {
      form.reset({ name: "", cardNumber: "", userId: undefined });
    }
  }, [card, form]);

  function onSubmit(data: CardFormValues) {
    const newCard: CreditCard = {
      ...data,
      id: isEditMode ? card.id : new Date().toISOString(),
    }
    onAddCard(newCard)
    toast({
        title: "Success!",
        description: `Credit card has been ${isEditMode ? 'updated' : 'added'}.`,
        variant: "default",
    })
    setOpen(false)
    if (!isEditMode) {
      form.reset()
    }
  }

  const dialogTitle = isEditMode ? "Edit Credit Card" : "Add New Credit Card";
  const dialogDescription = isEditMode
    ? "Update the details of the credit card."
    : "Enter the details of the new credit card.";
  const buttonText = isEditMode ? "Save Changes" : "Save Card";

  const TriggerButton = (
      <Button variant="outline">
          <CreditCardIcon className="mr-2 h-4 w-4" />
          Add Card
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
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Amex Gold" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="cardNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl><Input type="text" placeholder="e.g., 1234567890123456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a user for this card" />
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
