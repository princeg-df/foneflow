
// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from './use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAndCreateAdmin = async () => {
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
            if (error.code === 'auth/email-already-in-use') {
                // Admin already exists, this is fine.
            } else {
                console.error("Error creating default admin user:", error);
            }
        }
    };

    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            auth.signOut();
            setUser(null);
          }
          setIsLoading(false);
        },
        (error) => {
            console.error("Firestore snapshot error:", error);
            toast({
                title: "Database Connection Error",
                description: "Could not connect to the database. Please try again later.",
                variant: "destructive",
            });
            auth.signOut();
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
