"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CreditCard as CreditCardIcon } from "lucide-react"
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
  userId: z.string({required_error: "User is required."}),
})

type CardFormValues = z.infer<typeof cardSchema>

interface AddCardDialogProps {
  onAddCard: (card: CreditCard) => void
  users: User[]
}

export default function AddCardDialog({ onAddCard, users }: AddCardDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
    },
  })

  function onSubmit(data: CardFormValues) {
    const newCard: CreditCard = {
      ...data,
      id: new Date().toISOString(),
    }
    onAddCard(newCard)
    toast({
        title: "Success!",
        description: "New credit card has been added.",
        variant: "default",
    })
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CreditCardIcon className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Credit Card</DialogTitle>
          <DialogDescription>
            Enter the details of the new credit card.
          </DialogDescription>
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
            <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="submit">Save Card</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
