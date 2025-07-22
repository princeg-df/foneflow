"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useLocalStorage from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, LogIn } from "lucide-react";
import type { User as UserType } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const defaultAdminUser: UserType = {
  id: 'user_admin',
  name: 'Prince',
  email: 'princegupta619@gmail.com',
  password: 'admin',
  role: 'admin',
};

export default function LoginPage() {
  const [currentUser, setCurrentUser] = useLocalStorage<UserType | null>('foneflow-currentUser', null);
  const [users, setUsers] = useLocalStorage<UserType[]>('foneflow-users', []);
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  
  // Ensure default admin exists on client
  useEffect(() => {
    if (isClient) {
        const adminExists = users.some(u => u.email === defaultAdminUser.email);
        if (!adminExists) {
            setUsers(prev => [...prev, defaultAdminUser]);
        }
    }
  }, [isClient, setUsers, users]);


  useEffect(() => {
    if (currentUser) {
      router.replace('/');
    }
  }, [currentUser, router]);

  function onSubmit(data: LoginFormValues) {
    const user = users.find(u => u && u.email && u.email === data.email && u.password === data.password);
    if (user) {
      setCurrentUser(user);
      toast({ title: "Success", description: "Logged in successfully." });
      router.push('/');
    } else {
      toast({
        title: "Error",
        description: "Incorrect email or password. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (!isClient) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center mb-8">
        <Smartphone className="h-8 w-8 mr-3 text-primary"/>
        <h1 className="text-4xl font-bold font-headline text-primary">
          FoneFlow
        </h1>
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-8 text-sm text-muted-foreground text-center">
        Default admin email is <span className="font-bold">princegupta619@gmail.com</span> and password is <span className="font-bold">admin</span>.
      </p>
    </div>
  );
}
