"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useLocalStorage from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft } from "lucide-react";
import type { User } from "@/lib/types";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('foneflow-currentUser', null);
  const [, setUsers] = useLocalStorage<User[]>('foneflow-users', []);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  if (!currentUser) {
      router.replace('/login');
      return null;
  }

  function onSubmit(data: PasswordFormValues) {
    if (data.currentPassword !== currentUser?.password) {
      toast({
        title: "Error",
        description: "Incorrect current password.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedUser = { ...currentUser, password: data.newPassword };
    setCurrentUser(updatedUser);
    
    // Fetch users only when needed
    const allUsers: User[] = JSON.parse(localStorage.getItem('foneflow-users') || '[]');
    const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUsers);

    toast({
      title: "Success",
      description: "Password updated successfully.",
    });
    form.reset();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Change your application password here. Your email is <span className="font-semibold text-primary">{currentUser.email}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between">
                 <Button type="button" variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                 </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
