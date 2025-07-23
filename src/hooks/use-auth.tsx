
// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
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
    // This function runs once to ensure the default admin exists.
    const checkAndCreateAdmin = async () => {
        const defaultAdminEmail = 'princegupta619@gmail.com';
        const defaultAdminPassword = 'Qwerty@123';
        
        try {
            // We try to create the user. If it fails because the email is in use,
            // it means the admin already exists, which is fine.
            const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
            const adminUser: Omit<User, 'id'> = {
                name: 'Prince',
                email: defaultAdminEmail,
                role: 'admin',
            };
            await setDoc(doc(db, "users", userCredential.user.uid), adminUser);
            // After creating the user for the first time, we sign them out so the app
            // doesn't automatically log in as admin.
            await auth.signOut();
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                // This is expected if the admin user already exists. We can ignore it.
            } else {
                console.error("Error checking/creating default admin user:", error);
            }
        }
    };

    checkAndCreateAdmin();

    // This is the primary listener for user authentication state.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            // This case can happen if a user is deleted from Firestore but not from Auth.
            auth.signOut();
            setUser(null);
          }
          setIsLoading(false);
        },
        (error) => {
            console.error("Firestore snapshot error:", error);
            toast({
                title: "Database Connection Error",
                description: "Could not connect to the database. Please try again.",
                variant: "destructive",
                duration: 10000,
            });
            auth.signOut();
            setUser(null);
            setIsLoading(false);
        });
        return () => unsubSnapshot();
      } else {
        // No user is signed in.
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4">Authenticating...</p>
        </div>
      ) : (
        children
      )}
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
