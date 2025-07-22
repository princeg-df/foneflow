"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { UserPlus, Save } from "lucide-react"
import type { User } from "@/lib/types"
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
import { useToast } from "@/hooks/use-toast"

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
})

type UserFormValues = z.infer<typeof userSchema>

interface AddUserDialogProps {
  onAddUser: (user: User) => void;
  user?: User | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddUserDialog({ onAddUser, user, isOpen, onOpenChange }: AddUserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const { toast } = useToast()

  const isEditMode = !!user;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;


  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: isEditMode ? { name: user.name } : { name: "" },
  })
  
  useEffect(() => {
    if (user) {
      form.reset({ name: user.name });
    } else {
      form.reset({ name: "" });
    }
  }, [user, form]);

  function onSubmit(data: UserFormValues) {
    const newUser: User = {
      ...data,
      id: isEditMode ? user.id : new Date().toISOString(),
    }
    onAddUser(newUser)
    toast({
        title: "Success!",
        description: `User has been ${isEditMode ? 'updated' : 'added'}.`,
        variant: "default",
    })
    setOpen(false)
    if (!isEditMode) {
      form.reset()
    }
  }

  const dialogTitle = isEditMode ? "Edit User" : "Add New User";
  const dialogDescription = isEditMode
    ? "Update the name of the user."
    : "Enter the name of the new user.";
  const buttonText = isEditMode ? "Save Changes" : "Save User";

  const TriggerButton = (
    <Button variant="outline">
        <UserPlus className="mr-2 h-4 w-4" />
        Add User
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
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
