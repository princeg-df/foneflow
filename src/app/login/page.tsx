// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, LogIn, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { User as UserType } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const defaultAdminEmail = 'princegupta619@gmail.com';
const defaultAdminPassword = 'Qwerty@123';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const checkAndCreateAdmin = async () => {
        try {
            // This is a simplified check. In a real app, you'd want a more secure way to provision the first admin.
            // We try to sign in to check if the user exists. If not, create it.
            await signInWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
            await auth.signOut();
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                console.log("Default admin not found, creating one...");
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
                    const adminUser: Omit<UserType, 'id'> = {
                        name: 'Prince',
                        email: defaultAdminEmail,
                        role: 'admin',
                    };
                    await setDoc(doc(db, "users", userCredential.user.uid), adminUser);
                    console.log("Default admin user created.");
                    await auth.signOut();
                } catch (creationError) {
                    console.error("Error creating default admin user:", creationError);
                }
            }
        }
    };
    
    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/');
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);


  async function onSubmit(data: LoginFormValues) {
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Success", description: "Logged in successfully." });
      router.push('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Incorrect email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading...</p>
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
                      <Input type="email" placeholder="Enter your email" {...field} disabled={isLoggingIn} />
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
                      <Input type="password" placeholder="Enter your password" {...field} disabled={isLoggingIn} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-8 text-sm text-muted-foreground text-center">
        Default admin email: <span className="font-bold">{defaultAdminEmail}</span><br/>Password: <span className="font-bold">{defaultAdminPassword}</span>
      </p>
    </div>
  );
}
