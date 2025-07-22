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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import useLocalStorage from "@/hooks/use-local-storage"

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address."),
  password: z.string().min(4, "Password must be at least 4 characters long"),
  role: z.enum(["admin", "user"]),
})

type UserFormValues = z.infer<typeof userSchema>

interface AddUserDialogProps {
  onAddUser: (user: User) => void;
  user?: User | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentUser: User | null;
}

export default function AddUserDialog({ onAddUser, user, isOpen, onOpenChange, currentUser }: AddUserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const { toast } = useToast()
  const [users] = useLocalStorage<User[]>('foneflow-users', []);

  const isEditMode = !!user;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;


  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: isEditMode ? { name: user.name, email: user.email, password: user.password, role: user.role } : { name: "", email: "", password: "", role: "user" },
  })
  
  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, email: user.email, password: user.password, role: user.role });
    } else {
      form.reset({ name: "", email: "", password: "", role: "user" });
    }
  }, [user, form]);

  function onSubmit(data: UserFormValues) {
    const emailInUse = users.some(
      (u) => u.email === data.email && u.id !== user?.id
    );

    if (emailInUse) {
      form.setError("email", {
        type: "manual",
        message: "This email is already in use.",
      });
      return;
    }

    const newUser: User = {
      ...data,
      id: isEditMode ? user.id : `user_${new Date().getTime()}`,
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
    ? "Update the details of the user."
    : "Enter the details of the new user.";
  const buttonText = isEditMode ? "Save Changes" : "Save User";

  const TriggerButton = (
    <Button variant="outline">
        <UserPlus className="mr-2 h-4 w-4" />
        Add User
    </Button>
  );

  if (currentUser?.role !== 'admin') {
      return null;
  }

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
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., john.doe@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                      </Select>
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
