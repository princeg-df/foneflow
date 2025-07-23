// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
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

const checkAndCreateAdmin = async () => {
    if (adminCheckCompleted) return;
    adminCheckCompleted = true;

    const defaultAdminEmail = 'admin@foneflow.com';
    const defaultAdminPassword = 'Admin@123';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
        const user = userCredential.user;
        // After creating the user in Auth, create their document in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userData: User = {
            id: user.uid,
            email: defaultAdminEmail,
            name: 'Default Admin',
            role: 'admin',
        };
        await setDoc(userDocRef, userData);
        // Important: Sign out immediately so this initial setup doesn't affect the user's login flow.
        await auth.signOut();
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // This is expected and fine. The admin user already exists.
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
    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          setIsLoading(true);
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setUser(null);
            setIsLoading(false);
        });
        return () => unsubSnapshot();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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
