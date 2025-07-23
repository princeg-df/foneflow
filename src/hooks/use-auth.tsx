// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { toast } from './use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

// A flag to ensure the admin check runs only once per application lifecycle.
let adminCheckCompleted = false;

const checkAndCreateAdmin = async () => {
    if (adminCheckCompleted) return;
    adminCheckCompleted = true;

    const defaultAdminEmail = 'princegupta619@gmail.com';
    const defaultAdminPassword = 'Qwerty@123';
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
        const adminUser: Omit<User, 'id'> = {
            name: 'Prince',
            email: defaultAdminEmail,
            role: 'admin',
        };
        await setDoc(doc(db, "users", userCredential.user.uid), adminUser);
        await auth.signOut();
    } catch (error: any) {
        if (error.code !== 'auth/email-already-in-use') {
            console.error("Critical Error: Could not create default admin user:", error);
            toast({
                title: "Setup Error",
                description: "Could not create the default admin user.",
                variant: "destructive"
            });
        }
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Run the admin check once on startup.
    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            // User authenticated in Firebase Auth but no record in Firestore.
            // This can happen if the user is deleted from the DB but not Auth.
            // Log them out to be safe.
            setUser(null);
            auth.signOut();
          }
          setIsLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            toast({
                title: "Database Connection Error",
                description: "Could not fetch user profile.",
                variant: "destructive",
            });
            setUser(null);
            setIsLoading(false);
        });
        return () => unsubSnapshot(); // Unsubscribe from Firestore listener
      } else {
        // No firebase user, so not logged in.
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // Unsubscribe from Auth listener
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
