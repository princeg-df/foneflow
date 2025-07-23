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
  adminCredential?: { email: string, pass: string };
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

let adminCheckCompleted = false;

const defaultAdminEmail = 'admin@foneflow.com';
const defaultAdminPassword = 'Admin@123';

// This function runs once to ensure the default admin exists in Firebase Auth & Firestore.
const checkAndCreateAdmin = async () => {
    if (adminCheckCompleted) return;
    adminCheckCompleted = true;

    try {
        await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
        // This will trigger onAuthStateChanged, which will then handle creating the Firestore doc.
    } catch (error: any) {
        if (error.code !== 'auth/email-already-in-use') {
            console.error("Critical Error: Could not create default admin user in Auth:", error);
            toast({
                title: "Setup Error",
                description: "Could not prepare the default admin user.",
                variant: "destructive"
            });
        }
    }
    // Sign out immediately so this setup doesn't affect the user's login flow.
    if (auth.currentUser?.email === defaultAdminEmail) {
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
              setIsLoading(false);
            } else {
              // This can happen if user exists in Auth but not Firestore (e.g., first-time admin creation).
               if(firebaseUser.email === defaultAdminEmail) {
                  const userData: User = {
                    id: firebaseUser.uid,
                    email: defaultAdminEmail,
                    name: 'Default Admin',
                    role: 'admin',
                  };
                  try {
                    await setDoc(userDocRef, userData);
                    setUser(userData);
                  } catch (e) {
                     console.error("Error creating admin user doc:", e)
                  }
               } else {
                   // A regular user who doesn't have a doc for some reason.
                   // This is an inconsistent state, so treat as logged out.
                   setUser(null);
               }
               setIsLoading(false);
            }
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
    <AuthContext.Provider value={{ user, isLoading, adminCredential: { email: defaultAdminEmail, pass: defaultAdminPassword } }}>
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
