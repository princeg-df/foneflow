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

let adminCheckCompleted = false;

// This function runs once to ensure the default admin exists in Firebase Auth & Firestore.
const checkAndCreateAdmin = async () => {
    if (adminCheckCompleted) return;
    adminCheckCompleted = true;

    const defaultAdminEmail = 'admin@foneflow.com';
    const defaultAdminPassword = 'Admin@123';

    try {
        // The createUser API is idempotent for this purpose. 
        // If the user already exists, it will throw 'auth/email-already-in-use', which we catch.
        const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
        const user = userCredential.user;
        
        // If creation is successful, create their document in Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const userData: User = {
            id: user.uid,
            email: defaultAdminEmail,
            name: 'Default Admin',
            role: 'admin',
        };
        await setDoc(userDocRef, userData);
        
        // Sign out immediately so this setup doesn't affect the user's login flow.
        await auth.signOut();
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // This is expected if the admin already exists. No action needed.
        } else {
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
    // Run the one-time admin check before setting up the auth listener.
    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // If a user is logged in, listen for changes to their document in Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            // This case can happen if a user exists in Auth but not Firestore.
            setUser(null);
          }
          setIsLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setUser(null);
            setIsLoading(false);
        });
        return () => unsubSnapshot(); // Cleanup the Firestore listener.
      } else {
        // If no user is logged in, update the state.
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup the Auth listener.
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
