// src/components/add-user-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { UserPlus, Save, Loader2 } from "lucide-react"
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
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["admin", "user"]),
})

type UserFormValues = z.infer<typeof userSchema>

interface AddUserDialogProps {
  user?: User | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentUser: User | null;
  onSuccess?: () => void;
}

export default function AddUserDialog({ user, isOpen, onOpenChange, currentUser, onSuccess }: AddUserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const isEditMode = !!user;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const getInitialValues = () => {
    if (isEditMode && user) {
      // Password is not editable for existing users via this form for security reasons
      return { name: user.name, email: user.email, password: "password", role: user.role }
    }
    return { name: "", email: "", password: "", role: "user" as const }
  }


  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: getInitialValues(),
  })
  
  useEffect(() => {
    form.reset(getInitialValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, form]);

  async function onSubmit(data: UserFormValues) {
    setIsSaving(true);
    // In a real app, creating a user would be a backend operation for security.
    // This is a simplified client-side version.
    // We can't create a user in Firebase Auth from the client without signing them in.
    // So we'll just store their details in Firestore. This is NOT secure for production.
    const id = isEditMode && user ? user.id : doc(doc(db, 'users', 'placeholder')).id;
    const userData: Omit<User, 'password'> = {
      id,
      name: data.name,
      email: data.email,
      role: data.role
    }

    try {
        await setDoc(doc(db, "users", id), userData);
        toast({
            title: "Success!",
            description: `User has been ${isEditMode ? 'updated' : 'added'}.`,
        })
        setOpen(false)
        if (!isEditMode) {
          form.reset()
        }
        if(onSuccess) onSuccess();
    } catch(e) {
        console.error("Error saving user:", e);
        toast({
            title: "Error",
            description: "Could not save user details. The email might already be in use.",
            variant: "destructive"
        })
    } finally {
        setIsSaving(false);
    }
  }

  const dialogTitle = isEditMode ? "Edit User" : "Add New User";
  const dialogDescription = isEditMode
    ? "Update the details of the user."
    : "Enter the details of the new user. Password cannot be changed here.";
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
                  <FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSaving} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="e.g., john.doe@example.com" {...field} disabled={isSaving || isEditMode} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEditMode && (
              <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Enter password" {...field} disabled={isSaving} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
            )}
            <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isSaving}>
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
               <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {buttonText}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
