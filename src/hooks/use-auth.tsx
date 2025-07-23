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

// This function runs once to ensure the default admin exists in Firebase Auth & Firestore.
const checkAndCreateAdmin = async () => {
    if (adminCheckCompleted) return;
    adminCheckCompleted = true;

    const defaultAdminEmail = 'admin@foneflow.com';
    const defaultAdminPassword = 'Admin@123';

    try {
        await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // Admin already exists in Auth, this is expected.
        } else {
            console.error("Critical Error: Could not create default admin user in Auth:", error);
            toast({
                title: "Setup Error",
                description: "Could not prepare the default admin user.",
                variant: "destructive"
            });
        }
    }
    // Sign out immediately so this setup doesn't affect the user's login flow.
    // This is crucial to ensure the onAuthStateChanged listener gets a clean state.
    if (auth.currentUser) {
       await auth.signOut();
    }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAndCreateAdmin();

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const unsubSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              setUser({ id: docSnap.id, ...docSnap.data() } as User);
            } else {
              // This can happen if user exists in Auth but not Firestore.
              // Let's create the user doc for the default admin if it's missing.
               if(firebaseUser.email === 'admin@foneflow.com') {
                  const userData: User = {
                    id: firebaseUser.uid,
                    email: 'admin@foneflow.com',
                    name: 'Default Admin',
                    role: 'admin',
                  };
                  await setDoc(userDocRef, userData);
                  setUser(userData);
               } else {
                   setUser(null);
               }
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
    };
    
    initializeAuth();

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
