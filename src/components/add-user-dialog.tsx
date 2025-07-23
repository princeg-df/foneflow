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
import { db, auth as mainAuth, firebaseConfig } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth"
import { initializeApp, getApps, deleteApp } from "firebase/app"

// Schema for adding a new user
const addUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["admin", "user"]),
});

// Schema for editing an existing user (password is not editable here)
const editUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address."),
  role: z.enum(["admin", "user"]),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

interface AddUserDialogProps {
  user?: User | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddUserDialog({ user, isOpen, onOpenChange, onSuccess }: AddUserDialogProps) {
  const { user: currentUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const isEditMode = !!user;

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const form = useForm<AddUserFormValues | EditUserFormValues>({
    resolver: zodResolver(isEditMode ? editUserSchema : addUserSchema),
  });
  
  useEffect(() => {
    if(open) {
      if (isEditMode && user) {
        form.reset({ name: user.name, email: user.email, role: user.role });
      } else {
        form.reset({ name: "", email: "", password: "", role: "user" });
      }
    }
  }, [user, isEditMode, open, form]);

  async function onSubmit(data: AddUserFormValues | EditUserFormValues) {
    setIsSaving(true);

    if (isEditMode) {
      // Logic for editing a user
      if (!user) return;
      const userData: Omit<User, 'id'> = {
        name: data.name,
        email: data.email,
        role: (data as EditUserFormValues).role,
      };
      try {
        await setDoc(doc(db, "users", user.id), userData, { merge: true });
        toast({ title: "Success!", description: `User has been updated.` });
        if(onSuccess) onSuccess();
        setOpen(false);
      } catch (error) {
        console.error("Error updating user:", error);
        toast({ title: "Error", description: "Could not update user details.", variant: "destructive" });
      }

    } else {
      // Logic for creating a new user
      const { name, email, password, role } = data as AddUserFormValues;
      const tempAppName = `temp-auth-app-${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newUserId = userCredential.user.uid;
        
        const newUser: User = { id: newUserId, name, email, role };
        await setDoc(doc(db, "users", newUserId), newUser);

        toast({ title: "Success!", description: `User ${name} created successfully.` });
        if(onSuccess) onSuccess();
        setOpen(false);
        form.reset();

      } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
            title: "Error Creating User",
            description: error.code === 'auth/email-already-in-use' 
              ? "This email address is already in use."
              : "An unexpected error occurred. Please try again.",
            variant: "destructive"
        });
      } finally {
        await deleteApp(tempApp);
      }
    }

    setIsSaving(false);
  }

  const dialogTitle = isEditMode ? "Edit User" : "Add New User";
  const dialogDescription = isEditMode
    ? "Update the details of the user. Password cannot be changed here."
    : "Create a new user in Firebase Authentication and Firestore.";
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
